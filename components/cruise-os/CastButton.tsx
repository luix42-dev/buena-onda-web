'use client'

import { useState } from 'react'
import { Cast } from 'lucide-react'
import ScreenMirrorHelp from '@/components/experience/ScreenMirrorHelp'

/** Mirror the source device. Never launch a second drive or transfer its audio. */
export default function CastButton() {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className="dd-icon" aria-label="Mirror Cruise to your TV"
      title="Mirror Cruise to your TV" aria-haspopup="dialog" aria-expanded={open}
      onClick={() => setOpen(true)}><Cast size={20} /></button>
    <ScreenMirrorHelp open={open} onClose={() => setOpen(false)} />
  </>
}
