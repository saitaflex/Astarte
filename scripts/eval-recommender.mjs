// Offline evaluation of the content recommender against a label it never sees directly: the product category.
// For every published product, take its top-3 neighbours from pgvector and measure how many share its category
// (precision@3), compared with what random suggestions would give. Also reports coverage.
// Usage: node --env-file=.env.local scripts/eval-recommender.mjs
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: prods, error } = await db.from("products")
  .select("id, title, product_categories(category_slug), artist_profiles!inner(approval_status)")
  .eq("status", "published").eq("artist_profiles.approval_status", "approved").not("embedding", "is", null);
if (error) throw error;
const cat = new Map(prods.map((p) => [p.id, new Set(p.product_categories.map((c) => c.category_slug))]));
const shares = (a, b) => [...cat.get(a)].some((c) => cat.get(b)?.has(c));

let hits = 0, total = 0, randomHits = 0, randomTotal = 0;
const shown = new Set();
for (const p of prods) {
  const { data: near } = await db.rpc("similar_products", { p_id: p.id, k: 3 });
  for (const n of near ?? []) { total++; shown.add(n.id); if (shares(p.id, n.id)) hits++; }
  for (const q of prods) if (q.id !== p.id) { randomTotal++; if (shares(p.id, q.id)) randomHits++; }
}
const p3 = hits / total, rnd = randomHits / randomTotal;
console.log(JSON.stringify({
  products: prods.length,
  precision_at_3: +p3.toFixed(3),
  random_baseline: +rnd.toFixed(3),
  lift: +(p3 / rnd).toFixed(2),
  catalog_coverage: +(shown.size / prods.length).toFixed(3),
  measured_at: new Date().toISOString(),
}, null, 2));
