// Computes multilingual embeddings for every product and artist and stores them in pgvector.
// Model: Xenova/paraphrase-multilingual-MiniLM-L12-v2 (384 dims, 50+ languages incl. FR, EN, AR), run locally.
// Product text = title + description + technique + materials + categories + AI descriptions/tags of its photos.
// Artist vector = normalised mean of its own text and its products' vectors.
// Usage: node --env-file=.env.local scripts/embed-catalog.mjs
import { pipeline } from "@huggingface/transformers";
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const embed = await pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2", { dtype: "q8" });
const vec = async (text) => Array.from((await embed(text.slice(0, 2000), { pooling: "mean", normalize: true })).data);
const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const mean = (vs) => norm(vs[0].map((_, i) => vs.reduce((s, v) => s + v[i], 0) / vs.length));
const lit = (v) => `[${v.map((x) => x.toFixed(6)).join(",")}]`;

const { data: products, error } = await db.from("products")
  .select("id, artist_id, title, description, technique, materials, product_categories(category_slug)").eq("status", "published");
if (error) throw error;
const { data: imgs } = await db.from("portfolio_images").select("product_id, artist_id, ai_description, tags, caption");
const { data: artists } = await db.from("artist_profiles").select("id, display_name, bio, primary_category, specialties").eq("approval_status", "approved");

const productVec = new Map();
for (const p of products) {
  const pics = (imgs ?? []).filter((i) => i.product_id === p.id);
  const text = [p.title, p.description, p.technique, (p.materials ?? []).join(", "),
    (p.product_categories ?? []).map((c) => c.category_slug).join(", "),
    ...pics.map((i) => [i.caption, i.ai_description, (i.tags ?? []).join(", ")].filter(Boolean).join(". "))].filter(Boolean).join(". ");
  const v = await vec(text);
  productVec.set(p.id, v);
  const { error: e } = await db.from("products").update({ embedding: lit(v) }).eq("id", p.id);
  if (e) throw e;
}
console.log(`products embedded: ${productVec.size}`);

let n = 0;
for (const a of artists ?? []) {
  const pics = (imgs ?? []).filter((i) => i.artist_id === a.id && !i.product_id);
  const own = await vec([a.display_name, a.bio, a.primary_category, (a.specialties ?? []).join(", "),
    ...pics.slice(0, 6).map((i) => [i.caption, i.ai_description].filter(Boolean).join(". "))].filter(Boolean).join(". "));
  const prods = products.filter((p) => p.artist_id === a.id).map((p) => productVec.get(p.id));
  const v = prods.length ? mean([own, ...prods]) : own;
  const { error: e } = await db.from("artist_profiles").update({ embedding: lit(v) }).eq("id", a.id);
  if (e) throw e;
  n++;
}
console.log(`artists embedded: ${n}`);
