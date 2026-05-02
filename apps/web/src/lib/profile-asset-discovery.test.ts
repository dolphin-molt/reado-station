import { describe, expect, it } from 'vitest'

import { createAiSdkProfileAssetSelector, createBigModelSearchProvider, createBraveSearchProvider, discoverXProfileAssets } from './profile-asset-discovery'

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  })
}

function htmlResponse(value: string, finalUrl?: string): Response {
  const response = new Response(value, {
    headers: { 'content-type': 'text/html' },
    status: 200,
  })
  if (finalUrl) {
    Object.defineProperty(response, 'url', { value: finalUrl })
  }
  return response
}

describe('profile asset discovery', () => {
  it('normalizes Brave web search results behind the provider interface', async () => {
    const requestedUrls: string[] = []
    const provider = createBraveSearchProvider({
      apiKey: 'search-key',
      fetcher: async (input, init) => {
        requestedUrls.push(input.toString())
        expect((init?.headers as Record<string, string>)['X-Subscription-Token']).toBe('search-key')
        return jsonResponse({
          web: {
            results: [
              { title: 'Anthropic', url: 'https://www.anthropic.com', description: 'Official site.' },
            ],
          },
        })
      },
    })

    await expect(provider?.search('Anthropic official website', { limit: 3 })).resolves.toEqual([
      { title: 'Anthropic', url: 'https://www.anthropic.com', snippet: 'Official site.' },
    ])
    expect(requestedUrls[0]).toContain('api.search.brave.com/res/v1/web/search')
    expect(requestedUrls[0]).toContain('q=Anthropic+official+website')
  })

  it('normalizes BigModel web search results behind the provider interface', async () => {
    const requestedBodies: unknown[] = []
    const provider = createBigModelSearchProvider({
      apiKey: 'bigmodel-key',
      fetcher: async (input, init) => {
        expect(input.toString()).toBe('https://open.bigmodel.cn/api/paas/v4/web_search')
        expect((init?.headers as Record<string, string>).authorization).toBe('Bearer bigmodel-key')
        requestedBodies.push(JSON.parse(init?.body as string))
        return jsonResponse({
          search_result: [
            { title: 'Anthropic', link: 'https://www.anthropic.com', content: 'Official site.' },
          ],
        })
      },
    })

    await expect(provider?.search('Anthropic official website', { limit: 3 })).resolves.toEqual([
      { title: 'Anthropic', url: 'https://www.anthropic.com', snippet: 'Official site.' },
    ])
    expect(requestedBodies[0]).toMatchObject({
      count: 3,
      search_engine: 'search_std',
      search_query: 'Anthropic official website',
    })
  })

  it('uses Vercel AI SDK generateObject to select profile assets', async () => {
    const generateObjectCalls: Array<{
      prompt: string
      system: string
    }> = []
    const provider = createAiSdkProfileAssetSelector({
      apiKey: 'model-token',
      endpoint: 'https://gateway.example.com/v1/chat/completions',
      generateObject: async (options) => {
        generateObjectCalls.push({ prompt: options.prompt, system: options.system })
        return {
          object: {
            assets: [
              {
                kind: 'website',
                title: 'Anthropic',
                url: 'https://www.anthropic.com',
                summary: 'Selected official website.',
              },
            ],
          },
        }
      },
      model: 'test-model',
    })

    await expect(provider?.select({
      candidates: [{
        kind: 'website',
        title: 'Anthropic',
        url: 'https://www.anthropic.com',
        summary: 'Candidate website.',
      }],
      profile: { description: 'We build Claude.', name: 'Anthropic', username: 'AnthropicAI' },
    })).resolves.toEqual([
      {
        kind: 'website',
        title: 'Anthropic',
        url: 'https://www.anthropic.com',
        summary: 'Selected official website.',
      },
    ])
    expect(generateObjectCalls).toHaveLength(1)
    expect(generateObjectCalls[0].system).toContain('Select official profile assets from candidates')
    expect(generateObjectCalls[0].prompt).toContain('Anthropic')
    expect(generateObjectCalls[0].prompt).toContain('https://www.anthropic.com')
  })

  it('discovers website, GitHub, YouTube channel, and YouTube videos from public providers', async () => {
    const requestedUrls: string[] = []
    const fetcher: typeof fetch = async (input) => {
      const url = input.toString()
      requestedUrls.push(url)
      if (url === 'https://www.anthropic.com/') return htmlResponse('<title>Anthropic</title>')
      if (url.startsWith('https://api.github.com/search/users')) {
        return jsonResponse({
          items: [
            { html_url: 'https://github.com/AnthropicAI', login: 'AnthropicAI', type: 'Organization' },
            { html_url: 'https://github.com/anthropics', login: 'anthropics', type: 'Organization' },
          ],
        })
      }
      if (url === 'https://api.github.com/orgs/AnthropicAI') {
        return jsonResponse({
          description: null,
          html_url: 'https://github.com/AnthropicAI',
          login: 'AnthropicAI',
          public_repos: 0,
        })
      }
      if (url === 'https://api.github.com/orgs/anthropics') {
        return jsonResponse({
          description: 'Official Anthropic GitHub organization.',
          html_url: 'https://github.com/anthropics',
          login: 'anthropics',
          public_repos: 42,
        })
      }
      if (url === 'https://www.youtube.com/@anthropic-ai') {
        return htmlResponse(`
          <html><head><title>Anthropic - YouTube</title></head>
          <body>
            <script>{"videoId":"ysPbXH0LpIE","title":{"runs":[{"text":"Prompting 101 | Code w/ Claude"}]}}</script>
          </body></html>
        `)
      }
      return new Response('', { status: 404 })
    }

    const assets = await discoverXProfileAssets({
      description: 'We build Claude.',
      name: 'Anthropic',
      rawJson: '{"data":{"profile_image_url":"https://pbs.twimg.com/profile_images/not-a-website.jpg"}}',
      username: 'AnthropicAI',
    }, {
      assetSelector: {
        select: async ({ candidates }) => candidates,
      },
      fetcher,
    })

    expect(requestedUrls).toContain('https://www.anthropic.com/')
    expect(assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'website', title: 'Anthropic', url: 'https://www.anthropic.com' }),
      expect.objectContaining({ kind: 'github', title: 'anthropics', url: 'https://github.com/anthropics' }),
      expect.objectContaining({ kind: 'youtube', title: 'Anthropic YouTube', url: 'https://www.youtube.com/@anthropic-ai' }),
      expect.objectContaining({
        kind: 'youtube',
        thumbnailUrl: 'https://i.ytimg.com/vi/ysPbXH0LpIE/hqdefault.jpg',
        title: 'Prompting 101 | Code w/ Claude',
        url: 'https://www.youtube.com/watch?v=ysPbXH0LpIE',
      }),
    ]))
  })

  it('rejects public candidates that do not match the X profile identity', async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = input.toString()
      if (url === 'https://www.anthropic.com/') return htmlResponse('<title>Anthropic</title>')
      if (url.startsWith('https://api.github.com/search/users')) {
        return jsonResponse({ items: [{ html_url: 'https://github.com/random-lab', login: 'random-lab', type: 'Organization' }] })
      }
      if (url === 'https://api.github.com/orgs/random-lab') {
        return jsonResponse({ description: 'Not related.', html_url: 'https://github.com/random-lab', login: 'random-lab' })
      }
      if (url === 'https://api.github.com/orgs/anthropics') {
        return jsonResponse({ description: 'Official Anthropic GitHub organization.', html_url: 'https://github.com/anthropics', login: 'anthropics' })
      }
      if (url === 'https://www.youtube.com/@anthropic') return htmlResponse('<title>Matt Gregory - YouTube</title>')
      if (url === 'https://www.youtube.com/@anthropic-ai') return htmlResponse('<title>Anthropic - YouTube</title>')
      return new Response('', { status: 404 })
    }

    const assets = await discoverXProfileAssets({
      description: 'We build Claude.',
      name: 'Anthropic',
      rawJson: '{"data":{"profile_image_url":"https://pbs.twimg.com/profile_images/not-a-website.jpg"}}',
      username: 'AnthropicAI',
    }, {
      assetSelector: {
        select: async ({ candidates }) => candidates,
      },
      fetcher,
    })

    expect(assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Anthropic', url: 'https://www.anthropic.com' }),
      expect.objectContaining({ title: 'anthropics', url: 'https://github.com/anthropics' }),
      expect.objectContaining({ title: 'Anthropic YouTube', url: 'https://www.youtube.com/@anthropic-ai' }),
    ]))
    expect(assets).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ url: 'https://pbs.twimg.com/profile_images/not-a-website.jpg' }),
      expect.objectContaining({ title: 'Matt Gregory YouTube' }),
      expect.objectContaining({ url: 'https://github.com/random-lab' }),
    ]))
  })

  it('prefers URLs from the X profile over guessed personal-name domains', async () => {
    const requestedUrls: string[] = []
    const fetcher: typeof fetch = async (input) => {
      const url = input.toString()
      requestedUrls.push(url)
      if (url === 'https://t.co/dDtDyVssfm') {
        return htmlResponse('<title>Join Us On Our Journey</title>', 'https://terafab.ai/')
      }
      if (url.startsWith('https://api.github.com/search/users')) return jsonResponse({ items: [] })
      if (url === 'https://www.youtube.com/@elon-musk') return new Response('', { status: 404 })
      if (url === 'https://www.youtube.com/@elonmusk') return new Response('', { status: 404 })
      return new Response('', { status: 404 })
    }

    const assets = await discoverXProfileAssets({
      description: 'https://t.co/dDtDyVssfm',
      name: 'Elon Musk',
      username: 'elonmusk',
    }, { fetcher })

    expect(requestedUrls[0]).toBe('https://t.co/dDtDyVssfm')
    expect(requestedUrls).not.toContain('https://www.elon-musk.com/')
    expect(assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'website', url: 'https://terafab.ai' }),
    ]))
    expect(assets).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ url: 'https://www.elon-musk.com' }),
    ]))
  })

  it('does not accept web search candidates when no model selector is configured', async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = input.toString()
      if (url === 'https://www.elon-musk.com/') return htmlResponse('<title>Elon Musk Official</title>')
      if (url.startsWith('https://api.github.com/search/users')) return jsonResponse({ items: [] })
      if (url === 'https://www.youtube.com/@elon-musk') return new Response('', { status: 404 })
      if (url === 'https://www.youtube.com/@elonmusk') return new Response('', { status: 404 })
      return new Response('', { status: 404 })
    }

    const assets = await discoverXProfileAssets({
      description: '',
      name: 'Elon Musk',
      username: 'elonmusk',
    }, {
      fetcher,
      searchProvider: {
        search: async () => [{ title: 'Elon Musk', url: 'https://www.elon-musk.com/' }],
      },
    })

    expect(assets).toEqual([])
  })

  it('rejects web search candidates when the model selector does not approve them', async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = input.toString()
      if (url === 'https://www.elon-musk.com/') return htmlResponse('<title>Elon Musk Official</title>')
      if (url.startsWith('https://api.github.com/search/users')) return jsonResponse({ items: [] })
      if (url === 'https://www.youtube.com/@elon-musk') return new Response('', { status: 404 })
      if (url === 'https://www.youtube.com/@elonmusk') return new Response('', { status: 404 })
      return new Response('', { status: 404 })
    }

    const assets = await discoverXProfileAssets({
      description: '',
      name: 'Elon Musk',
      username: 'elonmusk',
    }, {
      assetSelector: {
        select: async () => [],
      },
      fetcher,
      searchProvider: {
        search: async () => [{ title: 'Elon Musk', url: 'https://www.elon-musk.com/' }],
      },
    })

    expect(assets).toEqual([])
  })

  it('rejects redirect-only lander pages from public search candidates', async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = input.toString()
      if (url === 'https://www.elon-musk.com/') {
        return htmlResponse('<!DOCTYPE html><html><head><script>window.onload=function(){window.location.href="/lander"}</script></head></html>')
      }
      if (url.startsWith('https://api.github.com/search/users')) return jsonResponse({ items: [] })
      if (url === 'https://www.youtube.com/@elon-musk') return new Response('', { status: 404 })
      if (url === 'https://www.youtube.com/@elonmusk') return new Response('', { status: 404 })
      return new Response('', { status: 404 })
    }

    const assets = await discoverXProfileAssets({
      description: '',
      name: 'Elon Musk',
      username: 'elonmusk',
    }, {
      fetcher,
      searchProvider: {
        search: async () => [{ title: 'Elon Musk', url: 'https://www.elon-musk.com/' }],
      },
    })

    expect(assets).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'website', url: 'https://www.elon-musk.com' }),
    ]))
  })
})
