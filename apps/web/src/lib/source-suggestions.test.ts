import { describe, expect, it } from 'vitest'

import { suggestedXAccounts } from './source-suggestions'

describe('suggested X accounts', () => {
  it('keeps Anthropic as a preset recommendation without blocking exact handles', () => {
    expect(suggestedXAccounts.find((account) => account.name === 'Anthropic')?.username).toBe('AnthropicAI')
  })
})
