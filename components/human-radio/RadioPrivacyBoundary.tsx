'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** This experimental listening surface does not load site marketing telemetry. */
export default function RadioPrivacyBoundary({ children }: { children: ReactNode }) {
  const path = usePathname()
  return path === '/cruise/human-radio' || path === '/cruise/prototype' || (path.startsWith('/cruise/experience') || path === '/cruise/os') ? null : children
}
