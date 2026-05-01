# Input Closure Verification

The input layer has two separate verification paths.

## Local Functional Check

Use this while the local Next dev server is already running:

```bash
READO_API_SECRET=local-smoke-secret npm run dev:web
npm run verify:input:local
```

`verify:input:local` runs local D1 migrations, type-checks the web app, runs the test suite, and executes the input smoke test.

The smoke test:

- checks required D1 tables before doing any work
- seeds a temporary Federal Reserve RSS source collection job
- runs the public source collection runner
- verifies `/channels`, `/sources`, and `/today?category=rss`
- verifies the local failure state for missing X API token
- verifies the local failure state for missing MiniMax key
- removes smoke-only rows after the run

## Build Check

Use this before deploying:

```bash
npm run verify:input:build
```

This runs type-check, the full test suite, and the Cloudflare OpenNext build.

Do not run `npm run build:web` and `npm run build:web:cloudflare` in parallel. Both commands write to `apps/web/.next`, and parallel builds can leave the dev server with a stale React client manifest. If a build was run while `npm run dev:web` was active, restart the dev server before browser testing.

## External Provider Checks

The local smoke test intentionally verifies safe failure states when provider credentials are absent.

Real provider checks require:

- `READO_X_BEARER_TOKEN`, `X_BEARER_TOKEN`, or `X_READO_BEAR_TOKEN` for real X collection
- `MINIMAX_API_KEY` or `MINIMAX_READO_KEY` for real TTS
- `AUDIO_BUCKET` R2 binding for persisted radio audio
- the R2 bucket from `apps/web/wrangler.jsonc` to exist in Cloudflare before deployment

RSS collection is exercised end to end by the smoke test.
