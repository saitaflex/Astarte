// Runs the AI-image detector over stored images that have no detector assessment yet.
// Results are evidence for reviewers: uncalibrated, never an automatic decision.
// Usage: node --env-file=.env.local scripts/detect-images.mjs [--all]
import { pipeline, RawImage } from "@huggingface/transformers";
import { createClient } from "@supabase/supabase-js";

export const DETECTOR = { model: "onnx-community/SMOGY-Ai-images-detector-ONNX", dtype: "q4", provider: "smogy-swin-onnx" };
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const classify = await pipeline("image-classification", DETECTOR.model, { dtype: DETECTOR.dtype });

const { data: images } = await db.from("portfolio_images").select("id, web_path, authenticity_assessments(provider)");
const todo = (images ?? []).filter((i) => process.argv.includes("--all") || !(i.authenticity_assessments ?? []).some((a) => a.provider === DETECTOR.provider));
for (const img of todo) {
  const { data: blob } = await db.storage.from("originals").download(img.web_path);
  if (!blob) continue;
  const raw = await RawImage.fromBlob(blob);
  const out = await classify(raw, { top_k: 2 });
  const ai = out.find((o) => o.label === "artificial")?.score ?? 0;
  const state = ai >= 0.8 ? "ai_indicators" : "uncertain";
  await db.from("authenticity_assessments").insert({
    image_id: img.id, provider: DETECTOR.provider, model_id: DETECTOR.model, model_version: DETECTOR.dtype, state,
    score: Number(ai.toFixed(4)), score_calibrated: false,
    signals: { artificial: Number(ai.toFixed(4)), human: Number((1 - ai).toFixed(4)) },
    note: "Swin classifier (CC BY-NC 4.0). Uncalibrated: high scores also occur on real photos (e.g. stage lighting). Assessment only, not proof.",
  });
  await db.from("portfolio_images").update({ authenticity_state: state }).eq("id", img.id);
  console.log(img.id.slice(0, 8), `artificial=${ai.toFixed(3)}`, state);
}
console.log(`${todo.length} image(s) assessed`);
