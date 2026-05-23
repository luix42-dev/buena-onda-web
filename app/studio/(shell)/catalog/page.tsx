import SectionHead from '@/components/studio/SectionHead'
import EmptyState from '@/components/studio/EmptyState'

export default function CatalogPage() {
  return (
    <>
      <SectionHead
        title="The Catalog"
        subtitle="Every piece in the house"
        actionLabel="+ New piece"
      />
      <EmptyState
        title="The catalog is empty."
        message="Phase 2 wires this view to the items table."
      />
    </>
  )
}
