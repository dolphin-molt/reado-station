import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getCloudflareEnv } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

type Provider = 'google' | 'github'

const OAUTH_STATE_COOKIE = 'reado_oauth_state'

function readProcessEnv(name: string): string | undefined {
  return process.env[name]
}

function providerFrom(value: string): Provider | null {
  return value === 'google' || value === 'github' ? value : null
}

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  if (value === '/admin' || value.startsWith('/admin/')) return '/'
  return value
}

function isSecureRequest(request: NextRequest): boolean {
  return new URL(request.url).protocol === 'https:'
}

async function oauthConfig(provider: Provider): Promise<{ clientId: string | null; authorizeUrl: string; scope: string }> {
  const env = await getCloudflareEnv()
  if (provider === 'google') {
    return {
      clientId: env?.GOOGLE_CLIENT_ID ?? readProcessEnv('GOOGLE_CLIENT_ID') ?? null,
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      scope: 'openid email profile',
    }
  }
  return {
    clientId: env?.GITHUB_CLIENT_ID ?? readProcessEnv('GITHUB_CLIENT_ID') ?? null,
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    scope: 'read:user user:email',
  }
}

interface OAuthStartContext {
  params: Promise<{ provider: string }>
}

export async function GET(request: NextRequest, context: OAuthStartContext): Promise<NextResponse> {
  const { provider: rawProvider } = await context.params
  const provider = providerFrom(rawProvider)
  if (!provider) return NextResponse.json({ error: 'Unsupported OAuth provider' }, { status: 404 })

  const config = await oauthConfig(provider)
  if (!config.clientId) return NextResponse.redirect(new URL('/login?error=oauth-config', request.url), { status: 303 })

  const next = safeNextPath(request.nextUrl.searchParams.get('next'))
  const state = crypto.randomUUID()
  const callbackUrl = new URL(`/api/auth/oauth/${provider}/callback`, request.url)
  const authorizeUrl = new URL(config.authorizeUrl)
  authorizeUrl.searchParams.set('client_id', config.clientId)
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl.toString())
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('scope', config.scope)
  authorizeUrl.searchParams.set('state', state)
  if (provider === 'google') authorizeUrl.searchParams.set('access_type', 'online')

  const response = NextResponse.redirect(authorizeUrl, { status: 303 })
  response.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ provider, state, next }), {
    httpOnly: true,
    maxAge: 10 * 60,
    path: '/',
    sameSite: 'lax',
    secure: isSecureRequest(request),
  })
  return response
}
