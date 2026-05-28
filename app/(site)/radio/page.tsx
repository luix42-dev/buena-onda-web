import type { Metadata } from 'next'
import { headers } from 'next/headers'
import ScanReveal from '@/components/ui/ScanReveal'
import type { Episode } from '@/types'

export const metadata: Metadata = {
  title: 'Radio',
  description: 'Curated mixes, live sessions, and field recordings from the house archive.',
}

export const dynamic = 'force-dynamic'

type EpisodesResponse = {
  episodes?: Episode[]
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unpublished'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || Number.isNaN(seconds)) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`
}

async function getBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')

  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
  const proto = headerStore.get('x-forwarded-proto') ?? (host?.includes('localhost') ? 'http' : 'https')

  if (host) return `${proto}://${host}`
  return 'http://localhost:3000'
}

async function loadEpisodes() {
  try {
    const baseUrl = await getBaseUrl()
    const res = await fetch(`${baseUrl}/api/episodes?limit=50`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error('Failed to load episodes.')
    }

    const body = (await res.json()) as EpisodesResponse
    return Array.isArray(body.episodes) ? body.episodes : []
  } catch {
    return []
  }
}

export default async function RadioPage() {
  const episodes = await loadEpisodes()

  return (
    <>
      <div className="pt-32 pb-16 bg-black text-pale-stone">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label text-teal">Radio / Sound</span>
            <h1
              className="font-display text-warm-white mt-2"
              style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)' }}
            >
              The Archive
            </h1>
            <p className="text-stone-grey text-sm mt-4 max-w-prose leading-relaxed">
              Curated mixes, live sessions, and field recordings. Listen front to back, straight from
              the published archive.
            </p>
          </ScanReveal>
        </div>
      </div>

      <section className="bg-black min-h-screen">
        <div className="max-w-site mx-auto px-5 md:px-10 py-12">
          {episodes.length === 0 ? (
            <ScanReveal>
              <div className="border border-charcoal/40 bg-near-black p-8 md:p-10">
                <p className="archive-label text-[0.62rem] text-teal">Radio Archive</p>
                <h2 className="font-display text-warm-white mt-3" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
                  No published episodes yet.
                </h2>
                <p className="text-stone-grey text-sm leading-relaxed mt-3 max-w-prose">
                  The archive is now wired to live episode data. Publish an episode in Studio and it
                  will appear here automatically.
                </p>
              </div>
            </ScanReveal>
          ) : (
            <ScanReveal>
              <div className="border border-charcoal/40">
                <div className="hidden md:grid md:grid-cols-[120px_1fr_280px] gap-6 px-5 py-3 border-b border-charcoal/40">
                  <span className="archive-label text-[0.58rem]">Date</span>
                  <span className="archive-label text-[0.58rem]">Episode / Title</span>
                  <span className="archive-label text-[0.58rem]">Playback</span>
                </div>

                {episodes.map((episode, index) => (
                  <article
                    key={episode.id}
                    className="grid md:grid-cols-[120px_1fr_280px] gap-4 md:gap-6 px-5 py-6 border-b border-charcoal/30 last:border-b-0"
                  >
                    <div className="flex flex-col gap-2">
                      <span className="archive-label text-[0.58rem] text-teal-light">
                        EP.{String(episode.episode_number ?? index + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-xs text-stone-grey">
                        {formatDate(episode.published_at ?? episode.created_at)}
                      </span>
                      {formatDuration(episode.duration) && (
                        <span className="font-mono text-xs text-stone-grey/80">
                          {formatDuration(episode.duration)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="font-display text-warm-white text-xl leading-snug">
                        {episode.title}
                      </h2>
                      <p className="text-stone-grey text-sm leading-relaxed mt-2">
                        {episode.description ?? 'No description yet.'}
                      </p>
                    </div>

                    <div className="flex items-center">
                      {episode.audio_url ? (
                        <audio
                          controls
                          preload="none"
                          className="w-full"
                          src={episode.audio_url}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <div className="w-full border border-charcoal/40 px-4 py-3">
                          <span className="font-mono text-xs text-stone-grey">
                            Audio unavailable
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </ScanReveal>
          )}
        </div>
      </section>
    </>
  )
}
