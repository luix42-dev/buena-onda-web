import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
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

function youtubeEmbedUrl(raw: string | null | undefined) {
  if (!raw) return null
  try {
    const url = new URL(raw)
    const list = url.searchParams.get('list')
    if (list) return 'https://www.youtube.com/embed/videoseries?list=' + encodeURIComponent(list)
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id ? 'https://www.youtube.com/embed/' + id : null
    }
    const segments = url.pathname.split('/').filter(Boolean)
    const id = url.searchParams.get('v') || segments[segments.length - 1]
    return id ? 'https://www.youtube.com/embed/' + id : null
  } catch {
    return null
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
  const gallery = event.gallery?.filter(item => item.image) ?? []
  const videos = event.videos?.filter(item => item.url) ?? []
  const playlistEmbed = youtubeEmbedUrl(event.playlist_url)
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
              <p className='font-serif italic text-near-black max-w-3xl mb-12' style={{ fontSize: 'clamp(1.35rem, 3vw, 2rem)', lineHeight: 1.22 }}>{event.tagline}</p>
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

      {event.description ? (
        <section className='bg-warm-page py-16 border-y border-pale-stone'>
          <div className='max-w-site mx-auto px-5 md:px-10'>
            <ScanReveal>
              <div className='max-w-4xl'>
                <p className='font-serif text-near-black' style={{ fontSize: 'clamp(1.35rem, 3vw, 2rem)', lineHeight: 1.45 }}>{event.description}</p>
              </div>
            </ScanReveal>
          </div>
        </section>
      ) : null}

      {gallery.length > 0 ? (
        <EditorialSection label='On the floor' tone='pink'>
          <div className='grid grid-cols-2 md:grid-cols-6 auto-rows-[160px] gap-3 md:gap-4'>
            {gallery.map((item, i) => (
              <ScanReveal key={(item.image ?? 'image') + '-' + i} delay={i * 45} className={galleryClass(i)}>
                <figure className='relative h-full overflow-hidden rounded-[3px] bg-near-black'>
                  <img src={item.image} alt={item.caption ?? event.name} className='w-full h-full object-cover' />
                  {item.caption ? <figcaption className='absolute left-3 bottom-3 max-w-[80%] font-mono text-[0.58rem] uppercase tracking-[0.16em] text-white/75'>{item.caption}</figcaption> : null}
                </figure>
              </ScanReveal>
            ))}
          </div>
        </EditorialSection>
      ) : null}

      {(videos.length > 0 || playlistEmbed) ? (
        <EditorialSection label='Footage'>
          <div className='grid md:grid-cols-2 gap-8'>
            {videos.map((video, i) => {
              const src = youtubeEmbedUrl(video.url)
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
          <div className='grid md:grid-cols-2 gap-4'>
            {archiveSheets.map((sheet, i) => (
              <a key={(sheet.file ?? 'sheet') + '-' + i} href={sheet.file} download className='paper-hover border border-pale-stone bg-warm-white p-5 flex items-center gap-4'>
                <span className='font-mono text-teal text-xl'>▣</span>
                <span className='text-cta'>{sheet.label || 'Archive sheet ' + (i + 1)}</span>
              </a>
            ))}
          </div>
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

function galleryClass(index: number) {
  if (index === 0) return 'col-span-2 row-span-2 md:col-span-3 md:row-span-2'
  if (index === 1) return 'col-span-1 row-span-1 md:col-span-2'
  if (index === 2) return 'col-span-1 row-span-1 md:col-span-1'
  if (index % 5 === 3) return 'col-span-2 row-span-1 md:col-span-3'
  if (index % 5 === 4) return 'col-span-1 row-span-1 md:col-span-2'
  return 'col-span-1 row-span-1 md:col-span-2'
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
