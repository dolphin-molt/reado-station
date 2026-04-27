// @ts-expect-error OpenNext generates this module during build.
import openNextWorker from '../.open-next/worker.js'

import { generateLatestDigest } from './lib/digest-generator'

export default {
  fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    return openNextWorker.fetch(request, env, ctx)
  },

  async scheduled(_event: ScheduledEvent, env: CloudflareEnv, ctx: ExecutionContext): Promise<void> {
    if (!env.DB) {
      console.warn('Scheduled digest skipped: D1 database is unavailable')
      return
    }

    ctx.waitUntil(
      generateLatestDigest(env.DB, env)
        .then((result) => {
          console.log('Scheduled digest finished', JSON.stringify(result))
        })
        .catch((error) => {
          console.error('Scheduled digest failed', error)
        }),
    )
  },
}
