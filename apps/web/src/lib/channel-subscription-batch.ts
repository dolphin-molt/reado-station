import { findMarketChannel, type MarketChannel } from '@/lib/channel-catalog'

export interface MarketChannelBatchResult {
  added: number
  failed: number
  firstError: string
}

export async function subscribeMarketChannelBatch(
  channelIds: string[],
  subscribe: (channel: MarketChannel) => Promise<void>,
  errorCode: (error: unknown) => string = (error) => error instanceof Error ? error.message : 'unknown',
): Promise<MarketChannelBatchResult> {
  let added = 0
  let failed = 0
  let firstError = ''

  for (const id of channelIds) {
    const channel = findMarketChannel(id)
    if (!channel) continue
    try {
      await subscribe(channel)
      added += 1
    } catch (error) {
      failed += 1
      if (!firstError) firstError = errorCode(error)
    }
  }

  return { added, failed, firstError }
}
