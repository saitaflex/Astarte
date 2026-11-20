import "server-only";
import { z } from "zod";
import { getChatProvider, ProviderUnavailableError } from "@/lib/ai/provider";
import { CATEGORIES } from "@/lib/data/categories";
import { getRepository, type Catalog } from "@/lib/data/repository";
import type { GalleryImage, RecordKind, SearchFilter, SearchHit } from "@/lib/data/types";
import type { Locale } from "@/lib/i18n/config";
import { CITIES } from "@/lib/search/dictionary";
import { normalizeText, tokenize } from "@/lib/search/normalize";
import { parseQuery } from "@/lib/search/parse";
import { search } from "@/lib/search/search";
import { parseJsonObject, validateExplanation } from "./guard";
import type { DiscoveryResponse, ResultCard } from "./types";

const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
const CITY_NAMES = CITIES.map((c) => c.city);

const InterpretSchema = z.object({
  categories: z.array(z.string()).default([]),
  city: z.string().nullable().default(null),
  maxBudget: z.number().positive().nullable().default(null),
  kind: z.enum(["product", "service", "commission", "event", "any"]).default("any"),
  keywords: z.array(z.string()).default([]),
});

const INTERPRET_PROMPT = `You convert a customer's request for handmade or creative work into search filters for a Tunisian marketplace of real human artists.
The request may be in English, French, Arabic, Tunisian Derja, or Derja written in Latin letters with digits (Arabizi: 3=ع, 7=ح, 9=ق, 5=خ).
Return ONLY a JSON object: {"categories": string[], "city": string|null, "maxBudget": number|null, "kind": "product"|"service"|"commission"|"event"|"any", "keywords": string[]}.
- categories: choose only from this list: ${CATEGORY_SLUGS.join(", ")}.
- city: choose only from: ${CITY_NAMES.join(", ")}; null if none is named.
- maxBudget: a number in Tunisian dinars if the customer states a maximum, else null.
- kind: "event" for workshops, classes, exhibitions, concerts or markets; "commission" for custom-made work; "service" for hiring someone; "product" for ready-made items; otherwise "any".
- keywords: up to 5 short words in English or French describing the object or style.
Never invent anything else. Do not propose designs.`;

function mergeInterpretation(base: SearchFilter, raw: unknown): SearchFilter {
  const parsed = InterpretSchema.safeParse(raw);
  if (!parsed.success) return base;
  const llm = parsed.data;
  // Crafts recognised by the dictionary are certain; the model only fills in when none were found.
  const categories = new Set(base.categories.length ? base.categories : llm.categories.filter((c) => CATEGORY_SLUGS.includes(c)));
  const city = base.city ?? (llm.city && CITY_NAMES.includes(llm.city) ? llm.city : null);
  let kinds = base.kinds;
  if (!kinds.length) {
    // The model's guess only narrows to clear types. "commission"/"service" guesses would
    // hide ready-made works that fit, so they search everything (explicit words like
    // "custom" or "sur mesure" are still honoured by the keyword parser above).
    if (llm.kind === "event") kinds = ["event"];
    else if (llm.kind === "product") kinds = ["product"];
  }
  const keywords = llm.keywords.slice(0, 5).join(" ");
  return {
    ...base,
    categories: [...categories],
    city,
    maxBudget: base.maxBudget ?? llm.maxBudget,
    kinds,
    text: [base.text, keywords].filter(Boolean).join(" "),
  };
}

/** Picks the picture whose caption/description/tags best match the request words. */
function bestPicture(gallery: GalleryImage[] | undefined, words: string[], productId?: string): GalleryImage | null {
  const pool = (gallery ?? []).filter((g) => productId === undefined || g.productId === productId);
  let best: GalleryImage | null = pool[0] ?? null;
  let bestScore = 0;
  for (const g of pool) {
    const text = normalizeText(`${g.caption ?? ""} ${g.description ?? ""} ${g.tags.join(" ")}`);
    const score = words.filter((w) => w.length > 2 && text.includes(w)).length;
    if (score > bestScore) {
      best = g;
      bestScore = score;
    }
  }
  return best;
}

function toCard(hit: SearchHit, catalog: Catalog, words: string[] = []): ResultCard | null {
  const artists = new Map(catalog.artists.map((a) => [a.id, a]));
  const artistRef = (id: string) => {
    const a = artists.get(id);
    return a ? { name: a.displayName, slug: a.slug, city: a.location?.city ?? null, isDev: a.isDev } : null;
  };
  const base = { matched: hit.matched, unknown: hit.unknown, isOnline: false, startsAt: null, availability: null, subtitle: null };

  if (hit.kind === "artist") {
    const a = artists.get(hit.id);
    if (!a) return null;
    return {
      ...base, kind: "artist", id: a.id, title: a.displayName, subtitle: a.specialties.slice(0, 3).join(" · ") || null,
      artist: artistRef(a.id)!, categories: a.categories, ...(() => { const g = bestPicture(a.gallery, words); return { image: g?.url ?? a.coverImage ?? null, pictureNote: g?.description ?? g?.caption ?? null }; })(), price: null, priceLabel: "none",
      availability: a.acceptsCommissions ? "commissions" : null,
    };
  }
  if (hit.kind === "product") {
    const p = catalog.products.find((x) => x.id === hit.id);
    const ref = p && artistRef(p.artistId);
    if (!p || !ref) return null;
    return { ...base, kind: "product", id: p.id, title: p.title, subtitle: p.description, artist: ref, categories: p.categories, ...(() => { const g = bestPicture(artists.get(p.artistId)?.gallery, words, p.id); return { image: g?.url ?? p.images?.[0] ?? artists.get(p.artistId)?.coverImage ?? null, pictureNote: g?.description ?? null }; })(), price: p.price, priceLabel: p.price ? "fixed" : "on_request", availability: p.availability };
  }
  if (hit.kind === "service") {
    const s = catalog.services.find((x) => x.id === hit.id);
    const ref = s && artistRef(s.artistId);
    if (!s || !ref) return null;
    return { ...base, kind: "service", id: s.id, title: s.title, subtitle: s.description, artist: ref, categories: s.categories, image: artists.get(s.artistId)?.coverImage ?? null, price: s.priceFrom, priceLabel: s.priceFrom ? "from" : "on_request" };
  }
  const e = catalog.events.find((x) => x.id === hit.id);
  const ref = e && artistRef(e.artistId);
  if (!e || !ref) return null;
  return {
    ...base, kind: "event", id: e.id, title: e.title, subtitle: e.description, artist: { ...ref, city: e.city },
    categories: e.categories, image: artists.get(e.artistId)?.coverImage ?? null, price: e.price, priceLabel: e.pricingMode === "free" ? "free" : e.price ? "fixed" : "on_request",
    startsAt: e.startsAt, isOnline: e.isOnline,
  };
}

const EXPLAIN_PROMPT = (locale: Locale) => `You explain search results on Astarte, a platform of real human artists and artisans.
You receive the customer's request and a JSON list of REAL records retrieved from the database.
Write in ${locale === "fr" ? "French" : locale === "ar" ? "Arabic (Modern Standard, simple)" : "English"}.
Return ONLY JSON: {"intro": string, "items": [{"id": string, "reason": string}], "question": string|null}.
Rules:
- Use only the ids given. Never mention any artist, product, price, date or place that is not in the records.
- "reason": one short sentence (max 20 words) on why the record matches the request, using only its fields.
- If a price or date is missing, do not guess it.
- "picture" describes the matching photo. You may say what the photo shows when it explains the match (e.g. "their photos show mosaic tables with palm leaves"), but never claim from it who made the work or how.
- Never propose a design, style or idea for the artist to make. The artist decides.
- Never say an artist is available or has accepted anything.
- "intro": one short sentence. "question": one short clarifying question only if it would clearly improve results, else null.`;

export async function discover(query: string, locale: Locale): Promise<DiscoveryResponse> {
  const repo = await getRepository();
  const catalog = await repo.catalog();
  const parsed = parseQuery(query);
  const provider = getChatProvider();
  let ai: DiscoveryResponse["ai"] = provider ? "on" : "off";
  let filter = parsed.filter;

  if (provider) {
    try {
      const reply = await provider.chat(
        [
          { role: "system", content: INTERPRET_PROMPT },
          { role: "user", content: query.slice(0, 500) },
        ],
        { model: "parse", json: true, maxTokens: 1000 },
      );
      filter = mergeInterpretation(filter, parseJsonObject(reply));
    } catch (err) {
      if (!(err instanceof ProviderUnavailableError)) throw err;
      console.warn("interpret step failed:", err.message);
      ai = "error";
    }
  }

  let hits = search(catalog, filter, { eventTypes: parsed.eventTypes });
  // If a kind restriction (e.g. "products only") leaves nothing in the requested craft,
  // widen to every kind so an artist who works in that craft is still found.
  const inCraft = (h: SearchHit) => h.matched.some((m) => m.startsWith("category:"));
  // Only widen when nothing matched well: strong word matches beat a (possibly wrong) craft guess.
  if (filter.kinds.length && filter.categories.length && !hits.some(inCraft) && !hits.some((h) => h.score >= 2)) {
    const wider = search(catalog, { ...filter, kinds: [] }, { eventTypes: parsed.eventTypes });
    if (wider.some(inCraft)) hits = wider.filter(inCraft);
  }
  // Artists whose photos clearly show what was asked for are always offered,
  // even if the request was narrowed to another type (e.g. events).
  // Needs at least one photo match and two distinct matching words in total.
  const pictureBacked = (h: SearchHit) =>
    h.matched.some((m) => m.startsWith("picture:")) &&
    new Set(h.matched.filter((m) => m.startsWith("picture:") || m.startsWith("word:")).map((m) => m.split(":")[1])).size >= 2;
  const byPicture = search(catalog, { ...filter, kinds: ["artist"], categories: [] }, { eventTypes: parsed.eventTypes })
    .filter((h) => pictureBacked(h) && !hits.some((x) => x.id === h.id))
    .slice(0, 2);
  if (byPicture.length) hits = [...hits, ...byPicture].sort((a, b) => b.score - a.score).slice(0, 8);
  const words = [...new Set([...tokenize(query), ...tokenize(filter.text)])];
  const results = hits.map((h) => toCard(h, catalog, words)).filter((c): c is ResultCard => c !== null);

  let explanation: DiscoveryResponse["explanation"] = null;
  if (provider && results.length) {
    try {
      const records = results.map((r) => ({
        id: r.id, kind: r.kind, title: r.title, description: r.subtitle, artist: r.artist.name, city: r.artist.city,
        categories: r.categories, price: r.price ? `${r.price.amount} ${r.price.currency}` : r.priceLabel === "free" ? "free" : null,
        startsAt: r.startsAt, online: r.isOnline, picture: r.pictureNote ?? null,
      }));
      const reply = await provider.chat(
        [
          { role: "system", content: EXPLAIN_PROMPT(locale) },
          { role: "user", content: JSON.stringify({ request: query.slice(0, 500), records }) },
        ],
        { model: "explain", json: true, maxTokens: 2000 },
      );
      const raw = parseJsonObject(reply);
      if (raw) {
        const v = validateExplanation(raw, new Set(results.map((r) => r.id)));
        explanation = { intro: v.intro, reasons: v.reasons, question: v.question };
      }
    } catch (err) {
      if (!(err instanceof ProviderUnavailableError)) throw err;
      console.warn("explain step failed:", err.message);
      ai = "error";
    }
  }

  // An explanation means the AI worked for this request, even if interpretation fell back to keywords.
  if (explanation) ai = "on";

  return {
    results,
    explanation,
    ai,
    interpreted: { categories: filter.categories, city: filter.city, maxBudget: filter.maxBudget, kinds: filter.kinds as RecordKind[] },
    source: repo.source,
  };
}
