export interface TimelineItem {
  slug:    string
  year:    string
  title:   string
  summary: string
  story:   string
  photo:   string | null   // hero image for era page
  photos:  string[]        // contact sheet images for era page
}

export const timelineItems: TimelineItem[] = [
  {
    slug:    'pre-2014',
    year:    'PRE-2014',
    title:   'The Signal',
    summary: 'Vice City, the 1980s obsession, the frequency that started it all.',
    story:   `It started with Grand Theft Auto: Vice City. That game broke something open in me: the pastel buildings, the FM stations bleeding from car windows, the way everything felt like it was happening at golden hour. I didn't know what to call it yet. I just knew it was the world I wanted to live in. And it was set in Miami, of all places.\n\nFrom that moment, the 1980s became a frequency I'd tuned into and couldn't leave. Miami Vice. Vintage. The weight of things made to last.\n\nI was in Venezuela then, with no idea where the thread was leading.`,
    photo:   null,
    photos:  [],
  },
  {
    slug:    '2014',
    year:    '2014',
    title:   'Founded: Caracas to New York',
    summary: 'A personal practice in analog culture became something with a name.',
    story:   `In 2014 I started Buena Onda. I was a graphic designer in Venezuela: making tote bags, sewing pouches, printing shirts. Small things. But they were mine.\n\nThen I moved to the U.S. New York first. The brand paused in 2016 while I found my footing, but the frequency never went quiet.`,
    photo:   null,
    photos:  [],
  },
  {
    slug:    '2017',
    year:    '2017',
    title:   'Miami',
    summary: 'Miami was always the destination. Almost ten years now.',
    story:   `In 2017 I moved to Miami: the city the thread had always been pointing toward. Almost ten years here now.`,
    photo:   null,
    photos:  [],
  },
  {
    slug:    '2018',
    year:    '2018',
    title:   'The B Group',
    summary: 'Miami confirmed everything. First t-shirt capsule drops.',
    story:   `Miami confirmed what the game had been telling me. This city holds the 1980s in its bones: in the architecture, in the people, in the record stores and estate sales in Coral Gables. I kept going deeper. Curating. Learning what made something worth keeping.\n\nLaunched my first t-shirt capsule that year: The B Group.`,
    photo:   null,
    photos:  [],
  },
  {
    slug:    '2019',
    year:    '2019',
    title:   'Jolt Radio',
    summary: 'Found a home at Jolt Radio. It fit.',
    story:   `Jolt Radio was the best find I'd made in Miami. Met John and Pedro Caignet and clicked immediately over our shared pull toward the 1980s and analog culture.\n\nThat same year I started DJing. 80s Club was already moving with Oswave releasing episodes on SoundCloud, and I stepped into that world.`,
    photo:   null,
    photos:  [],
  },
  {
    slug:    '2020',
    year:    '2020',
    title:   'The Active Year',
    summary: 'Joined forces with Estefania Blanco. Merch, markets, and an 80s content machine.',
    story:   `Joined forces with my best friend Estefania Blanco and built an 80s content machine together. Started releasing my own merch and doing vintage markets with the Love Tempo crew.\n\nThe reach opened doors: Glitterwave, Neonblonde86, TurnBackTheBlockToThe80s, Adriane Avery, Veronicawheels. Met my good friend Jason Ho, who made the best ad Buena Onda has had.\n\nStarted #NeonHuntMiami that year too.`,
    photo:   null,
    photos:  [],
  },
  {
    slug:    '2022',
    year:    '2022',
    title:   'Open Decks',
    summary: 'Opened the store at Jolt Radio. Launched Open Decks.',
    story:   `Opened my store at Jolt Radio and launched Open Decks: a project that the Miami community made their own.`,
    photo:   null,
    photos:  [],
  },
  {
    slug:    '2025',
    year:    '2025',
    title:   'Onda Tropical',
    summary: 'A new event format. Latin American, Caribbean, and Afro-rooted dance music.',
    story:   `Launched Onda Tropical: a seasonal event format rooted in Latin American, Caribbean, and Afro-rooted dance music. The house expanded.`,
    photo:   null,
    photos:  [],
  },
  {
    slug:    '2026',
    year:    '2026',
    title:   'The Relaunch',
    summary: 'Buena Onda becomes an analog culture house.',
    story:   `The relaunch. Call it a content creator era — I've come around on the phrase. Buena Onda is an analog culture house: the declaration, and everything before this was the proof.`,
    photo:   null,
    photos:  [],
  },
]
