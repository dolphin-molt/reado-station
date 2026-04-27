// @ts-expect-error OpenNext generates this module during build.
import openNextWorker from '../.open-next/worker.js'

import { generateLatestDigest } from './lib/digest-generator'
import { collectProgramSources } from './lib/program-collector'

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
      collectProgramSources(env.DB, env)
        .then((collection) => generateLatestDigest(env.DB as D1Database, env)
          .then((digest) => ({ collection, digest })))
        .then((result) => {
          console.log('Scheduled collection and digest finished', JSON.stringify(result))
        })
        .catch((error) => {
          console.error('Scheduled collection and digest failed', error)
        }),
    )
  },
}
