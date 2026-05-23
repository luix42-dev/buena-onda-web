'use client'

import type { MouseEventHandler } from 'react'

type Props = {
  title:        string
  subtitle:     string
  actionLabel?: string
  onAction?:    MouseEventHandler<HTMLButtonElement>
  actionHref?:  string
}

export default function SectionHead({
  title,
  subtitle,
  actionLabel,
  onAction,
  actionHref,
}: Props) {
  return (
    <div className="sec-head">
      <div>
        <div className="ttl">{title}</div>
        <div className="sub">{subtitle}</div>
      </div>
      {actionLabel && (
        actionHref ? (
          <a className="btn coral" href={actionHref}>{actionLabel}</a>
        ) : (
          <button type="button" className="btn coral" onClick={onAction}>
            {actionLabel}
          </button>
        )
      )}
    </div>
  )
}
