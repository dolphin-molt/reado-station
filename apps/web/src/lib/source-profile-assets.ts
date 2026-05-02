export interface SourceProfileAsset {
  kind: 'website' | 'github' | 'youtube'
  title: string
  url: string
  summary: string
  meta?: string
  thumbnailUrl?: string
}

interface SourceProfileAssetRow {
  featuredJson: string | null
}

interface LoadSourceProfileAssetsInput {
  sourceType: string
  sourceValue: string
}

const SEED_X_PROFILE_ASSETS: Record<string, SourceProfileAsset[]> = {
  anthropicai: [
    {
      kind: 'website',
      title: 'Anthropic',
      url: 'https://www.anthropic.com',
      meta: 'Official website',
      summary: 'Anthropic company site for Claude, product updates, research, safety notes, and company news.',
    },
    {
      kind: 'github',
      title: 'anthropics',
      url: 'https://github.com/anthropics',
      meta: 'GitHub organization',
      summary: 'Official Anthropic-managed GitHub organization, including Claude Code and developer tooling repositories.',
    },
    {
      kind: 'youtube',
      title: 'Anthropic YouTube',
      url: 'https://www.youtube.com/@anthropic-ai',
      meta: 'Video channel',
      summary: 'Anthropic video channel for Claude demos, product walkthroughs, and research or safety talks.',
    },
    {
      kind: 'youtube',
      title: 'Prompting 101 | Code w/ Claude',
      url: 'https://www.youtube.com/watch?v=ysPbXH0LpIE',
      meta: 'Code w/ Claude',
      thumbnailUrl: 'https://i.ytimg.com/vi/ysPbXH0LpIE/hqdefault.jpg',
      summary: 'Anthropic session on prompt design patterns for Claude-powered coding workflows.',
    },
    {
      kind: 'youtube',
      title: 'Claude Code & the evolution of agentic coding',
      url: 'https://www.youtube.com/watch?v=Lue8K2jqfKk',
      meta: 'Code w/ Claude',
      thumbnailUrl: 'https://i.ytimg.com/vi/Lue8K2jqfKk/hqdefault.jpg',
      summary: 'Boris Cherny discusses Claude Code and agentic coding workflows.',
    },
  ],
  openai: [
    {
      kind: 'website',
      title: 'OpenAI',
      url: 'https://openai.com',
      meta: 'Official website',
      summary: 'OpenAI company site for product, research, safety, API, and company announcements.',
    },
    {
      kind: 'github',
      title: 'openai',
      url: 'https://github.com/openai',
      meta: 'GitHub organization',
      summary: 'Official OpenAI GitHub organization for SDKs, examples, evals, and developer tooling.',
    },
    {
      kind: 'youtube',
      title: 'OpenAI YouTube',
      url: 'https://www.youtube.com/@OpenAI',
      meta: 'Video channel',
      summary: 'OpenAI video channel for product demos, research talks, and company announcements.',
    },
  ],
}

export function presetXProfileAssets(username: string | null | undefined): SourceProfileAsset[] {
  if (!username) return []
  return SEED_X_PROFILE_ASSETS[username.toLowerCase()] ?? []
}

function normalizeProfileAssets(value: unknown): SourceProfileAsset[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const asset = item as Partial<SourceProfileAsset>
    if (
      (asset.kind !== 'website' && asset.kind !== 'github' && asset.kind !== 'youtube') ||
      typeof asset.title !== 'string' ||
      typeof asset.url !== 'string'
    ) {
      return []
    }
    return [{
      kind: asset.kind,
      title: asset.title,
      url: asset.url,
      summary: typeof asset.summary === 'string' ? asset.summary : '',
      meta: typeof asset.meta === 'string' ? asset.meta : undefined,
      thumbnailUrl: typeof asset.thumbnailUrl === 'string' ? asset.thumbnailUrl : undefined,
    }]
  })
}

function parseProfileAssetsJson(value: string | null | undefined): SourceProfileAsset[] {
  if (!value) return []
  try {
    return normalizeProfileAssets(JSON.parse(value) as unknown)
  } catch {
    return []
  }
}

export async function loadSourceProfileAssets(db: D1Database, input: LoadSourceProfileAssetsInput): Promise<SourceProfileAsset[]> {
  const row = await db
    .prepare(
      `
        SELECT featured_json AS featuredJson
        FROM channel_profiles
        WHERE source_type = ? AND lower(source_value) = lower(?)
        LIMIT 1
      `,
    )
    .bind(input.sourceType, input.sourceValue)
    .first<SourceProfileAssetRow>()
    .catch((error) => {
      if (error instanceof Error && error.message.includes('channel_profiles')) return null
      throw error
    })

  const filledAssets = parseProfileAssetsJson(row?.featuredJson)
  if (row?.featuredJson) return filledAssets

  return input.sourceType === 'x' ? presetXProfileAssets(input.sourceValue) : []
}
