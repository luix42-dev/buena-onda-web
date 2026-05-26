import SectionHead from '@/components/studio/SectionHead'
import EmptyState from '@/components/studio/EmptyState'

export default function HomepageEditorPage() {
  return (
    <>
      <SectionHead
        title="Homepage"
        subtitle="What people see first"
      />
      <EmptyState
        title="Homepage editor lands in Phase 6."
        message="The five section cards (Hero, Pillars, Now Playing, Manifesto, Newsletter) are wired then."
      />
    </>
  )
}
