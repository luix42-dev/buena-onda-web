'use client'

import { usePathname } from 'next/navigation'
import Navigation from '@/components/layout/Navigation'
import Footer from '@/components/layout/Footer'
import PersistentPlayer from '@/components/ui/PersistentPlayer'

export default function CruiseSiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const cruise = pathname === '/cruise' || pathname === '/cruise/human-radio' || pathname.startsWith('/cruise/experience')
  if (cruise) return <main>{children}</main>
  return <><Navigation /><main className="pb-16">{children}</main><Footer /><PersistentPlayer /></>
}
