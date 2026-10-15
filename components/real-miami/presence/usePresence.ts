'use client'

import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import {freshPresence,EXPERIENCE_PRESENCE_LEASE_MS} from '@/lib/experience/presence'

/** Production keeps the bare channel so the live count is real visitors only.
 * Local and preview runs share the same Supabase project, so they join a separate channel. */
const PRESENCE_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? '' : `:${process.env.NEXT_PUBLIC_VERCEL_ENV || 'local'}`
export const PRESENCE_CHANNEL = `cruise:presence${PRESENCE_ENV}`
export const VISITOR_STORAGE_KEY = 'buena-onda:visitor:v1'
const TAB_STORAGE_KEY = 'buena-onda:tab:v1'
const SUBSCRIBE_TIMEOUT_MS = 8000

export type PresenceCounts = { sessions: number; visitors: number }

type PresenceMeta = { visitor?: unknown } | null | undefined
type PresenceStateLike = Record<string, ReadonlyArray<PresenceMeta> | undefined | null>

/**
 * Pure reducer: Supabase presence state -> counts.
 * sessions = presence keys that currently have at least one meta (one key per tab).
 * visitors = unique visitor ids across those keys; a key without a usable visitor id
 * counts as its own visitor (never merged, never dropped).
 */
export function countPresence(state: PresenceStateLike | null | undefined): PresenceCounts {
  if (!state) return { sessions: 0, visitors: 0 }
  let sessions = 0
  const visitors = new Set<string>()
  for (const key of Object.keys(state)) {
    const metas = state[key]
    if (!Array.isArray(metas) || metas.length === 0) continue
    sessions += 1
    let found = false
    for (const meta of metas) {
      const v = meta && typeof meta === 'object' ? (meta as { visitor?: unknown }).visitor : undefined
      if (typeof v === 'string' && v.length > 0) {
        visitors.add(`v:${v}`)
        found = true
      }
    }
    if (!found) visitors.add(`k:${key}`)
  }
  return { sessions, visitors: visitors.size }
}

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function stored(kind: 'session' | 'local', key: string): string {
  try {
    const s = kind === 'session' ? window.sessionStorage : window.localStorage
    let id = s.getItem(key)
    if (!id) {
      id = randomId()
      s.setItem(key, id)
    }
    return id
  } catch {
    return randomId() // storage blocked: still unique for this mount
  }
}

export type PresenceResult = PresenceCounts & { live: boolean }
const OFF: PresenceResult = { sessions: 0, visitors: 0, live: false }

export function usePresence(enabled: boolean, leased = false): PresenceResult {
  const [result, setResult] = useState<PresenceResult>(OFF)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setResult(OFF)
      return
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setResult(OFF)
      return
    }

    let client: ReturnType<typeof createClient>
    try {
      client = createClient() // lib/supabase/client.ts (browser singleton)
    } catch {
      setResult(OFF)
      return
    }

    let disposed = false
    let subscribed = false
    let channel: RealtimeChannel | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let heartbeat: ReturnType<typeof setInterval> | undefined
    let expiry: ReturnType<typeof setInterval> | undefined
    const tabId = leased ? randomId() : stored('session', TAB_STORAGE_KEY)
    const visitorId = leased ? tabId : stored('local', VISITOR_STORAGE_KEY)

    const teardown = () => {
      if (timer) clearTimeout(timer)
      if (heartbeat) clearInterval(heartbeat)
      if (expiry) clearInterval(expiry)
      timer = undefined
      subscribed = false
      const ch = channel
      channel = null
      if (ch) {
        ch.untrack().catch(() => {})
        client.removeChannel(ch).catch(() => {})
      }
    }

    const fail = () => {
      if (disposed) return
      teardown()
      setResult(OFF)
    }

    const syncCounts = () => {
      if (disposed || !channel || !subscribed) return
      const state = channel.presenceState() as PresenceStateLike
      setResult({ ...countPresence(leased ? freshPresence(state, Date.now(), EXPERIENCE_PRESENCE_LEASE_MS) : state), live: true })
    }

    const track = () => {
      if (!channel || !subscribed || document.hidden) return
      channel.track({ visitor: visitorId, at: Date.now() }).catch(fail)
    }
    const untrack = () => {
      if (!channel || !subscribed) return
      channel.untrack().catch(() => {})
    }

    const onVisibility = () => (document.hidden ? untrack() : track())
    const onPageHide = () => {
      teardown()
      setResult(OFF)
    }

    channel = client.channel(leased ? `${PRESENCE_CHANNEL}:experience-v1` : PRESENCE_CHANNEL, { config: { presence: { key: tabId } } })
    channel.on('presence', { event: 'sync' }, syncCounts).subscribe((status) => {
      if (disposed) return
      if (status === 'SUBSCRIBED') {
        if (timer) clearTimeout(timer)
        timer = undefined
        subscribed = true
        if (leased) { heartbeat = setInterval(track, 15000); expiry = setInterval(syncCounts, 5000) }
        track()
        syncCounts()
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        fail()
      }
    })

    timer = setTimeout(() => {
      if (!subscribed) fail()
    }, SUBSCRIBE_TIMEOUT_MS)

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      teardown()
      setResult(OFF)
    }
  }, [enabled, leased])

  return result
}
