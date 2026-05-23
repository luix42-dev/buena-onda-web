'use client'

import type { ReactNode } from 'react'

type Props = {
  active:    boolean
  /** Status-aware highlight variants for the catalog. */
  variant?:  'av' | 're' | 'so'
  onClick:   () => void
  children:  ReactNode
}

export default function FilterChip({ active, variant, onClick, children }: Props) {
  const cls = ['chip', active ? 'on' : '', active && variant ? variant : ''].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  )
}
