'use client'

import { useState } from 'react'
import ScanReveal from '@/components/ui/ScanReveal'

export interface TimelineItem {
  year:    string
  title:   string
  summary: string
  story:   string
  photo:   string | null
}

function StoryText({ text }: { text: string }) {
  return (
    <>
      {text.trim().split('\n\n').map((para, i) => (
        <p key={i} className="mb-4 last:mb-0">
          {para.split('\n').map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </>
  )
}

export default function TimelineAccordion({ items }: { items: TimelineItem[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  function toggle(year: string) {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  return (
    <div className="relative">
      {/* Vertical rule */}
      <div className="absolute left-[4.5rem] top-0 bottom-0 w-px bg-pale-stone hidden md:block" />

      <div className="flex flex-col">
        {items.map(({ year, title, summary, story }, i) => {
          const isOpen = openIds.has(year)
          return (
            <ScanReveal key={year} delay={i * 60}>
              <div className="flex flex-col md:flex-row gap-4 md:gap-12 py-8 border-b border-pale-stone last:border-0">
                {/* Year */}
                <div className="flex-shrink-0 w-full md:w-[4.5rem] pt-1">
                  <span className="font-mono text-xs tracking-wider text-teal">
                    {year}
                  </span>
                </div>

                {/* Content */}
                <div className="md:pl-8 flex-1">
                  <button
                    onClick={() => toggle(year)}
                    className="w-full text-left flex items-start justify-between gap-4 group"
                    aria-expanded={isOpen}
                  >
                    <div>
                      <h3 className="font-display text-near-black text-xl mb-1 group-hover:text-teal transition-colors duration-150">
                        {title}
                      </h3>
                      <p className="text-charcoal text-sm leading-relaxed">
                        {summary}
                      </p>
                    </div>
                    <span
                      className="flex-shrink-0 font-mono text-lg text-teal mt-0.5 transition-transform duration-300 select-none"
                      style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-6 prose-brand animate-fade-up" style={{ animationDuration: '0.3s' }}>
                      <StoryText text={story} />
                    </div>
                  )}
                </div>
              </div>
            </ScanReveal>
          )
        })}
      </div>
    </div>
  )
}
