import type { Metadata } from "next";
import Link from "next/link";
import { applyIncubationAction, registerWorkshopAction, toggleMilestoneAction } from "@/app/actions/grow";
import { Notice } from "@/components/dashboard/DashShell";
import { GuideAssistant } from "@/components/grow/GuideAssistant";
import { StatusPill } from "@/components/ui/StatusPill";
import { Submit, TextArea } from "@/components/ui/form";
import { getSessionUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { pageContext, pick } from "@/lib/i18n/page";
import { getReadiness, type Readiness } from "@/lib/readiness";
import { supabasePublic, supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Grow with Astarte" };

const STAGES = [
  { n: 1, en: "Discover your potential", fr: "Découvrir votre potentiel", ar: "اكتشف إمكاناتك", d: "Your specialty, your customers, what makes your work unique." },
  { n: 2, en: "Build your presentation", fr: "Construire votre présentation", ar: "ابنِ عرضك", d: "Photos, descriptions, categories, a profile people remember." },
  { n: 3, en: "Learn how to sell", fr: "Apprendre à vendre", ar: "تعلّم البيع", d: "Pricing, customer communication, handling orders." },
  { n: 4, en: "Reach more customers", fr: "Toucher plus de clients", ar: "اصل إلى عملاء أكثر", d: "Stories, campaigns, social media, Astarte promotions." },
  { n: 5, en: "Grow your creative business", fr: "Développer votre activité", ar: "طوّر نشاطك الإبداعي", d: "Statistics, collections, partnerships, community." },
];

type Milestone = { id: string; stage: number; sort: number; title: string; description: string; check_kind: string };

export default async function GrowPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ applied?: string; error?: string; registered?: string }> }) {
  const { locale } = await pageContext(params);
  const sp = await searchParams;
  const user = await getSessionUser();
  const pub = supabasePublic();
  const [{ data: program }, { data: workshops }] = await Promise.all([
    pub.from("incubation_programs").select("*, incubation_milestones(*)").eq("active", true).limit(1).maybeSingle(),
    pub.from("workshops").select("*").eq("status", "scheduled").gte("starts_at", new Date().toISOString()).order("starts_at").limit(6),
  ]);
  const milestones: Milestone[] = ((program?.incubation_milestones ?? []) as Milestone[]).sort((a, b) => a.stage - b.stage || a.sort - b.sort);

  let application: { status: string } | null = null;
  let enrollment: { id: string; mentor_name: string | null } | null = null;
  let completions = new Set<string>();
  let readiness: Readiness | null = null;
  let resources: { id: string; stage: number; kind: string; title: string; summary: string; body: string }[] = [];
  let registered = new Set<string>();
  if (user?.role === "artist" && user.artistId && program) {
    const db = await supabaseServer();
    const [a, e, res, reg] = await Promise.all([
      db.from("incubation_applications").select("status").eq("artist_id", user.artistId).eq("program_id", program.id).maybeSingle(),
      db.from("incubation_enrollments").select("id, mentor_name").eq("artist_id", user.artistId).eq("program_id", program.id).maybeSingle(),
      db.from("learning_resources").select("*").eq("published", true).order("stage"),
      db.from("workshop_registrations").select("workshop_id").eq("artist_id", user.artistId),
    ]);
    application = a.data;
    enrollment = e.data;
    resources = res.data ?? [];
    registered = new Set((reg.data ?? []).map((r) => r.workshop_id));
    if (enrollment) {
      const { data: done } = await db.from("milestone_completions").select("milestone_id").eq("enrollment_id", enrollment.id);
      completions = new Set((done ?? []).map((d) => d.milestone_id));
      readiness = await getReadiness(db, user.artistId);
    }
  }

  const isDone = (m: Milestone) => (m.check_kind === "manual" ? completions.has(m.id) : Boolean(readiness?.[m.check_kind as keyof Omit<Readiness, "facts">]));
  const doneCount = milestones.filter(isDone).length;
  const pct = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;
  const currentStage = STAGES.find((s) => milestones.some((m) => m.stage === s.n && !isDone(m)))?.n ?? 5;
  const nextSteps = milestones.filter((m) => !isDone(m)).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-ink">Astarte Incubation</p>
        <h1 className="mt-2 font-display text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02]">{pick(locale, { en: "Grow with Astarte", fr: "Grandir avec Astarte", ar: "انمُ مع Astarte" })}</h1>
        <p className="mt-3 text-xl text-charcoal/85">{pick(locale, { en: "We help your talent become your business.", fr: "Nous aidons votre talent à devenir votre métier.", ar: "نساعد موهبتك لتصبح مشروعك." })}</p>
      </header>

      {sp.applied && <div className="mt-6"><Notice>Application sent. The Astarte team will review it.</Notice></div>}
      {sp.registered && <div className="mt-6"><Notice>You are registered for the workshop.</Notice></div>}
      {sp.error && <div className="mt-6"><Notice kind="error">{sp.error}</Notice></div>}

      {enrollment && readiness ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-10">
            <section className="rounded-[22px] bg-charcoal p-6 text-cream">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-orange-soft">Stage {currentStage} of 5</p>
                  <p className="mt-1 font-display text-3xl">{pick(locale, STAGES[currentStage - 1])}</p>
                </div>
                <p className="font-display text-5xl">{pct}%</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-cream/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-orange" style={{ width: `${pct}%` }} />
              </div>
              {enrollment.mentor_name && <p className="mt-4 text-sm text-cream/80">Mentor: {enrollment.mentor_name}</p>}
            </section>

            {STAGES.map((s) => (
              <section key={s.n} aria-labelledby={`stage-${s.n}`}>
                <h2 id={`stage-${s.n}`} className="font-display text-2xl"><span className="text-orange-ink">0{s.n}</span> {pick(locale, s)}</h2>
                <ul className="mt-3 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white/80">
                  {milestones.filter((m) => m.stage === s.n).map((m) => {
                    const done = isDone(m);
                    return (
                      <li key={m.id} className="flex items-start gap-4 px-5 py-4">
                        {m.check_kind === "manual" ? (
                          <form action={toggleMilestoneAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="milestoneId" value={m.id} />
                            <button aria-label={done ? "Mark as not done" : "Mark as done"} className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-xs ${done ? "bg-charcoal text-cream" : "border border-charcoal/30 hover:border-orange"}`}>{done ? "✓" : ""}</button>
                          </form>
                        ) : (
                          <span title="Checked automatically from your listings" className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${done ? "bg-orange text-charcoal" : "border border-dashed border-charcoal/30"}`}>{done ? "✓" : ""}</span>
                        )}
                        <div>
                          <p className={`font-medium ${done ? "text-muted line-through" : ""}`}>{m.title}</p>
                          <p className="text-sm text-muted">{m.description}</p>
                          {m.check_kind !== "manual" && <p className="mt-1 text-xs text-orange-ink">Checked automatically</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {resources.filter((r) => r.stage === s.n).map((r) => (
                  <details key={r.id} className="mt-3 rounded-[var(--radius-card)] border border-line bg-cream/60 px-5 py-3">
                    <summary className="cursor-pointer text-sm"><span className="me-2 text-xs uppercase tracking-[0.12em] text-muted">{r.kind}</span>{r.title}</summary>
                    <p className="mt-2 text-sm text-muted">{r.summary}</p>
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed">{r.body}</pre>
                  </details>
                ))}
              </section>
            ))}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-[22px] border border-line bg-white/80 p-6">
              <h2 className="font-display text-xl">Recommended next steps</h2>
              <ol className="mt-3 list-decimal space-y-1.5 ps-5 text-sm">
                {nextSteps.map((m) => <li key={m.id}>{m.title}</li>)}
                {nextSteps.length === 0 && <li>All milestones done. Keep sharing stories and reviewing what sells.</li>}
              </ol>
              <h3 className="mt-5 text-xs uppercase tracking-[0.14em] text-muted">Marketplace performance</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted">Profile views</dt><dd>{readiness.facts.profileViews}</dd>
                <dt className="text-muted">Work views</dt><dd>{readiness.facts.productViews}</dd>
                <dt className="text-muted">Orders</dt><dd>{readiness.facts.orders}</dd>
                <dt className="text-muted">Completed</dt><dd>{readiness.facts.completedOrders}</dd>
              </dl>
              <Link href={`/${locale}/studio`} className="mt-4 inline-block text-sm underline decoration-orange underline-offset-4">Open my studio →</Link>
            </section>
            <GuideAssistant
              locale={locale}
              examples={["I want to sell my handmade carpets but don't know how to present them.", "I published five products but I'm not receiving customers."]}
            />
          </aside>
        </div>
      ) : (
        <>
          <ol className="mt-12 grid gap-4 md:grid-cols-5">
            {STAGES.map((s) => (
              <li key={s.n} className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
                <span className="font-display text-sm text-orange-ink">0{s.n}</span>
                <h2 className="mt-1 font-display text-lg leading-tight">{pick(locale, s)}</h2>
                <p className="mt-2 text-sm text-muted">{s.d}</p>
              </li>
            ))}
          </ol>

          <section className="mt-12 max-w-2xl">
            {!user ? (
              <p className="text-muted">
                <Link href={`/${locale}/join`} className="font-medium text-charcoal underline decoration-orange underline-offset-4">Join as an artist</Link> to apply. It is free.
              </p>
            ) : user.role !== "artist" ? (
              <p className="text-muted">The incubation programme is for artist accounts.</p>
            ) : application ? (
              <div className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
                <p className="font-display text-xl">Your application</p>
                <div className="mt-2"><StatusPill status={application.status} /></div>
                <p className="mt-2 text-sm text-muted">{application.status === "submitted" ? "The Astarte team is reviewing it." : application.status === "rejected" ? "Not accepted this time. You can still use the guides in your studio." : ""}</p>
              </div>
            ) : program ? (
              <form action={applyIncubationAction} className="space-y-4 rounded-[22px] border border-line bg-white/80 p-6">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="programId" value={program.id} />
                <h2 className="font-display text-2xl">Apply to the programme</h2>
                <TextArea label="Tell us about your work and what you want to achieve" name="motivation" rows={5} required maxLength={3000} />
                <fieldset>
                  <legend className="text-sm font-medium">Where do you need the most help?</legend>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    {[["photography", "Product photos"], ["pricing", "Pricing"], ["marketing", "Marketing"], ["selling", "Selling"], ["branding", "Branding"], ["orders", "Managing orders"]].map(([v, l]) => (
                      <label key={v} className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 has-[:checked]:border-orange"><input type="checkbox" name="needs" value={v} className="accent-[#F28C28]" /> {l}</label>
                    ))}
                  </div>
                </fieldset>
                <Submit>Send application</Submit>
              </form>
            ) : null}
          </section>
        </>
      )}

      {(workshops ?? []).length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-3xl">Workshops</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {(workshops ?? []).map((w) => (
              <li key={w.id} className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-orange-ink">{formatDate(w.starts_at, locale)}</p>
                <h3 className="mt-1 font-display text-xl">{w.title}</h3>
                <p className="mt-1 text-sm text-muted">{w.host} · {w.is_online ? "Online" : w.city} · {w.topic}</p>
                <p className="mt-2 text-sm">{w.description}</p>
                {user?.role === "artist" && (
                  registered.has(w.id) ? <p className="mt-3 text-sm text-emerald-700">Registered ✓</p> : (
                    <form action={registerWorkshopAction} className="mt-3">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="workshopId" value={w.id} />
                      <Submit variant="ghost" className="!py-2 text-sm">Register</Submit>
                    </form>
                  )
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
