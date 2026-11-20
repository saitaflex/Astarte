// Imports the real artist content supplied in Desktop\artsart\sources.
// Only facts visible in the supplied files are used (names, posters, photos, videos).
// Images are re-encoded (metadata removed) and published as platform-curated content.
// Prices for products were set by the platform owner.
// Idempotent: re-running updates the same profiles and replaces their media and products.
// Usage: node --env-file=.env.local scripts/import-sources.mjs [sourcesDir]
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SRC = process.argv[2] ?? "C:/Users/oussa/Desktop/artsart/sources";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TUNIS = { city: "Tunis", region: "Tunis", lat: 36.8065, lng: 10.1815, privacy: "approximate_city" };
const FS = "fousaifouse/for sale";

const ARTISTS = [
  {
    slug: "cove", name: "Cove", primary: "music", categories: ["music"], specialties: ["band", "live concerts"],
    bio: "Cove is a band. Upcoming: “Glasswing Butterfly”, a live concert at Hotel Saint-Georges, Tunis, on 28 November (doors open 19:30).",
    location: TUNIS, // inferred from the concert venue on the poster; to be confirmed by the band
    images: [
      ["cove/cove band logo.jpg", "Cove logo"],
      ["cove/728597800_17879936022609830_3131360757049060607_n.jpg", "Cove, band photo"],
      ["cove/912374286_17903711853609830_7270541981798794657_n.jpg", "“Cove // Glasswing Butterfly” live concert poster"],
    ],
    event: {
      slug: "cove-glasswing-butterfly", title: "Cove // Glasswing Butterfly — live concert", type: "performance",
      description: "Live concert by Cove at Hotel Saint-Georges, Tunis. Doors open at 19:30.",
      starts_at: "2026-11-28T18:30:00Z", ends_at: "2026-11-28T21:30:00Z", city: "Tunis", pricing_mode: "price_on_request",
    },
  },
  {
    slug: "the-targets", name: "The Targets", primary: "music", categories: ["music"], specialties: ["band", "live music"],
    bio: "The Targets is a band. Photos from their live performances.",
    location: null, // no location in the supplied material: no map marker
    images: [
      ["the targets/the targets band shot.jpg", "The Targets live on stage"],
      ["the targets/the targets logo.jpg", "The Targets logo"],
    ],
  },
  {
    slug: "twisted-reflection", name: "Twisted Reflection", primary: "music", categories: ["music"], specialties: ["band", "live concerts"],
    bio: "Twisted Reflection is a band. They played “Howling Carnival – The Break-In” at Studio B52, Tunis, on 5 September 2026.",
    location: TUNIS, // inferred from the concert venue on the poster; to be confirmed by the band
    images: [
      ["twisted reflection/787574436_18097593449134944_4436500310218296050_n.webp", "“Howling Carnival – The Break-In” poster, Studio B52, Tunis"],
      ["twisted reflection/twisted reflection logo.jpg", "Twisted Reflection logo"],
    ],
  },
  {
    slug: "fousaifouse", name: "Fousaifouse", primary: "mosaic", categories: ["mosaic", "traditional-crafts"], specialties: ["mosaic", "stone and glass tesserae", "mosaic tables"],
    bio: "Mosaic artisan working with stone and glass tesserae: portraits, vases, tables and small decorative pieces. The photos also show a group mosaic workshop.",
    location: null,
    video: "fousaifouse/video.mp4",
    images: [
      ["fousaifouse/WhatsApp Image 2026-11-19 at 4.25.24 PM.jpeg", "Mosaic portrait with masks"],
      ["fousaifouse/WhatsApp Image 2026-11-19 at 7.22.30 PM.jpeg", "Round mosaic table with a tree of life"],
      ["fousaifouse/WhatsApp Image 2026-11-19 at 4.26.10 PM.jpeg", "Mosaic vase with grape motif"],
      ["fousaifouse/WhatsApp Image 2026-11-19 at 7.33.29 PM.jpeg", "Small round mosaic pieces with fish motifs"],
      ["fousaifouse/WhatsApp Image 2026-11-19 at 8.14.06 PM.jpeg", "Group mosaic workshop"],
    ],
    products: [
      {
        title: "Mosaic panel: doves on a blossoming branch",
        description: "Framed stone mosaic panel. A branch of small brown tesserae with white flowers on a green ground, with two doves carved in white marble set in relief.",
        price: 100, stock: 1, materials: ["natural stone", "marble"], categories: ["mosaic", "traditional-crafts"], delivery: ["pickup", "local_delivery"],
        image: `${FS}/WhatsApp Image 2026-11-19 at 5.06.23 PM.jpeg`, featured: true,
      },
      {
        title: "Arched mosaic panel with hoopoe and stone basin",
        description: "Arched mosaic panel in warm yellow stone with a hoopoe among branches, a floral border and a small carved stone basin in relief.",
        price: 100, stock: 1, materials: ["natural stone", "glass tesserae"], categories: ["mosaic", "traditional-crafts"], delivery: ["pickup", "local_delivery"],
        image: `${FS}/WhatsApp Image 2026-11-19 at 5.06.53 PM.jpeg`, featured: true,
      },
      {
        title: "Mosaic coasters with olive branch (gift box)",
        description: "Round stone mosaic coasters with an olive-branch motif, presented in a gift box.",
        price: 90, stock: 5, materials: ["natural stone", "glass"], categories: ["mosaic"], delivery: ["pickup", "local_delivery", "shipping"],
        image: `${FS}/plates.jpeg`,
      },
      {
        title: "Round palm-leaf mosaic side table",
        description: "Round side table with a palm leaf in green glass tesserae on a cream stone mosaic top, on slim metal legs.",
        price: 90, stock: 2, materials: ["stone", "glass tesserae", "metal"], categories: ["mosaic", "furniture-design"], delivery: ["pickup", "local_delivery"],
        image: `${FS}/tables.jpeg`, featured: true,
      },
    ],
  },
  {
    // Name not given in the supplied video: descriptive working name until the artist confirms theirs.
    slug: "wood-carving-atelier", name: "Wood Carving Atelier", primary: "carpentry", categories: ["carpentry", "traditional-crafts"],
    specialties: ["wood carving", "hand chisel and mallet", "carved panels"],
    bio: "Hand wood carving: floral patterns cut into wooden panels with chisel and mallet. Watch the carving in the video.",
    location: null,
    video: "wood/WhatsApp Video 2026-11-19 at 9.24.22 PM.mp4",
    videoCaption: { en: "Carving a floral panel by hand", fr: "Sculpture d'un panneau floral à la main", ar: "نحت لوحة زخرفية يدويًا" },
    frames: [
      ["wood/WhatsApp Video 2026-11-19 at 9.24.22 PM.mp4", 4, "Carving a floral pattern with chisel and mallet"],
      ["wood/WhatsApp Video 2026-11-19 at 9.24.22 PM.mp4", 9, "Detail of the carved wooden panel"],
    ],
  },
  {
    // Name not given in the supplied video: descriptive working name until the artist confirms theirs.
    slug: "clay-heritage-pottery", name: "Clay & Heritage Pottery", primary: "pottery", categories: ["pottery", "traditional-crafts"],
    specialties: ["handmade pottery", "decorated figurines", "clay vessels"],
    bio: "Handmade pottery: decorated clay figurines and vessels. In the video, the artist presents her pieces and her work at an exhibition stand.",
    location: null,
    video: "New folder/WhatsApp Video 2026-11-19 at 9.27.50 PM.mp4",
    videoCaption: { en: "The artist presents her pottery", fr: "L'artiste présente sa poterie", ar: "الفنانة تقدّم أعمالها الفخارية" },
    frames: [
      ["New folder/WhatsApp Video 2026-11-19 at 9.27.50 PM.mp4", 18, "Decorated clay figurine"],
      ["New folder/WhatsApp Video 2026-11-19 at 9.27.50 PM.mp4", 2, "The artist presenting her pottery"],
      ["New folder/WhatsApp Video 2026-11-19 at 9.27.50 PM.mp4", 23, "Clay vessels on the stand"],
    ],
  },
  {
    slug: "bouchra-chebbi", name: "Bouchra Chebbi", primary: "textiles", categories: ["textiles", "painting"],
    specialties: ["string art", "yarn on canvas"],
    bio: "String art on canvas: line drawings and soft shapes made with coloured yarn, like a woman's face with flowers in pink and cream on a black ground.",
    location: null,
    images: [["Bouchra chebbi/bouchra strings painting .jpeg", "Yarn on canvas: woman's face with flowers"]],
  },
  {
    slug: "iheb-hoba", name: "Iheb Hoba", primary: "painting", categories: ["painting"],
    specialties: ["figurative painting", "portraits"],
    bio: "Painter of large figurative works with strong colour and texture, often portraits of women. One photo shows him interviewed in front of his paintings at an exhibition.",
    location: null,
    images: [
      ["iheb hoba/WhatsApp Image 2026-11-19 at 10.59.54 PM.jpeg", "Painting: woman in a red hood with joined hands"],
      ["iheb hoba/iheb hoba painting .jpeg", "Painting: young woman in a yellow skirt with bound hands"],
      ["iheb hoba/another iheb painting.jpeg", "Painting: figure bound to a tree in a dry landscape"],
      ["iheb hoba/iheb image.jpeg", "Iheb Hoba interviewed in front of his work"],
    ],
  },
  {
    slug: "issam-majdoub", name: "Issam Majdoub", primary: "jewelry", categories: ["jewelry", "metalwork"],
    specialties: ["silversmithing", "handmade silver pieces"],
    bio: "Silversmith. His photos show a silver parrot piece being finished at the workbench.",
    location: null,
    images: [
      ["Issam majdoub/design.jpeg", "Silver parrot on the jeweller's bench"],
      ["Issam majdoub/another design.jpeg", "Silver parrot held at the workbench"],
      ["Issam majdoub/face.jpeg", "Portrait of Issam Majdoub"],
    ],
    products: [
      {
        title: "Silver parrot piece", description: "Handmade silver parrot with engraved feathers and a long tail. Contact the artist for size, finish and price.",
        price: null, stock: null, availability: "made_to_order", materials: ["silver"], categories: ["jewelry", "metalwork"], delivery: ["pickup", "shipping"],
        image: "Issam majdoub/design.jpeg",
      },
    ],
  },
  {
    slug: "maryem-fake-jewls-bags", name: "Maryem · Fake Jewls Bags", primary: "fashion", categories: ["fashion", "jewelry"],
    specialties: ["beaded handbags", "mini bags"],
    bio: "Beaded handbags made bead by bead: black and gold mini bags, some with feathers and chain straps.",
    location: null,
    images: [
      ["maryem fake jewls bags/bag with feathure.jpeg", "Black beaded bag with feathers and gold chain"],
      ["maryem fake jewls bags/black bag.jpeg", "Black beaded mini bag with chain strap"],
      ["maryem fake jewls bags/yellow bag.jpeg", "Gold beaded mini bag"],
      ["maryem fake jewls bags/maryem face.jpeg", "Portrait of Maryem"],
    ],
    products: [
      { title: "Black beaded bag with feathers", description: "Black beaded handbag trimmed with feathers, with a gold chain strap.", price: null, stock: null, availability: "made_to_order", materials: ["beads", "feathers", "metal chain"], categories: ["fashion"], delivery: ["pickup", "local_delivery", "shipping"], image: "maryem fake jewls bags/bag with feathure.jpeg", featured: true },
      { title: "Black beaded mini bag", description: "Structured black beaded mini bag with a flap and a chain shoulder strap.", price: null, stock: null, availability: "made_to_order", materials: ["beads", "metal chain"], categories: ["fashion"], delivery: ["pickup", "local_delivery", "shipping"], image: "maryem fake jewls bags/black bag.jpeg" },
      { title: "Gold beaded mini bag", description: "Small gold beaded bag with a beaded top handle.", price: null, stock: null, availability: "made_to_order", materials: ["beads"], categories: ["fashion"], delivery: ["pickup", "local_delivery", "shipping"], image: "maryem fake jewls bags/yellow bag.jpeg" },
    ],
  },
  {
    slug: "ricordami-by-darahim", name: "Ricordami by Darahim", primary: "interior-design", categories: ["interior-design"],
    specialties: ["preserved flowers", "flower keepsakes", "gifts"],
    bio: "“Un fiore, un ricordo, per sempre” — a flower, a memory, forever. Clear cups filled with preserved flowers, made as keepsakes and gifts.",
    location: null,
    images: [
      ["ricordami by darahim/logo.jpeg", "Ricordami logo"],
      ["ricordami by darahim/product.jpeg", "Clear cup filled with preserved flowers"],
      ["ricordami by darahim/WhatsApp Image 2026-11-19 at 11.16.55 PM.jpeg", "Pink cup with preserved flowers", 270],
    ],
    products: [
      { title: "Preserved-flower keepsake cup", description: "Clear cup filled with preserved flowers in red, pink and lilac. A keepsake gift. Contact for colours and price.", price: null, stock: null, availability: "made_to_order", materials: ["preserved flowers"], categories: ["interior-design"], delivery: ["pickup", "local_delivery"], image: "ricordami by darahim/product.jpeg", featured: true },
    ],
  },
];

const mimeOf = (f) => (f.endsWith(".webp") ? "image/webp" : f.endsWith(".png") ? "image/png" : "image/jpeg");

async function ensureBucket() {
  const { error } = await db.storage.createBucket("public-media", { public: true, fileSizeLimit: "20MB", allowedMimeTypes: ["video/mp4"] });
  if (error && !/exists/i.test(error.message)) throw error;
}

/** A still frame from the artist's own video, used as a photo. */
function frameFrom(video, seconds) {
  return execFileSync("ffmpeg", ["-v", "error", "-ss", String(seconds), "-i", path.join(SRC, video), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "mjpeg", "-q:v", "2", "pipe:1"], { maxBuffer: 50 * 1024 * 1024 });
}

async function addImage(artistId, buf, ext, caption, sort, productId = null) {
  const meta = await sharp(buf).metadata();
  const web = await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  const id = randomUUID();
  const mime = mimeOf(ext);
  const original = `${artistId}/${id}${ext}`;
  const webPath = `web/${artistId}/${id}.webp`;
  const publicPath = `${artistId}/${id}.webp`;
  for (const [bucket, p, body, type] of [["originals", original, buf, mime], ["originals", webPath, web, "image/webp"], ["public-images", publicPath, web, "image/webp"]]) {
    const r = await db.storage.from(bucket).upload(p, body, { contentType: type, upsert: true });
    if (r.error) throw new Error(`${caption}: ${r.error.message}`);
  }
  const ins = await db.from("portfolio_images").insert({
    id, artist_id: artistId, product_id: productId, original_path: original, web_path: webPath, public_path: publicPath, mime,
    size_bytes: buf.length, width: meta.width, height: meta.height, sha256: createHash("sha256").update(buf).digest("hex"),
    caption, sort, moderation_status: "approved", authenticity_state: "not_assessed",
  });
  if (ins.error) throw new Error(`${caption}: ${ins.error.message}`);
  await db.from("authenticity_assessments").insert({
    image_id: id, provider: "platform-import", model_id: "none", model_version: "n/a", state: "not_assessed",
    signals: { hadExif: Boolean(meta.exif) }, note: "Supplied by the platform team from the artist's own material. Not run through a detector.",
  });
}

await ensureBucket();
for (const a of ARTISTS) {
  const { data: existing } = await db.from("artist_profiles").select("id").eq("slug", a.slug).maybeSingle();
  const row = {
    slug: a.slug, display_name: a.name, bio: a.bio, primary_category: a.primary, specialties: a.specialties,
    accepts_commissions: true, approval_status: "approved", is_demo: false, contact: [],
  };
  const artistId = existing?.id ?? randomUUID();
  const up = existing ? await db.from("artist_profiles").update(row).eq("id", artistId) : await db.from("artist_profiles").insert({ id: artistId, ...row });
  if (up.error) throw new Error(`${a.slug}: ${up.error.message}`);

  await db.from("artist_categories").delete().eq("artist_id", artistId);
  await db.from("artist_categories").insert(a.categories.map((c) => ({ artist_id: artistId, category_slug: c })));
  await db.from("locations").delete().eq("artist_id", artistId);
  if (a.location) await db.from("locations").insert({ artist_id: artistId, ...a.location });

  // Replace previously imported images and products
  const { data: old } = await db.from("portfolio_images").select("original_path, web_path, public_path").eq("artist_id", artistId);
  for (const o of old ?? []) {
    await db.storage.from("originals").remove([o.original_path, o.web_path].filter(Boolean));
    if (o.public_path) await db.storage.from("public-images").remove([o.public_path]);
  }
  await db.from("portfolio_images").delete().eq("artist_id", artistId);
  await db.from("products").delete().eq("artist_id", artistId);

  let sort = 0;
  for (const [file, caption, deg] of a.images ?? []) {
    let buf = readFileSync(path.join(SRC, file));
    if (deg) buf = await sharp(buf).rotate(deg).jpeg({ quality: 92 }).toBuffer();
    await addImage(artistId, buf, deg ? ".jpg" : path.extname(file).toLowerCase(), caption, sort++);
  }
  for (const [video, at, caption] of a.frames ?? []) await addImage(artistId, frameFrom(video, at), ".jpg", caption, sort++);

  for (const p of a.products ?? []) {
    const { data: prod, error } = await db
      .from("products")
      .insert({
        artist_id: artistId, title: p.title, description: p.description, price_amount: p.price, currency: "TND",
        availability: p.availability ?? "in_stock", stock: p.stock, materials: p.materials, delivery_options: p.delivery, status: "published", featured: Boolean(p.featured),
      })
      .select("id")
      .single();
    if (error) throw new Error(`${p.title}: ${error.message}`);
    await db.from("product_categories").insert(p.categories.map((c) => ({ product_id: prod.id, category_slug: c })));
    await addImage(artistId, readFileSync(path.join(SRC, p.image)), path.extname(p.image).toLowerCase(), p.title, sort++, prod.id);
  }

  let videoPath = null;
  if (a.video) {
    videoPath = `${artistId}/featured.mp4`;
    const r = await db.storage.from("public-media").upload(videoPath, readFileSync(path.join(SRC, a.video)), { contentType: "video/mp4", upsert: true });
    if (r.error) throw new Error(`${a.video}: ${r.error.message}`);
  }
  await db.from("artist_profiles").update({ featured_video_path: videoPath }).eq("id", artistId);

  if (a.event) {
    await db.from("events").delete().eq("slug", a.event.slug);
    const ev = await db.from("events").insert({ artist_id: artistId, categories: a.categories, status: "published", is_online: false, ...a.event });
    if (ev.error) throw new Error(`${a.slug} event: ${ev.error.message}`);
  }
  const parts = [`${(a.images?.length ?? 0) + (a.frames?.length ?? 0)} images`, a.products ? `${a.products.length} products` : "", a.video ? "video" : "", a.event ? "event" : ""].filter(Boolean);
  console.log(`imported ${a.name}: ${parts.join(" + ")}`);
}
