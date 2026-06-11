import Image from 'next/image'
import ScanReveal from './ScanReveal'

export interface ContactSheetImage {
  src:      string
  alt:      string
  frame?:   string  // e.g. "36A"
  date?:    string  // e.g. "2024-03"
  caption?: string
}

interface ContactSheetProps {
  images:   ContactSheetImage[]
  columns?: number
  className?: string
}

export default function ContactSheet({
  images,
  columns = 4,
  className = '',
}: ContactSheetProps) {
  return (
    <div
      className={`bg-[#1a1a1a] p-px ${className}`}
      style={{
        display:             'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap:                 '1px',
      }}
    >
      {images.map((img, i) => (
        <ScanReveal key={i} delay={i * 40} className="relative group">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#111] paper-hover cursor-pointer">
            {img.src ? (
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover transition-all duration-500 ease-analog"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#111]
                              flex items-center justify-center">
                <span className="archive-label text-[0.55rem] text-charcoal">
                  {img.frame ?? `F${String(i + 1).padStart(2, '0')}`}
                </span>
              </div>
            )}

            {/* Frame number overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent
                            p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <p className="archive-label text-[0.55rem] text-warm-sand/80">
                {img.frame ?? `F${String(i + 1).padStart(2, '0')}`}
                {img.date && ` · ${img.date}`}
              </p>
              {img.caption && (
                <p className="font-mono text-[0.6rem] text-stone-grey mt-0.5 truncate">
                  {img.caption}
                </p>
              )}
            </div>
          </div>
        </ScanReveal>
      ))}
    </div>
  )
}
