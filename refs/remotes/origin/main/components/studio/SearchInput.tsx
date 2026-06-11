'use client'

type Props = {
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
}

export default function SearchInput({ value, onChange, placeholder = 'Search…' }: Props) {
  return (
    <div className="search">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4-4" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
