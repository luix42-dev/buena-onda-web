import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import GalleryGrid from '@/components/ui/GalleryGrid'
import SignupSheetArchive from '@/components/ui/SignupSheetArchive'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const runtime = 'edge'

export const dynamic = 'force-dynamic'

type GalleryItem = { image?: string; caption?: string }
type VideoItem = { url?: string; label?: string }
type AudioFile = { file?: string; label?: string }
type Partner = { name?: string; logo?: string }
type ArchiveSheet = { file?: string; label?: string }

type LiveEvent = {
  id: string
  name: string
  slug: string
  tagline: string | null
  description: string | null
  tags: string[] | null
  status: 'recurring' | 'one-time' | 'archived'
  venue_name: string | null
  venue_city: string | null
  event_date: string | null
  lineup: string | null
  cover_image_url: string | null
  gallery: GalleryItem[] | null
  videos: VideoItem[] | null
  playlist_url: string | null
  audio_files: AudioFile[] | null
  partners: Partner[] | null
  archive_sheets: ArchiveSheet[] | null
}

interface Props { params: Promise<{ slug: string }> }

function titleParts(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return [name, ''] as const
  return [parts[0], parts.slice(1).join(' ')] as const
}

function formatDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value + 'T12:00:00')
  if (Number.isNaN(date.getTime())) return null
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
  const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
  return weekday + ' · ' + monthDay
}

function initials(name: string | null | undefined) {
  return (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'BO'
}

function getYouTubeEmbedUrl(urlString: string): string {
  const input = urlString.trim()
  if (!input) return ''
  try {
    const url = new URL(input)
    const list = url.searchParams.get('list')
    const videoId = url.searchParams.get('v')

    if (url.hostname.includes('youtu.be')) {
      const shortId = url.pathname.split('/').filter(Boolean)[0]
      if (!shortId) return ''
      if (list) return `https://www.youtube.com/embed/${encodeURIComponent(shortId)}?list=${encodeURIComponent(list)}`
      return `https://www.youtube.com/embed/${encodeURIComponent(shortId)}`
    }

    if (url.pathname === '/playlist' && list) {
      return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(list)}`
    }

    if (videoId && list) {
      return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?list=${encodeURIComponent(list)}`
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`
    }

    if (list) {
      return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(list)}`
    }

    if (url.pathname.startsWith('/embed/')) {
      return url.toString()
    }

    const segments = url.pathname.split('/').filter(Boolean)
    const id = segments[segments.length - 1]
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : ''
  } catch {
    return ''
  }
}

async function getEvent(slug: string) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.from('events').select('*').eq('slug', slug).single()
  if (error || !data) return null
  return data as LiveEvent
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const event = await getEvent(slug)
    if (event) return { title: event.name, description: event.tagline ?? event.description ?? undefined }
  } catch {}
  return { title: 'Live Event' }
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) notFound()

  const [titleOne, titleTwo] = titleParts(event.name)
  const isOndaTropical = event.slug.toLowerCase() === 'onda-tropical'
  const gallery = event.gallery?.filter(item => item.image) ?? []
  const videos = event.videos?.filter(item => item.url) ?? []
  const playlistEmbed = getYouTubeEmbedUrl(event.playlist_url ?? '')
  const audioFiles = event.audio_files?.filter(item => item.file) ?? []
  const partners = event.partners?.filter(item => item.name || item.logo) ?? []
  const archiveSheets = event.archive_sheets?.filter(item => item.file) ?? []
  const proofRows = [
    { label: 'Venue', value: event.venue_name },
    { label: 'City', value: event.venue_city },
    { label: 'Date', value: formatDate(event.event_date) },
    { label: 'Sound by', value: event.lineup, accent: true },
  ].filter((row): row is { label: string; value: string; accent?: boolean } => Boolean(row.value))

  return (
    <>
      <section className='bg-cream pt-32 pb-16 md:pb-24 overflow-hidden'>
        <div className='max-w-site mx-auto px-5 md:px-10'>
          <ScanReveal>
            <div className='flex gap-2 items-center mb-12 font-mono text-xs text-stone-grey'>
              <Link href='/events' className='hover:text-burnished transition-colors'>Live Events</Link>
              <span>/</span>
              <span className='text-near-black'>{event.name}</span>
            </div>
          </ScanReveal>

          <ScanReveal>
            <p className='archive-label text-teal mb-8 tracking-[0.22em]'>Sound · Space · A Buena Onda Production</p>
          </ScanReveal>

          <ScanReveal delay={60}>
            <h1 className='font-display text-near-black leading-none text-balance mb-5' style={{ fontSize: 'clamp(3.5rem, 11vw, 5.5rem)' }}>
              <span className='block'>{titleOne}</span>
              {titleTwo ? <span className='block text-rose-magenta'>{titleTwo}</span> : null}
            </h1>
          </ScanReveal>

          {event.tagline ? (
            <ScanReveal delay={100}>
              <p className='font-serif italic text-near-black max-w-3xl mb-6' style={{ fontSize: 'clamp(1.35rem, 3vw, 2rem)', lineHeight: 1.22 }}>{event.tagline}</p>
            </ScanReveal>
          ) : null}

          {event.description ? (
            <ScanReveal delay={120}>
              <p className='font-sans font-bold text-near-black mb-12' style={{ fontSize: '1.125rem', lineHeight: 1.55 }}>{event.description}</p>
            </ScanReveal>
          ) : null}

          <div className='grid md:grid-cols-[1.4fr_1fr] gap-8 lg:gap-14 items-start'>
            <ScanReveal delay={140}>
              <div className='aspect-square overflow-hidden rounded-[4px] bg-near-black p-3'>
                {event.cover_image_url ? (
                  <img src={event.cover_image_url} alt={event.name} className='w-full h-full object-contain' />
                ) : <div className='w-full h-full bg-warm-white' />}
              </div>
            </ScanReveal>

            <ScanReveal delay={180}>
              <div>
                {isOndaTropical ? (
                  <p className='font-serif italic mb-6 max-w-[38ch]' style={{ color: '#555', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    Latin American and Caribbean dance music at Cerveceria La Tropical. DJ Kumi and Tostao playing from the same tradition that built the room — Afro-Cuban rhythms, tropical bass, cumbia, the long records. A Buena Onda production. Proof that Miami still knows how to move.
                  </p>
                ) : null}

                {proofRows.length > 0 ? (
                  <div className='border-t-2 border-charcoal'>
                    {proofRows.map(row => (
                      <div key={row.label} className='grid grid-cols-[7rem_1fr] gap-4 items-baseline py-4 border-b border-pale-stone'>
                        <span className='archive-label text-[0.58rem] text-stone-grey'>{row.label}</span>
                        <span className={'font-display text-2xl leading-none text-right ' + (row.accent ? 'text-teal' : 'text-near-black')}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {partners.length > 0 ? (
                  <div className='mt-8 grid gap-4'>
                    {partners.map((partner, i) => (
                      <div key={(partner.name ?? 'partner') + '-' + i} className='border border-teal rounded-[4px] p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4'>
                        <div className='w-16 h-16 min-w-12 min-h-12 rounded-full border border-teal flex items-center justify-center overflow-hidden bg-cream shrink-0'>
                          {partner.logo ? <img src={partner.logo} alt={partner.name ?? 'Partner'} className='w-full h-full object-contain' /> : <span className='font-display text-teal text-2xl leading-none'>{initials(partner.name)}</span>}
                        </div>
                        <div>
                          <div className='font-display text-near-black text-2xl leading-none uppercase'>{partner.name}</div>
                          <div className='text-xs text-near-black/75 mt-1'>{partner.name}</div>
                          <div className='archive-label text-[0.55rem] mt-1'>Venue Partner</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </ScanReveal>
          </div>
        </div>
      </section>

      {gallery.length > 0 ? (
        <EditorialSection label='On the floor' tone='pink'>
          <GalleryGrid gallery={gallery} eventName={event.name} />
        </EditorialSection>
      ) : null}

      {(videos.length > 0 || playlistEmbed) ? (
        <EditorialSection label='Footage'>
          <div className='grid md:grid-cols-2 gap-8'>
            {videos.map((video, i) => {
              const src = video.url ? getYouTubeEmbedUrl(video.url) : ''
              return src ? <VideoFrame key={(video.url ?? 'video') + '-' + i} title={video.label ?? 'Video ' + (i + 1)} src={src} /> : null
            })}
          </div>
          {playlistEmbed ? <div className='mt-10'><VideoFrame title='Full playlist' src={playlistEmbed} full /></div> : null}
        </EditorialSection>
      ) : null}

      {audioFiles.length > 0 ? (
        <EditorialSection label='Recordings'>
          <div className='grid gap-4'>
            {audioFiles.map((audio, i) => (
              <div key={(audio.file ?? 'audio') + '-' + i} className='grid md:grid-cols-[1fr_2fr] gap-4 items-center py-4 border-b border-pale-stone'>
                <div className='flex items-center gap-3'>
                  <span className='font-mono text-teal'>▶</span>
                  <span className='font-display text-near-black text-xl leading-none'>{audio.label || 'Recording ' + (i + 1)}</span>
                </div>
                <audio controls src={audio.file} className='w-full' />
              </div>
            ))}
          </div>
        </EditorialSection>
      ) : null}

      {archiveSheets.length > 0 ? (
        <EditorialSection label='Archive'>
          <p className='font-serif italic mb-10' style={{ color: '#555', fontSize: '0.95rem', lineHeight: 1.5, maxWidth: '38ch' }}>
            The names from those years. Scroll through the archive, then follow it into the playlist.
          </p>
          <SignupSheetArchive sheets={archiveSheets.map(s => ({ url: s.file!, label: s.label }))} />
        </EditorialSection>
      ) : null}

      <section className='bg-cream py-12 border-t border-pale-stone'>
        <div className='max-w-site mx-auto px-5 md:px-10 text-center'>
          <p className='archive-label text-[0.58rem]'>A Buena Onda Experience · {event.status}</p>
        </div>
      </section>
    </>
  )
}

function VideoFrame({ title, src, full }: { title: string; src: string; full?: boolean }) {
  return (
    <ScanReveal>
      <div className={full ? 'md:col-span-2' : undefined}>
        <p className='archive-label text-[0.58rem] mb-3'>{title}</p>
        <div className='aspect-video bg-near-black overflow-hidden rounded-[3px]'>
          <iframe src={src} title={title} className='w-full h-full' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' allowFullScreen />
        </div>
      </div>
    </ScanReveal>
  )
}

function EditorialSection({ label, tone, children }: { label: string; tone?: 'pink'; children: ReactNode }) {
  return (
    <section className='py-20 bg-cream border-t border-pale-stone'>
      <div className='max-w-site mx-auto px-5 md:px-10'>
        <ScanReveal>
          <div className='flex items-center gap-4 mb-10'>
            <div className={'h-px w-14 ' + (tone === 'pink' ? 'bg-rose-magenta' : 'bg-teal')} />
            <p className='archive-label text-[0.62rem] text-near-black'>{label}</p>
          </div>
        </ScanReveal>
        {children}
      </div>
    </section>
  )
}
