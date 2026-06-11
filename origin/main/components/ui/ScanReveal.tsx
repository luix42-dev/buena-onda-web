'use client'

import { useEffect, useRef, ReactNode } from 'react'

interface ScanRevealProps {
  children: ReactNode
  delay?: number
  className?: string
}

/**
 * Reveals its children with a top-to-bottom scan (film-strip unroll).
 * Uses IntersectionObserver — no JS on hidden elements.
 */
export default function ScanReveal({
  children,
  delay = 0,
  className = '',
}: ScanRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // If already in viewport on mount (above the fold), reveal immediately
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setTimeout(() => el.classList.add('revealed'), delay)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.classList.add('revealed')
          }, delay)
          observer.disconnect()
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={`scan-reveal ${className}`}>
      {children}
    </div>
  )
}
