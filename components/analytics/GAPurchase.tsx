'use client'

import { useEffect } from 'react'
import { trackGAEvent } from '@/lib/analytics/ga'

type Props = {
  sessionId?: string
}

export default function GAPurchase({ sessionId }: Props) {
  useEffect(() => {
    trackGAEvent('purchase', {
      transaction_id: sessionId,
    })
  }, [sessionId])

  return null
}