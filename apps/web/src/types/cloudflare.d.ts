/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    DB?: D1Database
    READO_API_SECRET?: string
    READO_AUTH_SECRET?: string
    READO_ADMIN_USERNAME?: string
    READO_ADMIN_PASSWORD?: string
    READO_CONTENT_SOURCE?: 'd1' | 'json'
    READO_REQUIRE_D1?: string
  }
}

export {}
