export interface SourceProfileAsset {
  kind: 'website' | 'github' | 'youtube'
  title: string
  url: string
  summary: string
  meta?: string
}

const PRESET_X_PROFILE_ASSETS: Record<string, SourceProfileAsset[]> = {
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
  return PRESET_X_PROFILE_ASSETS[username.toLowerCase()] ?? []
}
