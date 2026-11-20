// One-off: sets the passport "technique" on existing real products without re-importing
// (re-importing would wipe photo descriptions). Values describe what the photos show.
// Usage: node --env-file=.env.local scripts/set-techniques.mjs
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TECHNIQUES = {
  "Mosaic panel: doves on a blossoming branch": "Stone mosaic with marble doves carved in relief",
  "Arched mosaic panel with hoopoe and stone basin": "Stone and glass mosaic with a carved stone basin",
  "Mosaic coasters with olive branch (gift box)": "Hand-cut stone mosaic",
  "Round palm-leaf mosaic side table": "Glass tesserae set on a stone mosaic top",
  "Silver parrot piece": "Hand-worked silver",
  "Black beaded bag with feathers": "Hand-beaded",
  "Black beaded mini bag": "Hand-beaded",
  "Gold beaded mini bag": "Hand-beaded",
  "Preserved-flower keepsake cup": "Preserved flowers arranged in a clear cup",
};
for (const [title, technique] of Object.entries(TECHNIQUES)) {
  const { data, error } = await db.from("products").update({ technique }).eq("title", title).select("id");
  console.log(error ? `error ${title}: ${error.message}` : `${data.length} × ${title}`);
}
