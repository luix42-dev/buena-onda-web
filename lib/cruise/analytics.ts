import type { CruiseAnalyticsEventName, CruiseAnalyticsPayload } from './types'

type Gtag = (command: 'event', name: string, payload: CruiseAnalyticsPayload) => void

declare global {
  interface Window {
    gtag?: Gtag
    __cruiseAnalytics?: Array<{ name: CruiseAnalyticsEventName; payload: CruiseAnalyticsPayload }>
  }
}

export function trackCruiseEvent(name: CruiseAnalyticsEventName, payload: CruiseAnalyticsPayload = {}) {
  if (typeof window === 'undefined') return
  window.__cruiseAnalytics ??= []
  window.__cruiseAnalytics.push({ name, payload })
  if (window.__cruiseAnalytics.length > 100) window.__cruiseAnalytics.shift()

  if (typeof window.gtag === 'function') {
    window.gtag('event', name, payload)
  } else if (process.env.NODE_ENV === 'development') {
    console.info('[cruise analytics]', name, payload)
  }
}
