import type { Metadata, Viewport } from 'next'
import { Instrument_Serif } from 'next/font/google'
import './studio.css'

const instrumentSerif = Instrument_Serif({
  weight:   ['400'],
  style:    ['italic', 'normal'],
  subsets:  ['latin'],
  variable: '--studio-serif',
  display:  'swap',
})

export const metadata: Metadata = {
  title:    'Studio · Buena Onda',
  robots:   { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor:  '#FAF8F5',
  colorScheme: 'light',
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`studio-root ${instrumentSerif.variable}`}>
      {children}
    </div>
  )
}
