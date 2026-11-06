'use client'

import { useEffect } from 'react'
import { attachCast, castIsRemote, castSupported, loadCastSdk } from '@/lib/cruise/google-cast'

/** Session ownership survives Garage/player transitions; only a user tap launches a receiver. */
export function useCastSenderConnection() {
  useEffect(() => {
    if (!castSupported()) return
    let alive = true
    let cleanup: (() => void) | undefined
    let lastActive: boolean | null = null
    const report = (active: boolean) => {
      if (!alive || active === lastActive) return
      lastActive = active
      window.dispatchEvent(new CustomEvent('cruise:casting', { detail: active }))
    }
    const ownership = (event: Event) => report((event as CustomEvent<boolean>).detail)
    window.addEventListener('cruise:cast-ownership', ownership)
    void loadCastSdk().then(() => {
      if (!alive) return
      cleanup = attachCast(
        () => {},
        () => report(false),
        state => {
          if (state === 'connected') report(castIsRemote())
          else if (state === 'disconnected') report(false)
        },
      )
    }).catch(() => { /* Local playback remains available when the sender SDK cannot load. */ })
    return () => {
      alive = false
      cleanup?.()
      window.removeEventListener('cruise:cast-ownership', ownership)
    }
  }, [])
}
