"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createImageUpload, finalizeImageUpload } from "@/app/actions/studio";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Uploads straight to private storage with a one-time signed URL (no large bodies
 * through our functions), then asks the server to validate and queue the image.
 */
export function ImageUploader({ locale, productId }: { locale: string; productId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMessage(null);
    let ok = 0;
    for (const file of Array.from(files).slice(0, 6)) {
      const start = await createImageUpload(locale, file.type, file.size);
      if (!start.path || !start.token) {
        setMessage({ kind: "error", text: start.error ?? "Upload failed." });
        continue;
      }
      const up = await supabaseBrowser().storage.from("originals").uploadToSignedUrl(start.path, start.token, file, { contentType: file.type });
      if (up.error) {
        setMessage({ kind: "error", text: "Upload failed. Please try again." });
        continue;
      }
      const done = await finalizeImageUpload(locale, start.path, productId, "");
      if (done.error) setMessage({ kind: "error", text: `${file.name}: ${done.error}` });
      else ok++;
    }
    if (ok) setMessage({ kind: "ok", text: `${ok} photo(s) uploaded. Our team will review them before they appear publicly.` });
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-line bg-white/60 px-6 py-10 text-center transition hover:border-orange ${busy ? "pointer-events-none opacity-60" : ""}`}>
        <span className="font-display text-xl">{busy ? "Uploading…" : "Add photos"}</span>
        <span className="text-sm text-muted">JPEG, PNG or WebP · at least 400 × 400 px · up to 10 MB · location data is removed</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
      </label>
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`mt-3 rounded-xl px-4 py-3 text-sm ${message.kind === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-orange/10"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
