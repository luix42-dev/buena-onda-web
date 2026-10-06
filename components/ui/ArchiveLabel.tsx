import { ReactNode } from 'react'

interface ArchiveLabelProps {
  children: ReactNode
  className?: string
  as?: 'span' | 'p' | 'div' | 'label'
}

export default function ArchiveLabel({
  children,
  className = '',
  as: Tag = 'span',
}: ArchiveLabelProps) {
  return (
    <Tag className={`archive-label ${className}`}>
      {children}
    </Tag>
  )
}
