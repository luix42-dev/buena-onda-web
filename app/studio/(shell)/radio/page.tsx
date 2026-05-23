import SectionHead from '@/components/studio/SectionHead'
import EmptyState from '@/components/studio/EmptyState'

export default function RadioPage() {
  return (
    <>
      <SectionHead
        title="The Archive"
        subtitle="Curated mixes, sessions, field recordings"
        actionLabel="+ Upload episode"
      />
      <EmptyState
        title="No episodes wired in yet."
        message="Phase 4 connects the existing episodes table to this view."
      />
    </>
  )
}
