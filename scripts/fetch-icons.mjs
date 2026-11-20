// Downloads 3dicons (CC0, https://3dicons.co by realvjy) "clay" renders and recolours them
// with an Astarte orange gradient map: shadows → deep orange, highlights → soft peach.
// Usage: node scripts/fetch-icons.mjs [outDir] [--preview previewFile]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CDN = "https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/clay";

/** Category slug → 3dicons icon name. Chosen for meaning; see README note for the few loose fits. */
export const CATEGORY_ICONS = {
  painting: "paint-brush",
  illustration: "pencil",
  sculpture: "sphere",
  pottery: "tea-cup",
  mosaic: "puzzle",
  carpentry: "tool",
  metalwork: "key",
  leather: "wallet",
  jewelry: "medal", // "crown" is not available on the CDN
  embroidery: "scissor",
  textiles: "flag",
  fashion: "bag",
  "traditional-crafts": "star",
  photography: "camera",
  videography: "video-camera",
  music: "music",
  singing: "mic",
  composition: "headphone",
  "graphic-design": "color-palette",
  animation: "play",
  architecture: "cube",
  "interior-design": "roll-brush",
  "furniture-design": "bulb",
  studios: "lab",
};

const out = process.argv[2] ?? "public/icons/categories";
const previewIdx = process.argv.indexOf("--preview");
const preview = previewIdx > 0 ? process.argv[previewIdx + 1] : null;

// Gradient map stops (luminance 0 → 1)
const STOPS = [
  [0.0, [122, 58, 10]], // deep burnt orange
  [0.45, [214, 112, 24]], // brand orange, darker side
  [0.75, [242, 140, 40]], // brand orange #F28C28
  [1.0, [255, 214, 160]], // soft peach highlight
];
function mapColor(l) {
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i];
    const [p0, c0] = STOPS[i - 1];
    if (l <= p1) {
      const t = (l - p0) / (p1 - p0);
      return c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
    }
  }
  return STOPS.at(-1)[1];
}

async function recolor(buf) {
  const img = sharp(buf).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  // Clay renders are near-white; stretch their luminance range before mapping.
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 128) { const g = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114; min = Math.min(min, g); max = Math.max(max, g); }
  for (let i = 0; i < data.length; i += 4) {
    const g = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const l = Math.max(0, Math.min(1, (g - min) / Math.max(1, max - min)));
    const [r, gg, b] = mapColor(l);
    data[i] = r; data[i + 1] = gg; data[i + 2] = b;
  }
  return sharp(data, { raw: info }).webp({ quality: 90, alphaQuality: 100 }).toBuffer();
}

mkdirSync(out, { recursive: true });
const tiles = [];
let n = 0;
for (const [slug, icon] of Object.entries(CATEGORY_ICONS)) {
  const res = await fetch(`${CDN}/${icon}-dynamic-clay.png`);
  if (!res.ok) { console.log("missing", icon, res.status); continue; }
  const webp = await recolor(Buffer.from(await res.arrayBuffer()));
  writeFileSync(path.join(out, `${slug}.webp`), webp);
  if (preview) tiles.push({ input: await sharp(webp).resize(180, 180).png().toBuffer(), left: (n % 6) * 200 + 10, top: Math.floor(n / 6) * 200 + 10 });
  n++;
}
if (preview) {
  await sharp({ create: { width: 1200, height: Math.ceil(n / 6) * 200, channels: 3, background: "#F5F1EA" } }).composite(tiles).png().toFile(preview);
}
console.log(`${n} icons written to ${out}`);
