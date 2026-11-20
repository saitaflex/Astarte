import type { Metadata } from "next";
import { decideEventAction } from "@/app/actions/admin";
import { DashShell } from "@/components/dashboard/DashShell";
import { StatusPill } from "@/components/ui/StatusPill";
import { adminContext, adminNav } from "@/lib/admin";
import { formatDate, formatMoney } from "@/lib/format";
import { pageContext } from "@/lib/i18n/page";
import { one } from "@/lib/supabase/rel";

export const metadata: Metadata = { title: "Events & listings · Admin" };

export default async function AdminContent({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await pageContext(params);
  const { db, badges } = await adminContext(locale);
  const [{ data: suggested }, { data: events }, { data: products }] = await Promise.all([
    db.from("events").select("*, artist_profiles(display_name)").eq("status", "pending_review").order("created_at"),
    db.from("events").select("id, title, starts_at, status, city, is_online, artist_profiles(display_name)").neq("status", "pending_review").order("starts_at", { ascending: false }).limit(20),
    db.from("products").select("id, title, status, price_amount, currency, artist_profiles(display_name)").order("created_at", { ascending: false }).limit(30),
  ]);
  const here = `/${locale}/admin/content`;

  return (
    <DashShell title="Administration" items={adminNav(locale, badges)} active={here}>
      <h1 className="font-display text-3xl">Events suggested by customers</h1>
      <ul className="mt-4 space-y-3">
        {(suggested ?? []).length === 0 && <li className="text-muted">No suggestions waiting.</li>}
        {(suggested ?? []).map((e) => (
          <li key={e.id} className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-orange-ink">{formatDate(e.starts_at, locale)}</p>
            <p className="font-display text-xl">{e.title}</p>
            <p className="text-sm text-muted">{one(e.artist_profiles)?.display_name ?? "No artist linked"} · {e.is_online ? "Online" : e.city}</p>
            <p className="mt-2 text-sm">{e.description}</p>
            <form action={decideEventAction} className="mt-3 flex gap-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="eventId" value={e.id} />
              <input type="hidden" name="back" value={here} />
              <button name="status" value="published" className="rounded-full bg-charcoal px-4 py-2 text-sm text-cream">Publish</button>
              <button name="status" value="rejected" className="rounded-full border border-line bg-white px-4 py-2 text-sm">Reject</button>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 font-display text-2xl">Recent events</h2>
      <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white/80 text-sm">
        {(events ?? []).map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span>{e.title} · {one(e.artist_profiles)?.display_name} · {formatDate(e.starts_at, locale)}</span>
            <span className="flex items-center gap-2">
              <StatusPill status={e.status} />
              {e.status === "published" && (
                <form action={decideEventAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="eventId" value={e.id} />
                  <input type="hidden" name="back" value={here} />
                  <button name="status" value="cancelled" className="text-xs text-muted underline">Unpublish</button>
                </form>
              )}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 font-display text-2xl">Latest listings</h2>
      <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white/80 text-sm">
        {(products ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span>{p.title} · {one(p.artist_profiles)?.display_name}</span>
            <span className="flex items-center gap-3">{p.price_amount != null ? formatMoney({ amount: Number(p.price_amount), currency: p.currency }, locale) : "on request"} <StatusPill status={p.status} /></span>
          </li>
        ))}
      </ul>
    </DashShell>
  );
}
