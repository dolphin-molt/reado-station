import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ChannelMarketPage } from './ChannelMarketPage'

vi.mock('@/components/layout/Header', () => ({
  Header: vi.fn(({ active }) => createElement('header', { className: 'test-header', 'data-active': active })),
}))

describe('channel discovery page', () => {
  it('renders input discovery as a batch-follow market for AI and finance', () => {
    const html = renderToStaticMarkup(createElement(ChannelMarketPage, { lang: 'zh' }))

    expect(html).toContain('data-active="channels"')
    expect(html).toContain('频道发现')
    expect(html).toContain('AI')
    expect(html).toContain('金融')
    expect(html).toContain('频道包')
    expect(html).toContain('AI 产品/工程启动包')
    expect(html).toContain('金融宏观雷达')
    expect(html).toContain('从零训练小型语言模型的工程笔记')
    expect(html).toContain('FOMC 利率声明和会议纪要')
    expect(html).toContain('加入我的信息源')
    expect(html).toContain('action="/api/channel-subscriptions/batch"')
    expect(html).toContain('name="channelId"')
    expect(html).toContain('name="packId"')
    expect(html).toContain('Federal Reserve News')
  })

  it('routes cards to source profile pages instead of directly opening the add-source form', () => {
    const html = renderToStaticMarkup(createElement(ChannelMarketPage, { lang: 'zh' }))

    expect(html).toContain('href="/channels/x-karpathy"')
    expect(html).toContain('查看主页')
    expect(html).not.toContain('公共采集池')
    expect(html).not.toContain('多人关注同一个源时，账号资料和内容只采集一次。')
    expect(html).not.toContain('为什么值得关注')
    expect(html).not.toContain('适合谁')
    expect(html).not.toContain('内容节奏')
  })

  it('keeps the discovery header compact so the directory is visible sooner', () => {
    const html = renderToStaticMarkup(createElement(ChannelMarketPage, { lang: 'zh' }))

    expect(html).toContain('channel-market-page__hero')
    expect(html).toContain('发现优质 X 账号、RSS、论文和工具源。')
    expect(html).not.toContain('Read Less')
    expect(html).not.toContain('Know More')
  })
})
