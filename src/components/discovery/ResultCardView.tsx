import Link from "next/link";
import { categoryName } from "@/lib/data/categories";
import type { ResultCard } from "@/lib/discovery/types";
import { formatDate, formatMoney } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Cover } from "@/components/visual/Cover";

function priceText(card: ResultCard, locale: Locale, t: Dictionary["results"]) {
  if (card.kind === "artist") return null;
  if (card.priceLabel === "free") return locale === "ar" ? "مجاني" : locale === "fr" ? "Gratuit" : "Free";
  if (card.priceLabel === "on_request" || !card.price) return t.priceOnRequest;
  const value = formatMoney(card.price, locale);
  return card.priceLabel === "from" ? `${locale === "fr" ? "À partir de" : locale === "ar" ? "ابتداءً من" : "From"} ${value}` : value;
}

function availabilityText(card: ResultCard, t: Dictionary["results"]) {
  switch (card.availability) {
    case "in_stock":
      return t.inStock;
    case "made_to_order":
      return t.madeToOrder;
    case "unavailable":
      return t.unavailable;
    case "commissions":
      return t.commissions;
    default:
      return null;
  }
}

export function ResultCardView({ card, reason, locale, t }: { card: ResultCard; reason?: string; locale: Locale; t: Dictionary["results"] }) {
  const kindLabel = { artist: t.artist, product: t.product, service: t.service, event: t.event }[card.kind];
  const price = priceText(card, locale, t);
  const availability = availabilityText(card, t);
  const primary = card.categories[0] ?? "";
  const place = card.isOnline ? t.online : card.artist.city;

  return (
    <article className="group relative grid grid-cols-[72px_1fr] gap-4 rounded-[var(--radius-card)] border border-line bg-white/80 p-4 transition hover:border-orange/50 hover:bg-white sm:grid-cols-[88px_1fr]">
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-cream-deep">
        <Cover src={card.image} category={primary} alt="" sizes="88px" />
      </div>
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
          <span className="text-orange-ink">{kindLabel}</span>
          {primary && <span>· {categoryName(primary, locale)}</span>}
          {place && <span>· {place}</span>}
        </div>
        <h3 className="truncate font-display text-lg leading-snug text-charcoal">
          <Link href={`/${locale}/artists/${card.artist.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {card.title}
          </Link>
        </h3>
        {card.kind !== "artist" && <p className="truncate text-sm text-muted">{card.artist.name}</p>}
        {card.kind === "artist" && card.subtitle && <p className="truncate text-sm text-muted">{card.subtitle}</p>}
        {reason && <p className="mt-2 text-sm leading-relaxed text-charcoal/85">{reason}</p>}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {card.startsAt && <span className="rounded-full bg-cream px-2.5 py-1">{formatDate(card.startsAt, locale)}</span>}
          {price && <span className="rounded-full bg-cream px-2.5 py-1">{price}</span>}
          {availability && <span className="rounded-full bg-cream px-2.5 py-1">{availability}</span>}
        </div>
      </div>
    </article>
  );
}
