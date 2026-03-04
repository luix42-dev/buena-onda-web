import { ReactNode } from 'react'

interface PullQuoteProps {
  children: ReactNode
  attribution?: string
  className?: string
}

export default function PullQuote({ children, attribution, className = '' }: PullQuoteProps) {
  return (
    <blockquote className={`pull-quote ${className}`}>
      <p>{children}</p>
      {attribution && (
        <footer className="mt-3">
          <cite className="font-mono text-xs tracking-wider text-stone-grey not-italic">
            — {attribution}
          </cite>
        </footer>
      )}
    </blockquote>
  )
}
