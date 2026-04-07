/**
 * 回归测试 — translate.ts 纯函数
 *
 * isLikelyChinese 从 lib/utils.ts 导出，直接 import。
 */
import { describe, it, expect } from 'vitest'
import { isLikelyChinese } from './lib/utils.js'

describe('isLikelyChinese', () => {
  it('should detect pure Chinese text', () => {
    expect(isLikelyChinese('谷歌发布了全新的大语言模型')).toBe(true)
  })

  it('should detect Chinese with some English terms', () => {
    expect(isLikelyChinese('OpenAI 发布 GPT-5 模型，多模态能力大幅提升')).toBe(true)
  })

  it('should detect pure English text', () => {
    expect(isLikelyChinese('OpenAI launches GPT-5 with improved reasoning')).toBe(false)
  })

  it('should detect English with technical terms', () => {
    expect(isLikelyChinese('New GGUF v4 format brings 15% faster inference and better quantization')).toBe(false)
  })

  it('should return true for empty/null text (skip translation)', () => {
    expect(isLikelyChinese('')).toBe(true)
  })

  it('should handle mixed content near threshold', () => {
    expect(isLikelyChinese('A B C 你')).toBe(false)
    expect(isLikelyChinese('A 你好')).toBe(true)
  })

  it('should handle Japanese/Korean (not Chinese)', () => {
    expect(isLikelyChinese('トランスフォーマー')).toBe(false)
  })
})
