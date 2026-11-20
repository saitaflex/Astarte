import "server-only";
import { requireRole } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";
import { supabaseServer } from "@/lib/supabase/server";

export async function adminContext(locale: Locale) {
  const user = await requireRole(locale, ["admin"]);
  const db = await supabaseServer();
  const [artists, images, offers, apps, events] = await Promise.all([
    db.from("artist_profiles").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
    db.from("portfolio_images").select("id", { count: "exact", head: true }).eq("moderation_status", "pending"),
    db.from("reward_offers").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    db.from("incubation_applications").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    db.from("events").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
  ]);
  return { user, db, badges: { artists: artists.count ?? 0, images: images.count ?? 0, points: offers.count ?? 0, grow: apps.count ?? 0, content: events.count ?? 0 } };
}

export function adminNav(locale: Locale, b: { artists: number; images: number; points: number; grow: number; content: number }) {
  const p = `/${locale}/admin`;
  return [
    { href: p, label: "Overview" },
    { href: `${p}/artists`, label: "Artist registrations", badge: b.artists },
    { href: `${p}/images`, label: "Image review", badge: b.images },
    { href: `${p}/content`, label: "Events & listings", badge: b.content },
    { href: `${p}/points`, label: "Point Merci", badge: b.points },
    { href: `${p}/grow`, label: "Incubation", badge: b.grow },
    { href: `${p}/users`, label: "Users" },
    { href: `${p}/audit`, label: "Audit log" },
  ];
}
