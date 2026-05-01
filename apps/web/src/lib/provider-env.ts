type ProviderEnv = {
  MINIMAX_API_KEY?: string
  MINIMAX_READO_KEY?: string
  READO_X_BEARER_TOKEN?: string
  X_BEARER_TOKEN?: string
  X_READO_BEAR_TOKEN?: string
}

function firstNonEmpty(...values: Array<string | undefined>): string | null {
  for (const value of values) {
    const normalized = value?.trim()
    if (normalized) return normalized
  }
  return null
}

export function resolveXBearerToken(env: ProviderEnv | null | undefined, processEnv: ProviderEnv = process.env as ProviderEnv): string | null {
  return firstNonEmpty(
    env?.READO_X_BEARER_TOKEN,
    env?.X_BEARER_TOKEN,
    env?.X_READO_BEAR_TOKEN,
    processEnv.READO_X_BEARER_TOKEN,
    processEnv.X_BEARER_TOKEN,
    processEnv.X_READO_BEAR_TOKEN,
  )
}

export function resolveMiniMaxApiKey(env: ProviderEnv | null | undefined, processEnv: ProviderEnv = process.env as ProviderEnv): string | null {
  return firstNonEmpty(
    env?.MINIMAX_API_KEY,
    env?.MINIMAX_READO_KEY,
    processEnv.MINIMAX_API_KEY,
    processEnv.MINIMAX_READO_KEY,
  )
}
