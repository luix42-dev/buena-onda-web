'use client'

import dynamic from 'next/dynamic'

const Street = dynamic(() => import('@/components/cruise/master/MiamiStreet'), { ssr: false })

export default function StreetClient({ previewAuthorized }: { previewAuthorized: boolean }) {
  return <Street previewAuthorized={previewAuthorized} />
}
