/** @type {import('next').NextConfig} */
const nextConfig = {
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
