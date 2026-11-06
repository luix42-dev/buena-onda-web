// Inlined at build time, same as lib/nav.ts.
const CRUISE_LIVE = process.env.NEXT_PUBLIC_CRUISE_LIVE === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    const privateHeaders = [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }]
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        // The Cast receiver embeds the same-origin Cruise page. Stripe and radio
        // use external frames/media, so do not impose a speculative default-src.
        { key: 'Content-Security-Policy', value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'" },
      ],
    },
    { source: '/studio/:path*', headers: privateHeaders },
    { source: '/api/admin/:path*', headers: privateHeaders },
    { source: '/api/studio/:path*', headers: privateHeaders },
    ]
  },
  distDir: process.env.CRUISE_DIST_DIR || '.next',
  serverExternalPackages: ['sharp', '@imgly/background-removal-node'],
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/drive', destination: '/drive.html' },
      ],
    }
  },
  async redirects() {
    return [
      { source: '/objects', destination: '/themes', permanent: false },
      ...(CRUISE_LIVE ? [{ source: '/radio', missing: [{ type: 'query', key: 'fallback' }], destination: '/cruise', permanent: false }] : []),
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
}

export default nextConfig
