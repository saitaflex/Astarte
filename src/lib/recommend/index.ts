import "server-only";
import { getCatalog } from "@/lib/data/repository";
import type { Artist, Product } from "@/lib/data/types";
import { supabaseAdmin } from "@/lib/supabase/server";
import { coViews, diversify, parseVector, score, tasteVector, type Candidate, type Reason, type Scored } from "./engine";

export const VISITOR_COOKIE = "astarte_vid";
const DAY = 86_400_000;

export interface ProductPick { product: Product; artist: Artist; score: number; reasons: Reason[]; match: number }
export interface ArtistPick { artist: Artist; match: number; sharedCategory: boolean }

export async function recordInteraction(visitor: string, kind: string, productId: string | null, artistId: string | null, source: string | null) {
  const db = supabaseAdmin();
  await db.from("interactions").insert({ visitor_id: visitor, kind, product_id: productId, artist_id: artistId, source });
  // Keep the simple counters in sync so studio dashboards and KPIs read real numbers.
  if (kind === "view_product" && productId) {
    const { data } = await db.from("products").select("views").eq("id", productId).single();
    if (data) await db.from("products").update({ views: data.views + 1 }).eq("id", productId);
  }
  if (kind === "contact_click" && artistId) {
    const { data } = await db.from("artist_profiles").select("contact_clicks").eq("id", artistId).single();
    if (data) await db.from("artist_profiles").update({ contact_clicks: data.contact_clicks + 1 }).eq("id", artistId);
  }
}

export async function logSearch(query: string, locale: string, artistIds: string[], productIds: string[]) {
  await supabaseAdmin().from("search_events").insert({ query: query.slice(0, 300), locale, artist_ids: artistIds, product_ids: productIds });
}

function candidates(products: Product[], artists: Map<string, Artist>): Map<string, Candidate> {
  return new Map(products.filter((p) => artists.has(p.artistId)).map((p) => [p.id, {
    id: p.id, artistId: p.artistId, category: p.categories[0] ?? "", materials: p.materials,
    technique: p.passport?.technique ?? null, isDemo: Boolean(artists.get(p.artistId)!.isDev),
  }]));
}

async function viewRows() {
  const since = new Date(Date.now() - 90 * DAY).toISOString();
  const { data } = await supabaseAdmin().from("interactions").select("visitor_id, product_id").eq("kind", "view_product").gte("created_at", since).limit(20000);
  return data ?? [];
}

function viewCounts(rows: { product_id: string | null }[]) {
  const m = new Map<string, number>();
  for (const r of rows) if (r.product_id) m.set(r.product_id, (m.get(r.product_id) ?? 0) + 1);
  return m;
}

function toPicks(ranked: Scored[], products: Map<string, Product>, artists: Map<string, Artist>): ProductPick[] {
  return ranked.map((s) => {
    const product = products.get(s.id)!;
    return { product, artist: artists.get(product.artistId)!, score: s.score, reasons: s.reasons, match: Math.round(s.parts.content * 100) };
  });
}

/** "You may also like": works similar to one product. */
export async function similarProducts(productId: string, k = 4): Promise<ProductPick[]> {
  try {
    const { products, artists } = await getCatalog();
    const aMap = new Map(artists.map((a) => [a.id, a]));
    const pMap = new Map(products.map((p) => [p.id, p]));
    const cands = candidates(products, aMap);
    const seed = cands.get(productId);
    if (!seed) return [];
    const [{ data: near }, rows] = await Promise.all([supabaseAdmin().rpc("similar_products", { p_id: productId, k: 16 }), viewRows()]);
    const content = new Map<string, number>((near ?? []).map((r: { id: string; similarity: number }) => [r.id, r.similarity]));
    const pool = [...content.keys()].map((id) => cands.get(id)).filter(Boolean) as Candidate[];
    const scored = score(pool, { content, coView: coViews(rows, new Set([productId])), views: viewCounts(rows) }, seed);
    return toPicks(diversify(scored, cands, k), pMap, aMap);
  } catch {
    return [];
  }
}

/** "For you": personalised from this visitor's recent views; popular and diverse when there is no history. */
export async function forVisitor(visitor: string | undefined, k = 4): Promise<{ picks: ProductPick[]; personalised: boolean }> {
  try {
    const { products, artists } = await getCatalog();
    const aMap = new Map(artists.map((a) => [a.id, a]));
    const pMap = new Map(products.map((p) => [p.id, p]));
    const cands = candidates(products, aMap);
    const db = supabaseAdmin();
    const rows = await viewRows();
    const views = viewCounts(rows);
    const seen = new Set(rows.filter((r) => r.visitor_id === visitor && r.product_id).map((r) => r.product_id!));
    let content = new Map<string, number>();
    if (seen.size) {
      const { data } = await db.from("products").select("id, embedding").in("id", [...seen]);
      const taste = tasteVector((data ?? []).map((r) => parseVector(r.embedding)).filter(Boolean) as number[][]);
      if (taste) {
        const { data: near } = await db.rpc("products_near", { v: `[${taste.join(",")}]`, k: 24 });
        content = new Map((near ?? []).map((r: { id: string; similarity: number }) => [r.id, r.similarity]));
      }
    }
    const pool = [...cands.values()].filter((c) => !seen.has(c.id));
    const scored = score(pool, { content, coView: coViews(rows, seen), views });
    return { picks: toPicks(diversify(scored, cands, k), pMap, aMap), personalised: content.size > 0 };
  } catch {
    return { picks: [], personalised: false };
  }
}

/** Creators close to this one (embedding similarity), at most one per category among the first picks. */
export async function similarArtists(artistId: string, k = 3): Promise<ArtistPick[]> {
  try {
    const { artists } = await getCatalog();
    const aMap = new Map(artists.map((a) => [a.id, a]));
    const me = aMap.get(artistId);
    const { data } = await supabaseAdmin().rpc("similar_artists", { a_id: artistId, k: 12 });
    const out: ArtistPick[] = [];
    const cats = new Set<string>();
    for (const r of (data ?? []) as { id: string; similarity: number }[]) {
      const a = aMap.get(r.id);
      if (!a || (cats.has(a.primaryCategory) && out.length < k - 1)) continue;
      cats.add(a.primaryCategory);
      out.push({ artist: a, match: Math.round(Math.max(0, r.similarity) * 100), sharedCategory: a.primaryCategory === me?.primaryCategory });
      if (out.length === k) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** Clients for an artist: real searches (last 30 days) where Astarte showed this artist or their works. */
export async function demandForArtist(artistId: string, productIds: string[]) {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const filters = [`artist_ids.cs.{${artistId}}`, ...(productIds.length ? [`product_ids.ov.{${productIds.join(",")}}`] : [])];
  const [{ data: searches }, { count: views }, { count: contacts }, { count: recoClicks }] = await Promise.all([
    db.from("search_events").select("query, created_at").or(filters.join(",")).gte("created_at", since).order("created_at", { ascending: false }).limit(200),
    db.from("interactions").select("*", { count: "exact", head: true }).or(`artist_id.eq.${artistId}${productIds.length ? `,product_id.in.(${productIds.join(",")})` : ""}`).in("kind", ["view_artist", "view_product"]).gte("created_at", since),
    db.from("interactions").select("*", { count: "exact", head: true }).eq("artist_id", artistId).eq("kind", "contact_click").gte("created_at", since),
    db.from("interactions").select("*", { count: "exact", head: true }).eq("kind", "recommendation_click").or(`artist_id.eq.${artistId}${productIds.length ? `,product_id.in.(${productIds.join(",")})` : ""}`).gte("created_at", since),
  ]);
  const counts = new Map<string, number>();
  for (const s of searches ?? []) {
    const q = s.query.trim().toLowerCase();
    counts.set(q, (counts.get(q) ?? 0) + 1);
  }
  return {
    searches: searches?.length ?? 0,
    topQueries: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    views: views ?? 0, contacts: contacts ?? 0, recoClicks: recoClicks ?? 0,
  };
}
