import type { Metadata } from "next";
import { createWorkshopAction, decideApplicationAction } from "@/app/actions/admin";
import { DashShell, Notice } from "@/components/dashboard/DashShell";
import { StatusPill } from "@/components/ui/StatusPill";
import { Field, Select, Submit, TextArea } from "@/components/ui/form";
import { adminContext, adminNav } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { pageContext } from "@/lib/i18n/page";
import { one } from "@/lib/supabase/rel";

export const metadata: Metadata = { title: "Incubation · Admin" };

export default async function AdminGrow({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }) {
  const { locale } = await pageContext(params);
  const { error } = await searchParams;
  const { db, badges } = await adminContext(locale);
  const [{ data: apps }, { data: enrollments }, { data: milestones }, { data: completions }, { data: workshops }] = await Promise.all([
    db.from("incubation_applications").select("*, artist_profiles(display_name, slug)").order("created_at", { ascending: false }),
    db.from("incubation_enrollments").select("*, artist_profiles(display_name)"),
    db.from("incubation_milestones").select("id, check_kind"),
    db.from("milestone_completions").select("enrollment_id"),
    db.from("workshops").select("*, workshop_registrations(count)").order("starts_at", { ascending: false }).limit(20),
  ]);
  const manualTotal = (milestones ?? []).filter((m) => m.check_kind === "manual").length;

  return (
    <DashShell title="Administration" items={adminNav(locale, badges)} active={`/${locale}/admin/grow`}>
      {error && <Notice kind="error">{error}</Notice>}
      <h1 className="font-display text-3xl">Incubation</h1>
      <h2 className="mt-6 font-display text-2xl">Applications</h2>
      <ul className="mt-3 space-y-3">
        {(apps ?? []).length === 0 && <li className="text-muted">No applications yet.</li>}
        {(apps ?? []).map((a) => (
          <li key={a.id} className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-xl">{one(a.artist_profiles)?.display_name}</p>
              <StatusPill status={a.status} />
            </div>
            <p className="mt-2 text-sm">{a.motivation}</p>
            {a.needs?.length > 0 && <p className="mt-1 text-xs text-muted">Needs: {a.needs.join(", ")}</p>}
            {a.status === "submitted" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={decideApplicationAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="decision" value="accept" />
                  <input name="mentor" placeholder="Assign mentor (optional)" className="rounded-xl border border-line px-3 py-2 text-sm" />
                  <button className="rounded-full bg-charcoal px-4 py-2 text-sm text-cream">Accept</button>
                </form>
                <form action={decideApplicationAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <button className="rounded-full border border-line bg-white px-4 py-2 text-sm">Reject</button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-display text-2xl">Enrolled artists</h2>
      <ul className="mt-3 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white/80 text-sm">
        {(enrollments ?? []).map((e) => (
          <li key={e.id} className="flex justify-between px-4 py-3">
            <span>{one(e.artist_profiles)?.display_name}{e.mentor_name ? ` · mentor ${e.mentor_name}` : ""}</span>
            <span className="text-muted">{(completions ?? []).filter((c) => c.enrollment_id === e.id).length}/{manualTotal} self-reported milestones · since {new Date(e.started_at).toLocaleDateString(locale)}</span>
          </li>
        ))}
        {(enrollments ?? []).length === 0 && <li className="px-4 py-3 text-muted">None yet.</li>}
      </ul>

      <h2 className="mt-10 font-display text-2xl">Workshops</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {(workshops ?? []).map((w) => <li key={w.id} className="rounded-xl border border-line bg-white/80 px-4 py-3">{formatDate(w.starts_at, locale)} · <strong>{w.title}</strong> · {w.host} · {w.workshop_registrations?.[0]?.count ?? 0} registered</li>)}
      </ul>
      <form action={createWorkshopAction} className="mt-4 grid gap-3 rounded-[var(--radius-card)] border border-line bg-white/70 p-5 sm:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />
        <Field label="Title" name="title" required />
        <Field label="Host" name="host" required />
        <div className="sm:col-span-2"><TextArea label="Description" name="description" rows={2} maxLength={1000} /></div>
        <Select label="Topic" name="topic" defaultValue="marketing" options={["marketing", "photography", "pricing", "entrepreneurship", "networking", "craft"].map((t) => ({ value: t, label: t }))} />
        <Field label="Starts (Tunisia time)" name="startsAt" type="datetime-local" required />
        <Field label="Duration (hours)" name="hours" type="number" min={0.5} step="0.5" defaultValue={1.5} required />
        <Field label="City (if in person)" name="city" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="online" defaultChecked className="accent-[#F28C28]" /> Online</label>
        <div className="sm:col-span-2"><Submit variant="dark">Publish workshop</Submit></div>
      </form>
    </DashShell>
  );
}
