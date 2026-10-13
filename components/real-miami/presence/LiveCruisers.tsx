'use client'

import { usePresence } from './usePresence'
import styles from './live-cruisers.module.css'

type Props = { enabled: boolean; className?: string }

/** Honest presence pill. Renders nothing unless the realtime channel is live and counted >= 1. */
export default function LiveCruisers({ enabled, className }: Props) {
  const { visitors, live } = usePresence(enabled)
  if (!enabled || !live || visitors < 1) return null
  return (
    <div
      className={[styles.pill, className].filter(Boolean).join(' ')}
      role="status"
      aria-live="off"
      aria-label={`${visitors} ${visitors === 1 ? 'person' : 'people'} cruising now`}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.text}>
        <span className={styles.num}>{visitors}</span> cruising now
      </span>
    </div>
  )
}

export { LiveCruisers }
