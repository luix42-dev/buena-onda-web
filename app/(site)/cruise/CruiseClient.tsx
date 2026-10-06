'use client'

import CruiseExperience from '@/components/cruise/LaunchExperience'
import type { CruiseCampaign } from '@/lib/cruise/types'

export default function CruiseClient({ campaign, campaignValid }: { campaign: CruiseCampaign; campaignValid: boolean }) {
  return <CruiseExperience campaign={campaign} campaignValid={campaignValid} />
}
