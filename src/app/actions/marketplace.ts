"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { supabaseServer } from "@/lib/supabase/server";

const loc = (form: FormData) => {
  const v = String(form.get("locale") ?? "en");
  return isLocale(v) ? v : "en";
};

async function requireCustomer(locale: string, next: string) {
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/sign-in?next=${encodeURIComponent(next)}`);
  if (user.role !== "customer") redirect(`${next}${next.includes("?") ? "&" : "?"}error=customers_only`);
  return user;
}

export async function addToCartAction(form: FormData) {
  const locale = loc(form);
  const productId = z.string().uuid().parse(form.get("productId"));
  const back = `/${locale}/marketplace/${productId}`;
  const user = await requireCustomer(locale, back);
  const db = await supabaseServer();
  const { data: existing } = await db.from("shopping_cart_items").select("quantity").eq("customer_id", user.id).eq("product_id", productId).maybeSingle();
  const quantity = Math.min(20, (existing?.quantity ?? 0) + 1);
  const { error } = await db.from("shopping_cart_items").upsert({ customer_id: user.id, product_id: productId, quantity });
  if (error) redirect(`${back}?error=cart`);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/cart`);
}

export async function updateCartAction(form: FormData) {
  const locale = loc(form);
  const user = await requireCustomer(locale, `/${locale}/cart`);
  const productId = z.string().uuid().parse(form.get("productId"));
  const quantity = z.coerce.number().int().min(0).max(20).parse(form.get("quantity"));
  const db = await supabaseServer();
  if (quantity === 0) await db.from("shopping_cart_items").delete().eq("customer_id", user.id).eq("product_id", productId);
  else await db.from("shopping_cart_items").update({ quantity }).eq("customer_id", user.id).eq("product_id", productId);
  revalidatePath(`/${locale}`, "layout");
}

const Checkout = z.object({
  fulfilment: z.enum(["pickup", "local_delivery", "shipping"]),
  city: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(1000).optional().default(""),
  payment: z.enum(["pay_artist_directly", "cash_on_delivery", "bank_transfer"]),
});

export async function placeOrderAction(form: FormData) {
  const locale = loc(form);
  await requireCustomer(locale, `/${locale}/cart`);
  const parsed = Checkout.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`/${locale}/cart?error=${encodeURIComponent("Please choose how you want to receive your order.")}`);
  if (parsed.data.fulfilment !== "pickup" && !parsed.data.city) redirect(`/${locale}/cart?error=${encodeURIComponent("Please enter your city for delivery.")}`);
  const db = await supabaseServer();
  const { error } = await db.rpc("place_order", {
    p_fulfilment: parsed.data.fulfilment,
    p_city: parsed.data.city,
    p_note: parsed.data.note,
    p_payment: parsed.data.payment,
  });
  if (error) redirect(`/${locale}/cart?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/account?ordered=1`);
}

/** Artists move their own orders forward; customers can cancel a requested order. Checked in the database. */
export async function updateOrderStatusAction(form: FormData) {
  const locale = loc(form);
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/sign-in`);
  const orderId = z.string().uuid().parse(form.get("orderId"));
  const status = z.enum(["confirmed", "in_progress", "ready", "shipped", "completed", "cancelled", "refunded"]).optional().safeParse(form.get("status") || undefined);
  const payment = z.enum(["unpaid", "paid_offline", "refunded_offline"]).optional().safeParse(form.get("payment") || undefined);
  const note = z.string().trim().max(1000).optional().parse(form.get("note") || undefined);
  const db = await supabaseServer();
  const { error } = await db.rpc("update_order_status", {
    p_order: orderId,
    p_status: status.success ? (status.data ?? null) : null,
    p_note: note ?? null,
    p_payment_status: payment.success ? (payment.data ?? null) : null,
  });
  const back = user.role === "artist" ? `/${locale}/studio/orders` : `/${locale}/account`;
  redirect(error ? `${back}?error=${encodeURIComponent(error.message)}` : back);
}

export async function toggleFavoriteAction(form: FormData) {
  const locale = loc(form);
  const productId = z.string().uuid().optional().safeParse(form.get("productId") || undefined);
  const artistId = z.string().uuid().optional().safeParse(form.get("artistId") || undefined);
  const back = String(form.get("back") ?? `/${locale}/marketplace`);
  const safeBack = back.startsWith(`/${locale}/`) ? back : `/${locale}/marketplace`;
  const user = await requireCustomer(locale, safeBack);
  const db = await supabaseServer();
  const column = productId.success && productId.data ? "product_id" : "artist_id";
  const value = productId.success && productId.data ? productId.data : artistId.success ? artistId.data : undefined;
  if (!value) redirect(safeBack);
  const { data: existing } = await db.from("favorites").select("id").eq("customer_id", user.id).eq(column, value).maybeSingle();
  if (existing) await db.from("favorites").delete().eq("id", existing.id);
  else await db.from("favorites").insert({ customer_id: user.id, [column]: value });
  revalidatePath(safeBack);
  redirect(safeBack);
}

const CustomRequest = z.object({
  artistId: z.string().uuid(),
  what: z.string().trim().min(10, "Please describe what you are looking for.").max(1500),
  dimensions: z.string().trim().max(200).optional().default(""),
  budget: z.coerce.number().min(0).max(1_000_000).optional(),
  deadline: z.string().optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
});

/** A custom order is a brief the artist answers. The artist decides what to create. */
export async function requestCustomWorkAction(form: FormData) {
  const locale = loc(form);
  const slug = String(form.get("slug") ?? "");
  const back = `/${locale}/artists/${slug}/request`;
  const user = await requireCustomer(locale, back);
  const raw = Object.fromEntries(form);
  const parsed = CustomRequest.safeParse({ ...raw, budget: raw.budget === "" ? undefined : raw.budget });
  if (!parsed.success) redirect(`${back}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Please check the form.")}`);
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(parsed.data.deadline) ? parsed.data.deadline : null;
  const db = await supabaseServer();
  const { error } = await db.from("project_requests").insert({
    customer_id: user.id,
    artist_id: parsed.data.artistId,
    brief: { what: parsed.data.what, dimensions: parsed.data.dimensions || null, city: parsed.data.city || null },
    budget_amount: parsed.data.budget ?? null,
    deadline,
  });
  if (error) redirect(`${back}?error=${encodeURIComponent("We could not send the request.")}`);
  redirect(`/${locale}/account?requested=1`);
}

export async function respondToRequestAction(form: FormData) {
  const locale = loc(form);
  const user = await getSessionUser();
  if (!user || user.role !== "artist") redirect(`/${locale}/sign-in`);
  const id = z.string().uuid().parse(form.get("requestId"));
  const status = z.enum(["in_discussion", "accepted", "declined", "in_progress", "completed"]).parse(form.get("status"));
  const reply = z.string().trim().max(1500).optional().parse(form.get("reply") || undefined);
  const db = await supabaseServer();
  // RLS limits this update to requests addressed to the signed-in artist.
  await db.from("project_requests").update({ status, ...(reply ? { artist_reply: reply } : {}) }).eq("id", id).eq("artist_id", user.artistId!);
  revalidatePath(`/${locale}/studio/orders`);
  redirect(`/${locale}/studio/orders`);
}
