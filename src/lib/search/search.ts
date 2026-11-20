/**
 * Ranking over the public catalog. Deterministic and explainable:
 * every hit lists the criteria it matched and the fields that are unknown.
 * Hard filters (city, budget, kind, upcoming) exclude; soft signals add score.
 */
import type { Catalog } from "@/lib/data/repository";
import type { Artist, GalleryImage, Money, RecordKind, SearchFilter, SearchHit } from "@/lib/data/types";
import { normalizeText, tokenize } from "./normalize";
import { STOP_WORDS } from "./parse";

interface Candidate {
  kind: RecordKind;
  id: string;
  artist: Artist | undefined;
  categories: string[];
  text: string;
  /** What the record's approved pictures show (captions, AI descriptions, tags) */
  pictureText: string;
  price: Money | null;
  priceRelevant: boolean;
  city: string | null;
  online: boolean;
  unknown: string[];
}

function candidates(catalog: Catalog, now: Date): Candidate[] {
  const artistById = new Map(catalog.artists.map((a) => [a.id, a]));
  const artistText = (a?: Artist) => (a ? `${a.displayName} ${a.specialties.join(" ")}` : "");
  const pictures = (imgs: GalleryImage[] = []) => normalizeText(imgs.map((i) => `${i.caption ?? ""} ${i.description ?? ""} ${i.tags.join(" ")}`).join(" "));
  const list: Candidate[] = [];

  for (const a of catalog.artists) {
    list.push({
      kind: "artist", id: a.id, artist: a, categories: a.categories,
      text: normalizeText(`${a.displayName} ${a.bio} ${a.specialties.join(" ")}`), pictureText: pictures(a.gallery),
      price: null, priceRelevant: false, city: a.location?.city ?? null, online: false,
      unknown: a.location ? [] : ["location"],
    });
  }
  for (const p of catalog.products) {
    const a = artistById.get(p.artistId);
    if (!a) continue;
    list.push({
      kind: "product", id: p.id, artist: a, categories: p.categories,
      text: normalizeText(`${p.title} ${p.description} ${p.materials.join(" ")} ${artistText(a)}`), pictureText: pictures(a.gallery?.filter((g) => g.productId === p.id)),
      price: p.price, priceRelevant: true, city: a.location?.city ?? null, online: false,
      unknown: p.price ? [] : ["price"],
    });
  }
  for (const s of catalog.services) {
    const a = artistById.get(s.artistId);
    if (!a) continue;
    list.push({
      kind: "service", id: s.id, artist: a, categories: s.categories,
      text: normalizeText(`${s.title} ${s.description} ${artistText(a)}`), pictureText: "",
      price: s.priceFrom, priceRelevant: true, city: a.location?.city ?? null, online: false,
      unknown: s.priceFrom ? [] : ["price"],
    });
  }
  for (const e of catalog.events) {
    const a = artistById.get(e.artistId);
    if (!a || new Date(e.endsAt) < now) continue;
    list.push({
      kind: "event", id: e.id, artist: a, categories: e.categories,
      text: normalizeText(`${e.title} ${e.description} ${e.type} ${artistText(a)}`), pictureText: "",
      price: e.pricingMode === "free" ? { amount: 0, currency: "TND" } : e.price,
      priceRelevant: true, city: e.city, online: e.isOnline,
      unknown: [...(e.pricingMode !== "free" && !e.price ? ["price"] : []), ...(e.capacity == null ? ["capacity"] : [])],
    });
  }
  return list;
}

export function search(catalog: Catalog, filter: SearchFilter, opts: { limit?: number; eventTypes?: string[]; now?: Date } = {}): SearchHit[] {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 8;
  const words = tokenize(filter.text).filter((w) => !STOP_WORDS.has(w));
  const wantCats = new Set(filter.categories);
  const hasIntent = wantCats.size > 0 || words.length > 0 || (opts.eventTypes?.length ?? 0) > 0 || filter.kinds.length > 0;
  if (!hasIntent && !filter.city) return [];

  const hits: SearchHit[] = [];
  for (const c of candidates(catalog, now)) {
    if (filter.kinds.length && !filter.kinds.includes(c.kind)) continue;
    if (filter.city && !c.online && c.city !== filter.city) continue;
    if (filter.maxBudget != null && c.priceRelevant && c.price && c.price.amount > filter.maxBudget) continue;
    if (filter.kinds.includes("artist") && filter.kinds.includes("service") && c.kind === "artist" && !c.artist?.acceptsCommissions) continue;

    let score = 0;
    const matched: string[] = [];

    const catHits = c.categories.filter((cat) => wantCats.has(cat));
    if (catHits.length) {
      score += 3 * catHits.length;
      matched.push(...catHits.map((cat) => `category:${cat}`));
    }
    for (const w of words) {
      if (w.length > 2 && c.text.includes(w)) {
        score += 1;
        matched.push(`word:${w}`);
      }
      if (w.length > 2 && c.pictureText.includes(w)) {
        // matched by what the artist's photos actually show
        score += 1.5;
        matched.push(`picture:${w}`);
      }
    }
    if (c.kind === "event" && opts.eventTypes?.length) {
      if (opts.eventTypes.some((t) => c.text.includes(t))) {
        score += 2;
        matched.push("event-type");
      }
    }
    // When the request names a craft, weak word-only matches from other crafts are noise
    if (wantCats.size > 0 && catHits.length === 0 && score < 2 && !matched.some((m) => m.startsWith("picture:"))) continue;
    // A kind-only query ("events", "workshops") lists everything of that kind
    if (score === 0 && filter.kinds.length && wantCats.size === 0 && words.length === 0) score = 0.5;
    // A city-only query lists everything in that city
    if (score === 0 && filter.city && !hasIntent) score = 0.5;
    if (score <= 0) continue;

    if (filter.city && c.city === filter.city) matched.push(`city:${filter.city}`);
    if (filter.maxBudget != null && c.price) matched.push("within-budget");
    if (filter.maxBudget != null && c.priceRelevant && !c.price) score -= 0.25; // unknown price ranks lower
    if (c.kind !== "artist") score += 0.1; // concrete offers slightly above profiles

    hits.push({ kind: c.kind, id: c.id, score, matched, unknown: c.unknown });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
