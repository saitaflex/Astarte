// Dev utility: screenshots key pages at desktop and mobile sizes.
// Usage: node scripts/shots.mjs [baseUrl] [outDir]
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const out = process.argv[3] ?? "shots";
const pages = (process.env.SHOT_PAGES ?? "/en,/en/artists,/en/artists/demo-sousse-oud-trio,/en/map,/ar").split(",");

const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const file = `${out}/${name}${path.replaceAll("/", "_")}.png`;
    await page.screenshot({ path: file, fullPage: process.env.FULL === "1" });
    console.log("saved", file);
  }
  if (errors.length) console.log(`[${name}] errors:`, errors);
}
await browser.close();
