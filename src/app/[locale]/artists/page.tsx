import type { Metadata } from "next";
import Link from "next/link";
import { CategoryIcon } from "@/components/visual/CategoryIcon";
import { Cover } from "@/components/visual/Cover";
import { CATEGORIES, categoryName } from "@/lib/data/categories";
import { getCatalog } from "@/lib/data/repository";
import { pageContext, pick } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "Artists" };

export default async function ArtistsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; city?: string }>;
}) {
  const { locale, t } = await pageContext(params);
  const { category, city } = await searchParams;
  const { artists } = await getCatalog();

  const cities = [...new Set(artists.map((a) => a.location?.city).filter((c): c is string => Boolean(c)))].sort();
  const usedCategories = CATEGORIES.filter((c) => artists.some((a) => a.categories.includes(c.slug)));
  const list = artists.filter((a) => (!category || a.categories.includes(category)) && (!city || a.location?.city === city));

  const qs = (next: { category?: string; city?: string }) => {
    const p = new URLSearchParams();
    const c = "category" in next ? next.category : category;
    const ci = "city" in next ? next.city : city;
    if (c) p.set("category", c);
    if (ci) p.set("city", ci);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl">{t.nav.artists}</h1>

      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.common.category}>
          <FilterChip href={`/${locale}/artists${qs({ category: undefined })}`} active={!category} label={t.common.all} />
          {usedCategories.map((c) => (
            <FilterChip key={c.slug} href={`/${locale}/artists${qs({ category: c.slug })}`} active={category === c.slug} label={c.name[locale]} icon={c.slug} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.common.city}>
          <FilterChip href={`/${locale}/artists${qs({ city: undefined })}`} active={!city} label={pick(locale, { en: "All cities", fr: "Toutes les villes", ar: "كل المدن" })} subtle />
          {cities.map((c) => (
            <FilterChip key={c} href={`/${locale}/artists${qs({ city: c })}`} active={city === c} label={c} subtle />
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-16 text-center text-muted">{t.results.none}</p>
      ) : (
        <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <li key={a.id}>
              <Link href={`/${locale}/artists/${a.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] transition group-hover:-translate-y-0.5">
                  <Cover src={a.coverImage} category={a.primaryCategory} alt={a.displayName} sizes="(max-width: 640px) 100vw, 33vw" />
                </div>
                <h2 className="mt-3 font-display text-xl group-hover:text-orange-ink">{a.displayName}</h2>
                <p className="text-sm text-muted">
                  {categoryName(a.primaryCategory, locale)}
                  {a.location && a.location.privacy !== "hidden" ? ` · ${a.location.city}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({ href, active, label, subtle, icon }: { href: string; active: boolean; label: string; subtle?: boolean; icon?: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border py-1.5 text-sm transition ${icon ? "ps-1.5 pe-3.5" : "px-3.5"} ${
        active ? "border-charcoal bg-charcoal text-cream" : subtle ? "border-transparent text-muted hover:text-charcoal" : "border-line bg-white/60 hover:border-charcoal/30"
      }`}
    >
      {icon && <CategoryIcon category={icon} size={22} />}
      {label}
    </Link>
  );
}
