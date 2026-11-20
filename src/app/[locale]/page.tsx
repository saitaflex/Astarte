import Link from "next/link";
import { DiscoveryPanel } from "@/components/discovery/DiscoveryPanel";
import { CategoryGlyph } from "@/components/visual/CategoryGlyph";
import { Cover } from "@/components/visual/Cover";
import { CATEGORIES, categoryName } from "@/lib/data/categories";
import { getCatalog } from "@/lib/data/repository";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

const HOME_CATEGORIES = ["pottery", "textiles", "music", "painting", "jewelry", "mosaic", "photography", "traditional-crafts"];

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const t = getDictionary(locale);
  const catalog = await getCatalog();
  const featured = catalog.artists.slice(0, 4);

  return (
    <>
      <DiscoveryPanel locale={locale} t={{ hero: t.hero, results: t.results, nav: t.nav }} />

      {/* How it works */}
      <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-6" aria-labelledby="how">
        <h2 id="how" className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          {t.home.howTitle}
        </h2>
        <ol className="mt-6 grid gap-8 sm:grid-cols-3">
          {t.home.how.map((step, i) => (
            <li key={step.t} className="border-t border-charcoal/15 pt-5">
              <span className="font-display text-sm text-orange-ink">0{i + 1}</span>
              <h3 className="mt-2 font-display text-2xl">{step.t}</h3>
              <p className="mt-2 text-muted">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Categories */}
      <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6" aria-labelledby="crafts">
        <div className="flex items-end justify-between gap-4">
          <h2 id="crafts" className="font-display text-3xl sm:text-4xl">{t.home.categoriesTitle}</h2>
          <Link href={`/${locale}/discover`} className="text-sm text-muted hover:text-charcoal">
            {t.nav.discover} →
          </Link>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HOME_CATEGORIES.map((slug) => (
            <li key={slug}>
              <Link href={`/${locale}/artists?category=${slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] transition group-hover:-translate-y-0.5">
                  <CategoryGlyph category={slug} label={false} />
                </div>
                <p className="mt-2 text-sm font-medium">{categoryName(slug, locale)}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">{CATEGORIES.length} disciplines</p>
      </section>

      {/* Featured makers (real, approved records only) */}
      {featured.length > 0 && (
        <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6" aria-labelledby="featured">
          <h2 id="featured" className="font-display text-3xl sm:text-4xl">{t.home.featuredTitle}</h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((a) => (
              <li key={a.id}>
                <Link href={`/${locale}/artists/${a.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)]">
                    <Cover src={a.coverImage} category={a.primaryCategory} alt={a.displayName} />
                  </div>
                  <p className="mt-3 font-display text-lg leading-tight group-hover:text-orange-ink">{a.displayName}</p>
                  <p className="text-sm text-muted">
                    {categoryName(a.primaryCategory, locale)}
                    {a.location ? ` · ${a.location.city}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Map + trust */}
      <section className="mx-auto mt-24 grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2">
        <Link href={`/${locale}/map`} className="group relative overflow-hidden rounded-[22px] bg-charcoal p-8 text-cream">
          <svg aria-hidden="true" viewBox="0 0 200 120" className="absolute -end-6 -bottom-6 h-48 opacity-60">
            <path d="M120 10 C110 30 128 40 118 60 C110 78 126 92 112 112" stroke="#FFB45C" strokeWidth="1" fill="none" strokeDasharray="2 4" />
            {[
              [118, 22], [124, 48], [114, 70], [120, 95], [108, 40],
            ].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill="#F28C28" />
            ))}
          </svg>
          <h2 className="font-display text-3xl">{t.home.mapTitle}</h2>
          <p className="mt-10 inline-flex items-center gap-2 text-sm text-orange-soft group-hover:gap-3 transition-all">{t.home.mapCta} →</p>
        </Link>
        <div className="rounded-[22px] border border-line bg-white/70 p-8">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-orange-ink">
            <span className="h-2 w-2 rounded-full bg-orange" aria-hidden="true" /> Human review
          </div>
          <h2 className="mt-3 font-display text-3xl">{t.home.trustTitle}</h2>
          <p className="mt-3 text-muted">{t.home.trustBody}</p>
        </div>
      </section>

      {/* Artist CTA */}
      <section className="mx-auto mt-24 max-w-6xl px-4 text-center sm:px-6">
        <h2 className="font-display text-[clamp(1.9rem,4vw,3rem)]">{t.home.artistCtaTitle}</h2>
        <p className="mx-auto mt-3 max-w-lg text-muted">{t.home.artistCtaBody}</p>
        <Link href={`/${locale}/join`} className="mt-6 inline-block rounded-full bg-orange px-6 py-3 font-medium text-charcoal transition hover:bg-orange-soft">
          {t.nav.join}
        </Link>
      </section>
    </>
  );
}
