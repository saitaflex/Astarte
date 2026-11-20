// Writes an AI description + search tags for every stored image that has none.
// Images are shrunk to 512 px first (fewer tokens) and rate limits are waited out.
// Usage: node --env-file=.env.local scripts/describe-images.mjs [--all]
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const key = process.env.AI_API_KEY;
const model = process.env.AI_MODEL_VISION || "qwen/qwen3.8-27b";
const PROMPT =
  'Describe what this photo shows for a search index of handmade art. Return ONLY JSON: {"description": string (one factual sentence: the object or scene, materials, colours, motifs), "tags": string[] (6-12 short lowercase English search words)}. Do not guess who made it, how it was made, prices or places.';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { data: images } = await db.from("portfolio_images").select("id, web_path, caption, ai_description");
const todo = (images ?? []).filter((i) => process.argv.includes("--all") || !i.ai_description);
let done = 0;
for (const img of todo) {
  const { data: blob } = await db.storage.from("originals").download(img.web_path);
  if (!blob) continue;
  const small = await sharp(Buffer.from(await blob.arrayBuffer())).resize(512, 512, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
  const body = JSON.stringify({
    model, temperature: 0.1, max_completion_tokens: 500, response_format: { type: "json_object" },
    messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${small.toString("base64")}` } }] }],
  });
  for (let attempt = 0; attempt < 6; attempt++) {
    let res;
    try {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body });
    } catch {
      await sleep(4000); // transient network error
      continue;
    }
    if (res.status === 429) {
      const msg = await res.text();
      const secs = Number(msg.match(/try again in ([\d.]+)s/)?.[1] ?? 20);
      await sleep((secs + 1) * 1000);
      continue;
    }
    if (!res.ok) { console.log(img.id.slice(0, 8), "failed", res.status); break; }
    const text = (await res.json()).choices?.[0]?.message?.content ?? "";
    try {
      const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      await db.from("portfolio_images").update({ ai_description: String(j.description).slice(0, 300), tags: (j.tags ?? []).map((t) => String(t).toLowerCase()).slice(0, 12), described_by: model }).eq("id", img.id);
      console.log(img.id.slice(0, 8), "|", img.caption, "→", (j.tags ?? []).slice(0, 6).join(", "));
      done++;
    } catch {
      console.log(img.id.slice(0, 8), "unparseable reply");
    }
    break;
  }
}
console.log(`${done}/${todo.length} image(s) described`);
