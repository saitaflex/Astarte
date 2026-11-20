import type { Metadata } from "next";
import Link from "next/link";
import { suggestEventAction } from "@/app/actions/events";
import { DiscoveryPanel } from "@/components/discovery/DiscoveryPanel";
import { Field, Select, Submit, TextArea } from "@/components/ui/form";
import { CategoryGlyph } from "@/components/visual/CategoryGlyph";
import { getSessionUser } from "@/lib/auth/session";
import { categoryName } from "@/lib/data/categories";
import { getCatalog } from "@/lib/data/repository";
import { formatDate, formatMoney } from "@/lib/format";
import { pageContext, pick } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "Discover" };

type Tab = "products" | "services" | "events";

export default async function DiscoverPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ type?: string; suggested?: string; error?: string }> }) {
  const { locale, t } = await pageContext(params);
  const { type, suggested, error } = await searchParams;
  const user = await getSessionUser();
  const tab: Tab = type === "services" || type === "events" ? type : "products";
  const catalog = await getCatalog();
  const artist = new Map(catalog.artists.map((a) => [a.id, a]));

  const tabs: { id: Tab; label: string }[] = [
    { id: "products", label: pick(locale, { en: "Existing works", fr: "Œuvres disponibles", ar: "أعمال جاهزة" }) },
    { id: "services", label: pick(locale, { en: "Services & commissions", fr: "Services & commandes", ar: "خدمات وطلبات خاصة" }) },
    { id: "events", label: t.nav.events },
  ];

  const items =
    tab === "products"
      ? catalog.products.map((p) => ({
          id: p.id, a: artist.get(p.artistId), title: p.title, desc: p.description, cat: p.categories[0],
          meta: [p.price ? formatMoney(p.price, locale) : t.results.priceOnRequest, p.availability === "in_stock" ? t.results.inStock : p.availability === "made_to_order" ? t.results.madeToOrder : t.results.unavailable],
        }))
      : tab === "services"
        ? catalog.services.map((s) => ({
            id: s.id, a: artist.get(s.artistId), title: s.title, desc: s.description, cat: s.categories[0],
            meta: [s.priceFrom ? `${pick(locale, { en: "From", fr: "À partir de", ar: "ابتداءً من" })} ${formatMoney(s.priceFrom, locale)}` : t.results.priceOnRequest],
          }))
        : [...catalog.events]
            .sort((x, y) => x.startsAt.localeCompare(y.startsAt))
            .map((e) => ({
              id: e.id, a: artist.get(e.artistId), title: e.title, desc: e.description, cat: e.categories[0],
              meta: [formatDate(e.startsAt, locale), e.isOnline ? t.results.online : (e.city ?? ""), e.pricingMode === "free" ? pick(locale, { en: "Free", fr: "Gratuit", ar: "مجاني" }) : e.price ? formatMoney(e.price, locale) : t.results.priceOnRequest],
            }));

  return (
    <>
    <DiscoveryPanel locale={locale} t={{ hero: t.hero, results: t.results, nav: t.nav }} />
    <div className="mx-auto mt-16 max-w-6xl px-4 pt-8 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl">{pick(locale, { en: "Browse everything", fr: "Tout parcourir", ar: "تصفح الكل" })}</h1>
      <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line" aria-label={t.common.filters}>
        {tabs.map((x) => (
          <Link
            key={x.id}
            href={`/${locale}/discover?type=${x.id}`}
            aria-current={tab === x.id ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm transition ${tab === x.id ? "border-orange text-charcoal" : "border-transparent text-muted hover:text-charcoal"}`}
          >
            {x.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="mt-16 text-center text-muted">{t.results.none}</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="group">
              <Link href={item.a ? `/${locale}/artists/${item.a.slug}` : "#"} className="block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)]">
                  <CategoryGlyph category={item.cat ?? ""} />
                </div>
                <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{item.cat ? categoryName(item.cat, locale) : ""}</p>
                <h2 className="font-display text-xl group-hover:text-orange-ink">{item.title}</h2>
                <p className="text-sm text-muted">{item.a?.displayName}</p>
                <p className="mt-2 line-clamp-2 text-sm text-charcoal/80">{item.desc}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {item.meta.filter(Boolean).map((m) => (
                    <span key={m} className="rounded-full bg-white/80 px-2.5 py-1">{m}</span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {tab === "events" && (
        <section className="mt-16 max-w-2xl">
          <h2 className="font-display text-2xl">{pick(locale, { en: "Know an artisan's event?", fr: "Vous connaissez un événement d'artisan ?", ar: "هل تعرف فعالية لحرفي؟" })}</h2>
          <p className="mt-1 text-sm text-muted">{pick(locale, { en: "Suggest it. Our team checks it before it appears.", fr: "Proposez-le. Notre équipe le vérifie avant publication.", ar: "اقترحها. يتحقق فريقنا منها قبل نشرها." })}</p>
          {suggested && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Thank you. Your suggestion is waiting for review.</p>}
          {error && <p role="alert" className="mt-4 rounded-xl bg-orange/10 px-4 py-3 text-sm">{error}</p>}
          {user ? (
            <form action={suggestEventAction} className="mt-4 space-y-3 rounded-[var(--radius-card)] border border-line bg-white/70 p-5">
              <input type="hidden" name="locale" value={locale} />
              <Select label={t.results.artist} name="artistId" required options={catalog.artists.map((a) => ({ value: a.id, label: a.displayName }))} />
              <Field label="Title" name="title" required />
              <TextArea label="Description" name="description" rows={3} maxLength={1500} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Select label="Type" name="type" defaultValue="workshop" options={["workshop", "masterclass", "exhibition", "open_studio", "market", "performance", "commission_day"].map((x) => ({ value: x, label: x.replace("_", " ") }))} />
                <Field label="Date & time" name="startsAt" type="datetime-local" required />
                <Field label={t.common.city} name="city" />
              </div>
              <Submit variant="dark">{pick(locale, { en: "Suggest event", fr: "Proposer l'événement", ar: "اقترح الفعالية" })}</Submit>
            </form>
          ) : (
            <Link href={`/${locale}/sign-in?next=/${locale}/discover?type=events`} className="mt-4 inline-block text-sm underline decoration-orange underline-offset-4">{t.nav.signIn}</Link>
          )}
        </section>
      )}
    </div>
    </>
  );
}
