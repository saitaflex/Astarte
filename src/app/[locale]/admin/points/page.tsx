import type { Metadata } from "next";
import { adjustPointsAction, createCampaignAction, decideOfferAction, setCampaignStatusAction } from "@/app/actions/admin";
import { DashShell, Notice, Stat } from "@/components/dashboard/DashShell";
import { StatusPill } from "@/components/ui/StatusPill";
import { Field, Submit, TextArea } from "@/components/ui/form";
import { adminContext, adminNav } from "@/lib/admin";
import { pageContext } from "@/lib/i18n/page";
import { one } from "@/lib/supabase/rel";

export const metadata: Metadata = { title: "Point Merci · Admin" };

export default async function AdminPoints({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string; adjusted?: string }> }) {
  const { locale } = await pageContext(params);
  const sp = await searchParams;
  const { db, badges } = await adminContext(locale);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [{ data: offers }, { data: campaigns }, { data: tx }, { data: recent }, { count: redemptions }] = await Promise.all([
    db.from("reward_offers").select("*, artist_profiles(display_name)").order("created_at", { ascending: false }),
    db.from("sponsored_campaigns").select("*, campaign_completions(count)").order("created_at", { ascending: false }),
    db.from("point_transactions").select("amount"),
    db.from("point_transactions").select("customer_id, amount").gt("amount", 0).gte("created_at", since),
    db.from("reward_redemptions").select("id", { count: "exact", head: true }),
  ]);
  // Simple fraud signal: customers who earned unusually many points in the last 24 hours.
  const perUser = new Map<string, number>();
  for (const r of recent ?? []) perUser.set(r.customer_id, (perUser.get(r.customer_id) ?? 0) + r.amount);
  const suspicious = [...perUser.entries()].filter(([, v]) => v >= 100).sort((a, b) => b[1] - a[1]);
  const issued = (tx ?? []).filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spent = -(tx ?? []).filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  return (
    <DashShell title="Administration" items={adminNav(locale, badges)} active={`/${locale}/admin/points`}>
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      {sp.adjusted && <Notice>Points adjusted and logged.</Notice>}
      <h1 className="font-display text-3xl">Point Merci</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Points issued" value={issued} />
        <Stat label="Points redeemed" value={spent} />
        <Stat label="Vouchers" value={redemptions ?? 0} />
        <Stat label="Flagged (24 h)" value={suspicious.length} hint="≥ 100 points earned in a day" />
      </div>

      <h2 className="mt-10 font-display text-2xl">Offers</h2>
      <ul className="mt-3 space-y-2">
        {(offers ?? []).map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/80 px-4 py-3 text-sm">
            <span><strong>{o.title}</strong> · {one(o.artist_profiles)?.display_name ?? o.business_name} · {o.points_cost} pts</span>
            <span className="flex items-center gap-2">
              <StatusPill status={o.status} />
              <form action={decideOfferAction} className="flex gap-1">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={o.id} />
                {o.status !== "active" && <button name="status" value="active" className="rounded-full bg-charcoal px-3 py-1 text-xs text-cream">Approve</button>}
                {o.status === "active" && <button name="status" value="paused" className="rounded-full border border-line px-3 py-1 text-xs">Pause</button>}
                {o.status === "pending_review" && <button name="status" value="rejected" className="rounded-full border border-line px-3 py-1 text-xs">Reject</button>}
              </form>
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-display text-2xl">Sponsored campaigns</h2>
      <ul className="mt-3 space-y-2">
        {(campaigns ?? []).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/80 px-4 py-3 text-sm">
            <span><strong>{c.title}</strong> · {c.sponsor_name} · {c.points} pts / {c.min_seconds}s · {c.campaign_completions?.[0]?.count ?? 0} completions · budget {c.budget_points}</span>
            <span className="flex items-center gap-2">
              <StatusPill status={c.status} />
              <form action={setCampaignStatusAction} className="flex gap-1">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={c.id} />
                {c.status !== "active" && c.status !== "ended" && <button name="status" value="active" className="rounded-full bg-charcoal px-3 py-1 text-xs text-cream">Approve & start</button>}
                {c.status === "active" && <button name="status" value="paused" className="rounded-full border border-line px-3 py-1 text-xs">Pause</button>}
                {c.status !== "ended" && <button name="status" value="ended" className="rounded-full border border-line px-3 py-1 text-xs">End</button>}
              </form>
            </span>
          </li>
        ))}
      </ul>
      <form action={createCampaignAction} className="mt-4 grid gap-3 rounded-[var(--radius-card)] border border-line bg-white/70 p-5 sm:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />
        <Field label="Sponsor" name="sponsor" required />
        <Field label="Title" name="title" required />
        <div className="sm:col-span-2"><TextArea label="Description" name="description" rows={2} maxLength={500} /></div>
        <div className="sm:col-span-2"><Field label="Video URL (https, YouTube/Vimeo or MP4)" name="videoUrl" type="url" required /></div>
        <Field label="Minimum seconds watched" name="seconds" type="number" min={5} defaultValue={30} required />
        <Field label="Points per view" name="points" type="number" min={1} defaultValue={10} required />
        <Field label="Total points budget" name="budget" type="number" min={1} defaultValue={5000} required />
        <Field label="Runs for (days)" name="days" type="number" min={1} defaultValue={30} required />
        <div className="sm:col-span-2"><Submit variant="dark">Create campaign (starts after approval)</Submit></div>
      </form>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="font-display text-2xl">Adjust points</h2>
          <form action={adjustPointsAction} className="mt-3 space-y-3 rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
            <input type="hidden" name="locale" value={locale} />
            <Field label="Customer email" name="email" type="email" required />
            <Field label="Amount (negative to remove)" name="amount" type="number" required />
            <Field label="Reason (recorded in the ledger and audit log)" name="reason" required />
            <Submit variant="dark">Apply adjustment</Submit>
          </form>
        </section>
        <section>
          <h2 className="font-display text-2xl">Suspicious activity</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {suspicious.map(([id, v]) => <li key={id} className="rounded-xl border border-line bg-white/80 px-4 py-2 font-mono">{id.slice(0, 8)}… · {v} pts in 24 h</li>)}
            {suspicious.length === 0 && <li className="text-muted">Nothing flagged.</li>}
          </ul>
        </section>
      </div>
    </DashShell>
  );
}
