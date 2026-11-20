import "server-only";
import { DashShell } from "@/components/dashboard/DashShell";
import { requireRole } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";
import { pick } from "@/lib/i18n/page";
import { supabaseServer } from "@/lib/supabase/server";

export async function studioContext(locale: Locale) {
  const user = await requireRole(locale, ["artist"]);
  const db = await supabaseServer();
  const { data: artist } = await db.from("artist_profiles").select("*").eq("user_id", user.id).single();
  const { count: newOrders } = await db.from("marketplace_orders").select("id", { count: "exact", head: true }).eq("status", "requested");
  const { count: newRequests } = await db.from("project_requests").select("id", { count: "exact", head: true }).eq("status", "submitted");
  return { user, artist, db, badges: { orders: (newOrders ?? 0) + (newRequests ?? 0) } };
}

export function studioNav(locale: Locale, badges: { orders: number }) {
  const b = `/${locale}/studio`;
  return [
    { href: b, label: pick(locale, { en: "Overview", fr: "Vue d'ensemble", ar: "نظرة عامة" }) },
    { href: `${b}/profile`, label: pick(locale, { en: "Profile", fr: "Profil", ar: "الملف" }) },
    { href: `${b}/products`, label: pick(locale, { en: "Works & photos", fr: "Œuvres & photos", ar: "الأعمال والصور" }) },
    { href: `${b}/orders`, label: pick(locale, { en: "Orders & requests", fr: "Commandes & demandes", ar: "الطلبات" }), badge: badges.orders },
    { href: `${b}/posts`, label: pick(locale, { en: "Stories", fr: "Histoires", ar: "القصص" }) },
    { href: `${b}/events`, label: pick(locale, { en: "Events", fr: "Événements", ar: "الفعاليات" }) },
    { href: `${b}/offers`, label: pick(locale, { en: "Point Merci offers", fr: "Offres Point Merci", ar: "عروض نقاط ميرسي" }) },
    { href: `/${locale}/grow`, label: pick(locale, { en: "Grow with Astarte", fr: "Grandir avec Astarte", ar: "انمُ مع Astarte" }) },
  ];
}

export { DashShell };
