import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { AUTH_SESSION_COOKIE, createAuthSession, getAuthConfig, getCurrentAuthSession, upsertOAuthUser, type OAuthProfile } from '@/lib/auth'
import { getCloudflareEnv, getD1Binding } from '@/lib/cloudflare'

export const dynamic = 'force-dynamic'

type Provider = 'google' | 'github'

const OAUTH_STATE_COOKIE = 'reado_oauth_state'

function readProcessEnv(name: string): string | undefined {
  return process.env[name]
}

function providerFrom(value: string): Provider | null {
  return value === 'google' || value === 'github' ? value : null
}

function isSecureRequest(request: NextRequest): boolean {
  return new URL(request.url).protocol === 'https:'
}

function loginRedirect(request: NextRequest, error: string): NextResponse {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url), { status: 303 })
}

async function oauthSecrets(provider: Provider): Promise<{ clientId: string | null; clientSecret: string | null; tokenUrl: string }> {
  const env = await getCloudflareEnv()
  if (provider === 'google') {
    return {
      clientId: env?.GOOGLE_CLIENT_ID ?? readProcessEnv('GOOGLE_CLIENT_ID') ?? null,
      clientSecret: env?.GOOGLE_CLIENT_SECRET ?? readProcessEnv('GOOGLE_CLIENT_SECRET') ?? null,
      tokenUrl: 'https://oauth2.googleapis.com/token',
    }
  }
  return {
    clientId: env?.GITHUB_CLIENT_ID ?? readProcessEnv('GITHUB_CLIENT_ID') ?? null,
    clientSecret: env?.GITHUB_CLIENT_SECRET ?? readProcessEnv('GITHUB_CLIENT_SECRET') ?? null,
    tokenUrl: 'https://github.com/login/oauth/access_token',
  }
}

async function exchangeCode(provider: Provider, request: NextRequest, code: string): Promise<string | null> {
  const secrets = await oauthSecrets(provider)
  if (!secrets.clientId || !secrets.clientSecret) return null

  const redirectUri = new URL(`/api/auth/oauth/${provider}/callback`, request.url).toString()
  const body = new URLSearchParams({
    client_id: secrets.clientId,
    client_secret: secrets.clientSecret,
    code,
    redirect_uri: redirectUri,
  })

  const response = await fetch(secrets.tokenUrl, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  const payload = (await response.json().catch(() => ({}))) as { access_token?: string }
  return payload.access_token ?? null
}

async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const payload = (await response.json()) as { sub: string; email?: string; name?: string; picture?: string }
  return {
    provider: 'google',
    providerUserId: payload.sub,
    email: payload.email ?? null,
    displayName: payload.name ?? payload.email?.split('@')[0] ?? 'Google user',
    avatarUrl: payload.picture ?? null,
  }
}

async function fetchGitHubProfile(accessToken: string): Promise<OAuthProfile> {
  const headers = { accept: 'application/vnd.github+json', authorization: `Bearer ${accessToken}` }
  const [userResponse, emailsResponse] = await Promise.all([
    fetch('https://api.github.com/user', { headers }),
    fetch('https://api.github.com/user/emails', { headers }),
  ])
  const user = (await userResponse.json()) as { id: number; login: string; name?: string | null; avatar_url?: string; email?: string | null }
  const emails = emailsResponse.ok
    ? ((await emailsResponse.json()) as Array<{ email: string; primary?: boolean; verified?: boolean }>)
    : []
  const email = user.email ?? emails.find((entry) => entry.primary && entry.verified)?.email ?? emails.find((entry) => entry.verified)?.email ?? null

  return {
    provider: 'github',
    providerUserId: String(user.id),
    email,
    displayName: user.name ?? user.login,
    avatarUrl: user.avatar_url ?? null,
  }
}

interface OAuthCallbackContext {
  params: Promise<{ provider: string }>
}

export async function GET(request: NextRequest, context: OAuthCallbackContext): Promise<NextResponse> {
  const { provider: rawProvider } = await context.params
  const provider = providerFrom(rawProvider)
  if (!provider) return NextResponse.json({ error: 'Unsupported OAuth provider' }, { status: 404 })

  const stateCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value
  let statePayload: { provider?: string; state?: string; next?: string } | null = null
  if (stateCookie) {
    try {
      statePayload = JSON.parse(stateCookie) as { provider?: string; state?: string; next?: string }
    } catch {
      statePayload = null
    }
  }
  if (!statePayload || statePayload.provider !== provider || statePayload.state !== request.nextUrl.searchParams.get('state')) {
    return loginRedirect(request, 'oauth-state')
  }

  const code = request.nextUrl.searchParams.get('code')
  if (!code) return loginRedirect(request, 'oauth-denied')

  const [db, config] = await Promise.all([getD1Binding().catch(() => null), getAuthConfig()])
  if (!db || !config.authSecret) return loginRedirect(request, 'config')

  const accessToken = await exchangeCode(provider, request, code)
  if (!accessToken) return loginRedirect(request, 'oauth-token')

  const profile = provider === 'google' ? await fetchGoogleProfile(accessToken) : await fetchGitHubProfile(accessToken)
  const currentSession = await getCurrentAuthSession()
  const user = await upsertOAuthUser(db, profile, currentSession?.userId)
  const session = await createAuthSession(db, config, user.id)
  const response = NextResponse.redirect(new URL(statePayload.next ?? '/', request.url), { status: 303 })
  response.cookies.delete(OAUTH_STATE_COOKIE)
  response.cookies.set(AUTH_SESSION_COOKIE, session.token, {
    expires: session.expiresAt,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: isSecureRequest(request),
  })
  return response
}
