import 'server-only'

import { getCloudflareEnv } from '@/lib/cloudflare'
import { resolveMiniMaxApiKey } from '@/lib/provider-env'
import { estimateMiniMaxTtsCredits } from '@/lib/usage-metering'
import { getWorkspaceCreditBalance } from '@/lib/workspaces'

export interface RadioEpisode {
  id: string
  workspaceId: string
  date: string
  status: string
  title: string
  script: string
  r2Key: string | null
  creditsEstimated: number
  creditsUsed: number
}

interface RadioEpisodeRow {
  id: string
  workspaceId: string
  date: string
  status: string
  title: string | null
  script: string | null
  r2Key: string | null
  creditsEstimated: number | null
  creditsUsed: number | null
}

export interface VoiceProvider {
  createSpeech(input: { text: string; model: string; voiceId?: string | null }): Promise<{ audio: ArrayBuffer; metadata: unknown }>
}

function rowToEpisode(row: RadioEpisodeRow): RadioEpisode {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    date: row.date,
    status: row.status,
    title: row.title ?? '',
    script: row.script ?? '',
    r2Key: row.r2Key,
    creditsEstimated: Number(row.creditsEstimated ?? 0),
    creditsUsed: Number(row.creditsUsed ?? 0),
  }
}

export function radioScriptFromDigest(input: { headline?: string | null; observationText?: string | null; stories?: Array<{ title: string; summary: string; impact?: string }> }): string {
  const lines = [
    input.headline ? `今天的 reado 电台：${input.headline}` : '今天的 reado 电台。',
    input.observationText ?? '',
    ...(input.stories ?? []).slice(0, 5).map((story, index) => `第 ${index + 1} 条，${story.title}。${story.summary}${story.impact ? ` 影响是：${story.impact}` : ''}`),
  ]
  return lines.join('\n').replace(/\s+/g, ' ').trim().slice(0, 6000)
}

export async function loadRadioEpisode(db: D1Database, workspaceId: string, date: string): Promise<RadioEpisode | null> {
  const row = await db
    .prepare(
      `
        SELECT id, workspace_id AS workspaceId, date, status, title, script, r2_key AS r2Key,
               credits_estimated AS creditsEstimated, credits_used AS creditsUsed
        FROM radio_episodes
        WHERE workspace_id = ? AND date = ?
        LIMIT 1
      `,
    )
    .bind(workspaceId, date)
    .first<RadioEpisodeRow>()
  return row ? rowToEpisode(row) : null
}

export async function createRadioEpisode(db: D1Database, input: {
  workspaceId: string
  userId: string
  date: string
  title: string
  script: string
  model?: string
}): Promise<RadioEpisode> {
  const env = await getCloudflareEnv()
  const model = input.model ?? env?.MINIMAX_TTS_MODEL ?? 'speech-2.8-turbo'
  const creditUsdValue = Number(env?.READO_CREDIT_USD_VALUE ?? 0.01)
  const estimated = estimateMiniMaxTtsCredits(input.script, model, creditUsdValue)
  const balance = await getWorkspaceCreditBalance(db, input.workspaceId)
  if (balance < estimated) throw new Error('insufficient-credits')

  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db
    .prepare(
      `
        INSERT INTO radio_episodes (
          id, workspace_id, user_id, date, status, title, script, provider, provider_model,
          credits_estimated, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'queued', ?, ?, 'minimax-tts', ?, ?, ?, ?)
        ON CONFLICT(workspace_id, date) DO UPDATE SET
          script = excluded.script,
          credits_estimated = excluded.credits_estimated,
          status = CASE WHEN radio_episodes.status = 'ready' THEN radio_episodes.status ELSE 'queued' END,
          updated_at = excluded.updated_at
      `,
    )
    .bind(id, input.workspaceId, input.userId, input.date, input.title, input.script, model, estimated, now, now)
    .run()

  const episode = await loadRadioEpisode(db, input.workspaceId, input.date)
  if (!episode) throw new Error('radio episode was not created')
  return episode
}

export class MiniMaxVoiceProvider implements VoiceProvider {
  constructor(private apiKey: string) {}

  async createSpeech(input: { text: string; model: string; voiceId?: string | null }): Promise<{ audio: ArrayBuffer; metadata: unknown }> {
    const response = await fetch('https://api.minimax.io/v1/t2a_v2', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        text: input.text,
        stream: false,
        voice_setting: {
          voice_id: input.voiceId ?? 'male-qn-qingse',
          speed: 1,
          vol: 1,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
      }),
    })
    const payload = await response.json().catch(() => ({})) as { data?: { audio?: string }; base_resp?: { status_msg?: string } }
    if (!response.ok || !payload.data?.audio) throw new Error(payload.base_resp?.status_msg ?? `MiniMax TTS failed with ${response.status}`)
    const bytes = Uint8Array.from(atob(payload.data.audio), (char) => char.charCodeAt(0))
    return { audio: bytes.buffer, metadata: payload }
  }
}

export async function runQueuedRadioEpisode(db: D1Database, env: CloudflareEnv, provider?: VoiceProvider): Promise<RadioEpisode | null> {
  const row = await db
    .prepare(
      `
        SELECT id, workspace_id AS workspaceId, date, status, title, script, r2_key AS r2Key,
               credits_estimated AS creditsEstimated, credits_used AS creditsUsed
        FROM radio_episodes
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT 1
      `,
    )
    .first<RadioEpisodeRow>()
  if (!row) return null

  const episode = rowToEpisode(row)
  const now = new Date().toISOString()
  await db.prepare("UPDATE radio_episodes SET status = 'running', updated_at = ?, started_at = ? WHERE id = ?").bind(now, now, episode.id).run().catch(async () => {
    await db.prepare("UPDATE radio_episodes SET status = 'running', updated_at = ? WHERE id = ?").bind(now, episode.id).run()
  })

  try {
    const miniMaxApiKey = resolveMiniMaxApiKey(env)
    const voice = provider ?? new MiniMaxVoiceProvider(miniMaxApiKey ?? '')
    if (!provider && !miniMaxApiKey) throw new Error('MINIMAX_API_KEY is not configured')
    if (!env.AUDIO_BUCKET) throw new Error('AUDIO_BUCKET is not configured')
    const model = env.MINIMAX_TTS_MODEL ?? 'speech-2.8-turbo'
    const result = await voice.createSpeech({ text: episode.script, model, voiceId: env.MINIMAX_TTS_VOICE_ID })
    const r2Key = `radio/${episode.workspaceId}/${episode.date}/${episode.id}.mp3`
    await env.AUDIO_BUCKET.put(r2Key, result.audio, { httpMetadata: { contentType: 'audio/mpeg' } })
    const creditsUsed = estimateMiniMaxTtsCredits(episode.script, model, Number(env.READO_CREDIT_USD_VALUE ?? 0.01))
    await db.batch([
      db.prepare(
        `
          UPDATE radio_episodes
          SET status = 'ready', r2_key = ?, provider_json = ?, credits_used = ?, updated_at = ?, completed_at = ?
          WHERE id = ?
        `,
      ).bind(r2Key, JSON.stringify(result.metadata ?? {}), creditsUsed, now, now, episode.id),
      db.prepare(
        `
          INSERT INTO credit_ledger (id, workspace_id, action, credits_delta, item_count, metadata_json, created_at)
          VALUES (?, ?, 'radio_tts_spend', ?, ?, ?, ?)
        `,
      ).bind(crypto.randomUUID(), episode.workspaceId, -creditsUsed, [...episode.script].length, JSON.stringify({ episode_id: episode.id, model }), now),
    ])
  } catch (error) {
    await db.prepare("UPDATE radio_episodes SET status = 'failed', error = ?, updated_at = ? WHERE id = ?")
      .bind(error instanceof Error ? error.message : 'unknown error', now, episode.id)
      .run()
  }

  return loadRadioEpisode(db, episode.workspaceId, episode.date)
}
