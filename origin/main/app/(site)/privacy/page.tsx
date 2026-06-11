import type { Metadata } from 'next'
import ScanReveal from '@/components/ui/ScanReveal'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'Privacy information for Buena Onda.',
}

const sections = [
  {
    title: 'What we collect',
    body: 'We collect the information you submit through contact, reservation, and newsletter forms, along with order details required to fulfill purchases.',
  },
  {
    title: 'How we use it',
    body: 'We use that information to reply to inquiries, manage reservations, send newsletter updates you requested, and complete transactions.',
  },
  {
    title: 'Third parties',
    body: 'Payments are handled by Stripe. Email delivery may be handled by Resend. Data storage is handled through Supabase and related infrastructure providers.',
  },
  {
    title: 'Your choices',
    body: 'You can contact Buena Onda to request removal from the newsletter or to ask about personal data associated with a submitted inquiry or reservation.',
  },
]

export default function PrivacyPage() {
  return (
    <>
      <div className="pt-32 pb-16 bg-warm-page">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label">Privacy</span>
            <h1
              className="font-display text-near-black mt-2"
              style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)' }}
            >
              Privacy
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
