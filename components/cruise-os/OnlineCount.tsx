'use client'

import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { freshPresence } from '@/lib/experience/presence'
import { countPresence } from '@/components/real-miami/presence/usePresence'
import styles from './online-count.module.css'

const environment = process.env.NEXT_PUBLIC_VERCEL_ENV || 'local'
const channelName = `cruise:online:v1:${environment}`
const visitorKey = 'buena-onda:online-visitor:v1'

/** Anonymous browser presence. TV receivers do not count as another person. */
export default function OnlineCount({ garage = false }: { garage?: boolean }) {
  const [count, setCount] = useState<number | null>(null)
  const [receiver] = useState(() => typeof location !== 'undefined' && new URLSearchParams(location.search).get('receiver') === '1')
  useEffect(() => {
    if (receiver || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
    const client = createClient()
    const tab = crypto.randomUUID()
    let visitor = tab
    try {
      visitor = localStorage.getItem(visitorKey) || tab
      localStorage.setItem(visitorKey, visitor)
    } catch { /* A storage-blocked browser still has an anonymous session. */ }
    let channel: RealtimeChannel | null = null, subscribed = false, disposed = false, suspended = false
    let retry: ReturnType<typeof setTimeout> | undefined
    const remove = () => {
      subscribed = false
      const previous = channel; channel = null
      if (previous) { void previous.untrack().catch(() => {}); void client.removeChannel(previous).catch(() => {}) }
    }
    const refresh = () => {
      if (!subscribed || !channel || disposed) return
      const state = freshPresence(channel.presenceState<{ visitor: string; at: number }>())
      const next = countPresence(state).visitors
      setCount(next > 0 ? next : null)
    }
    const track = () => {
      if (!subscribed || !channel || document.hidden) return
      const current = channel
      void current.track({ visitor, at: Date.now() }).then(status => {
        if (channel === current && status !== 'ok') reconnect()
      }).catch(() => { if (channel === current) reconnect() })
    }
    const reconnect = () => {
      if (disposed || suspended) return
      setCount(null); remove()
      if (!retry) retry = setTimeout(() => { retry = undefined; connect() }, 5000)
    }
    const connect = () => {
      if (disposed || suspended || channel || !navigator.onLine) return
      const current = client.channel(channelName, { config: { presence: { key: tab } } })
      channel = current
      current.on('presence', { event: 'sync' }, refresh).subscribe(status => {
        if (disposed || channel !== current) return
        if (status === 'SUBSCRIBED') { subscribed = true; track(); refresh() }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') reconnect()
      })
    }
    const visibility = () => {
      if (document.hidden) void channel?.untrack().catch(() => {})
      else { connect(); track() }
    }
    const hide = () => { suspended = true; clearTimeout(retry); retry = undefined; remove(); setCount(null) }
    const show = () => { suspended = false; connect() }
    const offline = () => { remove(); setCount(null) }
    const heartbeat = setInterval(track, 15000)
    const expiry = setInterval(refresh, 5000)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', hide)
    window.addEventListener('pageshow', show)
    window.addEventListener('online', show)
    window.addEventListener('offline', offline)
    connect()
    return () => {
      disposed = true; clearTimeout(retry); clearInterval(heartbeat); clearInterval(expiry); remove()
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', hide)
      window.removeEventListener('pageshow', show)
      window.removeEventListener('online', show)
      window.removeEventListener('offline', offline)
    }
  }, [receiver])
  if (receiver) return null
  return <div className={styles.counter} role="status" aria-live="off" data-online-count={count ?? ''} data-garage={garage}
    title="Active Cruise browsers. Multiple tabs in the same browser count once."
    aria-label={count === null ? 'Live online count reconnecting' : `${count} online now`}>
    <span className={count === null ? styles.waiting : styles.dot} aria-hidden="true" />
    {count === null ? <span>Connecting</span> : <><strong>{count.toLocaleString()}</strong><span>online<span className={styles.now}> now</span></span></>}
  </div>
}
