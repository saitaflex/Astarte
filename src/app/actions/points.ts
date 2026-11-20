"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";

const Activity = z.enum(["profile_discovery", "post_read", "sponsored_video"]);

/** Starts a server-timed engagement session. Only signed-in customers earn points. */
export async function startEngagement(activity: string, targetId: string): Promise<{ sessionId?: string; error?: string }> {
  const user = await getSessionUser();
  if (!user || user.role !== "customer") return { error: "not_customer" };
  const a = Activity.safeParse(activity);
  const t = z.string().uuid().safeParse(targetId);
  if (!a.success || !t.success) return { error: "invalid" };
  const db = await supabaseServer();
  const { data, error } = await db.rpc("start_engagement", { p_activity: a.data, p_target: t.data });
  if (error) return { error: error.message };
  return { sessionId: data as string };
}

/** Completes a session. The database checks the elapsed time, limits and duplicates. */
export async function completeEngagement(sessionId: string): Promise<{ points: number; error?: string }> {
  if (!z.string().uuid().safeParse(sessionId).success) return { points: 0, error: "invalid" };
  const db = await supabaseServer();
  const { data, error } = await db.rpc("complete_engagement", { p_session: sessionId });
  if (error) return { points: 0, error: error.message };
  revalidatePath("/[locale]/points", "page");
  return { points: (data as number) ?? 0 };
}

export async function redeemOfferAction(form: FormData): Promise<void> {
  const offerId = z.string().uuid().safeParse(form.get("offerId"));
  const locale = String(form.get("locale") ?? "en");
  if (!offerId.success) return;
  const db = await supabaseServer();
  const { error } = await db.rpc("redeem_offer", { p_offer: offerId.data });
  const { redirect } = await import("next/navigation");
  redirect(`/${locale}/points?${error ? `error=${encodeURIComponent(error.message)}` : "redeemed=1"}`);
}
