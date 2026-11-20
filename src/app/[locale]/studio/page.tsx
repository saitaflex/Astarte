import type { Metadata } from "next";
import Link from "next/link";
import { Notice, Stat } from "@/components/dashboard/DashShell";
import { pageContext, pick } from "@/lib/i18n/page";
import { getReadiness } from "@/lib/readiness";
import { demandForArtist } from "@/lib/recommend";
import { DashShell, studioContext, studioNav } from "@/lib/studio";

export const metadata: Metadata = { title: "Studio" };

export default async function StudioHome({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { locale } = await pageContext(params);
  const { welcome } = await searchParams;
  const { artist, db, badges } = await studioContext(locale);
  if (!artist) return <p className="p-10">Artist profile missing.</p>;
  const r = await getReadiness(db, artist.id);
  const { data: myProducts } = await db.from("products").select("id").eq("artist_id", artist.id);
  const demand = await demandForArtist(artist.id, (myProducts ?? []).map((p) => p.id)).catch(() => null);

  const steps = [
    { done: r.has_bio, label: pick(locale, { en: "Write a biography of at least 80 characters", fr: "Écrire une biographie d'au moins 80 caractères", ar: "اكتب نبذة من 80 حرفًا على الأقل" }), href: "profile" },
    { done: r.has_location, label: pick(locale, { en: "Set your location", fr: "Définir votre localisation", ar: "حدّد موقعك" }), href: "profile" },
    { done: r.facts.published > 0, label: pick(locale, { en: "Publish your first work", fr: "Publier votre première œuvre", ar: "انشر عملك الأول" }), href: "products/new" },
    { done: r.has_approved_images, label: pick(locale, { en: "Get 3 photos approved", fr: "Faire valider 3 photos", ar: "اعتماد 3 صور" }), href: "products" },
    { done: r.has_post, label: pick(locale, { en: "Share a story", fr: "Partager une histoire", ar: "شارك قصة" }), href: "posts" },
  ];

  return (
    <DashShell
      title={pick(locale, { en: "My studio", fr: "Mon atelier", ar: "مرسمي" })}
      items={studioNav(locale, badges)}
      active={`/${locale}/studio`}
      banner={<h1 className="mt-2 font-display text-4xl">{artist.display_name}</h1>}
    >
      {welcome && <Notice>{pick(locale, { en: "Welcome to Astarte! Add your works and photos while our team reviews your profile.", fr: "Bienvenue sur Astarte ! Ajoutez vos œuvres et photos pendant que notre équipe examine votre profil.", ar: "مرحبًا بك في Astarte! أضف أعمالك وصورك بينما يراجع فريقنا ملفك." })}</Notice>}
      {artist.approval_status !== "approved" && (
        <Notice kind="info">
          {artist.approval_status === "pending" && pick(locale, { en: "Your profile is waiting for review. It is not public yet.", fr: "Votre profil attend une validation. Il n'est pas encore public.", ar: "ملفك في انتظار المراجعة وليس عامًا بعد." })}
          {artist.approval_status === "changes_requested" && pick(locale, { en: "Our team asked for changes to your profile. Please update it.", fr: "Notre équipe a demandé des modifications. Merci de mettre à jour votre profil.", ar: "طلب فريقنا تعديلات على ملفك. يرجى تحديثه." })}
          {artist.approval_status === "rejected" && pick(locale, { en: "Your profile was not approved. Contact the Astarte team for details.", fr: "Votre profil n'a pas été approuvé. Contactez l'équipe Astarte.", ar: "لم تتم الموافقة على ملفك. تواصل مع فريق Astarte." })}
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={pick(locale, { en: "Profile views", fr: "Vues du profil", ar: "مشاهدات الملف" })} value={r.facts.profileViews} />
        <Stat label={pick(locale, { en: "Published works", fr: "Œuvres publiées", ar: "أعمال منشورة" })} value={r.facts.published} />
        <Stat label={pick(locale, { en: "Orders", fr: "Commandes", ar: "الطلبات" })} value={r.facts.orders} hint={`${r.facts.completedOrders} completed`} />
        <Stat label={pick(locale, { en: "Photos in review", fr: "Photos en revue", ar: "صور قيد المراجعة" })} value={r.facts.pendingImages} />
      </div>

      {demand && (
        <section className="mt-10">
          <h2 className="font-display text-2xl">{pick(locale, { en: "Clients looking for work like yours", fr: "Les clients qui cherchent votre travail", ar: "عملاء يبحثون عن أعمال مثل أعمالك" })}</h2>
          <p className="mt-1 text-sm text-muted">{pick(locale, { en: "Last 30 days. Real searches where Astarte's AI suggested you or your works, and what visitors did next. Anonymous.", fr: "30 derniers jours. Vraies recherches où l'IA d'Astarte vous a suggéré, et ce que les visiteurs ont fait ensuite. Anonyme.", ar: "آخر 30 يومًا. عمليات بحث حقيقية اقترحك فيها ذكاء Astarte، وما فعله الزوار بعدها. دون هوية." })}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={pick(locale, { en: "Searches that showed you", fr: "Recherches qui vous ont montré", ar: "عمليات بحث أظهرتك" })} value={demand.searches} />
            <Stat label={pick(locale, { en: "Views of you and your works", fr: "Vues de vous et vos œuvres", ar: "مشاهدات لك ولأعمالك" })} value={demand.views} />
            <Stat label={pick(locale, { en: "Clicks from suggestions", fr: "Clics depuis les suggestions", ar: "نقرات من الاقتراحات" })} value={demand.recoClicks} />
            <Stat label={pick(locale, { en: "Contact requests started", fr: "Demandes de contact", ar: "طلبات تواصل" })} value={demand.contacts} />
          </div>
          {demand.topQueries.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {demand.topQueries.map(([q, n]) => (
                <li key={q} className="rounded-full border border-line bg-white px-3 py-1 text-sm">« {q} » <span className="text-muted">× {n}</span></li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-2xl">{pick(locale, { en: "Next steps", fr: "Prochaines étapes", ar: "الخطوات التالية" })}</h2>
        <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white/80">
          {steps.map((s) => (
            <li key={s.label}>
              <Link href={`/${locale}/studio/${s.href}`} className="flex items-center gap-3 px-5 py-4 hover:bg-cream/60">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${s.done ? "bg-charcoal text-cream" : "border border-line"}`} aria-hidden="true">{s.done ? "✓" : ""}</span>
                <span className={s.done ? "text-muted line-through" : ""}>{s.label}</span>
                <span className="sr-only">{s.done ? "done" : "to do"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {artist.approval_status === "approved" && (
        <p className="mt-6 text-sm text-muted">
          <Link href={`/${locale}/artists/${artist.slug}`} className="underline decoration-orange underline-offset-4">{pick(locale, { en: "View my public profile", fr: "Voir mon profil public", ar: "عرض ملفي العام" })} →</Link>
        </p>
      )}
    </DashShell>
  );
}
