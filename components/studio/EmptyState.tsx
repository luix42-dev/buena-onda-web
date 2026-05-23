type Props = {
  title?:   string
  message?: string
  icon?:    string
}

export default function EmptyState({
  title   = 'Nothing here yet.',
  message = 'When there is something to show, it lands here.',
  icon    = '◌',
}: Props) {
  return (
    <div className="empty">
      <div className="em-ic">{icon}</div>
      <div className="em-t">{title}</div>
      <div className="em-s">{message}</div>
    </div>
  )
}
