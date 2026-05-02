/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    DB?: D1Database
    AUDIO_BUCKET?: R2Bucket
    WORKER_SELF_REFERENCE?: Fetcher
    READO_API_SECRET?: string
    READO_AUTH_SECRET?: string
    READO_ADMIN_USERNAME?: string
    READO_ADMIN_PASSWORD?: string
    READO_CONTENT_SOURCE?: 'd1' | 'json'
    READO_REQUIRE_D1?: string
    READO_X_API_BASE_URL?: string
    READO_X_BEARER_TOKEN?: string
    READO_BRAVE_SEARCH_API_KEY?: string
    BRAVE_SEARCH_API_KEY?: string
    READO_PROFILE_ENRICHMENT_MODEL_ENDPOINT?: string
    READO_PROFILE_ENRICHMENT_MODEL_TOKEN?: string
    READO_PROFILE_ENRICHMENT_MODEL?: string
    CLOUDFLARE_AI_GATEWAY_URL?: string
    CLOUDFLARE_AI_GATEWAY_TOKEN?: string
    READO_INTERNAL_API_BASE_URL?: string
    X_BEARER_TOKEN?: string
    X_READO_BEAR_TOKEN?: string
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
    GITHUB_CLIENT_ID?: string
    GITHUB_CLIENT_SECRET?: string
    READO_STRIPE_SECRET_KEY?: string
    READO_STRIPE_WEBHOOK_SECRET?: string
    READO_STRIPE_PRICE_TEST?: string
    READO_STRIPE_PRICE_PRO?: string
    READO_STRIPE_PRICE_POWER?: string
    READO_STRIPE_PRICE_TEAM?: string
    MINIMAX_API_KEY?: string
    MINIMAX_READO_KEY?: string
    MINIMAX_TTS_MODEL?: string
    MINIMAX_TTS_VOICE_ID?: string
    READO_CREDIT_USD_VALUE?: string
    STRIPE_PRICE_TEST?: string
    STRIPE_SECRET_KEY?: string
    STRIPE_WEBHOOK_SECRET?: string
    STRIPE_PRICE_PRO?: string
    STRIPE_PRICE_POWER?: string
    STRIPE_PRICE_TEAM?: string
    ANTHROPIC_API_KEY?: string
    SILICONFLOW_API_KEY?: string
    SILICONFLOW_API_BASE_URL?: string
    LLM_PROVIDER?: string
    LLM_MODEL?: string
    READO_COLLECT_MAX_SOURCES?: string
    READO_COLLECT_CONCURRENCY?: string
  }
}

export {}
