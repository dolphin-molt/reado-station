import type { Lang } from '@/lib/i18n'

export interface SuggestedXAccount {
  description: Record<Lang, string>
  name: string
  username: string
}

export const suggestedXAccounts: SuggestedXAccount[] = [
  {
    name: 'OpenAI',
    username: 'OpenAI',
    description: {
      zh: '官方产品与平台发布，适合作为 AI 公司基础源。',
      en: 'Official product and platform updates for the core AI company feed.',
    },
  },
  {
    name: 'Anthropic',
    username: 'AnthropicAI',
    description: {
      zh: '模型发布、安全研究和团队动态。',
      en: 'Model launches, safety research, and team updates.',
    },
  },
  {
    name: 'Andrej Karpathy',
    username: 'karpathy',
    description: {
      zh: '高信号工程与模型思考，适合个人观察列表。',
      en: 'High-signal engineering and model thinking for personal watchlists.',
    },
  },
  {
    name: 'Shawn Wang',
    username: 'swyx',
    description: {
      zh: '开发者视角的 AI 产品、工作流和社区讨论。',
      en: 'AI product, workflow, and community discussions from a builder perspective.',
    },
  },
]
