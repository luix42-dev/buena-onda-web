import SectionHead from '@/components/studio/SectionHead'
import EmptyState from '@/components/studio/EmptyState'

export default function CulturePage() {
  return (
    <>
      <SectionHead
        title="Culture"
        subtitle="Essays from the analog world"
        actionLabel="+ New essay"
      />
      <EmptyState
        title="No essays wired in yet."
        message="Phase 5 connects the posts table to this view."
      />
    </>
  )
}
