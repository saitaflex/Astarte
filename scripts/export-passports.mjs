// Exports every published product's Savoir-faire passport as PDFs (full page A4 + QR card A6) and a QR PNG.
// Prints from the live site so the files match what a scan opens.
// Usage: PW_CHANNEL=chrome node --env-file=.env.local scripts/export-passports.mjs [outDir] [locale]
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import QRCode from "qrcode";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://astarte-art.vercel.app";
const OUT = process.argv[2] ?? path.resolve("passports-export");
const LOCALE = process.argv[3] ?? "fr";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: products, error } = await db
  .from("products").select("id, title, artist_profiles!inner(slug, is_demo, approval_status)")
  .eq("status", "published").eq("artist_profiles.approval_status", "approved");
if (error) throw error;

const safe = (s) => s.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 60);
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL });
const page = await browser.newPage();
for (const p of products) {
  const group = p.artist_profiles.is_demo ? "demo" : "real";
  const dir = path.join(OUT, group, p.artist_profiles.slug);
  await mkdir(dir, { recursive: true });
  const base = path.join(dir, safe(p.title));
  const url = `${SITE}/${LOCALE}/passport/${p.id}`;
  // QR points at the same URL the printed card uses (scan counter flag included).
  await QRCode.toFile(`${base}-qr.png`, `${url}?scan=1`, { width: 600, margin: 2 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: `${base}-passport.pdf`, format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
  await page.goto(`${url}/card`, { waitUntil: "networkidle" });
  await page.pdf({ path: `${base}-card.pdf`, width: "105mm", height: "148mm", printBackground: true, pageRanges: "1" });
  console.log(`${group} ${p.artist_profiles.slug} / ${p.title}`);
}
await browser.close();
console.log(`\n${products.length} passports -> ${OUT}`);
