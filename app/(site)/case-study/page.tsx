import type { Metadata } from 'next'
import Link from 'next/link'
import ScanReveal from '@/components/ui/ScanReveal'

export const metadata: Metadata = {
  title: 'Brand Archive',
  description: 'Buena Onda brand archive notes.',
}

export default function CaseStudyPage() {
  return (
    <>
      <div className="pt-32 pb-16 bg-near-black text-pale-stone">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label text-stone-grey">Brand Archive</span>
            <h1
              className="font-display text-linen-peach mt-3"
              style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)' }}
            >
              Launching soon
            </h1>
            <p className="text-stone-grey text-sm mt-4 max-w-prose leading-relaxed">
              The longer-form Buena Onda brand archive is being prepared for publication. It is not part
              of the launch surface yet.
            </p>
          </ScanReveal>
        </div>
      </div>

      <section className="py-20 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <div className="border border-pale-stone bg-warm-white p-8 md:p-10">
              <p className="archive-label text-[0.6rem] text-teal">Status</p>
              <h2 className="font-display text-near-black text-3xl mt-3">Not published yet.</h2>
              <p className="text-charcoal text-sm leading-relaxed mt-4 max-w-2xl">
                When this section is ready, it will return with the final archive study and complete visual
                analysis. Until then, the rest of the site is the live launch surface.
              </p>
              <Link href="/" className="inline-block mt-8 btn-hollow-coral">
                Return home
              </Link>
            </div>
          </ScanReveal>
        </div>
      </section>
    </>
  )
}
