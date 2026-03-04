'use client'

export default function FilmGrain() {
  return (
    <>
      {/* Static SVG grain overlay — zero JS on scroll */}
      <div
        aria-hidden="true"
        className="grain-overlay"
        style={{ userSelect: 'none' }}
      />
    </>
  )
}
