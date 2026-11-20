// Fills complete Savoir-faire passports on DEMO products only (artists flagged is_demo, shown as "Demo ·"),
// and adds a few demo products, so the jury can see what a fully declared passport looks like.
// The facts are synthetic but plausible for each city's craft tradition. Real artisans' products are never touched:
// their passports only show what the artisan declared.
// Usage: node --env-file=.env.local scripts/seed-demo-passports.mjs
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// [artist slug, title, passport fields, product fields for new items]
const PASSPORTS = [
  ["demo-nabeul-clay-studio", "Hand-painted serving bowl", {
    technique: "Wheel-thrown earthenware, hand-painted with mineral glazes, kiln-fired twice", origin_city: "Nabeul", hours_to_make: 6,
    local_materials: true, recycled_materials: false, repairable: false, care_instructions: "Hand wash. Not for the oven or microwave.",
  }],
  ["demo-nabeul-clay-studio", "Set of six decorative tiles", {
    technique: "Pressed clay tiles, hand-painted floral pattern, glazed", origin_city: "Nabeul", hours_to_make: 10,
    local_materials: true, recycled_materials: false, repairable: false, care_instructions: "Wipe with a damp cloth. Fix with tile adhesive.",
  }],
  ["demo-kairouan-carpets", "Mergoum wall rug", {
    technique: "Flat-woven mergoum on a vertical loom, hand-spun wool, natural dyes", origin_city: "Kairouan", hours_to_make: 120,
    local_materials: true, recycled_materials: false, repairable: true, care_instructions: "Shake out, air in the shade, no machine wash. Re-weaving offered.",
  }],
  ["demo-tunis-oil-painter", "Original oil painting: Medina doorway", {
    technique: "Oil on stretched linen, painted from life in the Medina", origin_city: "Tunis", hours_to_make: 40,
    local_materials: false, recycled_materials: false, repairable: true, care_instructions: "Keep out of direct sun and humidity. Retouching offered by the painter.",
  }],
  ["demo-sfax-woodcraft", "Olive-wood dining table", {
    technique: "Solid olive wood, hand-planed, mortise-and-tenon joints, oil finish", origin_city: "Sfax", hours_to_make: 80,
    local_materials: true, recycled_materials: true, repairable: true, care_instructions: "Re-oil every few months. Wood comes from olive trees no longer producing fruit.",
  }],
  ["demo-sfax-woodcraft", "Olive-wood salad bowl", {
    technique: "Lathe-turned olive wood, food-safe oil finish", origin_city: "Sfax", hours_to_make: 4,
    local_materials: true, recycled_materials: true, repairable: true, care_instructions: "Hand wash, dry at once, oil when it looks pale.",
  }],
  ["demo-djerba-silver", "Silver khomsa pendant", {
    technique: "Hand-cut and chased sterling silver", origin_city: "Houmt Souk, Djerba", hours_to_make: 5,
    local_materials: false, recycled_materials: true, repairable: true, care_instructions: "Polish with a soft cloth. Silver partly melted down from old jewellery.",
  }],
  ["demo-bizerte-leather", "Leather tote bag", {
    technique: "Vegetable-tanned leather, hand saddle-stitched", origin_city: "Bizerte", hours_to_make: 12,
    local_materials: true, recycled_materials: false, repairable: true, care_instructions: "Nourish with leather balm. Stitching repaired free for life.",
  }],
  // New demo products
  ["demo-kairouan-carpets", "Kilim cushion cover", {
    technique: "Flat-woven kilim from wool offcuts of larger rugs", origin_city: "Kairouan", hours_to_make: 14,
    local_materials: true, recycled_materials: true, repairable: true, care_instructions: "Hand wash cold, dry flat.",
  }, { price_amount: 75, stock: 4, materials: ["wool"], categories: ["textiles"], description: "Cushion cover woven from wool left over from larger rugs. 45 × 45 cm, cushion not included." }],
  ["demo-djerba-silver", "Filigree silver earrings", {
    technique: "Silver filigree, twisted wire soldered by hand", origin_city: "Houmt Souk, Djerba", hours_to_make: 8,
    local_materials: false, recycled_materials: true, repairable: true, care_instructions: "Store dry, polish gently.",
  }, { price_amount: 95, stock: 3, materials: ["silver"], categories: ["jewelry"], description: "Light filigree earrings in the Djerba tradition." }],
  ["demo-bizerte-leather", "Card wallet from leather offcuts", {
    technique: "Leather offcuts, hand saddle-stitched", origin_city: "Bizerte", hours_to_make: 3,
    local_materials: true, recycled_materials: true, repairable: true, care_instructions: "Leather balm once a year.",
  }, { price_amount: 45, stock: 8, materials: ["leather"], categories: ["leather"], description: "Slim card wallet cut from offcuts of bags made in the workshop." }],
  ["demo-sidi-bou-said-photo", "Signed print: blue door", {
    technique: "Archival pigment print on cotton paper, signed and numbered (edition of 30)", origin_city: "Sidi Bou Said", hours_to_make: 2,
    local_materials: false, recycled_materials: false, repairable: false, care_instructions: "Frame behind UV-protective glass, away from damp walls.",
  }, { price_amount: 120, stock: 30, materials: ["cotton paper", "pigment ink"], categories: ["photography"], description: "A Sidi Bou Said door photographed at dawn. 30 × 40 cm." }],
];

const { data: artists, error: ae } = await db.from("artist_profiles").select("id, slug, is_demo").like("slug", "demo-%");
if (ae) throw ae;
for (const [slug, title, passport, extra] of PASSPORTS) {
  const artist = artists.find((a) => a.slug === slug);
  if (!artist?.is_demo) { console.log(`skip ${slug}: not a demo artist`); continue; }
  const { data: existing } = await db.from("products").select("id").eq("artist_id", artist.id).eq("title", title).maybeSingle();
  let id = existing?.id;
  if (!id) {
    if (!extra) { console.log(`missing ${title}`); continue; }
    const { categories, ...fields } = extra;
    const { data, error } = await db.from("products").insert({
      artist_id: artist.id, title, status: "published", availability: "in_stock", delivery_options: ["pickup", "local_delivery"], ...fields, ...passport,
    }).select("id").single();
    if (error) throw error;
    id = data.id;
    await db.from("product_categories").insert(categories.map((c) => ({ product_id: id, category_slug: c })));
    console.log(`added  ${title}`);
  } else {
    const { error } = await db.from("products").update(passport).eq("id", id);
    if (error) throw error;
    console.log(`filled ${title}`);
  }
}
