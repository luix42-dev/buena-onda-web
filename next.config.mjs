// Inlined at build time, same as lib/nav.ts.
const CRUISE_LIVE = process.env.NEXT_PUBLIC_CRUISE_LIVE === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
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
      ...(CRUISE_LIVE ? [{ source: '/radio', destination: '/cruise', permanent: false }] : []),
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
