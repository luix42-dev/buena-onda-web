// Hosts allowed by images.remotePatterns in next.config.mjs. next/image throws
// for any other remote host, so anything else is rendered unoptimized instead.
const OPTIMIZABLE_HOSTS = [/\.supabase\.co$/, /^images\.unsplash\.com$/]

export function canOptimizeImage(src: string): boolean {
  if (src.startsWith('/')) return true
  try {
    const { protocol, hostname, pathname } = new URL(src)
    if (protocol !== 'https:') return false
    if (hostname.endsWith('.supabase.co')) return pathname.startsWith('/storage/v1/object/public/')
    return OPTIMIZABLE_HOSTS.some(re => re.test(hostname))
  } catch {
    return false
  }
}
