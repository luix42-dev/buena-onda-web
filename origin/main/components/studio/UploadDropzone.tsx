'use client'

import type { DragEventHandler } from 'react'

type Props = {
  icon?:    string
  title:    string
  hint?:    string
  onDrop?:  (files: File[]) => void
  onClick?: () => void
}

export default function UploadDropzone({
  icon = '⌃',
  title,
  hint,
  onDrop,
  onClick,
}: Props) {
  const handleDrop: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    if (!onDrop) return
    const files = Array.from(e.dataTransfer.files)
    onDrop(files)
  }

  return (
    <div
      className="upload"
      onClick={onClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="ic">{icon}</div>
      <div className="u1">{title}</div>
      {hint && <div className="u2">{hint}</div>}
    </div>
  )
}
