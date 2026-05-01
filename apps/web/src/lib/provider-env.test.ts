import { describe, expect, it } from 'vitest'

import { resolveMiniMaxApiKey, resolveXBearerToken } from './provider-env'

describe('provider env aliases', () => {
  it('reads the okitenv X bearer token alias', () => {
    expect(resolveXBearerToken({ X_READO_BEAR_TOKEN: 'x-token' })).toBe('x-token')
  })

  it('prefers canonical X bearer token names over aliases', () => {
    expect(resolveXBearerToken({ READO_X_BEARER_TOKEN: 'canonical', X_READO_BEAR_TOKEN: 'alias' })).toBe('canonical')
    expect(resolveXBearerToken({ X_BEARER_TOKEN: 'short', X_READO_BEAR_TOKEN: 'alias' })).toBe('short')
  })

  it('reads the okitenv MiniMax key alias', () => {
    expect(resolveMiniMaxApiKey({ MINIMAX_READO_KEY: 'minimax-key' })).toBe('minimax-key')
  })

  it('prefers canonical MiniMax key name over aliases', () => {
    expect(resolveMiniMaxApiKey({ MINIMAX_API_KEY: 'canonical', MINIMAX_READO_KEY: 'alias' })).toBe('canonical')
  })
})
