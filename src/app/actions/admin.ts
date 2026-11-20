"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit, getSessionUser } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const loc = (form: FormData) => {
  const v = String(form.get("locale") ?? "en");
  return isLocale(v) ? v : "en";
};

/** Every admin action re-checks the role on the server. The UI hiding buttons is not security. */
async function requireAdmin(locale: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin" || user.status !== "active") redirect(`/${locale}/sign-in`);
  return user;
}

const back = (form: FormData, locale: string, fallback: string) => {
  const b = String(form.get("back") ?? "");
  return b.startsWith(`/${locale}/admin`) ? b : `/${locale}/admin/${fallback}`;
};

// ---------- artists ----------
export async function decideArtistAction(form: FormData) {
  const locale = loc(form);
  const admin = await requireAdmin(locale);
  const id = z.string().uuid().parse(form.get("artistId"));
  const decision = z.enum(["approved", "rejected", "changes_requested"]).parse(form.get("decision"));
  const note = String(form.get("note") ?? "").slice(0, 1000);
  const db = await supabaseServer();
  await db.from("artist_profiles").update({ approval_status: decision }).eq("id", id);
  await db.from("moderation_reviews").insert({
    reviewer_id: admin.id, target_type: "artist_profile", target_id: id,
    decision: decision === "approved" ? "approve" : decision === "rejected" ? "reject" : "request_changes", internal_note: note || null,
  });
  await audit(admin.id, `artist.${decision}`, "artist_profile", id, { note });
  revalidatePath(`/${locale}`, "layout");
  redirect(back(form, locale, "artists"));
}

export async function setVerificationAction(form: FormData) {
  const locale = loc(form);
  const admin = await requireAdmin(locale);
  const id = z.string().uuid().parse(form.get("artistId"));
  const status = z.enum(["verified", "not_requested", "pending"]).parse(form.get("status"));
  const db = await supabaseServer();
  await db.from("artist_profiles").update({ verification_status: status }).eq("id", id);
  await audit(admin.id, `artist.verification.${status}`, "artist_profile", id);
  revalidatePath(`/${locale}`, "layout");
  redirect(back(form, locale, "artists"));
}

export async function setUserStatusAction(form: FormData) {
  const locale = loc(form);
  const admin = await requireAdmin(locale);
  const id = z.string().uuid().parse(form.get("userId"));
  const status = z.enum(["active", "suspended"]).parse(form.get("status"));
  const reason = String(form.get("reason") ?? "").trim();
  if (id === admin.id) redirect(`${back(form, locale, "users")}?error=${encodeURIComponent("You cannot suspend yourself.")}`);
  if (status === "suspended" && reason.length < 5) redirect(`${back(form, locale, "users")}?error=${encodeURIComponent("Please give a reason.")}`);
  const db = await supabaseServer();
  await db.from("profiles").update({ status }).eq("id", id);
  if (status === "suspended") await supabaseAdmin().auth.admin.signOut(id).catch(() => undefined);
  await audit(admin.id, status === "suspended" ? "user.suspend" : "user.restore", "profile", id, { reason });
  revalidatePath(`/${locale}`, "layout");
  redirect(back(form, locale, "users"));
}

// ---------- images ----------
export async function moderateImageAction(form: FormData) {
  const locale = loc(form);
  const admin = await requireAdmin(locale);
  const id = z.string().uuid().parse(form.get("imageId"));
  const decision = z.enum(["approve", "reject", "request_changes", "mark_uncertain"]).parse(form.get("decision"));
  const note = String(form.get("note") ?? "").slice(0, 1000);
  const service = supabaseAdmin();
  const { data: img } = await service.from("portfolio_images").select("*").eq("id", id).single();
  if (!img) redirect(back(form, locale, "images"));
  const { data: assessment } = await service.from("authenticity_assessments").select("id").eq("image_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const update: Record<string, unknown> = {};
  if (decision === "approve") {
    // Publish the metadata-stripped copy to the public bucket.
    const publicPath = `${img.artist_id}/${img.id}.webp`;
    const { data: blob } = await service.storage.from("originals").download(img.web_path);
    if (blob) {
      await service.storage.from("public-images").upload(publicPath, Buffer.from(await blob.arrayBuffer()), { contentType: "image/webp", upsert: true });
      update.public_path = publicPath;
      update.moderation_status = "approved";
    }
  } else if (decision === "reject" || decision === "request_changes") {
    if (img.public_path) await service.storage.from("public-images").remove([img.public_path]);
    update.public_path = null;
    update.moderation_status = decision === "reject" ? "rejected" : "changes_requested";
  } else {
    // Human reviewer's judgement on origin, recorded separately from the model output.
    update.authenticity_state = "uncertain";
  }
  await service.from("portfolio_images").update(update).eq("id", id);
  await service.from("moderation_reviews").insert({ reviewer_id: admin.id, target_type: "portfolio_image", target_id: id, decision, internal_note: note || null, assessment_id: assessment?.id ?? null });
  await audit(admin.id, `image.${decision}`, "portfolio_image", id, { note });
  revalidatePath(`/${locale}`, "layout");
  redirect(back(form, locale, "images"));
}

/** Stores a detector result produced in the admin's browser. Evidence only: it never changes moderation status. */
export async function recordDetectionAction(imageId: string, artificial: number) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin" || admin.status !== "active") throw new Error("admin only");
  const id = z.string().uuid().parse(imageId);
  const p = z.number().min(0).max(1).parse(artificial);
  const { DETECTOR } = await import("@/lib/images/detector");
  const state = p >= DETECTOR.threshold ? "ai_indicators" : "uncertain";
  const service = supabaseAdmin();
  await service.from("authenticity_assessments").insert({
    image_id: id, provider: DETECTOR.provider, model_id: DETECTOR.model, model_version: DETECTOR.dtype, state,
    score: Number(p.toFixed(4)), score_calibrated: false,
    signals: { artificial: Number(p.toFixed(4)), human: Number((1 - p).toFixed(4)), ranBy: "admin-browser" },
    note: `Swin classifier (${DETECTOR.license}). Uncalibrated: high scores also occur on real photos (e.g. stage lighting). Assessment only, not proof.`,
  });
  await service.from("portfolio_images").update({ authenticity_state: state }).eq("id", id);
  await audit(admin.id, "image.detector_run", "portfolio_image", id, { artificial: p });
}

// ---------- events ----------
export async function decideEventAction(form: FormData) {
  const locale = loc(form);
  const admin = await requireAdmin(locale);
  const id = z.string().uuid().parse(form.get("eventId"));
  const status = z.enum(["published", "rejected", "cancelled"]).parse(form.get("status"));
  const db = await supabaseServer();
  await db.from("events").update({ status }).eq("id", id);
  await audit(admin.id, `event.${status}`, "event", id);
  revalidatePath(`/${locale}`, "layout");
  redirect(back(form, locale, "content"));
}

// ---------- Point Merci ----------
export async function createCampaignAction(form: FormData) {
  const locale = loc(form);
  const admin = await requireAdmin(locale);
  const p = z
    .object({
      sponsor: z.string().trim().min(2).max(80),
      title: z.string().trim().min(3).max(120),
      description: z.string().trim().max(500),
      videoUrl: z.string().trim().url().startsWith("https://"),
      seconds: z.coerce.number().int().min(5).max(600),
      points: z.coerce.number().int().min(1).max(500),
      budget: z.coerce.number().int().min(1).max(1_000_000),
      days: z.coerce.number().int().min(1).max(365),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success) redirect(`/${locale}/admin/points?error=${encodeURIComponent(p.error.issues[0]?.message ?? "Check the campaign.")}`);
  const db = await supabaseServer();
  const { data } = await db
    .from("sponsored_campaigns")
    .insert({
      sponsor_name: p.data.sponsor, title: p.data.title, description: p.data.description, video_url: p.data.videoUrl,
      min_seconds: p.data.seconds, points: p.data.points, budget_points: p.data.budget,
      ends_at: new Date(Date.now() + p.data.days * 86_400_000).toISOString(), status: "pending_review", created_by: admin.id,
    })
    .select("id")
    .single();
  await audit(admin.id, "campaign.create", "campaign", data?.id ?? "", { sponsor: p.data.sponsor });
  redirect(`/${locale}/admin/points`);
}

export async function setCampaignStatusAction(form: FormData) {
  const locale = loc(form);
  const admin = await requireAdmin(locale);
  const id = z.string().uuid().parse(form.get("id"));
  const status = z.enum(["active", "paused", "ended", "rejected"]).parse(form.get("status"));
  const db = await supabaseServer();
  await db.from("sponsored_campaigns").update({ status }).eq("id", id);
  await audit(admin.id, `campaign.${status}`, "campaign", id);
  redirect(`/${locale}/admin/points`);
}

export async function decideOfferAction(form: FormData) {
  const locale = loc(form);
  const admin = await requireAdmin(locale);
  const id = z.string().uuid().parse(form.get("id"));
  const status = z.enum(["active", "rejected", "paused"]).parse(form.get("status"));
  const db = await supabaseServer();
  await db.from("reward_offers").update({ status }).eq("id", id);
  await db.from("moderation_reviews").insert({ reviewer_id: admin.id, target_type: "reward_offer", target_id: id, decision: status === "active" ? "approve" : "reject" });
  await audit(admin.id, `offer.${status}`, "reward_offer", id);
  redirect(`/${locale}/admin/points`);
}

export async function adjustPointsAction(form: FormData) {
  const locale = loc(form);
  await requireAdmin(locale);
  const p = z
    .object({ email: z.string().trim().toLowerCase().email(), amount: z.coerce.number().int().min(-100000).max(100000).refine((n) => n !== 0), reason: z.string().trim().min(5).max(300) })
    .safeParse(Object.fromEntries(form));
  if (!p.success) redirect(`/${locale}/admin/points?error=${encodeURIComponent("Email, a non-zero amount and a reason are required.")}`);
  const { data: list } = await supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
  const target = list?.users.find((u) => u.email?.toLowerCase() === p.data.email);
  if (!target) redirect(`/${locale}/admin/points?error=${encodeURIComponent("No user with that email.")}`);
  const db = await supabaseServer();
  // The SQL function re-checks admin rights and writes both the ledger entry and the audit log.
  const { error } = await db.rpc("admin_adjust_points", { p_customer: target.id, p_amount: p.data.amount, p_reason: p.data.reason });
  redirect(`/${locale}/admin/points?${error ? `error=${encodeURIComponent(error.message)}` : "adjusted=1"}`);
}

// ---------- incubation ----------
export async function decideApplicationAction(form: FormData) {
  const locale = loc(form);
  await requireAdmin(locale);
  const id = z.string().uuid().parse(form.get("id"));
  // Never default to a decision: a missing value must fail, not silently reject.
  const accept = z.enum(["accept", "reject"]).parse(form.get("decision")) === "accept";
  const mentor = String(form.get("mentor") ?? "").slice(0, 120);
  const db = await supabaseServer();
  const { error } = await db.rpc("decide_incubation_application", { p_application: id, p_accept: accept, p_mentor: mentor });
  redirect(`/${locale}/admin/grow${error ? `?error=${encodeURIComponent(error.message)}` : ""}`);
}

export async function createWorkshopAction(form: FormData) {
  const locale = loc(form);
  const admin = await requireAdmin(locale);
  const p = z
    .object({
      title: z.string().trim().min(3).max(140),
      description: z.string().trim().max(1000),
      host: z.string().trim().min(2).max(120),
      topic: z.enum(["marketing", "photography", "pricing", "entrepreneurship", "networking", "craft"]),
      startsAt: z.string().min(10),
      hours: z.coerce.number().min(0.5).max(48),
      city: z.string().trim().max(80).optional().default(""),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success) redirect(`/${locale}/admin/grow?error=${encodeURIComponent("Please check the workshop.")}`);
  const start = new Date(`${p.data.startsAt}:00+01:00`);
  const db = await supabaseServer();
  const { data } = await db
    .from("workshops")
    .insert({
      title: p.data.title, description: p.data.description, host: p.data.host, topic: p.data.topic,
      starts_at: start.toISOString(), ends_at: new Date(start.getTime() + p.data.hours * 3_600_000).toISOString(),
      is_online: form.get("online") === "on", city: p.data.city || null,
    })
    .select("id")
    .single();
  await audit(admin.id, "workshop.create", "workshop", data?.id ?? "");
  redirect(`/${locale}/admin/grow`);
}
