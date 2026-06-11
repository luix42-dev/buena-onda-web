'use client'

type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  variant: 'status' | 'pub'
  options: Option<T>[]
  value:   T
  onChange: (v: T) => void
}

export default function SegmentedControl<T extends string>({
  variant,
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <div className={`seg ${variant}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-v={opt.value}
          className={value === opt.value ? 'on' : ''}
          onClick={() => onChange(opt.value)}
        >
          <span className="sd" />
          {opt.label}
        </button>
      ))}
    </div>
  )
}
