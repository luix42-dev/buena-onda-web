type AvailabilityVariant = 'available' | 'reserved' | 'sold'
type EditorialVariant    = 'draft' | 'scheduled' | 'published'
export type StatusVariant = AvailabilityVariant | EditorialVariant

const CLASS: Record<StatusVariant, string> = {
  available: 'av',
  reserved:  're',
  sold:      'so',
  draft:     'draft',
  scheduled: 'sched',
  published: 'live',
}

const LABEL: Record<StatusVariant, string> = {
  available: 'Available',
  reserved:  'Reserved',
  sold:      'Sold',
  draft:     'Draft',
  scheduled: 'Scheduled',
  published: 'Live',
}

type Props = {
  variant:   StatusVariant
  label?:    string
  /** Inline removes absolute positioning so it can sit inside flex rows. */
  inline?:   boolean
  /** Use the row-pill (`.rpill`) styling for use inside list rows. */
  rowStyle?: boolean
}

export default function StatusPill({ variant, label, inline, rowStyle }: Props) {
  const cls = `${rowStyle ? 'rpill' : 'pill'} ${CLASS[variant]}${inline ? ' inline' : ''}`
  return (
    <span className={cls}>
      <span className="dot" />
      {label ?? LABEL[variant]}
    </span>
  )
}
