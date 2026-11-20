/**
 * Hybrid recommender, pure functions (no I/O) so they can be unit-tested.
 *
 * score = 0.55 · content   (cosine similarity of multilingual embeddings, pgvector)
 *       + 0.25 · coView    (other visitors who viewed the seed also viewed this item, normalised)
 *       + 0.10 · popularity (views in the last 30 days, log-scaled and normalised)
 *       + 0.10 · context   (same category / technique / materials as the seed)
 * then diversity re-ranking (MMR-style): an item from an artist already picked, or of a category already
 * picked, is penalised, so suggestions are not five works by the same person.
 */

export interface Candidate {
  id: string;
  artistId: string;
  category: string;
  materials: string[];
  technique: string | null;
  isDemo: boolean;
}

export interface Signals {
  content: Map<string, number>;   // id -> cosine similarity in [-1, 1]
  coView: Map<string, number>;    // id -> co-view count with the seed(s)
  views: Map<string, number>;     // id -> views in the window
}

export type Reason = "content" | "coView" | "popular" | "sameCategory" | "sameTechnique";

export interface Scored {
  id: string;
  score: number;
  parts: { content: number; coView: number; popularity: number; context: number };
  reasons: Reason[];
}

export const WEIGHTS = { content: 0.55, coView: 0.25, popularity: 0.1, context: 0.1 } as const;

const maxOf = (m: Map<string, number>) => Math.max(0, ...m.values());

export function score(cands: Candidate[], sig: Signals, seed?: Candidate): Scored[] {
  const coMax = maxOf(sig.coView);
  const popMax = Math.log1p(maxOf(sig.views));
  return cands.map((c) => {
    const content = Math.max(0, sig.content.get(c.id) ?? 0);
    const coView = coMax ? (sig.coView.get(c.id) ?? 0) / coMax : 0;
    const popularity = popMax ? Math.log1p(sig.views.get(c.id) ?? 0) / popMax : 0;
    const sameCategory = Boolean(seed && c.category && c.category === seed.category);
    const sameTechnique = Boolean(seed?.technique && c.technique && firstWord(c.technique) === firstWord(seed.technique));
    const sharedMaterial = Boolean(seed && c.materials.some((m) => seed.materials.includes(m)));
    const context = (sameCategory ? 0.5 : 0) + (sameTechnique ? 0.3 : 0) + (sharedMaterial ? 0.2 : 0);
    const total = WEIGHTS.content * content + WEIGHTS.coView * coView + WEIGHTS.popularity * popularity + WEIGHTS.context * context
      + (c.isDemo ? 0 : 0.03); // small preference for real creators over demo profiles
    const reasons: Reason[] = [];
    if (coView >= 0.5) reasons.push("coView");
    if (sameTechnique) reasons.push("sameTechnique");
    else if (sameCategory) reasons.push("sameCategory");
    if (content >= 0.5 && !reasons.length) reasons.push("content");
    if (popularity >= 0.8 && reasons.length < 2) reasons.push("popular");
    if (!reasons.length) reasons.push("content");
    return { id: c.id, score: total, parts: { content, coView, popularity, context }, reasons };
  });
}

/** Greedy diversity re-ranking: penalise repeated artists (0.15) and categories (0.05). */
export function diversify(scored: Scored[], byId: Map<string, Candidate>, k: number): Scored[] {
  const pool = [...scored].sort((a, b) => b.score - a.score);
  const out: Scored[] = [];
  const artists = new Map<string, number>();
  const cats = new Map<string, number>();
  while (out.length < k && pool.length) {
    let best = 0;
    let bestVal = -Infinity;
    pool.forEach((s, i) => {
      const c = byId.get(s.id)!;
      const v = s.score - 0.15 * (artists.get(c.artistId) ?? 0) - 0.05 * (cats.get(c.category) ?? 0);
      if (v > bestVal) { bestVal = v; best = i; }
    });
    const [pick] = pool.splice(best, 1);
    const c = byId.get(pick.id)!;
    artists.set(c.artistId, (artists.get(c.artistId) ?? 0) + 1);
    cats.set(c.category, (cats.get(c.category) ?? 0) + 1);
    out.push(pick);
  }
  return out;
}

/** Mean of L2-normalised vectors, renormalised: a visitor's "taste" vector. */
export function tasteVector(vectors: number[][]): number[] | null {
  if (!vectors.length) return null;
  const m = vectors[0].map((_, i) => vectors.reduce((s, v) => s + v[i], 0) / vectors.length);
  const n = Math.hypot(...m) || 1;
  return m.map((x) => x / n);
}

/** Co-view counts: for each item, number of visitors who viewed it and at least one seed item. */
export function coViews(rows: { visitor_id: string; product_id: string | null }[], seeds: Set<string>): Map<string, number> {
  const byVisitor = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.product_id) continue;
    if (!byVisitor.has(r.visitor_id)) byVisitor.set(r.visitor_id, new Set());
    byVisitor.get(r.visitor_id)!.add(r.product_id);
  }
  const out = new Map<string, number>();
  for (const items of byVisitor.values()) {
    if (![...items].some((i) => seeds.has(i))) continue;
    for (const i of items) if (!seeds.has(i)) out.set(i, (out.get(i) ?? 0) + 1);
  }
  return out;
}

export function parseVector(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === "string" && v.startsWith("[")) return JSON.parse(v) as number[];
  return null;
}

function firstWord(s: string) {
  return s.toLowerCase().split(/[\s,-]+/)[0];
}
