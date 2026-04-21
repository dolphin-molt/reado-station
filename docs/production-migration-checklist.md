# Production Migration Checklist

This is the cutover runbook for moving `reado-station` from Astro + GitHub Pages to the Cloudflare/OpenNext + D1 path.

## Current Safety Position

- Astro/GitHub Pages remains the live rollback path.
- `apps/web` can run against D1 in production and can fall back to repository JSON locally.
- Collection and digest scripts still write files first, then optionally dual-write to the D1 API.
- D1 writes are not required unless `READO_D1_WRITE_REQUIRED=true`.

## Pre-Cutover Setup

- [ ] Create a Cloudflare D1 database named `reado-station`.
- [ ] Add GitHub secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `READO_D1_DATABASE_ID`, `READO_API_SECRET`.
- [ ] Add collection dual-write secrets: `READO_D1_API_BASE_URL`, `READO_D1_API_SECRET`.
- [ ] Keep `READO_D1_WRITE_REQUIRED=false` until at least one successful dual-run cycle.
- [ ] Run the Cloudflare deploy workflow manually with `deploy=true` and `backfill=true`.
- [ ] Confirm `/api/health` returns `status: ok`, `contentSource: d1`, and non-zero item/digest counts.

## Dual-Run Gate

- [ ] Enable collection dual-write with `READO_D1_API_BASE_URL` and `READO_D1_API_SECRET`.
- [ ] Run at least 3 morning/evening cycles with JSON and D1 both populated.
- [ ] Compare latest-day item counts between `site/src/data/items.json` and `/api/health`.
- [ ] Confirm latest homepage renders from D1 in Cloudflare preview.
- [ ] Confirm archive page shows all historical days after backfill.
- [ ] Confirm digest clusters render for the latest day.
- [ ] Set `READO_D1_WRITE_REQUIRED=true` only after dual-write is stable.

## Cutover Gate

- [ ] Keep the GitHub Pages workflow enabled for one stabilization window.
- [ ] Switch production DNS/route to the Cloudflare Worker only after the dual-run gate is green.
- [ ] Monitor `/api/health`, Worker logs, and collection workflow logs after the next scheduled run.
- [ ] If D1 write or render fails, switch traffic back to GitHub Pages and set `READO_D1_WRITE_REQUIRED=false`.

## Decommission Gate

- [ ] Do not remove `data/`, `site/`, or `scripts/build-site-data.ts` until Cloudflare has served production successfully for multiple days.
- [ ] Keep `scripts/export-d1-backfill.ts` as the emergency restore path.
- [ ] Remove GitHub Pages only after rollback no longer depends on undeclared local state.
