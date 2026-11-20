# Astarte — for the ART4EARTH jury

**Live:** https://astarte-art.vercel.app · **Theme:** Savoir-faire traditionnels & artisanat durable
**One line:** Astarte helps Tunisian artisans get found, sold and coached, with an AI that speaks Derja and only recommends real creators.

## 90-second path
1. Homepage → type **« nheb fsifsa »** (Derja: "I want mosaic") → real mosaic works, each with why it matches.
2. Type **« butterfly poster »** → the band Cove, shown with the poster that matched (search reads the photos).
3. Open **Round palm-leaf mosaic side table** (90 DT) → **Passeport Savoir-faire** → scan the QR card.
4. Artist profile → gallery, video, products, share.
5. *(with admin access)* Image review: AI-image detector score as evidence; a real concert photo scores 1.000 (false positive), so a human decides.

## Sustainability (ART4EARTH)
- **Passeport Savoir-faire** per product: maker, technique, materials, origin, time to make, local / recycled materials, repair, care, plus a printable QR card for the physical object.
- Durable choices shown **only from declared facts**: handmade by a named artisan, made-to-order (no overstock), local pickup, local or recycled materials, repairable.
- **No carbon figures are claimed.** We do not estimate what we have not measured.
- AI is used for discovery only; no image generation.

## What was built, and when
- Built on **19–20 November 2026**, during the hackathon, by our team with an **AI coding assistant (Claude Code)**. Artist content was collected from the artists during the event.
- Repository history: https://github.com/saitaflex/astarte

## Numbers we can stand behind
| Claim | Value | How we know |
|---|---|---|
| Real creators on the platform | 11 | Imported from material the artists supplied |
| Real products | 9 (4 priced 90–100 DT, 5 "price on request") | Database |
| Demo profiles | 9, always labelled "Demo ·" | Database + site banner |
| Unit tests | 15 / 15 pass | `npm test` |
| End-to-end journey | 23 / 23 checks pass | `scripts/e2e-flow.mjs` on the real database |
| Live search set | 14 / 14 correct first result (EN/FR/AR/Derja) | Run against the live site |
| Recommender quality | 58.7 % of top-3 suggestions share the work's craft vs 13.8 % at random (×4.25 lift), 95 % catalog coverage | `scripts/eval-recommender.mjs` on the real database |
| Users, sales, income, CO₂ | **Not measured yet** | — |

## Honest limits
No online payment yet (orders are arranged with the artist) · imported artists have no login yet · the AI-image detector has a non-commercial licence and is uncalibrated · studio/admin screens mainly in English · interior regions not yet covered.

## Machine-learning suggestions (clients ↔ artists)
- **For clients:** "Vous aimerez aussi" on every work, "Créateurs proches" on every profile, "Pour vous" on the marketplace once a visitor has viewed works.
- **For artists:** the studio shows the real searches where the AI suggested them, plus views, suggestion clicks and contact requests (last 30 days, anonymous).
- **How it works:** multilingual embeddings (paraphrase-multilingual-MiniLM-L12-v2, FR/EN/AR) of each work's text, technique, materials and AI photo descriptions, stored in pgvector. Ranking blends content similarity (55 %), co-views by other visitors (25 %), popularity (10 %) and same craft/technique (10 %), then a diversity re-rank so one artist does not fill the list. Every suggestion shows why it was chosen.
- **Honest limits:** co-view and popularity signals start at zero (logging began 20 Nov 2026); until visitors arrive, suggestions are content-based. The quality number above measures craft similarity, not purchases.

## Where the hard parts are
- Recommender: `src/lib/recommend/`, `supabase/migrations/0011_recommendations.sql`, `scripts/embed-catalog.mjs`, `scripts/eval-recommender.mjs`
- Grounded AI pipeline with ID validation: `src/lib/discovery/`
- Derja / Arabizi search: `src/lib/search/`
- Passport + QR: `src/app/[locale]/passport/`, `src/lib/passport.ts`
- Points ledger with anti-cheat in the database: `supabase/migrations/0003_point_merci.sql`
- Image pipeline and detector: `src/lib/images/`, `src/components/admin/DetectorButton.tsx`
- Full dossier: `docs/PROJECT_DEFENSE.md` · Data protection: `docs/DATA_PROTECTION_PLAN.md`
