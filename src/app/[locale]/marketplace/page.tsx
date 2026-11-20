import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ProductArt } from "@/components/market/ProductArt";
import { RecoStrip } from "@/components/recommend/RecoStrip";
import { forVisitor, VISITOR_COOKIE } from "@/lib/recommend";
import { CATEGORIES, categoryName } from "@/lib/data/categories";
import { getCatalog } from "@/lib/data/repository";
import type { Product } from "@/lib/data/types";
import { formatMoney } from "@/lib/format";
import { marketLabels } from "@/lib/i18n/market-labels";
import { pageContext } from "@/lib/i18n/page";
import { normalizeText } from "@/lib/search/normalize";

export const metadata: Metadata = { title: "Marketplace" };

type Search = { q?: string; category?: string; max?: string; available?: string; city?: string };

export default async function MarketplacePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const { locale, t } = await pageContext(params);
  const sp = await searchParams;
  const m = marketLabels(locale);
  const { products, artists } = await getCatalog();
  const artistById = new Map(artists.map((a) => [a.id, a]));

  const q = normalizeText(sp.q ?? "");
  const max = sp.max ? Number(sp.max) : null;
  const filtered = products.filter((p) => {
    const a = artistById.get(p.artistId);
    if (!a) return false;
    if (sp.category && !p.categories.includes(sp.category)) return false;
    if (sp.city && a.location?.city !== sp.city) return false;
    if (max != null && !Number.isNaN(max) && p.price && p.price.amount > max) return false;
    if (sp.available === "1" && p.availability !== "in_stock") return false;
    if (q) {
      const hay = normalizeText(`${p.title} ${p.description} ${p.materials.join(" ")} ${a.displayName} ${a.location?.city ?? ""} ${p.categories.map((c) => categoryName(c, locale)).join(" ")}`);
      if (!q.split(" ").every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const filtering = Boolean(sp.q || sp.category || sp.max || sp.available || sp.city);
  const featured = filtering ? [] : products.filter((p) => p.featured).slice(0, 3);
  const usedCats = CATEGORIES.filter((c) => products.some((p) => p.categories.includes(c.slug)));
  const cities = [...new Set(products.map((p) => artistById.get(p.artistId)?.location?.city).filter(Boolean) as string[])].sort();
  const reco = filtering ? { picks: [], personalised: false } : await forVisitor((await cookies()).get(VISITOR_COOKIE)?.value, 4);
  const recoTitle = reco.personalised
    ? (locale === "fr" ? "Pour vous" : locale === "ar" ? "مقترحات لك" : "For you")
    : (locale === "fr" ? "À découvrir" : locale === "ar" ? "اكتشف" : "To discover");
  const recoNote = reco.personalised
    ? (locale === "fr" ? "D'après les œuvres que vous avez regardées" : locale === "ar" ? "حسب الأعمال التي شاهدتها" : "Based on the works you viewed")
    : (locale === "fr" ? "Variété de savoir-faire ; se personnalise dès que vous regardez des œuvres" : locale === "ar" ? "تنوع في الحرف، ويتخصص بعد مشاهدة الأعمال" : "A mix of crafts; becomes personal as you view works");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="font-display text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02] tracking-[-0.02em]">{m.title}</h1>
        <p className="mt-3 text-lg text-muted">{m.lead}</p>
      </header>

      {featured.length > 0 && (
        <section className="mt-12" aria-labelledby="featured">
          <h2 id="featured" className="text-xs font-medium uppercase tracking-[0.18em] text-muted">{m.featured}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr] md:grid-rows-2">
            {featured.map((p, i) => (
              <ProductTile key={p.id} p={p} artistName={artistById.get(p.artistId)?.displayName ?? ""} locale={locale} big={i === 0} by={m.by} priceOnRequest={t.results.priceOnRequest} />
            ))}
          </div>
        </section>
      )}

      <RecoStrip title={recoTitle} note={recoNote} picks={reco.picks} locale={locale} source={reco.personalised ? "for_you" : "discover"} priceOnRequest={t.results.priceOnRequest} />

      <form className="mt-14 grid gap-3 rounded-[22px] border border-line bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]" role="search">
        <input name="q" defaultValue={sp.q} placeholder={m.search} aria-label={m.search} className="rounded-xl border border-line bg-white px-4 py-2.5 outline-none focus:border-orange" />
        <select name="category" defaultValue={sp.category ?? ""} aria-label={t.common.category} className="rounded-xl border border-line bg-white px-3 py-2.5">
          <option value="">{t.common.category}: {t.common.all}</option>
          {usedCats.map((c) => <option key={c.slug} value={c.slug}>{c.name[locale]}</option>)}
        </select>
        <select name="city" defaultValue={sp.city ?? ""} aria-label={t.common.city} className="rounded-xl border border-line bg-white px-3 py-2.5">
          <option value="">{t.common.city}: {t.common.all}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input name="max" type="number" min={0} defaultValue={sp.max} placeholder={m.maxPrice} aria-label={m.maxPrice} className="rounded-xl border border-line bg-white px-4 py-2.5" />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            <input type="checkbox" name="available" value="1" defaultChecked={sp.available === "1"} className="accent-[#F28C28]" /> {m.availableOnly}
          </label>
          <button className="rounded-full bg-charcoal px-4 py-2.5 text-sm text-cream">{m.apply}</button>
        </div>
      </form>

      <section className="mt-10" aria-labelledby="all">
        <div className="flex items-baseline justify-between">
          <h2 id="all" className="font-display text-3xl">{m.all}</h2>
          {filtering && <Link href={`/${locale}/marketplace`} className="text-sm text-muted hover:text-charcoal">{m.reset}</Link>}
        </div>
        {filtered.length === 0 ? (
          <p className="mt-10 text-center text-muted">{t.results.none}</p>
        ) : (
          <ul className="mt-6 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <li key={p.id}>
                <ProductTile p={p} artistName={artistById.get(p.artistId)?.displayName ?? ""} locale={locale} by={m.by} priceOnRequest={t.results.priceOnRequest} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProductTile({ p, artistName, locale, big, by, priceOnRequest }: { p: Product; artistName: string; locale: "en" | "fr" | "ar"; big?: boolean; by: string; priceOnRequest: string }) {
  return (
    <Link href={`/${locale}/marketplace/${p.id}`} className={`group block ${big ? "md:row-span-2" : ""}`}>
      <div className={`relative overflow-hidden rounded-[var(--radius-card)] ${big ? "aspect-[4/5] md:aspect-auto md:h-[calc(100%-4.5rem)]" : "aspect-[4/5]"}`}>
        <ProductArt images={p.images} category={p.categories[0] ?? ""} alt={p.title} priority={big} />
        {p.availability !== "in_stock" && (
          <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs">{p.availability === "made_to_order" ? "Made to order" : "Sold out"}</span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className={`font-display leading-tight group-hover:text-orange-ink ${big ? "text-2xl" : "text-lg"}`}>{p.title}</h3>
          <p className="truncate text-sm text-muted">{by} {artistName}</p>
        </div>
        <p className="shrink-0 text-sm font-medium">{p.price ? formatMoney(p.price, locale) : priceOnRequest}</p>
      </div>
    </Link>
  );
}
