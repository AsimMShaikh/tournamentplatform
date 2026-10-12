import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions are stable in Next.js 15
  },
  images: {
    remotePatterns: [],
  },
}

export default nextConfig
