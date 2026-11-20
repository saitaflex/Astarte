# Astarte — Real People. Real Creativity.

A discovery platform and marketplace for real Tunisian artists and artisans.
AI helps people **discover** human creativity. It never **replaces** it.

**Live:** https://astarte-art.vercel.app

- AI search in English, French, Arabic and Tunisian Derja (incl. Arabizi), grounded in real database records
- Picture-aware search, artist profiles, marketplace, events, map
- Point Merci rewards, Grow with Astarte incubation
- Human Authenticity Check: AI-image detector as evidence, human review decides
- Artist studio and protected admin with audit log

Full documentation and defence guide: [`docs/PROJECT_DEFENSE.md`](docs/PROJECT_DEFENSE.md)

## Stack
Next.js 15 · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, Storage) · Vercel · Groq · transformers.js · Google Maps

## Getting started
```bash
npm install
cp .env.example .env.local   # fill in values
node --env-file=.env.local scripts/db-migrate.mjs
npm run dev
npm test
```

Category icons: [3dicons](https://3dicons.co) by realvjy (CC0), recoloured.
