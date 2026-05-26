import SectionHead from '@/components/studio/SectionHead'
import EmptyState from '@/components/studio/EmptyState'

export default function PlayerPage() {
  return (
    <>
      <SectionHead
        title="The Player"
        subtitle="Background music for the store — the ON AIR bar"
        actionLabel="+ Upload track"
      />
      <EmptyState
        title="No rotation yet."
        message="Phase 3 adds player_tracks and the R2 upload pipeline."
      />
    </>
  )
}
