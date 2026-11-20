import type { Metadata } from "next";
import { createEventAction } from "@/app/actions/studio";
import { Notice } from "@/components/dashboard/DashShell";
import { Field, Select, Submit, TextArea } from "@/components/ui/form";
import { formatDate } from "@/lib/format";
import { pageContext, pick } from "@/lib/i18n/page";
import { DashShell, studioContext, studioNav } from "@/lib/studio";

export const metadata: Metadata = { title: "Events" };

export default async function StudioEvents({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { locale } = await pageContext(params);
  const sp = await searchParams;
  const { artist, db, badges } = await studioContext(locale);
  const { data: events } = await db.from("events").select("*, event_registrations(count)").eq("artist_id", artist.id).order("starts_at", { ascending: false });

  return (
    <DashShell title={pick(locale, { en: "My studio", fr: "Mon atelier", ar: "مرسمي" })} items={studioNav(locale, badges)} active={`/${locale}/studio/events`}>
      {sp.saved && <Notice>Event published.</Notice>}
      {sp.error && <Notice kind="error">{sp.error}</Notice>}
      <h1 className="font-display text-3xl">Events</h1>
      <p className="mt-1 text-sm text-muted">Your events are published immediately and appear in discovery and AI search.</p>
      <form action={createEventAction} className="mt-6 space-y-4 rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
        <input type="hidden" name="locale" value={locale} />
        <Field label="Title" name="title" required />
        <TextArea label="Description" name="description" rows={3} maxLength={2000} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Type" name="type" defaultValue="workshop" options={[
            { value: "workshop", label: "Workshop" }, { value: "masterclass", label: "Masterclass" }, { value: "exhibition", label: "Exhibition" },
            { value: "open_studio", label: "Open studio" }, { value: "market", label: "Market / pop-up" }, { value: "performance", label: "Performance" }, { value: "commission_day", label: "Commission day" },
          ]} />
          <Field label="Starts (Tunisia time)" name="startsAt" type="datetime-local" required />
          <Field label="Duration (hours)" name="hours" type="number" min={0.5} step="0.5" defaultValue={2} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" name="city" />
          <Field label="Price (TND, empty = free)" name="price" type="number" min={0} />
          <Field label="Capacity (optional)" name="capacity" type="number" min={1} />
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-[auto_1fr]">
          <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="online" className="accent-[#F28C28]" /> Online event</label>
          <Field label="Online link (for online events)" name="onlineUrl" type="url" />
        </div>
        <Submit>Publish event</Submit>
      </form>
      <ul className="mt-8 space-y-3">
        {(events ?? []).map((e) => (
          <li key={e.id} className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-orange-ink">{formatDate(e.starts_at, locale)}</p>
            <h2 className="mt-1 font-display text-xl">{e.title}</h2>
            <p className="text-sm text-muted">{e.is_online ? "Online" : e.city} · {e.event_registrations?.[0]?.count ?? 0} registrations · {e.status}</p>
          </li>
        ))}
      </ul>
    </DashShell>
  );
}
