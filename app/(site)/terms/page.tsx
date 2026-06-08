import type { Metadata } from 'next'
import ScanReveal from '@/components/ui/ScanReveal'

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Terms for Buena Onda.',
}

const sections = [
  {
    title: 'Availability',
    body: 'Catalog items, drops, and reservations remain subject to availability until Buena Onda confirms the transaction or reservation directly.',
  },
  {
    title: 'Orders and reservations',
    body: 'Submitting a reservation or checkout request does not guarantee acceptance. Buena Onda may decline or cancel a request if availability, pricing, or fulfillment information is inaccurate.',
  },
  {
    title: 'Editorial content',
    body: 'Culture, radio, and event archive materials are published for editorial and archival purposes. Availability of those materials may change over time.',
  },
  {
    title: 'Contact',
    body: 'Questions about orders, reservations, or site use can be sent through the contact page.',
  },
]

export default function TermsPage() {
  return (
    <>
      <div className="pt-32 pb-16 bg-warm-page">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label">Terms</span>
            <h1
              className="font-display text-near-black mt-2"
              style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)' }}
            >
              Terms
            </h1>
          </ScanReveal>
        </div>
      </div>

      <section className="py-16 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10 grid gap-8">
          {sections.map((section, index) => (
            <ScanReveal key={section.title} delay={index * 80}>
              <article className="border-t border-pale-stone pt-6">
                <h2 className="font-display text-near-black text-2xl">{section.title}</h2>
                <p className="text-charcoal text-sm leading-relaxed mt-3 max-w-3xl">{section.body}</p>
              </article>
            </ScanReveal>
          ))}
        </div>
      </section>
    </>
  )
}
