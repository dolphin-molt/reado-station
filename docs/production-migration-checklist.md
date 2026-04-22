# Production Migration Checklist

This is the cutover runbook for moving `reado-station` from Astro + GitHub Pages / Git-tracked JSON to the Cloudflare/OpenNext + D1 path.

## Current Safety Position

- Cloudflare Worker + D1 is the production path.
- Astro/GitHub Pages remains a temporary rollback path only.
- `apps/web` reads D1 in production; local JSON fallback is only for development and emergency rebuilds.
- Collection and digest scripts may still write local files, but those files are ignored by Git and are not a production source of truth.
- D1 writes are required in automation with `READO_D1_WRITE_REQUIRED=true`.
- Cloudflare Worker preview is deployed at `https://reado-station-web.cing-self.workers.dev`.
- Production D1 database `reado-station` is provisioned and backfilled.

## Pre-Cutover Setup

- [x] Create a Cloudflare D1 database named `reado-station`.
- [x] Add GitHub secrets: `CLOUDFLARE_ACCOUNT_ID`, `READO_D1_DATABASE_ID`, `READO_API_SECRET`.
- [x] Add GitHub secret: `CLOUDFLARE_API_TOKEN` for CI deploys.
- [x] Add collection dual-write secrets: `READO_D1_API_BASE_URL`, `READO_D1_API_SECRET`.
- [x] Set `READO_D1_WRITE_REQUIRED=true` so failed D1 writes fail the collection job.
- [x] Deploy the Cloudflare Worker from local Wrangler.
- [x] Apply D1 migration and backfill.
- [x] Confirm `/api/health` returns `status: ok`, `contentSource: d1`, and non-zero item/digest counts.

## D1-Only Operation Gate

- [x] Enable collection writes with `READO_D1_API_BASE_URL` and `READO_D1_API_SECRET`.
- [x] Sync historical local `data/` through the public protected APIs with `npm run d1:sync-api -- --require`.
- [x] Remove tracked runtime data from the repository (`data/` and `site/src/data/*.json`).
- [x] Confirm `/api/health` item/digest counts after API sync.
- [x] Confirm latest homepage renders from D1 in Cloudflare preview.
- [x] Confirm archive page renders from D1 in Cloudflare preview.
- [ ] Confirm the next scheduled cloud collection writes new rows to D1 with no Git data commit.
- [ ] Confirm digest clusters render for the latest day after the next scheduled digest publish.

## Cutover Gate

- [x] Keep the GitHub Pages workflow available as manual rollback during the stabilization window.
- [ ] Switch production DNS/route to the Cloudflare Worker if the custom domain is not already pointed there.
- [ ] Monitor `/api/health`, Worker logs, and collection workflow logs after the next scheduled run.
- [ ] If D1 write or render fails, switch traffic back to GitHub Pages and pause collection until the D1/API issue is fixed.

## Decommission Gate

- [x] Remove tracked runtime data from Git while keeping local files available for emergency backfill.
- [ ] Keep `scripts/export-d1-backfill.ts` as the emergency restore path.
- [ ] Remove GitHub Pages and the legacy Astro workflow only after Cloudflare has served production successfully for multiple days.
