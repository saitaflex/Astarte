// Loads pages on the dev server and prints full React hydration messages.
import { chromium } from "@playwright/test";
const [base = "http://localhost:3200", ...paths] = process.argv.slice(2);
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error" && /hydrat|did not match|server rendered/i.test(m.text())) console.log("[error]", m.text().slice(0, 1500)); });
for (const p of paths.length ? paths : ["/en"]) {
  console.log("==", p);
  await page.goto(base + p, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(4000);
}
await browser.close();
