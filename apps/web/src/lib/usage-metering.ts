export type MeteredProvider = 'x-api' | 'minimax-tts' | 'rss'

export interface UsageRate {
  provider: MeteredProvider
  model: string
  unit: 'item' | 'character'
  usdPerUnit: number
}

export const DEFAULT_CREDIT_USD_VALUE = 0.01

export const DEFAULT_USAGE_RATES: UsageRate[] = [
  { provider: 'rss', model: 'default', unit: 'item', usdPerUnit: 0 },
  { provider: 'x-api', model: 'default', unit: 'item', usdPerUnit: 0.01 },
  { provider: 'minimax-tts', model: 'speech-2.8-turbo', unit: 'character', usdPerUnit: 60 / 1_000_000 },
  { provider: 'minimax-tts', model: 'speech-2.8-hd', unit: 'character', usdPerUnit: 100 / 1_000_000 },
]

export function estimateCreditsForCost(usdCost: number, creditUsdValue = DEFAULT_CREDIT_USD_VALUE): number {
  if (usdCost <= 0) return 0
  return Math.max(1, Math.ceil(usdCost / Math.max(creditUsdValue, 0.000001)))
}

export function findUsageRate(provider: MeteredProvider, model: string, rates: UsageRate[] = DEFAULT_USAGE_RATES): UsageRate {
  return rates.find((rate) => rate.provider === provider && rate.model === model)
    ?? rates.find((rate) => rate.provider === provider && rate.model === 'default')
    ?? { provider, model, unit: provider === 'minimax-tts' ? 'character' : 'item', usdPerUnit: 0 }
}

export function estimateMiniMaxTtsCredits(text: string, model = 'speech-2.8-turbo', creditUsdValue = DEFAULT_CREDIT_USD_VALUE): number {
  const rate = findUsageRate('minimax-tts', model)
  const characterCount = [...text].length
  return estimateCreditsForCost(characterCount * rate.usdPerUnit, creditUsdValue)
}

export function estimateSourceCollectionCredits(provider: 'rss' | 'x-api', itemCount: number, creditUsdValue = DEFAULT_CREDIT_USD_VALUE): number {
  const rate = findUsageRate(provider, 'default')
  return estimateCreditsForCost(Math.max(0, itemCount) * rate.usdPerUnit, creditUsdValue)
}
