"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getChatProvider, ProviderUnavailableError } from "@/lib/ai/provider";
import { getSessionUser } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getReadiness } from "@/lib/readiness";
import { rateLimit } from "@/lib/security/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

const loc = (form: FormData) => {
  const v = String(form.get("locale") ?? "en");
  return isLocale(v) ? v : "en";
};

async function artistOnly(locale: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "artist" || !user.artistId) redirect(`/${locale}/join`);
  return user as typeof user & { artistId: string };
}

export async function applyIncubationAction(form: FormData) {
  const locale = loc(form);
  const user = await artistOnly(locale);
  const parsed = z
    .object({ programId: z.string().uuid(), motivation: z.string().trim().min(30, "Please write at least 30 characters.").max(3000) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`/${locale}/grow?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Please check the form.")}`);
  const needs = form.getAll("needs").map(String).filter((n) => ["photography", "pricing", "marketing", "selling", "branding", "orders"].includes(n));
  const db = await supabaseServer();
  const { error } = await db.from("incubation_applications").insert({ artist_id: user.artistId, program_id: parsed.data.programId, motivation: parsed.data.motivation, needs });
  redirect(`/${locale}/grow?${error ? `error=${encodeURIComponent("You have already applied.")}` : "applied=1"}`);
}

export async function toggleMilestoneAction(form: FormData) {
  const locale = loc(form);
  const user = await artistOnly(locale);
  const milestoneId = z.string().uuid().parse(form.get("milestoneId"));
  const db = await supabaseServer();
  const { data: enrollment } = await db.from("incubation_enrollments").select("id").eq("artist_id", user.artistId).limit(1).maybeSingle();
  if (!enrollment) redirect(`/${locale}/grow`);
  const { data: m } = await db.from("incubation_milestones").select("check_kind").eq("id", milestoneId).single();
  if (m?.check_kind !== "manual") redirect(`/${locale}/grow`); // automatic milestones follow real data only
  const { data: existing } = await db.from("milestone_completions").select("milestone_id").eq("enrollment_id", enrollment!.id).eq("milestone_id", milestoneId).maybeSingle();
  if (existing) await db.from("milestone_completions").delete().eq("enrollment_id", enrollment!.id).eq("milestone_id", milestoneId);
  else await db.from("milestone_completions").insert({ enrollment_id: enrollment!.id, milestone_id: milestoneId });
  revalidatePath(`/${locale}/grow`);
  redirect(`/${locale}/grow`);
}

export async function registerWorkshopAction(form: FormData) {
  const locale = loc(form);
  const user = await artistOnly(locale);
  const workshopId = z.string().uuid().parse(form.get("workshopId"));
  const db = await supabaseServer();
  await db.from("workshop_registrations").upsert({ workshop_id: workshopId, artist_id: user.artistId });
  revalidatePath(`/${locale}/grow`);
  redirect(`/${locale}/grow?registered=1`);
}

export interface GuideAnswer {
  findings: string[];
  advice: string | null;
  error?: string;
}

/**
 * Practical guidance grounded in the artist's real listings. Findings are computed
 * from data; the optional AI advice only rephrases them into next steps and is told
 * never to invent numbers or promise sales.
 */
export async function askGuideAction(_prev: GuideAnswer, form: FormData): Promise<GuideAnswer> {
  const locale = loc(form);
  const user = await getSessionUser();
  if (!user || user.role !== "artist" || !user.artistId) return { findings: [], advice: null, error: "Artists only." };
  if (!rateLimit(`guide:${user.id}`, 15, 60 * 60_000)) return { findings: [], advice: null, error: "Please wait a little before asking again." };
  const question = z.string().trim().min(5).max(800).safeParse(form.get("question"));
  if (!question.success) return { findings: [], advice: null, error: "Please describe your situation in a sentence or two." };

  const db = await supabaseServer();
  const r = await getReadiness(db, user.artistId);
  const { data: products } = await db.from("products").select("title, description, price_amount, materials, status").eq("artist_id", user.artistId).neq("status", "archived").limit(20);

  const findings: string[] = [];
  if (!r.has_bio) findings.push(`Your biography has ${r.facts.bioLength} characters. Aim for at least 80: what you make, how, and what makes it yours.`);
  if (!r.has_location) findings.push("Your location is not set, so you cannot appear on the map or in local searches.");
  if (r.facts.published === 0) findings.push("You have no published works yet. Customers can only find what is published.");
  else if (r.facts.published < 3) findings.push(`You have ${r.facts.published} published work(s). Three or more gives customers a sense of your range.`);
  if (r.facts.withoutPhotos > 0) findings.push(`${r.facts.withoutPhotos} published work(s) have no approved photo. Listings without photos are rarely chosen.`);
  if (r.facts.pendingImages > 0) findings.push(`${r.facts.pendingImages} photo(s) are waiting for review by the Astarte team.`);
  if (r.facts.unpriced > 0) findings.push(`${r.facts.unpriced} published work(s) have no price. That is allowed, but a price or price range removes a question for buyers.`);
  const short = (products ?? []).filter((p) => p.status === "published" && (p.description ?? "").length < 80);
  if (short.length) findings.push(`${short.length} work(s) have a description under 80 characters: ${short.slice(0, 3).map((p) => `“${p.title}”`).join(", ")}. Add size, materials, technique and delivery.`);
  const noMaterials = (products ?? []).filter((p) => p.status === "published" && !(p.materials ?? []).length);
  if (noMaterials.length) findings.push(`${noMaterials.length} work(s) list no materials. Materials are one of the first things buyers search for.`);
  if (!r.has_post) findings.push("You have not shared a story yet. Stories let customers discover you and earn Point Merci for reading them.");
  if (findings.length === 0) findings.push("Your profile and listings cover the basics. Next: share stories regularly, offer a Point Merci reward, and join an upcoming workshop.");

  const provider = getChatProvider();
  if (!provider) return { findings, advice: null };
  try {
    const reply = await provider.chat(
      [
        {
          role: "system",
          content: `You are the Astarte incubation guide for a Tunisian artisan. Give practical business guidance in ${locale === "fr" ? "French" : locale === "ar" ? "simple Arabic" : "English"}.
Rules: Use only the facts provided. Never invent statistics, sales figures or customer numbers. Never promise sales or growth.
Never tell the artist what to create or how their art should look; the artist decides the creative work.
Focus on presentation, photos, descriptions, pricing method, categories, customer communication and visibility on Astarte.
Answer with at most 6 short numbered steps. No motivational filler.`,
        },
        { role: "user", content: JSON.stringify({ question: question.data, facts: r.facts, findings, products: (products ?? []).map((p) => ({ title: p.title, hasPrice: p.price_amount != null, descriptionLength: (p.description ?? "").length, materials: p.materials })) }) },
      ],
      { model: "explain", maxTokens: 1500 },
    );
    // Keep line breaks for numbered steps; drop links and markdown emphasis.
    const advice = reply.replace(/\bhttps?:\/\/\S+/gi, "").replace(/\*\*/g, "").trim().slice(0, 1800);
    return { findings, advice: advice || null };
  } catch (err) {
    if (!(err instanceof ProviderUnavailableError)) throw err;
    return { findings, advice: null };
  }
}
