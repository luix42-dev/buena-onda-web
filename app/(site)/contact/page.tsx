import type { Metadata } from 'next'
import ScanReveal from '@/components/ui/ScanReveal'
import ContactForm from '@/components/ui/ContactForm'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Buena Onda — for inquiries, bookings, press, and collaboration.',
}

export default function ContactPage() {
  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="pt-32 pb-16 bg-warm-page">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <ScanReveal>
            <span className="section-label">Contact</span>
            <h1
              className="font-display text-near-black mt-2"
              style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)' }}
            >
              Say hello.
            </h1>
          </ScanReveal>
        </div>
      </div>

      <section className="py-20 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <div className="grid md:grid-cols-2 gap-16">

            {/* Left: Info */}
            <ScanReveal>
              <div className="flex flex-col gap-10">
                <p className="text-charcoal leading-relaxed text-base max-w-prose">
                  For general inquiries, collaboration proposals, object drops,
                  and radio bookings. We read everything. We reply slowly, but we reply.
                </p>

                <div className="flex flex-col gap-6">
                  {[
                    { label: 'General',          value: 'hello@buenaonda.com', href: 'mailto:hello@buenaonda.com' },
                    { label: 'Press & Media',    value: 'press@buenaonda.com', href: 'mailto:press@buenaonda.com' },
                    { label: 'Radio & Bookings', value: 'radio@buenaonda.com', href: 'mailto:radio@buenaonda.com' },
                  ].map(({ label, value, href }) => (
                    <div key={label} className="border-b border-pale-stone pb-5">
                      <p className="archive-label text-[0.6rem] mb-1">{label}</p>
                      <a
                        href={href}
                        className="font-mono text-sm text-teal hover:text-neon-pink transition-colors"
                      >
                        {value}
                      </a>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="archive-label text-[0.6rem] mb-3">Find us</p>
                  <p className="font-mono text-sm text-charcoal">
                    Miami, FL — Wynwood &amp; Little Havana
                  </p>
                  <div className="flex gap-5 mt-5">
                    {[
                      { label: 'Instagram', href: 'https://instagram.com/buenaondalifestyle' },
                      { label: 'Mixcloud',  href: '#' },
                      { label: 'SoundCloud', href: '#' },
                    ].map(({ label, href }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs tracking-wider uppercase text-stone-grey
                                   hover:text-teal transition-colors"
                      >
                        {label} ↗
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </ScanReveal>

            {/* Right: Form (Client Component) */}
            <ScanReveal delay={150}>
              <ContactForm />
            </ScanReveal>
          </div>
        </div>
      </section>
    </>
  )
}
