// Live check: a signed-in user can open the account menu and sign out. Uses a temporary account.
// Usage: node --env-file=.env.local scripts/signout-check.mjs [baseUrl]
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const base = process.argv[2] ?? "https://astarte-art.vercel.app";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `e2e-signout-${Date.now()}@example.com`;
const password = "Signout-check-123";
const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: "Signout Check" } });
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
try {
  const page = await browser.newPage();
  await page.goto(`${base}/en/sign-in`);
  await page.waitForTimeout(1500);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('main button[type="submit"]');
  await page.waitForURL(/\/account/, { timeout: 20000 });
  console.log("signed in:", page.url().includes("/account"));
  await page.click("header summary:has-text('Signout Check')");
  const btn = page.locator("header button:has-text('Sign out')");
  const onTop = await btn.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  });
  console.log("Sign out button is on top:", onTop);
  await btn.click();
  await page.waitForURL((u) => !u.pathname.includes("/account"), { timeout: 20000 });
  await page.waitForTimeout(1000);
  console.log("after sign out, Sign in link visible:", (await page.locator("header a:has-text('Sign in')").count()) > 0);
} finally {
  await browser.close();
  await admin.auth.admin.deleteUser(data.user.id);
}
