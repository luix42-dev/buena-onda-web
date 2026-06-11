import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Outfit, Cormorant_Garamond, Space_Mono, Orbitron } from 'next/font/google'
import './globals.css'
import FilmGrain from '@/components/ui/FilmGrain'
import ClickSound from '@/components/ui/ClickSound'

const bebasNeue = Bebas_Neue({
  weight:   ['400'],
  subsets:  ['latin'],
  variable: '--font-display',
  display:  'swap',
})

const outfit = Outfit({
  weight:   ['300', '400', '500', '600', '700'],
  subsets:  ['latin'],
  variable: '--font-sans',
  display:  'swap',
})

const cormorantGaramond = Cormorant_Garamond({
  weight:   ['300', '400', '500', '600'],
  style:    ['normal', 'italic'],
  subsets:  ['latin'],
  variable: '--font-serif',
  display:  'swap',
})

const spaceMono = Space_Mono({
  weight:   ['400', '700'],
  subsets:  ['latin'],
  variable: '--font-mono',
  display:  'swap',
})

const orbitron = Orbitron({
  weight:   ['400', '500', '600', '700'],
  subsets:  ['latin'],
  variable: '--font-orbitron',
  display:  'swap',
})

export const metadata: Metadata = {
  title: {
    default:  'Buena Onda — Analog Culture House',
    template: '%s | Buena Onda',
  },
  description:
    'Buena Onda is an analog culture house rooted in Miami. Music, objects, and a lifestyle built to last.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buenaonda.com'
  ),
  openGraph: {
    type:        'website',
    locale:      'en_US',
    siteName:    'Buena Onda',
    title:       'Buena Onda — Analog Culture House',
    description: 'Music, objects, and a lifestyle built to last.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Buena Onda — Analog Culture House',
    description: 'Music, objects, and a lifestyle built to last.',
  },
  icons: {
    icon:  '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor:  '#FAF8F5',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${bebasNeue.variable} ${outfit.variable} ${cormorantGaramond.variable} ${spaceMono.variable} ${orbitron.variable}`}>
        <FilmGrain />
        <ClickSound />
        {children}
      </body>
    </html>
  )
}
