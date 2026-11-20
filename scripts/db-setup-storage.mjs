// Creates storage buckets (idempotent) and runs a quick anonymous access check.
// Usage: node --env-file=.env.local scripts/db-setup-storage.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const buckets = [
  // Originals and metadata-stripped review copies: private, served only via short signed URLs.
  { id: "originals", public: false, fileSizeLimit: "10MB", allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] },
  // Approved web images only.
  { id: "public-images", public: true, fileSizeLimit: "5MB", allowedMimeTypes: ["image/webp"] },
];
for (const b of buckets) {
  const { error } = await admin.storage.createBucket(b.id, { public: b.public, fileSizeLimit: b.fileSizeLimit, allowedMimeTypes: b.allowedMimeTypes });
  console.log(`bucket ${b.id}:`, error ? error.message : "created");
}

const checks = {
  "anon reads public_artists": await anon.from("public_artists").select("slug", { count: "exact", head: true }),
  "anon reads published products": await anon.from("products").select("id", { count: "exact", head: true }),
  "anon reads artist_profiles (expect 0)": await anon.from("artist_profiles").select("id", { count: "exact", head: true }),
  "anon reads locations (expect 0)": await anon.from("locations").select("artist_id", { count: "exact", head: true }),
  "anon reads point_transactions (expect 0)": await anon.from("point_transactions").select("id", { count: "exact", head: true }),
  "anon reads orders (expect 0)": await anon.from("marketplace_orders").select("id", { count: "exact", head: true }),
};
for (const [name, res] of Object.entries(checks)) console.log(`${name}: ${res.error ? "error " + res.error.message : res.count}`);

const { data: one } = await anon.from("public_artists").select("slug, public_contacts, lat, lng, privacy").eq("slug", "demo-tozeur-design-studio").single();
console.log("hidden-location artist exposes coords?", one?.lat !== null || one?.lng !== null, one);
const insert = await anon.from("products").insert({ artist_id: "00000000-0000-4000-a000-000000000001", title: "hack" });
console.log("anon insert product blocked?", Boolean(insert.error), insert.error?.message);
const rpc = await anon.rpc("admin_adjust_points", { p_customer: "00000000-0000-4000-a000-000000000001", p_amount: 1000, p_reason: "hacking attempt" });
console.log("anon admin_adjust_points blocked?", Boolean(rpc.error), rpc.error?.message);
