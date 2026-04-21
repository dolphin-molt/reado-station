# reado-station Migration Roadmap

Companion checklists:

- [Migration Parity Checklist](./migration-parity-checklist.md)
- [Production Migration Checklist](./production-migration-checklist.md)

> Goal: migrate `reado-station` from the current Astro + Git-tracked JSON delivery model to a Cloudflare-native application platform without interrupting the existing daily operation loop.

## One-Line Summary

Split the migration into two stages:

1. Platform parity: move the current "AI daily briefing site" onto the new runtime with minimal behavior change.
2. Platform expansion: only after parity is stable, add knowledge graph, assistant, tools, columns, community, and webhook-driven operations.

This keeps us from mixing "framework migration" and "product expansion" into one risky cutover.

## Current State

The current production path is still centered on these pieces:

- `scripts/collect.ts`: collects items into `data/YYYY/MM/DD/{batch}/raw.json`
- `scripts/summarize.ts`: generates `digest.md`
- `scripts/build-site-data.ts`: converts `data/` into `site/src/data/*.json`
- `site/`: Astro static site rendered from generated JSON
- `scripts/ops-runner.ts`: operational backbone for restore, collect, analyze, build, persist, publish

This means the real source of truth today is still:

- operational data in `data/`
- generated site JSON in `site/src/data/`
- Astro pages in `site/src/`

The migration branch now also contains a production-ready candidate path:

- `apps/web`: OpenNext/Cloudflare-capable Next app
- `db/d1/0001_core.sql`: minimum D1 schema
- `scripts/export-d1-backfill.ts`: idempotent D1 backfill export
- `apps/web/src/app/api/ingest`: protected collection ingest API
- `apps/web/src/app/api/digest`: protected digest publish API
- `apps/web/src/app/api/ops-state`: protected ops-state API
- `apps/web/src/app/api/health`: public D1 health check
- `.github/workflows/deploy-web-cloudflare.yml`: gated Cloudflare deploy workflow

## Planned Target

The intended target should be treated as a Cloudflare-native app platform with these boundaries:

- `apps/web`: user-facing web app
- `packages/shared`: shared types, schemas, and transformation logic
- `workers/*`: background jobs, ingestion, translation, image fetch, tagging, embedding, monitoring
- D1: operational and content database
- Cloudflare Pages/Workers: runtime and deployment target

The target is not just "rewrite the frontend". It is a read/write platform where:

- data is queryable instead of compiled into static JSON only
- operational state lives in a database instead of only `ops-state.json`
- ingestion and digest publishing can be done through APIs or workers
- future features can be added without rebuilding the whole site pipeline

## Migration Principles

1. Keep the daily briefing loop alive throughout the migration.
2. Migrate reads before removing the current write path.
3. Dual-write before cutover; never hard-switch the source of truth in one step.
4. Reach product parity before expanding scope.
5. Preserve a rollback path at every stage.
6. Treat Astro as the fallback until Next/Cloudflare proves stable in production.

## Non-Goals

These should not be bundled into the first cutover:

- full auth and account system
- community posting and voting
- assistant chat with retrieval
- tools directory and editorial columns
- knowledge graph enrichment beyond what supports the existing daily briefing experience

Those belong to stage 2, after the migrated core is stable.

## Recommended Migration Shape

### Phase 0: Freeze Boundaries

Goal: stop the migration from becoming a moving target.

Deliverables:

- define the minimum parity surface:
  - homepage
  - archive
  - bilingual content display
  - key stories / observations / full news list
  - digest publishing
  - source and run health visibility for operators
- define what remains on Astro during the migration
- define what is explicitly postponed to stage 2

Exit criteria:

- one written parity checklist exists
- one owner exists for each workstream: data, web, workers, ops

### Phase 1: Establish the New Skeleton

Goal: create the tracked target structure without changing production behavior yet.

Deliverables:

- commit the workspace structure:
  - `apps/web`
  - `packages/shared`
  - `workers/*`
- introduce workspace tooling intentionally:
  - `pnpm-workspace.yaml`
  - workspace package manifests
  - shared TypeScript config
  - build/test scripts
- move shared domain types out of ad-hoc script-local interfaces into `packages/shared`

Important rule:

- no product expansion in this phase
- no production traffic in this phase

Exit criteria:

- workspace installs cleanly
- type definitions are shared instead of duplicated
- local development works without changing the current Astro deployment

### Phase 2: Migrate the Data Model First

Goal: make the future platform data-complete before switching reads.

Deliverables:

- define the minimum D1 schema for parity:
  - `items`
  - `digests`
  - `sources`
  - `collection_runs`
  - `ops_state`
- write one import path from existing `data/` history into D1
- keep historical backfill idempotent
- establish stable IDs for items and digests
- preserve translation and image fields in the database model

Recommended write strategy:

- continue writing the existing JSON artifacts
- add a second write path into D1
- treat JSON as the recovery copy until cutover is complete

Exit criteria:

- a full backfill from Git-tracked history can populate D1
- today's collection and digest can be written to both JSON and D1
- item counts and digest counts match between both systems for at least 3 consecutive runs

### Phase 3: Build a Read-Only Next Version

Goal: replace the rendering layer without changing the editorial product.

Deliverables:

- implement homepage against D1
- implement archive pages against D1
- keep the information architecture as close as possible to Astro
- reuse the current editorial model:
  - observation text
  - key stories
  - grouped digest clusters
  - complete item list
- add a simple empty-state and degraded-mode behavior when D1 is unavailable

Migration rule:

- do not redesign the product yet
- do not add assistant, tools, or social features yet

Exit criteria:

- read-only Next app can render the current day and historical days
- content parity is manually verified against Astro
- the new app can run in preview without blocking the current site

### Phase 4: Move Operational Writes Behind Stable Interfaces

Goal: stop coupling operations to filesystem-only outputs.

Deliverables:

- ingestion endpoint or worker for items
- digest publish endpoint or worker
- ops state endpoint for health and operational actions
- webhook/event hooks for operational notifications

Recommended boundary split:

- collectors keep collecting
- publishers publish into a stable API or worker contract
- rendering layer reads only from D1

At the end of this phase, the filesystem is still present, but no longer required by the web app.

Exit criteria:

- collection, digest publish, and ops-state updates can run without the Astro build path
- operational runs can be observed from the new system

### Phase 5: Dual-Run and Cut Over Traffic

Goal: switch production safely.

Deliverables:

- staging environment for the new web app
- parity checks on:
  - item counts
  - cluster counts
  - archive coverage
  - bilingual field coverage
  - image coverage
- rollback runbook
- production cutover checklist

Cutover order:

1. keep Astro live
2. run Next/Cloudflare in preview or shadow mode
3. compare parity for several morning/evening cycles
4. switch production traffic
5. keep Astro deployable as rollback for one stabilization window

Exit criteria:

- several consecutive successful dual-run cycles
- no blocking data parity gap
- rollback path tested once, not just imagined

### Phase 6: Decommission the Legacy Static Pipeline

Goal: retire only what is truly replaced.

Safe removals:

- Astro site as primary runtime
- JSON-as-runtime-data dependency
- GitHub Pages-specific deploy logic

Keep longer than you think:

- historical `data/` snapshots
- one backfill script
- one emergency rebuild path

Exit criteria:

- production no longer depends on `site/src/data/*.json`
- rollback does not depend on undeclared local state
- documentation is updated to reflect the new primary architecture

## Stage 2: Platform Expansion

Only start after stage 1 is stable.

Recommended order:

1. operational APIs and webhook ecosystem
2. knowledge graph enrichment for topics, entities, and timelines
3. search and assistant experiences
4. tools directory / columns / editorial expansion
5. user accounts, bookmarks, subscriptions, and community features

This keeps product expansion from destabilizing the core briefing experience.

## Workstreams

### Workstream A: Data and Schema

Owns:

- canonical content types
- D1 schema
- import/backfill
- dual-write correctness

Main risk:

- inconsistent IDs or category mapping causing archive mismatches

### Workstream B: Web Parity

Owns:

- route structure
- homepage/archive rendering
- bilingual display
- graceful degradation

Main risk:

- mixing redesign goals into parity work

### Workstream C: Operations and Publishing

Owns:

- collect to ingest path
- digest publish path
- source health updates
- notification/webhook contracts

Main risk:

- breaking the existing unattended operation loop

### Workstream D: Deployment and Rollback

Owns:

- preview environments
- production cutover
- rollback verification
- observability

Main risk:

- switching traffic before parity is measured

## Recommended Milestones

### Milestone 1: Migration Spec Locked

- parity checklist written
- target folder structure committed
- shared types defined

### Milestone 2: Data Dual-Write

- D1 schema in place: `db/d1/0001_core.sql`
- historical import path exists: `npm run d1:backfill`
- new runs produce git-ignored D1 shadow SQL next to JSON/Markdown outputs
- direct D1 writes are still a follow-up after the import artifacts are verified

### Milestone 3: Read Parity

- Next app renders homepage and archive from D1
- manual parity pass completed

### Milestone 4: Operational Parity

- digest publish and ops-state mutation work in the new path
- dual-run stable

### Milestone 5: Production Cutover

- traffic moved to Cloudflare app
- Astro retained as temporary rollback

### Milestone 6: Legacy Retirement

- Astro path and JSON runtime path removed from the critical path

## Cutover Checklist

- D1 backfill completed
- today and yesterday exist correctly in D1
- homepage parity checked
- archive parity checked
- bilingual fields checked
- image coverage checked
- ops notifications checked
- rollback command documented
- rollback deploy verified

## Things to Avoid

- rewriting the collector while changing the frontend
- adding auth before parity
- introducing knowledge graph dependencies into the first homepage cutover
- deleting `data/` too early
- assuming untracked local prototypes count as completed migration work

## Suggested Immediate Next Step

The next high-leverage move is:

1. write and agree on the parity checklist
2. commit the target workspace skeleton
3. implement D1 backfill + dual-write before touching production traffic

If we do those three in order, the migration becomes operationally safe instead of aspirational.
