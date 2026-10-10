import { useEffect, useRef } from 'react'

/** prefers-reduced-motion as a ref (read inside useFrame without re-rendering). */
export function useReducedMotion() {
  const reduced = useRef(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => { reduced.current = q.matches }
    set(); q.addEventListener?.('change', set)
    return () => q.removeEventListener?.('change', set)
  }, [])
  return reduced
}
