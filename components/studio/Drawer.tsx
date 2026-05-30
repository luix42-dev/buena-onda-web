'use client'

import { useEffect, type ReactNode } from 'react'

type Props = {
  open:     boolean
  onClose:  () => void
  title:    string
  footer?:  ReactNode
  children: ReactNode
}

export default function Drawer({ open, onClose, title, footer, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={`scrim${open ? ' on' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`drawer${open ? ' on' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dhead">
          <span className="lbl">{title}</span>
          <button type="button" className="x" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="dbody">{children}</div>
        {footer && <div className="dfoot">{footer}</div>}
      </aside>
    </>
  )
}
