export interface TimelineItem {
  slug: string
  year: string
  title: string
  summary: string
  story: string
  photo: string | null
  photos: string[]
  thumbnail?: {
    src: string
    href: string
  }
}

export const timelineItems: TimelineItem[] = [
  {
    slug: 'pre-2014',
    year: 'PRE-2014',
    title: 'The Signal',
    summary: 'Vice City, the 1980s obsession, the frequency that started it all.',
    story: `It started with Grand Theft Auto: Vice City. That game broke something open — the pastel buildings, the FM stations bleeding from car windows, the way everything felt like it was happening at golden hour. I didn't know what to call it yet. I just knew it was the world I wanted to live in. And it was set in Miami.\n\nFrom that moment, the 1980s became a frequency I tuned into and couldn't leave. Miami Vice. Vintage. The weight of things made to last.`,
    photo: null,
    photos: [],
  },
  {
    slug: '2014',
    year: '2014',
    title: 'Founded',
    summary: 'A personal practice in analog culture became something with a name.',
    story: `In 2014 I started Buena Onda. Making tote bags, sewing pouches, printing shirts. Small things. But they were mine.\n\nI moved to the U.S. not long after. The brand paused, but the frequency never went quiet.`,
    photo: null,
    photos: [],
  },
  {
    slug: '2017',
    year: '2017',
    title: 'Miami',
    summary: 'Miami was always the destination. Almost ten years now.',
    story: `In 2017 I moved to Miami: the city the thread had always been pointing toward. Almost ten years here now.`,
    photo: null,
    photos: [],
  },
  {
    slug: '2021',
    year: '2021',
    title: 'Love Tempo',
    summary: 'The first live format. Music, community, analog culture in practice.',
    story: `Love Tempo brought it out of the idea stage and into a room. Events built around music, tactile objects, and the kind of presence you can't manufacture on a screen.`,
    photo: null,
    photos: [],
    thumbnail: {
      src: 'https://vkexbuvdimhdxbeonoxz.supabase.co/storage/v1/object/public/hero-media/18045445933005375.webp',
      href: 'https://www.instagram.com/thelovetempo/',
    },
  },
  {
    slug: '2022',
    year: '2022',
    title: 'Jolt Radio',
    summary: 'A broadcast home for the 80s Club — everything Buena Onda sounds like.',
    story: `The 80s Club found a home on Jolt Radio. A weekly transmission rooted in the decade that shaped this whole thing — italo disco, synth-pop, post-punk, the analog end of electronic music.`,
    photo: null,
    photos: [],
    thumbnail: {
      src: 'https://vkexbuvdimhdxbeonoxz.supabase.co/storage/v1/object/public/hero-media/18045479968154884.webp',
      href: 'https://www.joltradio.org/',
    },
  },
  {
    slug: '2026',
    year: '2026',
    title: 'Relaunch',
    summary: 'The full architecture. Sound, Style, Space, Signal.',
    story: `The brand relaunches as a proper cultural house: catalog, events, editorial, radio — all under one roof. Slower, more deliberate, and built to last.`,
    photo: null,
    photos: [],
  },
]
