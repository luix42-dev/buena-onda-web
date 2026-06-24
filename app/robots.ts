import type { MetadataRoute } from 'next'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.buenaondalifestyle.com'
const AI_AGENTS = [
  'GPTBot','OAI-SearchBot','ChatGPT-User',
  'ClaudeBot','Claude-SearchBot','Claude-User','anthropic-ai',
  'PerplexityBot','Perplexity-User',
  'Google-Extended','GoogleOther',
  'Applebot-Extended','Bingbot','Amazonbot',
  'meta-externalagent','DuckAssistBot','MistralAI-User','CCBot'
]

export default function robots(): MetadataRoute.Robots {
  const disallow = ['/studio/', '/api/']
  return {
    rules: [
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: '/', disallow })),
      { userAgent: '*', allow: '/', disallow },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}