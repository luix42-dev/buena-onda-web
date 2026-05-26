import SectionHead from '@/components/studio/SectionHead'
import EmptyState from '@/components/studio/EmptyState'

export default function TransmissionPage() {
  return (
    <>
      <SectionHead
        title="The Transmission"
        subtitle="Slow mail, worth reading"
        actionLabel="+ Compose"
      />
      <EmptyState
        title="No issues yet."
        message="Phase 5 adds the transmission_issues table and editor."
      />
    </>
  )
}
