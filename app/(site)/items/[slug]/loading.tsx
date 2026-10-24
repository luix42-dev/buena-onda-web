// Shown instantly on click while the item page streams in, and prefetched with
// the catalog links, so a tap always gets immediate visual feedback.
export default function ItemLoading() {
  return (
    <div className="pt-32 pb-32 bg-cream" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading object…</span>
      <div className="max-w-site mx-auto px-5 md:px-10">
        <div className="mb-16 h-3 w-48 bg-black/[0.06] animate-pulse" />
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-16 lg:gap-24 items-start">
          <div className="aspect-square w-full bg-black/[0.06] animate-pulse" />
          <div className="flex flex-col gap-5">
            <div className="h-3 w-28 bg-black/[0.06] animate-pulse" />
            <div className="h-10 w-4/5 bg-black/[0.06] animate-pulse" />
            <div className="h-10 w-3/5 bg-black/[0.06] animate-pulse" />
            <div className="h-5 w-24 bg-black/[0.06] animate-pulse mt-2" />
            <div className="h-12 w-56 bg-black/[0.06] animate-pulse mt-4" />
            <div className="h-px w-full bg-pale-stone mt-6" />
            <div className="h-4 w-full bg-black/[0.06] animate-pulse" />
            <div className="h-4 w-11/12 bg-black/[0.06] animate-pulse" />
            <div className="h-4 w-3/4 bg-black/[0.06] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
