import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { bebasNeue, outfit, cormorantGaramond, spaceMono, orbitron, fraunces } from './fonts'
import './globals.css'
import FilmGrain from '@/components/ui/FilmGrain'
import ClickSound from '@/components/ui/ClickSound'
import MetaPixel from '@/components/analytics/MetaPixel'

export const metadata: Metadata = {
  title: {
    default:  'Buena Onda — Analog Culture House',
    template: '%s | Buena Onda',
  },
  description:
    'Buena Onda is an analog culture house rooted in Miami. Music, objects, and a lifestyle built to last.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.buenaondalifestyle.com'
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
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${bebasNeue.variable} ${outfit.variable} ${cormorantGaramond.variable} ${spaceMono.variable} ${orbitron.variable} ${fraunces.variable}`}>
        <FilmGrain />
        <ClickSound />
        {children}
        <Analytics />
        <SpeedInsights />
        <MetaPixel />
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
        {clarityProjectId ? (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityProjectId}");
            `}
          </Script>
        ) : null}
      </body>
    </html>
  )
}