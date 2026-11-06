'use client'
import { useEffect, useRef } from 'react'
import { CAST_NAMESPACE, receiverCastStations, type CastCommand } from '@/lib/cruise/google-cast'
import { createCastReceiverController, type ReceiverValue } from '@/lib/cruise/cast-receiver-state'

export function useCastReceiver(value: ReceiverValue) {
  const current = useRef(value)
  current.current = value
  useEffect(() => {
    if (new URLSearchParams(location.search).get('receiver') !== '1' || parent === window) return
    const controller = createCastReceiverController(() => current.current, receiverCastStations)
    const message = (event: MessageEvent) => {
      if (event.source !== parent || event.origin !== location.origin || event.data?.channel !== CAST_NAMESPACE) return
      controller.receive(event.data.command as CastCommand)
    }
    const report = () => parent.postMessage({ channel: CAST_NAMESPACE, state: controller.tick() }, location.origin)
    addEventListener('message', message)
    report()
    const timer = setInterval(report, 250)
    return () => { removeEventListener('message', message); clearInterval(timer) }
  }, [])
}
