import type { DigestCluster, DigestData, DigestStory, Observation } from './content'

function getObservationAvatar(expert: string): string {
  const expertAvatars: Array<[string, string]> = [
    ['马斯克', '🚀'],
    ['Elon Musk', '🚀'],
    ['贝佐斯', '📦'],
    ['Jeff Bezos', '📦'],
    ['黄仁勋', '🎮'],
    ['Jensen Huang', '🎮'],
    ['奥特曼', '🤖'],
    ['Sam Altman', '🤖'],
    ['Dario Amodei', '🧠'],
    ['Amodei', '🧠'],
    ['李彦宏', '🔍'],
    ['扎克伯格', '👤'],
    ['Mark Zuckerberg', '👤'],
    ['纳德拉', '☁️'],
    ['Satya Nadella', '☁️'],
    ['李飞飞', '🎓'],
    ['Fei-Fei Li', '🎓'],
  ]

  for (const [key, avatar] of expertAvatars) {
    if (expert.includes(key)) return avatar
  }
  return '💡'
}

export function parseDigestMarkdown(markdown: string, date: string): DigestData {
  const lines = markdown.split('\n')
  const clusters: DigestCluster[] = []
  const observations: Observation[] = []
  let observationText = ''
  let currentCluster: DigestCluster | null = null
  let currentStory: DigestStory | null = null
  let headline = ''
  let inObservations = false
  let currentObservation: Observation | null = null
  let observationHasH3 = false

  const h1Match = markdown.match(/^# (.+)$/m)
  if (h1Match) headline = h1Match[1]

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/)
    if (h2Match) {
      const name = h2Match[1].trim()
      if (name === '采集统计') continue

      if (name === '今日观察') {
        inObservations = true
        if (currentStory && currentCluster) {
          currentCluster.stories.push(currentStory)
          currentStory = null
        }
        continue
      }

      if (inObservations) {
        if (currentObservation) observations.push(currentObservation)
        currentObservation = null
        inObservations = false
      }

      if (currentStory && currentCluster) {
        currentCluster.stories.push(currentStory)
        currentStory = null
      }

      currentCluster = { name, stories: [] }
      clusters.push(currentCluster)
      continue
    }

    if (inObservations) {
      const h3Match = line.match(/^### (.+)$/)
      if (h3Match) {
        observationHasH3 = true
        if (currentObservation) observations.push(currentObservation)
        const expert = h3Match[1].trim()
        currentObservation = { expert, avatar: getObservationAvatar(expert), text: '' }
        continue
      }

      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('---') || trimmed.startsWith('>')) continue

      if (observationHasH3 && currentObservation) {
        currentObservation.text += `${currentObservation.text ? ' ' : ''}${trimmed}`
      } else if (!observationHasH3) {
        observationText += `${observationText ? ' ' : ''}${trimmed}`
      }
      continue
    }

    const h3Match = line.match(/^### (.+)$/)
    if (h3Match && currentCluster) {
      if (currentStory) {
        currentCluster.stories.push(currentStory)
      }
      currentStory = { title: h3Match[1].trim(), summary: '', sources: [] }
      continue
    }

    if (!currentStory) continue

    if (line.startsWith('**来源**')) {
      for (const match of line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
        currentStory.sources.push({ name: match[1], url: match[2] })
      }
      continue
    }

    if (line.startsWith('- ')) {
      let foundSource = false
      for (const match of line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
        currentStory.sources.push({ name: match[1], url: match[2] })
        foundSource = true
      }
      if (foundSource) continue
    }

    const impactMatch = line.match(/^> 影响评估[:：]\s*(.+)$/)
    if (impactMatch) {
      currentStory.impact = impactMatch[1].trim()
      continue
    }

    if (
      line.startsWith('**官方公告**') ||
      line.startsWith('**媒体补充**') ||
      line.startsWith('**社区反应**') ||
      line.startsWith('**事件**') ||
      line.startsWith('**链接**')
    ) {
      const textContent = line.replace(/^\*\*[^*]+\*\*[:：]\s*/, '')
      if (textContent) {
        currentStory.summary += `${currentStory.summary ? ' ' : ''}${textContent.trim()}`
      }
      continue
    }

    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('---') && !trimmed.startsWith('>') && !trimmed.startsWith('|')) {
      currentStory.summary += `${currentStory.summary ? ' ' : ''}${trimmed}`
    }
  }

  if (currentStory && currentCluster) {
    currentCluster.stories.push(currentStory)
  }

  if (currentObservation) observations.push(currentObservation)

  for (const cluster of clusters) {
    for (const story of cluster.stories) {
      story.summary = story.summary.slice(0, 300).trim()
    }
  }

  for (const observation of observations) {
    observation.text = observation.text.slice(0, 300).trim()
  }

  if (!observationText && observations.length > 0) {
    observationText = observations.map((observation) => observation.text).join(' ')
  }

  return {
    date,
    headline,
    observationText: observationText.trim(),
    observations,
    clusters,
  }
}
