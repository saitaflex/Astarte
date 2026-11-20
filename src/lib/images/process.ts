import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

/** Checks the file's real type from its first bytes, not from the name or the browser's claim. */
export function sniffMime(buf: Buffer): (typeof ALLOWED_MIME)[number] | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

const AI_SOFTWARE = /(midjourney|dall[\s·-]?e|stable[\s-]?diffusion|firefly|imagen|leonardo|dreamstudio|novelai|comfyui|automatic1111|gpt-?image|ideogram|flux)/i;

export interface ProcessedImage {
  mime: string;
  sizeBytes: number;
  width: number;
  height: number;
  sha256: string;
  web: Buffer;
  signals: {
    hadExif: boolean;
    hadGps: boolean;
    software: string | null;
    aiSoftwareTag: boolean;
    c2paMarkerFound: boolean;
    cameraMake: string | null;
  };
}

function exifString(exif: Buffer | undefined, tag: string): string | null {
  if (!exif) return null;
  // Lightweight scan: EXIF ASCII values are stored inline; good enough for signals, not for proof.
  const text = exif.toString("latin1");
  const idx = text.toLowerCase().indexOf(tag.toLowerCase());
  return idx >= 0 ? text.slice(idx, idx + 60).replace(/[^\x20-\x7e]/g, " ").trim() : null;
}

/**
 * Validates and re-encodes an upload. The web copy is re-encoded to WebP at most
 * 1600 px, which drops all metadata (including GPS). Signals are evidence for a
 * human reviewer, never a verdict.
 */
export async function processImage(original: Buffer): Promise<ProcessedImage> {
  if (original.length > MAX_UPLOAD_BYTES) throw new Error("File is larger than 10 MB.");
  const mime = sniffMime(original);
  if (!mime) throw new Error("Only JPEG, PNG or WebP images are accepted.");

  const img = sharp(original, { failOn: "error" });
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error("This image could not be read.");
  if (meta.width < 400 || meta.height < 400) throw new Error("Please upload an image of at least 400 × 400 pixels.");

  const raw = original.toString("latin1");
  const software = exifString(meta.exif, "Software") ?? (/(parameters|prompt)\x00/i.test(raw.slice(0, 4096)) ? "PNG text: generation parameters" : null);
  const web = await sharp(original).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();

  return {
    mime,
    sizeBytes: original.length,
    width: meta.width,
    height: meta.height,
    sha256: createHash("sha256").update(original).digest("hex"),
    web,
    signals: {
      hadExif: Boolean(meta.exif),
      hadGps: Boolean(meta.exif && /GPS/.test(meta.exif.toString("latin1"))),
      software,
      aiSoftwareTag: Boolean(software && AI_SOFTWARE.test(software)) || AI_SOFTWARE.test(raw.slice(0, 65536).replace(/[^\x20-\x7e]/g, " ")),
      c2paMarkerFound: /c2pa|jumb/i.test(raw.slice(0, 262144)),
      cameraMake: exifString(meta.exif, "Make"),
    },
  };
}

/**
 * Turns signals into one of the three states without a detector model.
 * Without a configured detector, the most we can say from metadata is
 * "AI indicators" (an explicit AI tool tag) or "uncertain".
 */
export function stateFromSignals(s: ProcessedImage["signals"]): "ai_indicators" | "uncertain" {
  return s.aiSoftwareTag ? "ai_indicators" : "uncertain";
}
