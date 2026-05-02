// @ts-expect-error OpenNext generates this module during build.
import openNextWorker from '../.open-next/worker.js'

import { generateLatestDigest } from './lib/digest-generator'
import { collectProgramSources } from './lib/program-collector'
import { runSourceCollectionQueue } from './lib/source-collection-runner'

const DIGEST_CRONS = new Set(['0 0 * * *', '0 10 * * *'])

export default {
  fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    return openNextWorker.fetch(request, env, ctx)
  },

  async scheduled(event: ScheduledEvent, env: CloudflareEnv, ctx: ExecutionContext): Promise<void> {
    const db = env.DB
    if (!db) {
      console.warn('Scheduled work skipped: D1 database is unavailable')
      return
    }

    ctx.waitUntil(
      runSourceCollectionQueue(db as D1Database, { maxJobs: 10 })
        .then((sourceCollections) => {
          if (!DIGEST_CRONS.has(event.cron)) return { sourceCollections }
          return collectProgramSources(db, env)
            .then((collection) => generateLatestDigest(db as D1Database, env)
              .then((digest) => ({ sourceCollections, collection, digest })))
        })
        .then((result) => {
          console.log('Scheduled work finished', JSON.stringify(result))
        })
        .catch((error) => {
          console.error('Scheduled work failed', error)
        }),
    )
  },
}
