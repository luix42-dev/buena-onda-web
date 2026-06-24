'use client'

import { useEffect } from 'react'
import { trackGAEvent } from '@/lib/analytics/ga'

type Props = {
  itemId: string
  itemTitle: string
  itemSlug: string
}

export default function GAItemView({ itemId, itemTitle, itemSlug }: Props) {
  useEffect(() => {
    trackGAEvent('item_view', {
      item_id: itemId,
      item_name: itemTitle,
      item_slug: itemSlug,
    })
  }, [itemId, itemTitle, itemSlug])

  return null
}