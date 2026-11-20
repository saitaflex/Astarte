"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { CATEGORY_BY_SLUG } from "@/lib/data/categories";
import { TUNISIAN_CITIES } from "@/lib/data/cities";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, processImage, stateFromSignals } from "@/lib/images/process";
import { isLocale } from "@/lib/i18n/config";
import { rateLimit } from "@/lib/security/rate-limit";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const loc = (form: FormData) => {
  const v = String(form.get("locale") ?? "en");
  return isLocale(v) ? v : "en";
};

async function requireArtist(locale: string): Promise<SessionUser & { artistId: string }> {
  const user = await getSessionUser();
  if (!user || user.role !== "artist" || !user.artistId || user.status !== "active") redirect(`/${locale}/sign-in`);
  return user as SessionUser & { artistId: string };
}

const list = (v: FormDataEntryValue | null, max = 12) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);

const bad = (path: string, msg: string): never => redirect(`${path}?error=${encodeURIComponent(msg)}`);

// ---------- profile ----------
const Profile = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(2000),
  availability: z.enum(["accepting", "limited", "not_accepting"]),
  city: z.string().refine((c) => TUNISIAN_CITIES.some((x) => x.name === c)),
  privacy: z.enum(["public_workshop", "approximate_city", "service_area", "hidden"]),
  radius: z.coerce.number().int().min(1).max(500).optional(),
});

export async function updateProfileAction(form: FormData) {
  const locale = loc(form);
  const user = await requireArtist(locale);
  const path = `/${locale}/studio/profile`;
  const p = Profile.safeParse({ ...Object.fromEntries(form), radius: form.get("radius") || undefined });
  if (!p.success) bad(path, "Please check the form.");
  const data = p.data!;
  const categories = form.getAll("categories").map(String).filter((c) => CATEGORY_BY_SLUG.has(c)).slice(0, 4);
  const primary = String(form.get("primary") ?? "");
  if (!CATEGORY_BY_SLUG.has(primary)) bad(path, "Please choose your main discipline.");

  const contacts = (["email", "phone", "whatsapp", "instagram", "website"] as const)
    .map((channel) => ({ channel, value: String(form.get(`contact_${channel}`) ?? "").trim().slice(0, 120), public: form.get(`public_${channel}`) === "on" }))
    .filter((c) => c.value);

  const db = await supabaseServer();
  const { error } = await db
    .from("artist_profiles")
    .update({
      display_name: data.displayName,
      bio: data.bio,
      availability: data.availability,
      accepts_commissions: form.get("commissions") === "on",
      specialties: list(form.get("specialties"), 8),
      primary_category: primary,
      contact: contacts,
    })
    .eq("id", user.artistId);
  if (error) bad(path, "Could not save the profile.");

  await db.from("artist_categories").delete().eq("artist_id", user.artistId);
  await db.from("artist_categories").insert([...new Set([primary, ...categories])].map((c) => ({ artist_id: user.artistId, category_slug: c })));

  const city = TUNISIAN_CITIES.find((c) => c.name === data.city)!;
  // A public workshop point may be given precisely; otherwise we use the public city centre.
  const lat = data.privacy === "public_workshop" ? Number(form.get("lat")) || city.lat : city.lat;
  const lng = data.privacy === "public_workshop" ? Number(form.get("lng")) || city.lng : city.lng;
  await db.from("locations").upsert({
    artist_id: user.artistId, city: city.name, region: city.region, lat, lng, privacy: data.privacy,
    service_radius_km: data.privacy === "service_area" ? (data.radius ?? 50) : null,
  });
  revalidatePath(`/${locale}`, "layout");
  redirect(`${path}?saved=1`);
}

// ---------- products ----------
const ProductForm = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2, "Please add a title.").max(120),
  description: z.string().trim().max(4000),
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  availability: z.enum(["in_stock", "made_to_order", "unavailable"]),
  stock: z.coerce.number().int().min(0).max(100_000).optional(),
  status: z.enum(["draft", "published", "archived"]),
});

export async function saveProductAction(form: FormData) {
  const locale = loc(form);
  const user = await requireArtist(locale);
  const raw = Object.fromEntries(form);
  const p = ProductForm.safeParse({
    ...raw,
    id: raw.id || undefined,
    price: raw.price === "" ? undefined : raw.price,
    stock: raw.stock === "" ? undefined : raw.stock,
  });
  const back = raw.id ? `/${locale}/studio/products/${raw.id}` : `/${locale}/studio/products/new`;
  if (!p.success) bad(back, p.error!.issues[0]?.message ?? "Please check the form.");
  const d = p.data!;
  const delivery = form.getAll("delivery").map(String).filter((x) => ["pickup", "local_delivery", "shipping"].includes(x));
  const categories = form.getAll("categories").map(String).filter((c) => CATEGORY_BY_SLUG.has(c)).slice(0, 3);
  if (categories.length === 0) bad(back, "Please choose at least one category.");

  const row = {
    artist_id: user.artistId,
    title: d.title,
    description: d.description,
    price_amount: d.price ?? null,
    availability: d.availability,
    stock: d.stock ?? null,
    materials: list(form.get("materials"), 10),
    delivery_options: delivery.length ? delivery : ["pickup"],
    delivery_note: String(form.get("deliveryNote") ?? "").slice(0, 300) || null,
    status: d.status,
  };
  const db = await supabaseServer();
  const res = d.id
    ? await db.from("products").update(row).eq("id", d.id).eq("artist_id", user.artistId).select("id").single()
    : await db.from("products").insert(row).select("id").single();
  if (res.error || !res.data) bad(back, "Could not save the product.");
  const id = res.data!.id as string;
  await db.from("product_categories").delete().eq("product_id", id);
  await db.from("product_categories").insert(categories.map((c) => ({ product_id: id, category_slug: c })));
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/studio/products/${id}?saved=1`);
}

export async function deleteProductAction(form: FormData) {
  const locale = loc(form);
  const user = await requireArtist(locale);
  const id = z.string().uuid().parse(form.get("id"));
  const db = await supabaseServer();
  // Products with orders are archived (order history keeps its snapshot); others are deleted.
  const { count } = await db.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id);
  if (count) await db.from("products").update({ status: "archived" }).eq("id", id).eq("artist_id", user.artistId);
  else await db.from("products").delete().eq("id", id).eq("artist_id", user.artistId);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/studio/products`);
}

// ---------- images ----------
/** Step 1: validate the declared file and hand out a one-time signed upload URL. */
export async function createImageUpload(locale: string, mime: string, size: number): Promise<{ path?: string; token?: string; error?: string }> {
  const user = await requireArtist(isLocale(locale) ? locale : "en");
  if (!rateLimit(`upload:${user.id}`, 30, 60 * 60_000)) return { error: "Too many uploads in an hour. Please wait a little." };
  if (!(ALLOWED_MIME as readonly string[]).includes(mime)) return { error: "Only JPEG, PNG or WebP images are accepted." };
  if (size <= 0 || size > MAX_UPLOAD_BYTES) return { error: "Images must be smaller than 10 MB." };
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const path = `${user.artistId}/${randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin().storage.from("originals").createSignedUploadUrl(path);
  if (error || !data) return { error: "Upload is not available right now." };
  return { path, token: data.token };
}

/** Step 2: re-check the real file, strip metadata, record evidence and queue it for human review. */
export async function finalizeImageUpload(locale: string, path: string, productId: string | null, caption: string): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireArtist(isLocale(locale) ? locale : "en");
  if (!path.startsWith(`${user.artistId}/`) || path.includes("..")) return { error: "Invalid upload." };
  const admin = supabaseAdmin();
  if (productId) {
    const { data: owned } = await admin.from("products").select("id").eq("id", productId).eq("artist_id", user.artistId).maybeSingle();
    if (!owned) return { error: "Invalid product." };
  }
  const { data: blob, error: dlErr } = await admin.storage.from("originals").download(path);
  if (dlErr || !blob) return { error: "Upload not found." };

  let processed;
  try {
    processed = await processImage(Buffer.from(await blob.arrayBuffer()));
  } catch (err) {
    await admin.storage.from("originals").remove([path]);
    return { error: err instanceof Error ? err.message : "Invalid image." };
  }

  const imageId = randomUUID();
  const webPath = `web/${user.artistId}/${imageId}.webp`;
  const up = await admin.storage.from("originals").upload(webPath, processed.web, { contentType: "image/webp" });
  if (up.error) return { error: "Could not store the image." };

  const detector = process.env.IMAGE_DETECTION_PROVIDER?.trim();
  const state = stateFromSignals(processed.signals);
  const { error } = await admin.from("portfolio_images").insert({
    id: imageId, artist_id: user.artistId, product_id: productId, original_path: path, web_path: webPath,
    mime: processed.mime, size_bytes: processed.sizeBytes, width: processed.width, height: processed.height,
    sha256: processed.sha256, caption: caption.slice(0, 200) || null, authenticity_state: state,
  });
  if (error) return { error: "Could not save the image." };
  await admin.from("authenticity_assessments").insert({
    image_id: imageId,
    provider: detector || "metadata-only",
    model_id: detector ? null : "none",
    model_version: "signals-v1",
    state,
    score: null,
    score_calibrated: false,
    signals: processed.signals,
    note: detector
      ? "Detector configured but not yet integrated in this build."
      : "No AI-image detector is configured. This assessment uses file metadata only and cannot confirm how the image was made.",
  });
  // Describe the picture for search (best effort; search still works without it).
  const { data: signed } = await admin.storage.from("originals").createSignedUrl(webPath, 300);
  if (signed?.signedUrl) {
    const { describeImage } = await import("@/lib/ai/vision");
    const d = await describeImage(signed.signedUrl);
    if (d) await admin.from("portfolio_images").update({ ai_description: d.description, tags: d.tags, described_by: d.model }).eq("id", imageId);
  }
  revalidatePath(`/${locale}/studio`, "layout");
  return { ok: true };
}

export async function deleteImageAction(form: FormData) {
  const locale = loc(form);
  const user = await requireArtist(locale);
  const id = z.string().uuid().parse(form.get("id"));
  const admin = supabaseAdmin();
  const { data: img } = await admin.from("portfolio_images").select("*").eq("id", id).eq("artist_id", user.artistId).maybeSingle();
  if (img) {
    await admin.storage.from("originals").remove([img.original_path, img.web_path].filter(Boolean));
    if (img.public_path) await admin.storage.from("public-images").remove([img.public_path]);
    await admin.from("portfolio_images").delete().eq("id", id);
  }
  revalidatePath(`/${locale}`, "layout");
  redirect(String(form.get("back") ?? `/${locale}/studio/products`));
}

// ---------- posts, offers, events ----------
export async function createPostAction(form: FormData) {
  const locale = loc(form);
  const user = await requireArtist(locale);
  const p = z
    .object({ title: z.string().trim().min(3).max(140), body: z.string().trim().min(40, "Posts need at least 40 characters.").max(6000), kind: z.enum(["journey", "technique", "product", "workshop", "inspiration", "upcoming"]) })
    .safeParse(Object.fromEntries(form));
  if (!p.success) bad(`/${locale}/studio/posts`, p.error!.issues[0]?.message ?? "Please check the post.");
  const db = await supabaseServer();
  await db.from("artist_posts").insert({ artist_id: user.artistId, ...p.data! });
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/studio/posts?saved=1`);
}

export async function deletePostAction(form: FormData) {
  const locale = loc(form);
  const user = await requireArtist(locale);
  const db = await supabaseServer();
  await db.from("artist_posts").delete().eq("id", z.string().uuid().parse(form.get("id"))).eq("artist_id", user.artistId);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/studio/posts`);
}

export async function createOfferAction(form: FormData) {
  const locale = loc(form);
  const user = await requireArtist(locale);
  const raw = Object.fromEntries(form);
  const p = z
    .object({
      title: z.string().trim().min(3).max(120),
      description: z.string().trim().max(1000),
      conditions: z.string().trim().max(500),
      points: z.coerce.number().int().min(10).max(100000),
      quantity: z.coerce.number().int().min(1).max(10000).optional(),
      days: z.coerce.number().int().min(1).max(365),
    })
    .safeParse({ ...raw, quantity: raw.quantity === "" ? undefined : raw.quantity });
  if (!p.success) bad(`/${locale}/studio/offers`, "Please check the offer.");
  const db = await supabaseServer();
  await db.from("reward_offers").insert({
    artist_id: user.artistId, title: p.data!.title, description: p.data!.description, conditions: p.data!.conditions,
    points_cost: p.data!.points, quantity: p.data!.quantity ?? null, expires_at: new Date(Date.now() + p.data!.days * 86_400_000).toISOString(),
    status: "pending_review", created_by: user.id,
  });
  redirect(`/${locale}/studio/offers?saved=1`);
}

export async function createEventAction(form: FormData) {
  const locale = loc(form);
  const user = await requireArtist(locale);
  const raw = Object.fromEntries(form);
  const p = z
    .object({
      title: z.string().trim().min(3).max(140),
      description: z.string().trim().max(2000),
      type: z.enum(["workshop", "masterclass", "exhibition", "open_studio", "market", "performance", "commission_day"]),
      startsAt: z.string().min(10),
      hours: z.coerce.number().min(0.5).max(240),
      city: z.string().trim().max(80).optional().default(""),
      onlineUrl: z.string().trim().url().optional(),
      price: z.coerce.number().min(0).max(100000).optional(),
      capacity: z.coerce.number().int().min(1).max(100000).optional(),
    })
    .safeParse({ ...raw, onlineUrl: raw.onlineUrl || undefined, price: raw.price === "" ? undefined : raw.price, capacity: raw.capacity === "" ? undefined : raw.capacity });
  if (!p.success) bad(`/${locale}/studio/events`, p.error!.issues[0]?.message ?? "Please check the event.");
  const d = p.data!;
  // datetime-local has no zone: interpret it as Tunisia time (UTC+1, no DST).
  const start = new Date(`${d.startsAt}:00+01:00`);
  if (Number.isNaN(start.getTime()) || start < new Date()) bad(`/${locale}/studio/events`, "Please choose a future date.");
  const online = form.get("online") === "on";
  const { data: artist } = await supabaseAdmin().from("artist_profiles").select("primary_category").eq("id", user.artistId).single();
  const db = await supabaseServer();
  const { error } = await db.from("events").insert({
    artist_id: user.artistId,
    slug: `${d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${randomUUID().slice(0, 6)}`,
    title: d.title, description: d.description, type: d.type,
    starts_at: start.toISOString(), ends_at: new Date(start.getTime() + d.hours * 3_600_000).toISOString(),
    is_online: online, online_url: online ? (d.onlineUrl ?? null) : null, city: online ? null : d.city || null,
    pricing_mode: d.price ? "paid_pay_organizer" : "free", price_amount: d.price ?? null, capacity: d.capacity ?? null,
    categories: artist ? [artist.primary_category] : [], status: "published",
  });
  if (error) bad(`/${locale}/studio/events`, "Could not publish the event.");
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/studio/events?saved=1`);
}
