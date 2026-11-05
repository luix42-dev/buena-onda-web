'use client'

import { usePresence } from './usePresence'
import styles from './live-cruisers.module.css'

type Props = { enabled: boolean; className?: string; leased?: boolean }

/** Honest presence pill. Renders nothing unless the realtime channel is live and counted >= 1. */
export default function LiveCruisers({ enabled, className, leased = false }: Props) {
  const { visitors, live } = usePresence(enabled, leased)
  if (!enabled || !live || visitors < 1) return null
  return (
    <div
      className={[styles.pill, className].filter(Boolean).join(' ')}
      role="status"
      aria-live="off"
      aria-label={leased ? `${visitors} opted-in browser sessions active` : `${visitors} ${visitors === 1 ? 'person' : 'people'} cruising now`}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.text}>
        <span className={styles.num}>{visitors}</span> {leased ? 'opted-in sessions' : 'cruising now'}
      </span>
    </div>
  )
}

export { LiveCruisers }
