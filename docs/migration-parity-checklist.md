# reado-station Parity Checklist

> Companion to [Migration Roadmap](./migration-roadmap.md). This checklist defines what the production-ready D1 migration must keep true after cutover.

Production cutover runbook: [Production Migration Checklist](./production-migration-checklist.md)

## Scope

Production parity means:

- Cloudflare Worker + D1 is the production path
- the Next app in `apps/web` renders the same core briefing product from D1
- local JSON remains only as a development fallback and emergency import source
- current scripts and tests still pass

Production parity does not mean:

- auth, assistant, community, tools, columns, or knowledge graph are live

## Route Parity

- [x] Chinese homepage at `/`
- [x] English homepage at `/en`
- [x] Chinese archive page at `/archive`
- [x] English archive page at `/en/archive`
- [x] Chinese about page at `/about`
- [x] English about page at `/en/about`
- [x] Shared navigation model across zh/en routes
- [x] Language switch keeps the current route
- [ ] Daily archive detail routes

## Homepage Parity

- [x] latest day determined from generated data
- [x] masthead shows date, item count, source count
- [x] daily observation block
- [x] key stories block derived from digest clusters
- [x] full latest-day item list
- [x] latest-day item list pagination
- [x] translated title/summary fallback for Chinese display
- [x] category labels
- [x] empty state when no generated content exists
- [ ] category filter pills
- [ ] show-more progressive reveal
- [ ] theme/style toggles

## Archive Parity

- [x] reverse chronological day list
- [x] archive pagination
- [x] day item counts
- [x] batch labels
- [x] bilingual labels
- [ ] archive day detail pages

## About Parity

- [x] bilingual content blocks
- [x] feedback CTA
- [x] shared footer/nav
- [ ] feedback modal workflow

## Data Parity

- [x] production app reads D1 for homepage content
- [x] production app reads D1 for archive content
- [x] local app can fall back to empty/generated JSON when D1 is not required
- [x] content loader is server-side only
- [x] asset bridge exists for legacy `site/public` images/placeholders
- [x] shared content types extracted into `packages/shared`
- [x] `scripts/build-site-data.ts` uses shared types
- [x] minimum D1 schema defined in `db/d1/0001_core.sql`
- [x] deterministic backfill SQL export exists via `npm run d1:backfill`
- [x] collection runs write git-ignored D1 shadow SQL artifacts
- [x] digest generation writes git-ignored D1 shadow SQL artifacts
- [x] D1 read path for the candidate web app
- [x] protected D1 ingest API for collection output
- [x] protected D1 digest API for digest publishing
- [x] optional direct D1 write from collect/digest publish scripts
- [x] API-based historical sync script exists via `npm run d1:sync-api`

## Operational Safety

- [x] Astro path retained only as manual rollback
- [x] root script build remains separate from web candidate build
- [x] migration removes tracked runtime `data/` files from Git while preserving local ignored files
- [x] migration work does not remove `site/`
- [x] backfill script for D1
- [x] local shadow write path for collection and digest SQL
- [x] ingest API / worker write path
- [x] digest publish API / worker write path
- [x] ops-state API path
- [x] public health check endpoint
- [x] Cloudflare/OpenNext deployment workflow
- [x] scheduled collection workflow no longer commits runtime data

## Validation Checklist

- [x] `npm test -- --run`
- [x] `npm run build`
- [x] `npm run typecheck:web`
- [x] `npm run build:web`
- [x] `npm run build:web:cloudflare`
- [x] local D1 migration/backfill smoke test
- [x] Cloudflare preview `/api/health` returns D1 counts
- [x] Remote Cloudflare Worker `/api/health` returns D1 counts
- [x] Cloudflare preview zh homepage HTTP pass
- [x] Cloudflare preview en homepage HTTP pass
- [x] Cloudflare preview archive HTTP pass
- [ ] Cloudflare preview paginated homepage/archive HTTP pass after the pagination deploy
- [ ] manual visual archive/about pass
- [ ] next scheduled collection proves fresh D1 write in production

## Immediate Follow-Up

After the automated checks above are green, the remaining production work is operational monitoring:

1. watch the next scheduled cloud collection and confirm `/api/health` counts advance
2. confirm the latest digest publish writes through `/api/digest`
3. keep the legacy Astro/GitHub Pages path available for the stabilization window
4. remove the legacy path only after the D1-only workflow has run cleanly for multiple days
