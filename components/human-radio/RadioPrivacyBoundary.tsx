'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** This experimental listening surface does not load site marketing telemetry. */
export default function RadioPrivacyBoundary({ children }: { children: ReactNode }) {
  return usePathname() === '/cruise/human-radio' ? null : children
}
