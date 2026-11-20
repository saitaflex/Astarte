"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CATEGORY_BY_SLUG } from "@/lib/data/categories";
import { TUNISIAN_CITIES } from "@/lib/data/cities";
import { isLocale } from "@/lib/i18n/config";
import { rateLimit } from "@/lib/security/rate-limit";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  ok?: boolean;
}

async function clientKey(prefix: string) {
  const h = await headers();
  return `${prefix}:${h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}`;
}

const localeOf = (v: FormDataEntryValue | null) => (typeof v === "string" && isLocale(v) ? v : "en");

/** Only allow redirects to our own pages. */
function safeNext(value: FormDataEntryValue | null, locale: string, fallback: string) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith(`/${locale}/`) && !v.startsWith("//") ? v : `/${locale}/${fallback}`;
}

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `${base.length >= 3 ? base : "artist"}-${Math.random().toString(36).slice(2, 7)}`;
}

const Base = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  displayName: z.string().trim().min(2, "Please enter your name.").max(80),
});

const ArtistExtra = z.object({
  artistName: z.string().trim().min(2, "Please enter your artist or studio name.").max(80),
  category: z.string().refine((v) => CATEGORY_BY_SLUG.has(v), "Please choose your main discipline."),
  city: z.string().refine((v) => TUNISIAN_CITIES.some((c) => c.name === v), "Please choose your city."),
  privacy: z.enum(["approximate_city", "service_area", "hidden"]),
  bio: z.string().trim().max(2000).optional().default(""),
});

export async function signUpAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = localeOf(form.get("locale"));
  if (!rateLimit(await clientKey("signup"), 5, 10 * 60_000)) return { error: "Too many attempts. Please wait a few minutes." };

  const accountType = form.get("accountType") === "artist" ? "artist" : "customer";
  const base = Base.safeParse(Object.fromEntries(form));
  if (!base.success) return { error: base.error.issues[0]?.message ?? "Please check the form." };
  const extra = accountType === "artist" ? ArtistExtra.safeParse(Object.fromEntries(form)) : null;
  if (extra && !extra.success) return { error: extra.error.issues[0]?.message ?? "Please check the form." };
  if (form.get("consent") !== "on") return { error: "Please accept the terms and privacy notice." };

  const admin = supabaseAdmin();
  // MVP: accounts are confirmed on creation (no email verification step). See docs/MVP_BUILD_SPEC.md.
  const created = await admin.auth.admin.createUser({
    email: base.data.email,
    password: base.data.password,
    email_confirm: true,
    user_metadata: { display_name: base.data.displayName, account_type: accountType, locale },
  });
  if (created.error || !created.data.user) {
    const msg = created.error?.message ?? "";
    return { error: /already|registered|exists/i.test(msg) ? "An account with this email already exists. Please sign in." : "We could not create the account. Please try again." };
  }

  if (extra?.success) {
    const city = TUNISIAN_CITIES.find((c) => c.name === extra.data.city)!;
    const { data: artist, error } = await admin
      .from("artist_profiles")
      .insert({
        user_id: created.data.user.id,
        slug: slugify(extra.data.artistName),
        display_name: extra.data.artistName,
        bio: extra.data.bio,
        primary_category: extra.data.category,
        approval_status: "pending",
      })
      .select("id")
      .single();
    if (error || !artist) {
      await admin.auth.admin.deleteUser(created.data.user.id); // keep things consistent
      return { error: "We could not create the artist profile. Please try again." };
    }
    await admin.from("artist_categories").insert({ artist_id: artist.id, category_slug: extra.data.category });
    await admin.from("locations").insert({
      artist_id: artist.id,
      city: city.name,
      region: city.region,
      lat: city.lat,
      lng: city.lng,
      privacy: extra.data.privacy,
      service_radius_km: extra.data.privacy === "service_area" ? 50 : null,
    });
  }

  const db = await supabaseServer();
  const signIn = await db.auth.signInWithPassword({ email: base.data.email, password: base.data.password });
  if (signIn.error) redirect(`/${locale}/sign-in`);
  redirect(accountType === "artist" ? `/${locale}/studio?welcome=1` : safeNext(form.get("next"), locale, "account"));
}

export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = localeOf(form.get("locale"));
  if (!rateLimit(await clientKey("signin"), 10, 10 * 60_000)) return { error: "Too many attempts. Please wait a few minutes." };
  const parsed = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Please enter your email and password." };

  const db = await supabaseServer();
  const { data, error } = await db.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "Email or password is incorrect." };

  const { data: profile } = await db.from("profiles").select("role, status").eq("id", data.user.id).single();
  if (profile?.status === "suspended") {
    await db.auth.signOut();
    return { error: "This account is suspended. Please contact the Astarte team." };
  }
  const home = profile?.role === "admin" ? "admin" : profile?.role === "artist" ? "studio" : "account";
  redirect(safeNext(form.get("next"), locale, home));
}

export async function signOutAction(form: FormData) {
  const locale = localeOf(form.get("locale"));
  const db = await supabaseServer();
  await db.auth.signOut();
  redirect(`/${locale}`);
}
