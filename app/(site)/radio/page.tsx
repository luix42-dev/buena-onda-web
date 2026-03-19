'use client'

import { useState } from 'react'
import ScanReveal from '@/components/ui/ScanReveal'

interface Episode {
  id:             string
  episodeNumber:  number
  title:          string
  description:    string
  duration:       string
  date:           string
  tags:           string[]
  audioUrl:       string | null
}

const episodes: Episode[] = [
  { id: 'ep18', episodeNumber: 18, title: 'Afro-Cuban Jazz at the Source',    description: 'Two hours tracking Afro-Cuban jazz from Havana street rhythms to Miami cocktail bars. Rare 1970s Cuban pressings throughout.',                duration: '2h 04m', date: 'Mar 2024', tags: ['Jazz', 'Cuba', 'Archive'],     audioUrl: null },
  { id: 'ep17', episodeNumber: 17, title: 'Saudade — A Brazilian Journey',    description: 'Bossa nova, tropicália, and the sadness that runs through all of it. Curated from original vinyl.',                                    duration: '1h 48m', date: 'Feb 2024', tags: ['Brazil', 'Bossa', 'Vinyl'],    audioUrl: null },
  { id: 'ep16', episodeNumber: 16, title: 'Funk Carioca',                     description: 'Rio de Janeiro\'s street sound — raw, percussive, and impossible to sit still through.',                                                                  duration: '1h 22m', date: 'Jan 2024', tags: ['Brazil', 'Funk', 'Dance'],    audioUrl: null },
  { id: 'ep15', episodeNumber: 15, title: 'Miami Bass: A Retrospective',      description: 'Three acts tracing how Miami bass went from a local phenomenon to a global blueprint.',                                                                        duration: '1h 55m', date: 'Dec 2023', tags: ['Miami', 'Bass', 'History'],  audioUrl: null },
  { id: 'ep14', episodeNumber: 14, title: 'Slow Burners Vol. II',             description: 'Late-night music for people who don\'t want the night to end. Put it on. Don\'t stop it.',                                                                      duration: '2h 12m', date: 'Nov 2023', tags: ['Ambient', 'Deep', 'Night'],  audioUrl: null },
  { id: 'ep13', episodeNumber: 13, title: 'Havana Club Session',              description: 'Live recording from a sunset session in Little Havana. The room was full, the rum was cold.',                                                                duration: '1h 38m', date: 'Oct 2023', tags: ['Live', 'Havana', 'Session'], audioUrl: null },
]

function EpisodeRow({ ep, isActive }: {
  ep:       Episode
  isActive: boolean
}) {
  return (
    <div
      className={[
        'flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5',
        'border-b border-charcoal/30 last:border-0 transition-colors duration-200',
        isActive ? 'bg-teal/10' : '',
      ].join(' ')}
    >
      {/* Play indicator — disabled */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-charcoal/40">
        <span className="font-mono text-[0.65rem] text-charcoal/40">
          —
        </span>
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="archive-label text-[0.58rem] text-warm-sand">
            EP·{String(ep.episodeNumber).padStart(2, '0')}
          </span>
          {ep.tags.slice(0, 2).map(tag => (
            <span key={tag} className="archive-label text-[0.55rem] text-charcoal border border-charcoal/40 px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
        <h3 className={[
          'font-display text-base leading-snug transition-colors',
          isActive ? 'text-warm-white' : 'text-pale-stone group-hover:text-warm-white',
        ].join(' ')}>
          {ep.title}
        </h3>
        <p className="text-stone-grey text-xs leading-relaxed mt-1 line-clamp-1">
          {ep.description}
        </p>
      </div>

      {/* Duration + date */}
      <div className="flex-shrink-0 text-right hidden sm:block">
        <p className="font-mono text-xs text-stone-grey">{ep.duration}</p>
        <p className="archive-label text-[0.55rem] mt-1">{ep.date}</p>
      </div>
    </div>
  )
}

export default function RadioPage() {
  const [activeId, setActiveId] = useState<string | null>(null)

  const activeEpisode = episodes.find(e => e.id === activeId)

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
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
            <p className="text-stone-grey text-sm mt-4 max-w-prose">
              Curated mixes, live sessions, field recordings.
              Listen front to back. No shuffle.
            </p>
          </ScanReveal>
        </div>
      </div>

      {/* ── Coming Soon Banner ─────────────────────────────────────────── */}
      <div className="bg-near-black border-b border-charcoal/40 py-4">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <p className="font-mono text-xs text-stone-grey/60 text-center tracking-wide">
            The archive is being prepared. Episodes launching soon.
          </p>
        </div>
      </div>

      {/* ── Sticky Player ──────────────────────────────────────────────── */}
      {activeEpisode && (
        <div className="sticky top-16 z-30 bg-near-black border-b border-charcoal/50
                        shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="max-w-site mx-auto px-5 md:px-10 py-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-pulse" style={{ boxShadow: '0 0 6px rgba(255,60,142,0.5)' }} />
              <span className="font-mono text-[0.65rem] text-stone-grey tracking-wider uppercase">
                Now Playing
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-warm-white text-sm truncate">
                EP·{String(activeEpisode.episodeNumber).padStart(2, '0')} — {activeEpisode.title}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Audio player placeholder */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({length: 20}).map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-neon-pink rounded-full"
                    style={{ height: `${Math.random() * 16 + 4}px`, opacity: 0.7 }}
                  />
                ))}
              </div>
              <button
                onClick={() => setActiveId(null)}
                className="font-mono text-xs text-stone-grey hover:text-pale-stone transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Episode List ───────────────────────────────────────────────── */}
      <section className="bg-black min-h-screen">
        <div className="max-w-site mx-auto px-5 md:px-10 py-12">
          <ScanReveal>
            <div className="border border-charcoal/40">
              {/* Table header */}
              <div className="flex items-center gap-4 px-5 py-3 border-b border-charcoal/40">
                <div className="w-10" />
                <div className="flex-1">
                  <span className="archive-label text-[0.58rem]">Episode / Title</span>
                </div>
                <div className="hidden sm:block">
                  <span className="archive-label text-[0.58rem]">Duration</span>
                </div>
              </div>

              {episodes.map((ep) => (
                <EpisodeRow
                  key={ep.id}
                  ep={ep}
                  isActive={activeId === ep.id}
                />
              ))}
            </div>
          </ScanReveal>

        </div>
      </section>
    </>
  )
}
