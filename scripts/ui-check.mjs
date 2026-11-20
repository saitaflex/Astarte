// Checks header dropdowns are clickable above page content, and which map provider loads.
// Usage: node scripts/ui-check.mjs [baseUrl] [outDir]
import { chromium } from "@playwright/test";

const [base = "http://localhost:3100", out = "."] = process.argv.slice(2);
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const logs = [];
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && logs.push(m.text().slice(0, 200)));

// 1. Language dropdown over the artist profile (the page with layered backgrounds)
await page.goto(`${base}/en/artists/fousaifouse`, { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.click('summary[aria-label="Language"]');
const fr = page.locator('header a[lang="fr"]');
const topEl = await fr.evaluate((el) => {
  const r = el.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return el.contains(hit) || hit === el;
});
console.log("language menu item is on top:", topEl);
await fr.click({ timeout: 5000 });
await page.waitForURL(/\/fr$/, { timeout: 10000 }).catch(() => {});
console.log("clicking Français navigated to:", page.url());
// outside click closes it
await page.click('summary[aria-label="Language"]');
await page.mouse.click(600, 600);
console.log("menu closes on outside click:", !(await page.locator("header details[open]").count()));

// 2. Map provider
await page.goto(`${base}/en/map`, { waitUntil: "load" });
await page.waitForTimeout(6000);
const google = await page.locator(".gm-style").count();
const leaflet = await page.locator(".leaflet-container").count();
console.log("map provider:", google ? "Google Maps" : leaflet ? "OpenStreetMap fallback" : "none");
await page.screenshot({ path: `${out}/map.png` });
console.log("console:", logs.filter((l) => /google|maps|gm_/i.test(l)).slice(0, 4));
await browser.close();
