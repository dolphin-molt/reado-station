# reado-station Parity Checklist

> Companion to [Migration Roadmap](./migration-roadmap.md). This checklist defines what "phase 1 migration done" means before we touch the production cutover.

Production cutover runbook: [Production Migration Checklist](./production-migration-checklist.md)

## Scope

Phase 1 parity means:

- the current Astro site remains the production path
- a read-only candidate app exists in `apps/web`
- the candidate app can render the same core content model from repository data
- current scripts and tests still pass

Phase 1 parity does not mean:

- D1 is the production source of truth
- Cloudflare traffic has been switched
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
- [x] translated title/summary fallback for Chinese display
- [x] category labels
- [x] empty state when no generated content exists
- [ ] category filter pills
- [ ] show-more progressive reveal
- [ ] theme/style toggles

## Archive Parity

- [x] reverse chronological day list
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

- [x] candidate app reads `site/src/data/days.json`
- [x] candidate app reads `site/src/data/digests.json`
- [x] candidate app reads `site/src/data/items.json`
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

## Operational Safety

- [x] Astro production path unchanged
- [x] root script build remains separate from web candidate build
- [x] migration work does not remove `data/`
- [x] migration work does not remove `site/`
- [x] backfill script for D1
- [x] local shadow write path for collection and digest SQL
- [x] ingest API / worker write path
- [x] digest publish API / worker write path
- [x] ops-state API path
- [x] public health check endpoint
- [x] Cloudflare/OpenNext deployment workflow

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
- [ ] manual visual archive/about pass

## Immediate Follow-Up

After the automated checks above are green, the remaining production work is operational rather than code-heavy:

1. create the real Cloudflare D1 database and configure GitHub secrets
2. run the Cloudflare deploy workflow with D1 migration and backfill enabled
3. enable collection dual-write and observe 3 successful morning/evening cycles
4. cut over traffic only after `/api/health` and page parity checks are green
