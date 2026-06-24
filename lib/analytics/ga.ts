import { sendGAEvent } from '@next/third-parties/google'

type GAParams = Record<string, string | number | boolean | null | undefined>

export function trackGAEvent(eventName: string, params: GAParams = {}) {
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return
  sendGAEvent('event', eventName, params)
}