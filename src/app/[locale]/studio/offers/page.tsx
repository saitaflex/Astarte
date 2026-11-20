import type { Metadata } from "next";
import { createOfferAction } from "@/app/actions/studio";
import { Notice } from "@/components/dashboard/DashShell";
import { StatusPill } from "@/components/ui/StatusPill";
import { Field, Submit, TextArea } from "@/components/ui/form";
import { pageContext, pick } from "@/lib/i18n/page";
import { DashShell, studioContext, studioNav } from "@/lib/studio";

export const metadata: Metadata = { title: "Point Merci offers" };

export default async function StudioOffers({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { locale } = await pageContext(params);
  const sp = await searchParams;
  const { artist, db, badges } = await studioContext(locale);
  const [{ data: offers }, { data: redemptions }] = await Promise.all([
    db.from("reward_offers").select("*").eq("artist_id", artist.id).order("created_at", { ascending: false }),
    db.from("reward_redemptions").select("code, status, created_at, offer_id, reward_offers!inner(artist_id, title)").eq("reward_offers.artist_id", artist.id).order("created_at", { ascending: false }).limit(50),
  ]);

  return (
    <DashShell title={pick(locale, { en: "My studio", fr: "Mon atelier", ar: "مرسمي" })} items={studioNav(locale, badges)} active={`/${locale}/studio/offers`}>
      {sp.saved && <Notice>Offer sent for review. It appears in Point Merci once approved.</Notice>}
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      <h1 className="font-display text-3xl">Point Merci offers</h1>
      <p className="mt-1 text-sm text-muted">Offer something to customers who support artists, such as a discount or a workshop seat. You decide the conditions; customers show their voucher code.</p>
      <form action={createOfferAction} className="mt-6 space-y-4 rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
        <input type="hidden" name="locale" value={locale} />
        <Field label="Offer title" name="title" required placeholder="e.g. 10% off any bowl" />
        <TextArea label="Description" name="description" rows={2} maxLength={1000} />
        <TextArea label="Conditions" name="conditions" rows={2} maxLength={500} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Points required" name="points" type="number" min={10} defaultValue={50} required />
          <Field label="How many vouchers (optional)" name="quantity" type="number" min={1} />
          <Field label="Valid for (days)" name="days" type="number" min={1} max={365} defaultValue={60} required />
        </div>
        <Submit>Submit offer</Submit>
      </form>
      <h2 className="mt-10 font-display text-2xl">Your offers</h2>
      <ul className="mt-4 space-y-2">
        {(offers ?? []).map((o) => (
          <li key={o.id} className="flex items-center justify-between rounded-xl border border-line bg-white/80 px-4 py-3 text-sm">
            <span>{o.title} · {o.points_cost} pts{o.quantity != null ? ` · ${o.quantity} left` : ""}</span>
            <StatusPill status={o.status} />
          </li>
        ))}
      </ul>
      <h2 className="mt-10 font-display text-2xl">Vouchers claimed</h2>
      <p className="mt-1 text-sm text-muted">Check the customer&apos;s code against this list before honouring an offer.</p>
      <ul className="mt-4 space-y-2 font-mono text-sm">
        {(redemptions ?? []).map((r) => <li key={r.code} className="rounded-xl border border-line bg-white/80 px-4 py-2">{r.code} · {new Date(r.created_at).toLocaleDateString(locale)} · {r.status}</li>)}
        {(redemptions ?? []).length === 0 && <li className="font-sans text-muted">None yet.</li>}
      </ul>
    </DashShell>
  );
}
