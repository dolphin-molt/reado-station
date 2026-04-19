import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

import { getSitePublicDir } from '@/lib/content'

const CONTENT_TYPES: Record<string, string> = {
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ asset?: string[] }> },
) {
  const { asset } = await context.params
  if (!asset || asset.length === 0) {
    return new Response('Not found', { status: 404 })
  }

  const publicRoot = getSitePublicDir()
  const resolvedPath = resolve(publicRoot, ...asset)

  if (!resolvedPath.startsWith(publicRoot)) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const file = await readFile(resolvedPath)
    const extension = extname(join(...asset)).toLowerCase()
    const contentType = CONTENT_TYPES[extension] ?? 'application/octet-stream'

    return new Response(file, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': contentType,
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
