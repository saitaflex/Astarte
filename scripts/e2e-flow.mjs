// End-to-end journey test against a running server and the real database.
// Creates temporary accounts (e2e-*@example.com) and deletes them at the end.
// Usage: node --env-file=.env.local scripts/e2e-flow.mjs [baseUrl]
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const base = process.argv[2] ?? "http://localhost:3100";
const L = `${base}/en`;
const stamp = Date.now();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const accounts = {
  artist: { email: `e2e-artist-${stamp}@example.com`, password: "E2e-artist-pass-123" },
  customer: { email: `e2e-customer-${stamp}@example.com`, password: "E2e-customer-pass-123" },
  admin: { email: `e2e-admin-${stamp}@example.com`, password: "E2e-admin-pass-12345" },
};
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
};

// Test image: 900×700 PNG with a fake "Midjourney" software tag to exercise the AI-indicator signal.
const dir = path.join(os.tmpdir(), `artsart-e2e-${stamp}`);
mkdirSync(dir, { recursive: true });
const imgPath = path.join(dir, "work.jpg");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700"><rect width="900" height="700" fill="#EDE6DA"/><circle cx="450" cy="350" r="220" fill="#F28C28"/></svg>`;
writeFileSync(imgPath, await sharp(Buffer.from(svg)).jpeg().withExif({ IFD0: { Software: "Midjourney v6", Make: "TestCam" } }).toBuffer());

const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const newPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  [pageerror]", e.message));
  return page;
};
const submit = async (page, locator) => {
  await Promise.all([page.waitForResponse((r) => r.request().method() === "POST", { timeout: 30000 }), locator.click()]);
  await page.waitForTimeout(800);
};
const signIn = async (page, who) => {
  await page.goto(`${L}/sign-in`);
  await page.waitForTimeout(1500); // let the form hydrate
  await page.fill('input[name="email"]', accounts[who].email);
  await page.fill('input[name="password"]', accounts[who].password);
  await page.click('main button[type="submit"]');
  await page.waitForURL(/\/(admin|studio|account)/, { timeout: 20000 }).catch(async () => {
    await page.screenshot({ path: path.join(dir, `signin-${who}.png`) });
    console.log("  sign-in stuck at", page.url(), "screenshot:", path.join(dir, `signin-${who}.png`));
  });
};

let productId;
try {
  // 1. Guest can browse and the join page works
  const guest = await newPage();
  await guest.goto(L);
  check("guest sees homepage with orb", (await guest.locator("canvas[data-orb-state]").count()) === 1);
  const joinRes = await guest.goto(`${L}/join`);
  check("join page loads (was 404)", joinRes.status() === 200);

  // 2. Artist registers through the two-step form
  await guest.fill('input[name="artistName"]', `E2E Test Atelier ${stamp}`);
  await guest.selectOption('select[name="category"]', "pottery");
  await guest.selectOption('select[name="city"]', "Nabeul");
  await guest.fill('textarea[name="bio"]', "Test artist created by the automated end-to-end test. Hand-thrown ceramics with natural glazes, made in a small workshop.");
  await guest.click('button:has-text("Continue")');
  await guest.fill('input[name="displayName"]', "E2E Artist");
  await guest.fill('input[name="email"]', accounts.artist.email);
  await guest.fill('input[name="password"]', accounts.artist.password);
  await guest.check('input[name="consent"]');
  await guest.click('form button[type="submit"]:visible');
  await guest.waitForURL(/\/studio/, { timeout: 20000 });
  check("artist registration lands in studio", guest.url().includes("/studio"));
  const artistPage = guest;

  // 3. Artist creates a product and uploads a photo
  await artistPage.goto(`${L}/studio/products/new`);
  await artistPage.fill('input[name="title"]', "E2E glazed bowl");
  await artistPage.fill('textarea[name="description"]', "Automated test product. Hand-thrown bowl, 20 cm, stoneware with a natural ash glaze. Food safe.");
  await artistPage.fill('input[name="price"]', "70");
  await artistPage.fill('input[name="stock"]', "3");
  await artistPage.fill('input[name="materials"]', "stoneware, ash glaze");
  await artistPage.check('input[name="delivery"][value="shipping"]');
  await artistPage.click('form button[type="submit"]:has-text("Create work")');
  await artistPage.waitForURL(/studio\/products\/[0-9a-f-]{36}/, { timeout: 20000 });
  productId = artistPage.url().match(/products\/([0-9a-f-]{36})/)[1];
  check("artist creates product", Boolean(productId));
  await artistPage.setInputFiles('input[type="file"]', imgPath);
  await artistPage.waitForSelector("text=uploaded", { timeout: 40000 }).catch(() => {});
  const { data: imgs } = await admin.from("portfolio_images").select("id, moderation_status, authenticity_state, web_path").eq("product_id", productId);
  check("photo stored as pending review", imgs?.length === 1 && imgs[0].moderation_status === "pending");
  check("AI software tag detected as indicator (not a verdict)", imgs?.[0]?.authenticity_state === "ai_indicators");
  const { data: webCopy } = await admin.storage.from("originals").download(imgs[0].web_path);
  const meta = await sharp(Buffer.from(await webCopy.arrayBuffer())).metadata();
  check("public copy has metadata stripped", !meta.exif);

  // Not public before approval
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: hidden } = await anon.from("products").select("id").eq("id", productId);
  check("product hidden while artist is pending", hidden.length === 0);

  // 4. Admin (provisioned by script, not by the website) approves artist and image
  const { data: au } = await admin.auth.admin.createUser({ email: accounts.admin.email, password: accounts.admin.password, email_confirm: true });
  await admin.from("profiles").update({ role: "admin" }).eq("id", au.user.id);
  const adminPage = await newPage();
  await signIn(adminPage, "admin");
  check("admin signs in to dashboard", adminPage.url().includes("/admin"));
  await adminPage.goto(`${L}/admin/artists`);
  const card = adminPage.locator("li", { hasText: `E2E Test Atelier ${stamp}` });
  await submit(adminPage, card.locator('button[value="approved"]'));
  await adminPage.goto(`${L}/admin/images`);
  check("admin sees AI-indicator evidence", (await adminPage.locator("text=AI tool named in file: yes").count()) > 0);
  await submit(adminPage, adminPage.locator("li", { hasText: "E2E glazed bowl" }).locator('button[value="approve"]'));
  const { data: pubImg } = await anon.from("public_images").select("public_path").eq("product_id", productId);
  check("approved image is public", pubImg.length === 1);
  const { data: logs } = await admin.from("audit_logs").select("action").eq("actor_id", au.user.id);
  check("admin actions are audit-logged", (logs ?? []).some((l) => l.action === "artist.approved") && (logs ?? []).some((l) => l.action === "image.approve"));

  // 5. Customer registers, orders, and the artist confirms
  const cust = await newPage();
  await cust.goto(`${L}/sign-up`);
  await cust.fill('input[name="displayName"]', "E2E Customer");
  await cust.fill('input[name="email"]', accounts.customer.email);
  await cust.fill('input[name="password"]', accounts.customer.password);
  await cust.check('input[name="consent"]');
  await cust.click('button[type="submit"]');
  await cust.waitForURL(/\/account/, { timeout: 20000 });
  check("customer registration lands in account", cust.url().includes("/account"));
  await cust.goto(`${L}/marketplace/${productId}`);
  await cust.click('button:has-text("Add to cart")');
  await cust.waitForURL(/\/cart/);
  await cust.check('input[name="fulfilment"][value="shipping"]');
  await cust.fill('input[name="city"]', "Tunis");
  await cust.click('button:has-text("Send order request")');
  await cust.waitForURL(/account\?ordered=1/, { timeout: 20000 });
  const { data: order } = await admin.from("marketplace_orders").select("id, status, subtotal").eq("artist_id", (await admin.from("products").select("artist_id").eq("id", productId).single()).data.artist_id).single();
  check("order created as requested", order?.status === "requested" && Number(order.subtotal) === 70);
  const { data: stock } = await admin.from("products").select("stock").eq("id", productId).single();
  check("stock reserved", stock.stock === 2);
  await artistPage.goto(`${L}/studio/orders`);
  await submit(artistPage, artistPage.locator('button[value="confirmed"]'));
  const { data: confirmed } = await admin.from("marketplace_orders").select("status").eq("id", order.id).single();
  check("artist confirms order", confirmed.status === "confirmed");

  // Customer cannot force a status: direct RPC is rejected by the database
  const custClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await custClient.auth.signInWithPassword(accounts.customer);
  const forced = await custClient.rpc("update_order_status", { p_order: order.id, p_status: "completed" });
  check("customer cannot complete an order", Boolean(forced.error));
  const mint = await custClient.from("point_transactions").insert({ customer_id: (await custClient.auth.getUser()).data.user.id, amount: 1000, kind: "activity" });
  check("customer cannot mint points directly", Boolean(mint.error));

  // 6. Point Merci: genuine discovery earns points; too-fast completion does not
  const demoArtistId = "00000000-0000-4000-a000-000000000002";
  const { data: s1 } = await custClient.rpc("start_engagement", { p_activity: "profile_discovery", p_target: demoArtistId });
  const early = await custClient.rpc("complete_engagement", { p_session: s1 });
  check("instant completion is refused", Boolean(early.error) && /time/.test(early.error.message));
  await cust.goto(`${L}/artists/demo-kairouan-carpets`);
  await cust.waitForSelector("text=Point Merci for discovering", { timeout: 40000 }).catch(() => {});
  const { data: bal } = await custClient.rpc("my_point_balance");
  check("profile discovery earns 5 points after 20 s", bal === 5, `balance=${bal}`);
  if (bal !== 5) {
    const { data: sessions } = await admin.from("engagement_sessions").select("activity_code, started_at, completed_at").eq("target_id", demoArtistId).order("started_at");
    console.log("  sessions:", JSON.stringify(sessions));
  }
  const redeemEarly = await custClient.rpc("redeem_offer", { p_offer: (await admin.from("reward_offers").select("id").eq("points_cost", 50).single()).data.id });
  check("cannot redeem without enough points", Boolean(redeemEarly.error));

  // 7. Incubation: apply, admin accepts, guide answers from real data
  await artistPage.goto(`${L}/grow`);
  await artistPage.fill('textarea[name="motivation"]', "Automated test application: I want help with product photos and pricing for my ceramics.");
  await artistPage.click('button:has-text("Send application")');
  await artistPage.waitForURL(/applied=1/);
  await adminPage.goto(`${L}/admin/grow`);
  await submit(adminPage, adminPage.locator("li", { hasText: "Automated test application" }).locator('button:has-text("Accept")'));
  await artistPage.goto(`${L}/grow`);
  const enrolled = (await artistPage.locator("text=Stage").count()) > 0;
  check("enrolled artist sees journey dashboard", enrolled);
  if (!enrolled) {
    await artistPage.screenshot({ path: path.join(dir, "grow-artist.png"), fullPage: true });
    await adminPage.screenshot({ path: path.join(dir, "grow-admin.png"), fullPage: true });
    console.log("  screenshots in", dir, "admin url:", adminPage.url());
  }
  await artistPage.fill('textarea[name="question"]', "I published a product but I am not receiving customers. What should I improve?");
  await artistPage.click('button:has-text("Ask")');
  await artistPage.waitForSelector("text=What we see in your listings", { timeout: 40000 }).catch(() => {});
  check("guide returns data-based findings", (await artistPage.locator("text=What we see in your listings").count()) > 0);
} catch (err) {
  console.error("ERROR", err.message);
  results.push({ name: "uncaught error", ok: false });
} finally {
  await browser.close();
  // Clean up: delete test users (cascades to their profiles, artist profile, products, orders).
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of list.users.filter((x) => x.email?.startsWith("e2e-") && x.email.endsWith("@example.com"))) {
    const { data: ap } = await admin.from("artist_profiles").select("id").eq("user_id", u.id).maybeSingle();
    if (ap) {
      const { data: files } = await admin.from("portfolio_images").select("original_path, web_path, public_path").eq("artist_id", ap.id);
      for (const f of files ?? []) {
        await admin.storage.from("originals").remove([f.original_path, f.web_path].filter(Boolean));
        if (f.public_path) await admin.storage.from("public-images").remove([f.public_path]);
      }
    }
    await admin.from("marketplace_orders").delete().eq("customer_id", u.id);
    if (ap) await admin.from("marketplace_orders").delete().eq("artist_id", ap.id);
    await admin.from("audit_logs").delete().eq("actor_id", u.id);
    await admin.from("moderation_reviews").delete().eq("reviewer_id", u.id);
    await admin.from("incubation_applications").update({ reviewer_id: null }).eq("reviewer_id", u.id);
    await admin.from("point_transactions").update({ created_by: null }).eq("created_by", u.id);
    const del = await admin.auth.admin.deleteUser(u.id);
    if (del.error) console.log("cleanup failed for", u.email, del.error.message);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}
