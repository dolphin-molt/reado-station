import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

if (process.env.NODE_ENV === 'development') {
  void initOpenNextCloudflareForDev()
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: join(dirname(fileURLToPath(import.meta.url)), '..', '..'),
}

export default nextConfig
