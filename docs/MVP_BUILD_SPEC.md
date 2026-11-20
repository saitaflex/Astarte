# Astarte — MVP Build Specification

**Brand:** Astarte. The source brief says "HUMANLY"; the brand was renamed to Astarte earlier, so Astarte is used everywhere below.
**Slogan:** Real People. Real Creativity.
**Scope:** a working, tested MVP deployed on Vercel. The MVP is a demo for the Ministry of Culture.
**Status:** Specification. Nothing is built yet. The repository has no code.

Companion documents:
- `CLASS_DIAGRAM.md`: the full domain model (target architecture)
- `ADDENDUM_EVENTS_AND_AI.md`: events, Arabizi search, AI models and methods
- `DATA_PROTECTION_PLAN.md`: privacy controls (legal blockers deferred for MVP)

This document is the **MVP subset**. Where it conflicts with the class diagram, this document wins for the MVP.

---

## 1. Principles (in priority order)

1. Human creativity comes first.
2. AI helps people discover creators. It never replaces them.
3. Quality, trust and simplicity beat feature count.
4. A smaller, complete, polished product beats a larger unfinished one.

---

## 2. Stack decision

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Server components and route handlers fit Vercel. One codebase. |
| Styling | **Tailwind CSS** with design tokens as CSS variables | Fast, consistent, supports RTL with logical properties. |
| Components | Small in-house set. Headless primitives (Radix) only where accessibility is hard (dialog, dropdown, tabs). | Avoids a generic template look. |
| Database | **Supabase PostgreSQL** with `postgis`, `pgvector`, `pg_trgm` extensions | Relational, geo queries, semantic search and typo-tolerant Arabizi search in one database. |
| Auth | **Supabase Auth** (email + password, magic link optional) | Secure sessions, row-level security tied to `auth.uid()`. |
| Storage | **Supabase Storage**: private bucket for originals, public-read bucket for approved web variants only | Simple. Signed URLs for anything private. |
| Map | **Leaflet + OpenStreetMap tiles** for the demo, behind a `MapProvider` adapter | Free and open. Production traffic needs a commercial or self-hosted tile source (see section 13). |
| Orb | **Canvas 2D + CSS** (no three.js) | Lightweight. Full control. Easy reduced-motion fallback. |
| AI | Provider adapter. Candidate: Claude (`claude-haiku-5-5` for intent parsing, `claude-sonnet-5-5` for explanations) | Swappable. Works without AI (falls back to normal search). |
| Embeddings | BGE-M3 via an inference endpoint, behind `EmbeddingProvider` | Arabic, French, English. Optional for MVP; search works without it. |
| Image authenticity | `AuthenticityService` adapter. Candidate: Community-Forensics on an external worker | Not run inside Vercel functions. Shows "not configured" until connected. |
| i18n | `next-intl` with `en`, `fr`, `ar` locales; `dir="rtl"` for Arabic | Routing per locale, RTL layout. |
| Testing | Vitest (unit), Playwright (end-to-end journeys, mobile viewport) | Covers the 10 journeys in section 11. |
| Hosting | **Vercel** | Requested. |

---

## 3. Design system

### 3.1 Tokens

```css
:root {
  --orange-500: #F28C28;   /* primary: CTAs, orb core, active nav, focus */
  --orange-300: #FFB45C;   /* secondary: orb aura, highlights, hover */
  --charcoal:   #171717;   /* text, dark surfaces */
  --cream:      #F5F1EA;   /* page background */
  --white:      #FFFFFF;   /* cards, inputs */
  --ink-muted:  #5C5650;   /* secondary text (AA on cream) */
  --line:       #E4DDD2;   /* hairlines, borders */
  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 24px;
  --ease-out: cubic-bezier(.2,.8,.2,1);
}
```

Orange rules: one primary orange action per screen. Orange is never used for body text on cream (it fails contrast). Large orange areas are reserved for the orb.

### 3.2 Typography

| Role | Font | Notes |
|---|---|---|
| Display (hero, profile names) | An editorial serif, e.g. **Fraunces** or **Instrument Serif** | Gives the gallery feel. Used sparingly. |
| UI and body | A clean grotesk, e.g. **Inter Tight** or **Geist** | Readability. |
| Arabic | **IBM Plex Sans Arabic** (UI) + **Noto Naskh Arabic** (display) | Proper shaping and RTL. |

Fonts are self-hosted via `next/font` with `display: swap` and Latin + Arabic subsets only.

### 3.3 Motion rules

- Durations 150–400 ms for UI, slow loops (6–12 s) for ambient effects.
- Only `transform` and `opacity` are animated.
- `prefers-reduced-motion: reduce` turns ambient motion off and keeps state changes as fades.
- No animation blocks reading or input.

---

## 4. Homepage and the AI orb

### 4.1 First screen

```
 ┌──────────────────────────────────────────────────────────────┐
 │ Astarte        Discover  Artists  Map  About   Sign in [Join] │
 │                                                              │
 │                         ( orb )                              │
 │                                                              │
 │          Discover the beauty of human creativity.            │
 │  Tell us what you're looking for. We'll help you find the    │
 │              people who can make it.                         │
 │                                                              │
 │     ┌───────────────────────────────────────────┐ 🎤  →      │
 │     │ What are you looking for?                 │            │
 │     └───────────────────────────────────────────┘            │
 │            Explore artists  ·  Become an artist              │
 └──────────────────────────────────────────────────────────────┘
```

- The orb is the first thing seen. No marketplace grid above the fold.
- The microphone button only appears when a speech provider is configured.
- Below the fold, a short sequence: a few featured artists (real, approved records only), categories, a map preview, a trust section on authenticity, and an artist call to action. If the database is empty, these sections show an honest empty state, not fake artists.

### 4.2 Orb design

| Layer | Description |
|---|---|
| Core | Radial gradient from `#F28C28` to `#FFB45C`, with soft inner light. |
| Aura | Large blurred halo, low opacity, slow breathing scale (about 1.00 → 1.04 over 8 s). |
| Rings | 2–3 thin translucent ellipses rotating at different slow speeds. |
| Particles | 30–60 small warm particles drifting on a Canvas layer, fewer on mobile. |
| Texture | Very faint grain overlay to avoid a "plastic" look. |

### 4.3 Orb states

| State | Trigger | Behaviour |
|---|---|---|
| `idle` | Default | Slow breathing, slow rings, gentle drift. |
| `typing` | Input has focus and text | Aura brightens slightly, particles move a little faster. |
| `thinking` | Request sent | Rings speed up, a soft pulse travels outward. |
| `results` | Response received | Short settle animation, then back to `idle`. |
| `error` | Request failed | Brief dim, then idle. Error message shown in text. |
| `reduced` | Reduced motion | Static orb. State changes shown with opacity only. |

Implementation notes:
- `<Orb state={...} />` component. Canvas loop pauses when the tab is hidden or the orb is off-screen (`IntersectionObserver`).
- Device-pixel-ratio capped at 2. Frame budget target under 4 ms on mid-range phones.
- The orb is decorative: `aria-hidden="true"`. State changes are announced in an `aria-live` region as text ("Searching…", "3 results found").

### 4.4 Results

Results slide in below the input as a short list:
- Artist card: photo, name, city, specialty, one-line "why it matches".
- Product or service card: image, title, price (or "price on request"), availability (or "not provided"), artist name.
- Event card (from events feature): date, title, city or "online", price label.
- A clear "No match found" state with suggestions to widen the search.

---

## 5. Artistic atmospheres by category

Shown on artist profiles, category pages and a few selected backgrounds only. Never on the homepage hero, dashboards or forms.

| Category group | Motif | Implementation | Motion |
|---|---|---|---|
| Music, singing, composition | Faint floating notes, waveform lines | SVG, 3–6 notes, 4–8% opacity | Slow drift; off with reduced motion |
| Painting, illustration | Brushstroke texture, pigment shapes, paper grain | Static SVG/PNG texture | None |
| Sculpture, pottery, ceramics | Organic blobs, clay grain, soft shadows | SVG blobs + grain | Very slow morph or none |
| Textiles, carpets, embroidery, traditional crafts | Fine geometric motifs inspired by Tunisian patterns | SVG pattern tile, low contrast | None |
| Photography, videography | Editorial frames, thin crop marks | CSS borders and SVG marks | None |
| Design, architecture, interior, furniture | Fine grid, precise lines | CSS background grid | None |
| Jewelry, metalwork, leather, carpentry | Subtle material grain (metal sheen, wood grain, leather) | Static texture | None |

Rules:
- The artist's portfolio is always the visual focus. Decoration sits behind it at low opacity.
- Text contrast is checked with the decoration present.
- The motif comes from the artist's primary category. It is stored as `atmosphere` on the category, not chosen per artist.

---

## 6. Pages and routes

Locale prefix on all public routes: `/en`, `/fr`, `/ar`.

| # | Page | Route | Access |
|---|---|---|---|
| 1 | Homepage with orb | `/` | Public |
| 2 | Artist discovery | `/artists` | Public |
| 3 | Product and service discovery | `/discover` | Public |
| 4 | Interactive map | `/map` | Public |
| 5 | Artist profile | `/artists/[slug]` | Public (approved profiles only) |
| 6 | Customer sign in / sign up | `/sign-in`, `/sign-up` | Public |
| 7 | Artist registration | `/join` | Public |
| 8 | Customer dashboard | `/account` | Customer |
| 9 | Artist dashboard | `/studio` | Artist |
| 10 | Admin dashboard | `/admin` | Admin |
| 11 | About | `/about` | Public |
| 12 | Privacy and terms | `/privacy`, `/terms` | Public |
| 13 | Events (user-requested) | `/events`, `/events/[slug]` | Public |

Navigation: Discover · Artists · Map · About · Sign in, with a "Join as an artist" button. Events appear inside Discover as a filter tab, not as an extra nav item.

---

## 7. AI discovery

### 7.1 Pipeline

1. **Interpret.** `RequestUnderstandingService` turns the message into a structured filter (category, city, budget, type: product / service / commission / event, date range). Arabizi is normalised first (see addendum B.3).
2. **Search.** A server function queries the database with that filter: full-text, trigram, PostGIS radius, and pgvector if embeddings are configured.
3. **Retrieve.** Only approved, public records are returned.
4. **Rank.** Rule-based score first (filter match, distance, text relevance). Reciprocal Rank Fusion when vector search is on.
5. **Return.** Records go to the frontend as structured cards.
6. **Explain.** The LLM receives only those records and writes short "why it matches" lines plus at most one clarifying question. Every ID it mentions is validated server-side; unknown IDs are dropped.

### 7.2 When AI is not configured or fails

- Step 1 falls back to a keyword parser (category and city dictionaries, price regex, Arabizi dictionary).
- Step 6 is skipped. Cards show matched criteria instead of a generated sentence.
- The UI shows a small, honest label: "Smart search is offline — showing standard results." No fake AI reply.

### 7.3 Hard rules

The AI never invents artists, products, prices, portfolios, addresses or availability. It never proposes designs or artwork. It never says an artist has accepted a request. For commissions, it collects the customer's requirements into a brief, and the artist decides what to make.

---

## 8. MVP database schema

Essential tables from the brief, plus `events`, `event_registrations` and `search_terms` because events and Arabizi are confirmed MVP features. All tables have `created_at` and `updated_at`.

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `role` (`customer` / `artist` / `admin`), `display_name`, `locale`, `status` | Role is set only by server code, never by the signup form. |
| `artist_profiles` | `id`, `user_id` → profiles, `slug` unique, `display_name`, `bio`, `primary_category_id`, `avatar_path`, `approval_status`, `verification_status`, `availability`, `accepts_commissions`, `contact` (jsonb with per-field `public` flags) | Public only when `approval_status = 'approved'`. |
| `categories` | `id`, `slug`, `name_en`, `name_fr`, `name_ar`, `parent_id`, `atmosphere` | Seeded from section 9 of the brief. |
| `artist_categories` | `artist_id`, `category_id`, `is_primary` | Join table. |
| `locations` | `id`, `artist_id`, `city`, `region`, `country`, `point` (`geography(Point)`), `privacy` (`public_workshop` / `approximate_city` / `service_area` / `hidden`), `service_radius_km` | GiST index on `point`. Public view rounds coordinates. |
| `products` | `id`, `artist_id`, `title`, `description`, `price_amount` nullable, `currency`, `availability` (`in_stock` / `made_to_order` / `unavailable`), `materials` text[], `status`, `search_tsv`, `embedding` vector nullable | Full-text and vector indexes. |
| `services` | `id`, `artist_id`, `title`, `description`, `price_from` nullable, `currency`, `pricing_note`, `status`, `search_tsv`, `embedding` | Same indexes. |
| `portfolio_images` | `id`, `artist_id`, `product_id` nullable, `original_path` (private), `web_path` nullable, `mime`, `size_bytes`, `width`, `height`, `sha256`, `caption`, `moderation_status`, `authenticity_state` | `web_path` is set only after approval. |
| `authenticity_assessments` | `id`, `image_id`, `provider`, `model_id`, `model_version`, `state` (`human_evidence` / `ai_indicators` / `uncertain` / `not_assessed`), `score` nullable, `score_calibrated`, `signals` jsonb | ML prediction only. |
| `moderation_reviews` | `id`, `reviewer_id`, `target_type`, `target_id`, `decision` (`approve` / `reject` / `request_changes` / `mark_uncertain`), `internal_note`, `assessment_id` nullable | Human decision, separate from the assessment. |
| `project_requests` | `id`, `customer_id`, `artist_id`, `brief` jsonb, `budget_amount` nullable, `currency`, `deadline` nullable, `status` (`submitted` / `in_discussion` / `accepted` / `declined` / `in_progress` / `completed` / `cancelled`), `artist_reply` | One row per artist contacted. Only the artist can set `accepted`. |
| `favorites` | `customer_id`, `artist_id` | Composite primary key. |
| `events` | `id`, `artist_id`, `slug`, `title`, `description`, `type`, `starts_at`, `ends_at`, `timezone`, `is_online`, `online_url`, `location_id` nullable, `pricing_mode`, `price_amount` nullable, `capacity` nullable, `status`, `suggested_by` nullable | Artist events publish directly. Client suggestions (`suggested_by` set) need admin approval. |
| `event_registrations` | `id`, `event_id`, `customer_id`, `party_size`, `status` | Organiser confirms when capacity is limited. |
| `search_terms` | `id`, `term`, `script` (`latin` / `arabic`), `lang` (`derja` / `fr` / `en` / `ar`), `category_id` nullable, `event_type` nullable | Arabizi and synonym dictionary. Trigram index on `term`. |
| `audit_logs` | `id`, `actor_id`, `action`, `target_type`, `target_id`, `before` jsonb, `after` jsonb, `ip_hash` | Written by a server function on every admin action. |

Deferred to post-MVP (in the class diagram, not built now): messages, reviews, reports table, verification requests, notifications, analytics events table, AI interaction log, sustainability, system settings. Basic analytics in the MVP use simple counters (`artist_profiles.profile_views`, `contact_clicks`) incremented by a server function.

### 8.1 Row-level security (summary)

| Table | Public (anon) | Customer | Artist | Admin |
|---|---|---|---|---|
| `artist_profiles` | Read approved | Read approved | Read approved + own; update own | All |
| `products`, `services`, `events` | Read published of approved artists | Same | CRUD own | All |
| `portfolio_images` | Read approved (web variant) | Same | CRUD own; cannot set moderation fields | All |
| `locations` | Read via a **view** that rounds or hides coordinates | Same | CRUD own | All |
| `project_requests` | None | Create; read own | Read and reply to own | Read all |
| `favorites` | None | CRUD own | None | Read |
| `event_registrations` | None | Create; read own | Read for own events; confirm | All |
| `authenticity_assessments`, `moderation_reviews`, `audit_logs` | None | None | Read own image's state only | All |

Admin checks use a SQL function `is_admin()` that reads `profiles.role`. The service-role key is used only in server code.

### 8.2 Admin provisioning

- No admin option in any signup form.
- Script `scripts/create-admin.ts` (run locally with the service-role key) sets `profiles.role = 'admin'` for an existing user, and writes an audit log entry.
- Admin routes check the role on the server in middleware **and** in every server action.

---

## 9. Human authenticity check (MVP)

1. Artist uploads an image. The server validates type (JPEG, PNG, WebP), size (≤ 10 MB), dimensions, and re-encodes it to strip metadata. EXIF GPS is removed.
2. The original is stored in the private bucket. A record is created with `moderation_status = pending`.
3. If `IMAGE_DETECTION_PROVIDER` is configured, a job is sent to the external worker. The result is stored as an `authenticity_assessments` row.
4. If not configured, the assessment is stored as `not_assessed` with the reason "Detector not configured".
5. The admin queue shows: image, artist, upload date, assessment state, model and version, signals, C2PA result (if checked), and review history.
6. Admin chooses **Approve**, **Reject**, **Request changes** or **Mark uncertain**. The decision is saved in `moderation_reviews` and the audit log.
7. Approval publishes a web variant. The public badge says **"Reviewed"**, not "Proven human". Authenticity state is shown separately and in plain words.

No automatic rejection based on a model score.

---

## 10. Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Public anon key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Admin script and trusted server actions |
| `AI_PROVIDER` | Server | `anthropic` or empty (empty = AI off) |
| `AI_API_KEY` | Server | Provider key |
| `AI_MODEL_PARSE` / `AI_MODEL_EXPLAIN` | Server | Model ids |
| `EMBEDDING_PROVIDER` / `EMBEDDING_API_URL` / `EMBEDDING_API_KEY` | Server | Optional semantic search |
| `IMAGE_DETECTION_PROVIDER` / `IMAGE_DETECTION_API_URL` / `IMAGE_DETECTION_API_KEY` | Server | Optional authenticity worker |
| `SPEECH_PROVIDER` / `SPEECH_API_KEY` | Server | Optional voice input |
| `NEXT_PUBLIC_MAP_TILE_URL` / `NEXT_PUBLIC_MAP_ATTRIBUTION` | Browser | Tile source (defaults to OSM for the demo) |
| `RATE_LIMIT_SALT` | Server | Hashing IPs for rate limits and audit logs |

`.env.example` documents all of them. No real values are committed.

---

## 11. Acceptance journeys (Playwright, desktop + mobile)

| # | Journey | Passes when |
|---|---|---|
| 1 | Guest visits homepage | Orb renders, input is focusable, no console errors, reduced-motion shows a static orb |
| 2 | Guest searches for an artisan | Results come from seeded dev records; "no match" state works; AI-off fallback works |
| 3 | Customer registers | Account created with role `customer`; cannot reach `/studio` or `/admin` |
| 4 | Artist registers | Profile created with `approval_status = pending`; not visible publicly |
| 5 | Artist edits profile | Changes saved; contact fields hidden unless marked public |
| 6 | Artist uploads an image | Invalid files rejected; valid image stored privately; status pending |
| 7 | Admin reviews the image | Decision recorded; audit log entry written; approved image appears publicly with "Reviewed" badge |
| 8 | Customer finds an artist on the map | Marker shown only for non-hidden locations; marker opens the profile; list view in sync |
| 9 | Customer submits a project request | Request stored with status `submitted`; visible to that artist only |
| 10 | Artist responds | Status changes to `accepted` or `declined` only by the artist |
| 11 | Arabizi search (added) | A seeded Arabizi query returns the matching category results |
| 12 | Events (added) | Artist publishes an event; client suggestion waits for admin approval |
| 13 | RTL (added) | `/ar` renders right-to-left with no layout breakage on mobile |

Development seed data is clearly labelled (`[DEV]` prefix, separate seed script) and is never loaded into production.

---

## 12. Build order

1. **Inspect.** Repository (empty), skills (Vercel, Next.js, shadcn, frontend-design, Supabase via Vercel Marketplace), tools (Vercel CLI, browser automation, Postman CLI), credentials (none confirmed yet).
2. **Scaffold.** Next.js + TypeScript + Tailwind + next-intl. Tokens, fonts, base layout, RTL.
3. **Orb and homepage first.** Build, test animation, performance, reduced motion and mobile before anything else.
4. **Database.** Supabase migrations, RLS policies, seed script, admin script.
5. **Auth and roles.** Sign up, sign in, artist join flow, server role guards.
6. **Discovery.** Artists, products, services, events, filters, Arabizi dictionary, profile pages with atmospheres.
7. **Map.** Leaflet, markers from the privacy view, list sync.
8. **Studio (artist dashboard).** Profile, portfolio upload, products, services, events, requests, basic counters.
9. **Admin.** Pending registrations, image queue with authenticity panel, client event suggestions, users, categories, featured artists, audit log view.
10. **AI layer.** Provider adapter, keyword fallback, explanation step, ID validation.
11. **Test.** Unit tests for ranking, ID validation, Arabizi normaliser, RLS; Playwright journeys.
12. **Deploy.** Vercel project, environment variables, migrations on the production Supabase project, build, verify live URL, rerun journeys against production.

---

## 13. Operating cost estimate (to verify before committing)

| Service | Free tier (as reported) | When it stops being enough | Next step |
|---|---|---|---|
| Vercel | Hobby plan is **non-commercial, personal use only**. Reported: 4 hours of active CPU per month on functions; 10 GB deployment storage. | If Astarte becomes a commercial or official service, Hobby does not fit its terms. | Pro, reported at about $20/month. |
| Supabase | Reported: 500 MB database, 1 GB file storage, 5 GB egress, 50,000 monthly active users, 2 projects. **Free projects pause after 7 days without activity.** | Image storage (1 GB) is the first limit; pausing breaks a live demo. | Pro, reported at $25/month. |
| Map tiles | OSM tile servers: no fixed limit, but heavy or commercial production use is discouraged and can be blocked. | Any real public traffic. | A commercial tile provider or self-hosted tiles. Pricing not checked. |
| AI inference | Pay per token. | Depends on traffic. | Set a monthly cap in the provider dashboard. |
| Authenticity detector | No free hosted option confirmed. | Any use. | GPU worker or hosted endpoint; cost to be measured. |
| Embeddings | Optional for MVP. | — | Hosted endpoint or small CPU worker. |

**Demo budget:** can run at $0 on free tiers, with these risks: Supabase pausing after a week of inactivity, the Vercel Hobby non-commercial clause, and OSM tile limits.
**Small production budget:** roughly $45/month (Vercel Pro + Supabase Pro), plus AI usage and tiles. These figures come from third-party pages; check vercel.com/pricing and supabase.com/pricing before committing.

Note: one source reports that Supabase projects created after 30 May 2026 need explicit Postgres grants for the Data API. The migrations must include those grants.

---

## 14. Final delivery checklist (what the build must report)

1. Live Vercel URL (only once verified)
2. Repository structure
3. Technology stack
4. Database schema and relationships
5. Admin account setup steps
6. Environment variables
7. Configured integrations
8. Integrations still needing credentials
9. Tests run and results
10. Known limitations
11. Operating cost estimate
12. Next steps for development

Every feature is labelled **Working**, **Working (fallback mode)**, or **Placeholder (needs credentials)**.

---

## 15. Missing access before the build can deploy

| Needed | Why |
|---|---|
| Supabase project (or approval to create one through the Vercel Marketplace) | Database, auth and storage |
| Vercel account access from this machine (`vercel login`) | Deployment |
| AI provider key (optional) | Smart search; the app works without it |
| Detector endpoint (optional) | Authenticity check; the admin UI works without it and shows "not configured" |

---

## Sources

- Supabase free tier (third-party, 2026): https://dev.to/mahdi_benrhouma_fe1c6005/supabase-free-tier-limits-in-2026-what-you-actually-get-and-when-you-will-hit-them-4mhe
- Supabase free tier summary: https://automationatlas.io/answers/supabase-free-tier-limits-2026/
- Supabase pricing (official): https://supabase.com/docs/pricing
- Vercel Hobby plan (official): https://vercel.com/docs/plans/hobby
- Vercel limits (official): https://vercel.com/docs/limits
- Vercel pricing (third-party): https://schematichq.com/blog/vercel-pricing
- Vercel Hobby storage change: https://thenewstack.io/vercel-hobby-deployment-retention/
- OSM tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- OSM heavy-use discussion: https://lists.openstreetmap.org/pipermail/legal-talk/2013-December/007683.html
