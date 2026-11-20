// Dev utility: types a request into the homepage and screenshots the orb states and results.
// Usage: node scripts/flow.mjs [baseUrl] [outDir] [query] [locale]
import { chromium } from "@playwright/test";

const [base = "http://localhost:3100", out = "shots", query = "handmade pottery from Nabeul", locale = "en"] = process.argv.slice(2);
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${base}/${locale}`, { waitUntil: "load" });
await page.fill("#discover-input", query);
await page.screenshot({ path: `${out}/flow_1_typing.png` });
await page.click('form[role="search"] button[type="submit"]');
await page.waitForTimeout(250);
const thinking = await page.getAttribute("canvas[data-orb-state]", "data-orb-state");
await page.screenshot({ path: `${out}/flow_2_thinking.png` });
await page.waitForSelector("article", { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(800);
const results = await page.locator("article").count();
await page.screenshot({ path: `${out}/flow_3_results.png`, fullPage: true });
console.log(JSON.stringify({ stateWhileLoading: thinking, results, errors }));
await browser.close();
