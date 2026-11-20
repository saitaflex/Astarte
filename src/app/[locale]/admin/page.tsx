import type { Metadata } from "next";
import { DashShell, Stat } from "@/components/dashboard/DashShell";
import { getChatProvider } from "@/lib/ai/provider";
import { adminContext, adminNav } from "@/lib/admin";
import { categoryName } from "@/lib/data/categories";
import { pageContext } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "Admin" };

function countBy<T>(rows: T[], key: (r: T) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await pageContext(params);
  const { db, badges } = await adminContext(locale);
  // Every number below comes from a live database query.
  const [profiles, artists, images, orders, requests, points, locations] = await Promise.all([
    db.from("profiles").select("role, status, created_at"),
    db.from("artist_profiles").select("approval_status, verification_status, primary_category, is_demo"),
    db.from("portfolio_images").select("moderation_status, authenticity_state"),
    db.from("marketplace_orders").select("status"),
    db.from("project_requests").select("status"),
    db.from("point_transactions").select("amount, kind"),
    db.from("locations").select("city"),
  ]);
  const p = profiles.data ?? [];
  const a = artists.data ?? [];
  const img = images.data ?? [];
  const o = orders.data ?? [];
  const pts = points.data ?? [];
  const weekAgo = Date.now() - 7 * 86_400_000;
  const dist = countBy(img, (i) => i.authenticity_state);
  const cats = countBy(a.filter((x) => x.approval_status === "approved"), (x) => x.primary_category).slice(0, 6);
  const geo = countBy(locations.data ?? [], (l) => l.city).slice(0, 6);

  return (
    <DashShell title="Administration" items={adminNav(locale, badges)} active={`/${locale}/admin`} banner={<h1 className="mt-2 font-display text-4xl">Overview</h1>}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Customers" value={p.filter((x) => x.role === "customer").length} hint={`${p.filter((x) => new Date(x.created_at).getTime() > weekAgo).length} new accounts this week`} />
        <Stat label="Artists" value={a.length} hint={`${a.filter((x) => x.is_demo).length} demo profiles`} />
        <Stat label="Pending artists" value={a.filter((x) => x.approval_status === "pending").length} />
        <Stat label="Verified artists" value={a.filter((x) => x.verification_status === "verified").length} />
        <Stat label="Images to review" value={img.filter((x) => x.moderation_status === "pending").length} />
        <Stat label="Orders" value={o.length} hint={`${o.filter((x) => x.status === "completed").length} completed`} />
        <Stat label="Custom requests" value={(requests.data ?? []).length} hint={`${(requests.data ?? []).filter((x) => x.status === "accepted" || x.status === "completed").length} accepted`} />
        <Stat label="Points issued / redeemed" value={`${pts.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0)} / ${-pts.filter((x) => x.amount < 0).reduce((s, x) => s + x.amount, 0)}`} />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <section className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
          <h2 className="font-display text-xl">Authenticity assessments</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {dist.map(([k, v]) => <li key={k} className="flex justify-between"><span>{k.replaceAll("_", " ")}</span><span>{v}</span></li>)}
            {dist.length === 0 && <li className="text-muted">No images yet.</li>}
          </ul>
          <p className="mt-3 text-xs text-muted">Detector: {process.env.IMAGE_DETECTION_PROVIDER ? process.env.IMAGE_DETECTION_PROVIDER : "not configured (metadata signals only)"}</p>
        </section>
        <section className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
          <h2 className="font-display text-xl">Popular disciplines</h2>
          <ul className="mt-3 space-y-1.5 text-sm">{cats.map(([k, v]) => <li key={k} className="flex justify-between"><span>{categoryName(k, locale)}</span><span>{v}</span></li>)}</ul>
        </section>
        <section className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
          <h2 className="font-display text-xl">Where artists are</h2>
          <ul className="mt-3 space-y-1.5 text-sm">{geo.map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span>{v}</span></li>)}</ul>
        </section>
      </div>

      <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
        <h2 className="font-display text-xl">System status</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <li>Database: <span className="text-emerald-700">connected</span></li>
          <li>AI search: {getChatProvider() ? <span className="text-emerald-700">{process.env.AI_PROVIDER} configured</span> : <span className="text-muted">off (keyword search only)</span>}</li>
          <li>Image detector: {process.env.IMAGE_DETECTION_PROVIDER ? "configured" : <span className="text-muted">not configured</span>}</li>
          <li>Payments: <span className="text-muted">none (orders are arranged directly with artists)</span></li>
        </ul>
      </section>
    </DashShell>
  );
}
