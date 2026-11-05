'use client'

import { useEffect, useRef, useState } from 'react'
import { pressedEdges } from '@/lib/cruise-os/input'

type Inputs = { enabled: boolean; onGlovebox: () => void; onRadio: () => void; onCamera: () => void }
type Status = 'Controller navigation off' | 'Connect a standard controller' | 'Standard controller connected' | 'Unsupported controller mapping'
const FOCUSABLE = 'button,a[href],input:not([type="hidden"]),select,textarea,summary,[tabindex]'

function visibleEnabled(element: HTMLElement): boolean {
  if (element.tabIndex < 0 || element.matches(':disabled,[aria-disabled="true"]') || element.closest('[inert],[hidden],[aria-hidden="true"]')) return false
  const style = getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse' && element.getClientRects().length > 0
}
function focusTargets(dialog: HTMLDialogElement | null): HTMLElement[] {
  const targets = dialog
    ? [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
    : [...document.querySelectorAll<HTMLElement>(`.os-world-tools :is(${FOCUSABLE}),.os-radio-deck :is(${FOCUSABLE})`)]
  return targets.filter(visibleEnabled)
}

/** Optional standard-mapped menu input only; never controls the car or stores IDs. */
export function useCruiseGamepad({ enabled, onGlovebox, onRadio, onCamera }: Inputs): string {
  const latest = useRef({ onGlovebox, onRadio, onCamera }); latest.current = { onGlovebox, onRadio, onCamera }
  const [status, setStatus] = useState<Status>('Controller navigation off')
  useEffect(() => {
    if (!enabled) { setStatus('Controller navigation off'); return }
    let frame: number | null = null, disposed = false, identity: string | null = null
    let previous: boolean[] = [], currentStatus: Status = 'Connect a standard controller'
    const report = (next: Status) => { if (next !== currentStatus) { currentStatus = next; setStatus(next) } }
    setStatus(currentStatus)
    const baseline = () => { identity = null; previous = [] }
    const tick = () => {
      frame = null
      if (disposed || document.hidden) return
      let pads: Gamepad[] = []
      try { pads = Array.from(navigator.getGamepads?.() || []).filter((pad): pad is Gamepad => !!pad && pad.connected) } catch { /* No permission or API: leave native inputs available. */ }
      const pad = pads.find(item => item.mapping === 'standard')
      if (!pad) {
        report(pads.length ? 'Unsupported controller mapping' : 'Connect a standard controller'); baseline()
      } else {
        report('Standard controller connected')
        const nextIdentity = `${pad.index}:${pad.id}`, pressed = pad.buttons.map(button => button.pressed)
        if (identity !== nextIdentity) {
          // Connecting, reconnecting and visibility restoration never activate held buttons.
          identity = nextIdentity; previous = pressed
        } else {
          const edges = pressedEdges(pressed, previous); previous = pressed
          const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')
          if (edges.includes(1) && dialog) {
            const event = new Event('cancel', { cancelable: true })
            if (dialog.dispatchEvent(event)) dialog.close()
          } else if (edges.includes(12) || edges.includes(13)) {
            const targets = focusTargets(dialog), index = targets.indexOf(document.activeElement as HTMLElement)
            if (targets.length) {
              const direction = edges.includes(12) ? -1 : 1
              const next = index < 0 ? (direction > 0 ? 0 : targets.length - 1) : (index + direction + targets.length) % targets.length
              targets[next].focus({ preventScroll: false })
            }
          } else if (edges.includes(0)) {
            const focused = document.activeElement
            if (focused instanceof HTMLElement && focusTargets(dialog).includes(focused)) {
              if (focused.matches('button,a[href],summary,input[type="checkbox"],input[type="radio"]')) focused.click()
              else focused.focus() // Native selects/ranges keep their native interaction; no fake picker or input events.
            }
          } else if (!dialog) {
            if (edges.includes(9)) latest.current.onGlovebox()
            else if (edges.includes(2)) latest.current.onRadio()
            else if (edges.includes(3)) latest.current.onCamera()
          }
        }
      }
      if (!disposed && !document.hidden) frame = requestAnimationFrame(tick)
    }
    const stop = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; baseline() }
    const visible = () => { stop(); if (!document.hidden && !disposed) frame = requestAnimationFrame(tick) }
    const connection = () => { baseline(); if (frame === null && !document.hidden && !disposed) frame = requestAnimationFrame(tick) }
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('gamepadconnected', connection)
    window.addEventListener('gamepaddisconnected', connection)
    if (!document.hidden) frame = requestAnimationFrame(tick)
    return () => {
      disposed = true; stop()
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('gamepadconnected', connection)
      window.removeEventListener('gamepaddisconnected', connection)
    }
  }, [enabled])
  return enabled ? status : 'Controller navigation off'
}
