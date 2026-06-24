import FooterNewsletter from './layout/FooterNewsletter'

type Props = {
  source: string
}

export default function SubscribeBlock({ source }: Props) {
  return (
    <div style={{ background: '#0E0E0E', color: '#F8F7F3', padding: '80px 32px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <p
          className="font-mono"
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: '#E8176A',
            marginBottom: 18,
          }}
        >
          The Transmission
        </p>

        <FooterNewsletter variant="transmission" source={source} />
      </div>
    </div>
  )
}
