import { ProductArt } from "@/components/market/ProductArt";
import { TrackLink } from "@/components/recommend/Track";
import { formatMoney } from "@/lib/format";
import type { Reason } from "@/lib/recommend/engine";
import type { ProductPick } from "@/lib/recommend";

const REASON: Record<Reason, Record<"en" | "fr" | "ar", string>> = {
  content: { en: "Close in style and materials", fr: "Proche par le style et les matériaux", ar: "قريب في الأسلوب والمواد" },
  coView: { en: "Viewed together by other visitors", fr: "Vu ensemble par d'autres visiteurs", ar: "شاهده زوار آخرون معًا" },
  popular: { en: "Popular this month", fr: "Populaire ce mois-ci", ar: "رائج هذا الشهر" },
  sameCategory: { en: "Same craft", fr: "Même savoir-faire", ar: "نفس الحرفة" },
  sameTechnique: { en: "Same technique", fr: "Même technique", ar: "نفس التقنية" },
};

export function RecoStrip({ title, note, picks, locale, source, priceOnRequest }: {
  title: string; note: string; picks: ProductPick[]; locale: string; source: string; priceOnRequest: string;
}) {
  if (!picks.length) return null;
  const loc = (locale === "fr" || locale === "ar" ? locale : "en") as "en" | "fr" | "ar";
  return (
    <section className="mt-20" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="text-xs text-muted">{note}</p>
      </div>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {picks.map(({ product: x, artist, reasons }) => (
          <li key={x.id}>
            <TrackLink href={`/${locale}/marketplace/${x.id}`} ev={{ kind: "recommendation_click", productId: x.id, artistId: artist.id, source }} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)]">
                <ProductArt images={x.images} category={x.categories[0] ?? ""} alt={x.title} />
              </div>
              <p className="mt-2 font-display text-lg leading-snug group-hover:text-orange-ink">{x.title}</p>
              <p className="text-sm text-muted">{artist.displayName} · {x.price ? formatMoney(x.price, loc) : priceOnRequest}</p>
              <p className="mt-1 text-xs text-orange-ink">{reasons.map((r) => REASON[r][loc]).join(" · ")}</p>
            </TrackLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
