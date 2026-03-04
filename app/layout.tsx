import type { Metadata, Viewport } from 'next'
import './globals.css'
import FilmGrain from '@/components/ui/FilmGrain'
import ClickSound from '@/components/ui/ClickSound'

export const metadata: Metadata = {
  title: {
    default:  'Buena Onda — An Analog Culture House',
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
    title:       'Buena Onda — An Analog Culture House',
    description: 'Music, objects, and a lifestyle built to last.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Buena Onda — An Analog Culture House',
    description: 'Music, objects, and a lifestyle built to last.',
  },
  icons: {
    icon:  '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#FAF6F0',
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
      <body>
        <FilmGrain />
        <ClickSound />
        {children}
      </body>
    </html>
  )
}
