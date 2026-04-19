# reado-station Parity Checklist

> Companion to [Migration Roadmap](./migration-roadmap.md). This checklist defines what "phase 1 migration done" means before we touch the production cutover.

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
- [ ] D1 read path
- [ ] dual-write from collect/digest publish into D1

## Operational Safety

- [x] Astro production path unchanged
- [x] root script build remains separate from web candidate build
- [x] migration work does not remove `data/`
- [x] migration work does not remove `site/`
- [ ] backfill script for D1
- [ ] ingest API / worker write path
- [ ] digest publish API / worker write path

## Validation Checklist

- [ ] `npm test -- --run`
- [ ] `npm run build`
- [ ] `npm run typecheck:web`
- [ ] `npm run build:web`
- [ ] manual zh homepage pass
- [ ] manual en homepage pass
- [ ] manual archive/about pass

## Immediate Follow-Up

After the items above are green, the next migration slice is:

1. define the minimum D1 schema for `items`, `digests`, `sources`, `collection_runs`, and `ops_state`
2. add a deterministic backfill path from `data/` and generated site JSON
3. dual-write new collection and digest output into both JSON and D1
4. swap the candidate web app from JSON reads to repository-style data access backed by D1
