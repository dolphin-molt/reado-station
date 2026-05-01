import { describe, expect, it } from 'vitest'

import { findSuggestedXNameConflict } from './source-suggestions'

describe('suggested X account disambiguation', () => {
  it('flags company names whose official preset handle is different', () => {
    expect(findSuggestedXNameConflict('Anthropic')?.username).toBe('AnthropicAI')
    expect(findSuggestedXNameConflict('@Anthropic')?.username).toBe('AnthropicAI')
  })

  it('does not flag inputs that already use the preset handle', () => {
    expect(findSuggestedXNameConflict('AnthropicAI')).toBeNull()
    expect(findSuggestedXNameConflict('@OpenAI')).toBeNull()
  })
})
