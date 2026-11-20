"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { recordDetectionAction } from "@/app/actions/admin";
import { DETECTOR } from "@/lib/images/detector";

type Classifier = (input: string, opts: { top_k: number }) => Promise<{ label: string; score: number }[]>;
let classifierPromise: Promise<Classifier> | null = null;

/** Loads the detector once per tab (about 57 MB, cached by the browser after the first load). */
function getClassifier() {
  classifierPromise ??= import("@huggingface/transformers").then(
    ({ pipeline }) => pipeline("image-classification", DETECTOR.model, { dtype: DETECTOR.dtype }) as unknown as Promise<Classifier>,
  );
  return classifierPromise;
}

/** Runs the AI-image detector on one or more images in the admin's browser and stores the result as evidence. */
export function DetectorButton({ images, label = "Run AI detector" }: { images: { id: string; url: string }[]; label?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      setStatus("Loading model (first time takes a moment)…");
      const classify = await getClassifier();
      let n = 0;
      for (const img of images) {
        setStatus(`Analysing ${++n}/${images.length}…`);
        const out = await classify(img.url, { top_k: 2 });
        const ai = out.find((o) => o.label === "artificial")?.score ?? 0;
        await recordDetectionAction(img.id, ai);
      }
      setStatus(`Done: ${images.length} image(s) assessed.`);
      router.refresh();
    } catch (err) {
      setStatus(`Detector failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={run} disabled={busy || images.length === 0} className="rounded-full border border-orange/60 bg-orange/10 px-4 py-2 text-sm disabled:opacity-50">
        {busy ? "Running…" : label}
      </button>
      {status && <span className="text-xs text-muted" aria-live="polite">{status}</span>}
    </span>
  );
}
