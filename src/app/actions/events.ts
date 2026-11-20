"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { rateLimit } from "@/lib/security/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

/** Customers can suggest an artisan's event; it stays hidden until an admin approves it. */
export async function suggestEventAction(form: FormData) {
  const v = String(form.get("locale") ?? "en");
  const locale = isLocale(v) ? v : "en";
  const back = `/${locale}/discover?type=events`;
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/sign-in?next=${encodeURIComponent(back)}`);
  if (!rateLimit(`suggest:${user.id}`, 5, 24 * 60 * 60_000)) redirect(`${back}&error=${encodeURIComponent("You can suggest up to 5 events a day.")}`);
  const raw = Object.fromEntries(form);
  const p = z
    .object({
      artistId: z.string().uuid(),
      title: z.string().trim().min(3).max(140),
      description: z.string().trim().max(1500),
      type: z.enum(["workshop", "masterclass", "exhibition", "open_studio", "market", "performance", "commission_day"]),
      startsAt: z.string().min(10),
      city: z.string().trim().max(80).optional().default(""),
    })
    .safeParse(raw);
  if (!p.success) redirect(`${back}&error=${encodeURIComponent(p.error.issues[0]?.message ?? "Please check the event.")}`);
  const start = new Date(`${p.data.startsAt}:00+01:00`);
  if (Number.isNaN(start.getTime()) || start < new Date()) redirect(`${back}&error=${encodeURIComponent("Please choose a future date.")}`);
  const db = await supabaseServer();
  const { error } = await db.from("events").insert({
    artist_id: p.data.artistId,
    slug: `suggested-${randomUUID().slice(0, 8)}`,
    title: p.data.title,
    description: p.data.description,
    type: p.data.type,
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + 2 * 3_600_000).toISOString(),
    city: p.data.city || null,
    status: "pending_review",
    suggested_by: user.id,
  });
  redirect(`${back}&${error ? `error=${encodeURIComponent("Could not send the suggestion.")}` : "suggested=1"}`);
}
