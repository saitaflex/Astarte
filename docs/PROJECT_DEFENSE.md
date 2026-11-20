# Astarte — Project Dossier & Defence Guide

**Real People. Real Creativity.**
Live: **https://astarte-art.vercel.app** · Repository: **github.com/saitaflex/astarte**
Status: working MVP prepared as a demonstration for the Ministry of Culture (Tunisia).

---

## Part 1 — What Astarte is

### 1.1 The problem
- Tunisian artists and artisans (potters, mosaic makers, weavers, musicians, painters…) have real skills but weak digital visibility. Their work lives in scattered Instagram/WhatsApp posts and word of mouth.
- Customers who want something handmade do not know whom to ask, and cannot easily tell human work from mass-produced or AI-generated images.
- Generic marketplaces and AI tools tend to replace creators (AI art) or bury them among industrial products.

### 1.2 The answer
Astarte is a discovery platform and marketplace **for human-made work**:
1. A visitor describes what they want, in English, French, Arabic or Tunisian Derja (even in Latin letters: “nheb fsifsa”).
2. Astarte searches **its own database of real artists, works, services and events**, including what their photos actually show.
3. The AI only **explains** the real results. It never invents an artist, a product, a price or a design.
4. The customer contacts the artist, orders, or requests a custom piece. **The artist decides what to create.**

### 1.3 Principle we never break
> AI helps people **discover** human creativity. It never **replaces** it.

Every design decision below traces back to this sentence.

---

## Part 2 — Everything in the project

### 2.1 Public experience
| Feature | What it does |
|---|---|
| **AI orb homepage** | A living, breathing orange orb (Canvas 2D). It reacts to typing, thinking and results; a static version for users who prefer reduced motion. |
| **AI discovery search** | Natural-language search in 4 languages incl. Arabizi; returns artists, products, services and events with a short “why it matches” for each. |
| **Picture-aware search** | Each approved photo has an AI description + tags, so “butterfly poster” finds the band whose poster shows a butterfly, and shows that exact picture. |
| **Artists directory** | Filter by discipline (with 3D icons) and city. |
| **Artist profiles** | Portfolio gallery, featured video, stories, works, services, events, contact (only what the artist made public), share buttons, a discipline-themed background. |
| **Marketplace** | Gallery-style catalogue, filters (search, discipline, city, max price, availability), product pages, cart, order requests. |
| **Events** | Workshops, concerts, exhibitions; customers can suggest an artisan’s event (admin approves). |
| **Map** | Google Maps with artist pins and service-area circles; falls back to OpenStreetMap automatically. Locations respect each artist’s privacy choice. |
| **Point Merci** | Community rewards: earn points for genuine discovery (reading stories, exploring profiles, sponsored videos), redeem them for artist offers as voucher codes. |
| **Grow with Astarte** | Incubation programme: apply, 5-stage journey, auto-checked milestones, guides, workshops, practical AI guide. |
| **3 languages** | English, French, Arabic (full right-to-left layout). |
| **Sharing** | WhatsApp / Facebook / X / copy link; link previews show the artist’s real photo. |

### 2.2 Artist studio
Profile & location privacy · works with multi-photo upload · orders & custom requests · stories · events · Point Merci offers · statistics (profile views, orders) · incubation dashboard.

### 2.3 Administration (separate, protected)
Overview built from live database queries · artist approvals & identity verification · **image review** with authenticity evidence · event suggestions · Point Merci campaigns, offers, point adjustments, suspicious-activity flags · incubation applications & workshops · user suspension/restoration · **audit log** of every decision.

### 2.4 Content currently on the platform
- **11 real creators** from supplied material: Cove, The Targets, Twisted Reflection (bands), Fousaifouse · Henda Namouchi (mosaic), Wood Carving Atelier, Clay & Heritage Pottery, Bouchra Chebbi (string art), Iheb Hoba (painting), Issam Majdoub (silver), Maryem · Fake Jewls Bags (beaded bags), Ricordami by Darahim (preserved-flower keepsakes).
- **9 real products** (4 mosaic pieces at 90–100 DT, others “price on request”), 1 real upcoming concert, 41 approved photos, 3 videos.
- **9 demo profiles**, always labelled “Demo ·” with a site banner, so the empty-state is never faked.
- **24 disciplines**, each with a recoloured 3D icon (3dicons, CC0).

---

## Part 3 — How it is built

### 3.1 Stack
| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 15 (App Router) + TypeScript + Tailwind CSS 4** | Server rendering, server actions, one codebase, fits Vercel. |
| Database & auth | **Supabase** (PostgreSQL, Auth, Storage), region Frankfurt | Relational integrity, row-level security, closest region to Tunisia on the free tier. |
| Hosting | **Vercel** | Global CDN, instant deploys, previews. |
| AI text | **Groq** — `gpt-oss-20b` | Fast (≈1–3 s), cheap; behind a provider adapter so it can be swapped. |
| AI vision | **Groq** — `qwen3.8-27b` | Describes photos for search. |
| AI-image detector | **SMOGY Swin classifier** (ONNX, runs in the admin’s browser via transformers.js) | Real ML model, no server GPU needed. |
| Maps | **Google Maps JS** (+ Leaflet/OpenStreetMap fallback) | Familiar for users; never breaks if the key fails. |
| Images | **sharp** | Validation, metadata stripping, WebP conversion. |
| Tests | **Vitest** (unit) + **Playwright** (browser journeys) | Logic and real user flows. |

### 3.2 Architecture in one picture
```
Browser ──► Next.js (Vercel)
              ├─ Server Components: read public data (anon key + row-level security)
              ├─ Server Actions: every write, permission re-checked on the server
              ├─ /api/discover: parse → search DB → rank → LLM explains → IDs validated
              └─ Admin browser: AI-image detector (ONNX) → result stored as evidence
                    │
                    ▼
            Supabase: PostgreSQL (RLS on every table) · Auth · Storage (private originals / public approved)
```

### 3.3 Database (9 migrations, `supabase/migrations`)
- **Identity:** `profiles` (role: customer / artist / admin, status), linked 1-to-1 to auth users.
- **Catalogue:** `artist_profiles`, `artist_categories`, `locations`, `products`, `product_categories`, `services`, `events`, `event_registrations`, `categories`.
- **Images & trust:** `portfolio_images` (original / review copy / public copy, AI description, tags), `authenticity_assessments` (model output), `moderation_reviews` (human decision), `audit_logs`.
- **Marketplace:** `shopping_cart_items`, `marketplace_orders`, `order_items`, `project_requests`, `favorites`, `platform_settings`.
- **Point Merci:** `point_transactions` (append-only ledger), `point_activities`, `engagement_sessions`, `sponsored_campaigns`, `campaign_completions`, `reward_offers`, `reward_redemptions`, `artist_posts`.
- **Incubation:** `incubation_programs`, `incubation_milestones`, `incubation_applications`, `incubation_enrollments`, `milestone_completions`, `learning_resources`, `workshops`, `workshop_registrations`.
- **Public views:** `public_artists` (only approved artists, only public contacts, coordinates rounded or hidden), `public_images` (only approved photos).

### 3.4 The AI discovery pipeline (the heart of the project)
1. **Understand** — a keyword parser (dictionary in EN/FR/AR/Derja + Arabizi “skeleton” matching, typo tolerance) extracts crafts, city, budget, type. The LLM adds structure (keywords, kind) but **dictionary-recognised crafts always win** over the model’s guesses.
2. **Search the database** — hard filters (city, budget, upcoming dates, type) then scoring: craft match, words in titles/descriptions, **words in what the photos show**.
3. **Rank** — deterministic and explainable; each hit lists what it matched and what is unknown (e.g. “price”).
4. **Explain** — the LLM receives **only the retrieved records** and writes one short reason per record.
5. **Guard** — any ID the model mentions that was not retrieved is **dropped**; phone numbers, emails and links are stripped; length is capped.
6. **Fail safe** — without AI (no key, timeout), standard search still works and the page says so honestly.

### 3.5 Human Authenticity Check
- **Upload:** file type checked from its bytes (not the name), size and dimensions validated, re-encoded to WebP — this **removes all metadata including GPS**. Signals recorded: EXIF present, camera, software tag, AI tool named in the file, C2PA marker.
- **Detector:** SMOGY Swin classifier, score stored as raw, uncalibrated output with model name and version.
- **Three states:** *Human evidence* · *AI indicators* · *Uncertain* — never a forced yes/no.
- **Human decides:** the admin approves, rejects, requests clarification or marks uncertain. The decision is stored **separately** from the model output; the model never rejects anyone.
- **Honesty about limits:** in our own test, a real live-concert photo scored “artificial = 1.000” (false positive, stage lighting). That is exactly why the score is evidence, not a verdict.

### 3.6 Point Merci integrity
- **Ledger, not a balance field:** every point is a row; balance is computed. Nothing can be edited silently.
- **Server-timed:** the server records when an activity starts and refuses completion if the minimum time has not passed (tested: instant completion is refused).
- **One reward per target**, daily limits, campaign budgets, all enforced **inside the database**.
- **Atomic redemption** with row locks: points cannot be spent twice.
- **Customers cannot insert points** (tested: blocked by the database).

### 3.7 Security & privacy
| Threat | Protection |
|---|---|
| Someone makes themselves admin | No admin option in signup; admins created only by a server script; role changes blocked by a database trigger. |
| Hiding buttons ≠ security | Every server action re-checks the role; **row-level security on every table**. |
| SQL injection | Parameterised queries through the Supabase client; no string-built SQL. |
| XSS | React escaping; AI text sanitised before display. |
| Leaked private data | Public views expose only approved rows and public fields; contacts are opt-in per channel. |
| Location privacy | Workshop / city / service area / hidden; coordinates rounded server-side; GPS stripped from photos. |
| Abuse | Rate limits on login, signup, search, uploads, suggestions. |
| Secrets | Only in environment variables; never in the repository (scanned before every push). |
| Accountability | Every admin decision written to the audit log. |
| Headers | HSTS, nosniff, frame-deny, referrer and permissions policies. |

Full plan: `docs/DATA_PROTECTION_PLAN.md` (Tunisian law 2004-63 / INPDP, retention, rights, breach response).

---

## Part 4 — Proof it works

| Test | Result |
|---|---|
| Unit tests (search, Arabizi, filters, AI guard, picture matching) | **15 / 15 pass** |
| End-to-end journey (join → upload → admin review → order → points → incubation) on the real database | **23 / 23 checks pass** |
| Live search set (EN/FR/AR/Derja, picture queries) | **14 / 14 correct first result** |
| Anonymous-access security checks | Private tables invisible, inserts blocked, admin functions denied |
| Live UI checks | Dropdowns on top & clickable, sign-out works, Google Map loads |
| Build / lint / type-check | Clean |

---

## Part 5 — How to defend it (likely questions and strong answers)

### On the concept
**“Isn’t this just another marketplace?”**
No. Marketplaces rank products; Astarte ranks **people and their real work**. Discovery is conversational, multilingual (including Derja), picture-aware, and every result is a real, approved creator. Commerce, rewards and incubation all serve one goal: make human creativity findable and sustainable.

**“Why use AI on a platform against AI art?”**
Because the problem is *discovery*, not *creation*. AI reads the request and the photos, then points to humans. It is technically forbidden from inventing artists, prices or designs: it only sees records we retrieved, and anything else is deleted before display.

**“Who benefits?”**
Artisans get a professional profile, sales, visibility and coaching for free. Customers find authentic local work. The Ministry gets a living, data-backed map of creative activity by discipline and region.

### On the AI
**“How do you stop hallucinations?”**
Four layers: (1) the database is searched first; (2) the model only receives those records; (3) every ID in its answer is checked and unknown ones are dropped; (4) contact details and links are stripped. If the AI fails, normal search still answers. Demo: ask for something that does not exist; Astarte says “no match” instead of inventing.

**“Does it understand Tunisians?”**
Yes, in four forms: English, French, Arabic script and Arabizi Derja (“nheb fa5ar”). Digits like 3/7/9/5 are mapped to letters and spelling variants collapse to the same key. Demo: “nheb fsifsa” → mosaic works; “ورشة فخار” → pottery workshop.

**“How does picture search work?”**
A vision model writes a factual description and tags for each approved photo (what it shows: object, materials, colours, motifs, never who made it). Search matches those words and displays the matching photo. Demo: “butterfly poster” → Cove; “doves” → the mosaic doves panel.

**“Can your detector prove a work is human-made?”**
No, and no detector can. We say so openly. It is one piece of evidence alongside metadata, provenance markers and a human reviewer. We even show our own false positive. Overclaiming would harm the artists we protect.

**“What if the AI provider shuts down or gets expensive?”**
The AI sits behind a provider adapter (environment variables choose the provider and model). Search works without it.

### On security & law
**“Can a user cheat Point Merci?”**
Points are created only by database functions that check server time, daily limits, duplicates and budgets. Customers cannot write to the ledger at all (tested). Redemption locks rows so points cannot be spent twice.

**“What about personal data?”**
Data minimisation (city, not address), opt-in public contacts, GPS removed from photos, rights to access and deletion, retention periods, and a breach plan, all in the data-protection plan aligned with Law 2004-63 / INPDP. Legal formalities (INPDP declaration) are scheduled for after the MVP; the demo is non-commercial.

**“How are admins controlled?”**
They cannot be created from the website; every action is re-authorised on the server and written to an audit log.

### On business & sustainability
**“How does it make money?”** (the MVP deliberately does not)
Future options: optional commission on completed orders (already modelled, set to 0%), premium artist tools, clearly labelled sponsored campaigns (Point Merci), institutional partnerships and workshops. No payment is simulated today; orders are arranged directly with the artist.

**“What does it cost to run?”**
Demo: free tiers (Vercel Hobby, Supabase Free, Groq free tier). Production: about **$45/month** (Vercel Pro ≈ $20 + Supabase Pro $25) plus AI usage. Caveats: Vercel Hobby is non-commercial; Supabase free projects pause after 7 idle days.

**“How will you grow content?”**
Artist self-signup with a guided studio, incubation milestones that push complete profiles, Point Merci that rewards customers for discovering new artists, and share links that bring traffic from social media.

### On honesty (questions designed to catch you out)
**“Are these artists real?”** The 11 named creators come from material they supplied; the 9 “Demo ·” profiles are samples and labelled as such everywhere.
**“Is payment working?”** Intentionally not. Orders are requests; the artist confirms price and payment directly. We never fake a payment.
**“Did you test it?”** Yes: 15 unit tests, a 23-check end-to-end journey on the real database, and live checks (see Part 4).

---

## Part 6 — 5-minute demo script
1. **Homepage (30 s):** the orb; type “nheb fsifsa”. Show mosaic results and the “why it matches” lines.
2. **Picture search (30 s):** “butterfly poster” → Cove with the poster image; explain photo descriptions.
3. **Artist profile (45 s):** Fousaifouse · Henda Namouchi: gallery, video, products at 90–100 DT, share button.
4. **Marketplace & order (45 s):** add the palm-leaf table to cart → order request (no fake payment).
5. **Point Merci (30 s):** ledger, offers, voucher codes; explain anti-cheat.
6. **Admin (60 s):** image review with detector score and the stage-photo false positive; approve; show the audit log.
7. **Map & languages (30 s):** Google map pins; switch to Arabic (RTL).
8. **Close (30 s):** “AI helps people discover human creativity. It never replaces it.”

---

## Part 7 — Known limitations (say them before they are asked)
- No online payment yet (by design for the MVP).
- Imported artists have no login yet; their profiles are managed by the team until they claim accounts.
- The AI-image detector is non-commercial-licensed (CC BY-NC 4.0) and uncalibrated; a commercial launch needs another model.
- Studio and admin screens are mainly in English; public pages are EN/FR/AR.
- Instagram/Facebook import requires each artist’s authorisation through Meta’s API (not scraping), planned next.
- A harmless React hydration warning appears in production logs only.

## Part 8 — Next steps
Artist account claiming · online payment with a Tunisian-licensed provider · Instagram import with artist consent · calibrated detector with a commercial licence · artist dashboards in FR/AR · INPDP declaration and legal review · mobile app wrapper.

---

## Appendix — Run it yourself
```bash
npm install
cp .env.example .env.local      # fill in the values
node --env-file=.env.local scripts/db-migrate.mjs   # create the database
npm run dev                      # http://localhost:3000
npm test                         # unit tests
node --env-file=.env.local scripts/create-admin.mjs you@example.org "Your Name" "StrongPassword123"
```
Useful scripts: `import-sources.mjs` (artist content), `describe-images.mjs` (photo descriptions), `detect-images.mjs` (AI-image detector), `fetch-icons.mjs` (category icons), `e2e-flow.mjs` (journey test).
