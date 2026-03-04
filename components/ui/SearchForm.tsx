'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef } from 'react'

interface SearchFormProps {
  defaultValue?: string
}

export default function SearchForm({ defaultValue = '' }: SearchFormProps) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const inputRef     = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = inputRef.current?.value?.trim() ?? ''
    const themeParam = searchParams.get('theme')
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (themeParam) params.set('theme', themeParam)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-0" role="search">
      <input
        ref={inputRef}
        type="search"
        defaultValue={defaultValue}
        placeholder="Search objects, tags, themes..."
        aria-label="Search catalog"
        className="flex-1 border border-pale-stone border-r-0 bg-transparent px-4 py-3
                   font-mono text-sm text-near-black placeholder:text-stone-grey
                   focus:border-warm-sand focus:outline-none transition-colors"
      />
      <button
        type="submit"
        className="px-5 py-3 bg-near-black text-linen-peach font-mono text-xs
                   tracking-[0.15em] uppercase hover:bg-burnished transition-colors
                   border border-near-black"
      >
        Search
      </button>
    </form>
  )
}
