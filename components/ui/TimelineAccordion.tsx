import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'
import type { TimelineItem } from '@/lib/timeline'

export type { TimelineItem }

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
  return (
    <div className="relative">
      {/* Vertical rule */}
      <div className="absolute left-[4.5rem] top-0 bottom-0 w-px bg-pale-stone hidden md:block" />

      <div className="flex flex-col">
        {items.map(({ slug, year, title, summary, story }, i) => (
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
                <Link
                  href={`/about/${slug}`}
                  className="group inline-block mb-1"
                >
                  <h3 className="font-display text-near-black text-xl group-hover:text-teal transition-colors duration-150">
                    {title}
                  </h3>
                  <div
                    className="h-px w-0 group-hover:w-full transition-all duration-300"
                    style={{ background: '#2A9D9D' }}
                  />
                </Link>
                <p className="text-charcoal text-sm leading-relaxed mb-6">
                  {summary}
                </p>
                <div className="prose-brand">
                  <StoryText text={story} />
                </div>
              </div>
            </div>
          </ScanReveal>
        ))}
      </div>
    </div>
  )
}
