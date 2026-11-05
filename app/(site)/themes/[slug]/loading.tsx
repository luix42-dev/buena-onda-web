// Instant feedback while a catalog theme streams in.
export default function ThemeLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading theme…</span>
      <div className="pt-28 pb-10 bg-warm-page border-b border-black/5">
        <div className="max-w-site mx-auto px-5 md:px-10">
          <div className="mb-8 h-3 w-40 bg-black/[0.06] animate-pulse" />
          <div className="h-3 w-32 bg-black/[0.06] animate-pulse mb-6" />
          <div className="h-20 md:h-28 w-3/4 md:w-1/2 bg-black/[0.06] animate-pulse" />
        </div>
      </div>
      <section className="py-24 bg-cream">
        <div className="max-w-site mx-auto px-5 md:px-10">
          {[0, 1].map(i => (
            <div key={i} className="grid md:grid-cols-[180px_1fr] gap-8 lg:gap-16 py-10 border-t border-pale-stone">
              <div className="aspect-[3/4] bg-black/[0.06] animate-pulse" />
              <div className="flex flex-col gap-5 py-2">
                <div className="h-8 w-3/4 bg-black/[0.06] animate-pulse" />
                <div className="h-4 w-full max-w-md bg-black/[0.06] animate-pulse" />
                <div className="h-4 w-2/3 max-w-md bg-black/[0.06] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
