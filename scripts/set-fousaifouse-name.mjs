// One-off: adds the artisan's name (Henda Namouchi) to the Fousaifouse profile without re-importing.
// Usage: node --env-file=.env.local scripts/set-fousaifouse-name.mjs
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: cur, error: e1 } = await db.from("artist_profiles").select("id, display_name, bio").eq("slug", "fousaifouse").single();
if (e1) throw e1;
const bio = cur.bio.startsWith("Fousaifouse is the mosaic studio")
  ? cur.bio
  : cur.bio.replace(/^Mosaic artisan working/, "Fousaifouse is the mosaic studio of Henda Namouchi, a mosaic artisan working");
const { data, error } = await db.from("artist_profiles").update({ display_name: "Fousaifouse · Henda Namouchi", bio }).eq("id", cur.id).select("display_name, bio");
if (error) throw error;
console.log(data[0]);
