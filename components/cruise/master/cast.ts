'use client'
/**
 * Cast to TV.
 *  - Chrome / Android Chrome: Presentation API. The TV (Chromecast or any presentation display)
 *    loads the lean-back URL; this tab stays connected as the remote (stations, play, camera).
 *  - Safari / iOS: AirPlay screen mirroring of the lean-back page (no web API can start it).
 *  - Smart-TV browsers: open the short URL or scan the QR on the TV page.
 */
import type { StreetCamera } from './DriveController'

export type RemoteMessage =
  | { type: 'station'; id: string }
  | { type: 'toggle' }
  | { type: 'volume'; value: number }
  | { type: 'camera'; mode: StreetCamera | 'auto' }
  | { type: 'time'; value: 'day' | 'sunset' | 'night' }
  | { type: 'state'; station: string; playing: boolean; track: string; camera: string }

type Connection = { state: string; send(data: string): void; terminate(): void; close(): void; addEventListener(type: 'message' | 'close' | 'terminate' | 'connect', fn: (e: { data?: string }) => void): void }
type PresentationRequestCtor = new (urls: string[]) => { start(): Promise<Connection>; getAvailability?(): Promise<{ value: boolean; onchange: (() => void) | null }> }
type Receiver = { connectionList: Promise<{ connections: Connection[]; onconnectionavailable: ((e: { connection: Connection }) => void) | null }> }

const w = () => (typeof window === 'undefined' ? undefined : (window as unknown as { PresentationRequest?: PresentationRequestCtor; navigator: Navigator & { presentation?: { receiver?: Receiver } } }))

export const canPresent = () => !!w()?.PresentationRequest
export const isAppleDevice = () => typeof navigator !== 'undefined' && /iPhone|iPad|Macintosh/.test(navigator.userAgent) && !/Chrome|CriOS|Android/.test(navigator.userAgent)
export const isPresentationReceiver = () => !!w()?.navigator.presentation?.receiver

export function tvUrl(origin = typeof location === 'undefined' ? '' : location.origin) {
  return `${origin}/cruise/miami-test?tv=1`
}

export async function startCast(url: string, onMessage: (m: RemoteMessage) => void, onClose: () => void) {
  const Ctor = w()?.PresentationRequest; if (!Ctor) return null
  const connection = await new Ctor([url]).start()
  connection.addEventListener('message', e => { try { onMessage(JSON.parse(String(e.data))) } catch { /* ignore malformed */ } })
  connection.addEventListener('close', onClose); connection.addEventListener('terminate', onClose)
  return {
    send: (m: RemoteMessage) => { if (connection.state === 'connected') connection.send(JSON.stringify(m)) },
    stop: () => connection.terminate(),
  }
}

/** On the TV side: accept remotes, return a broadcaster for state updates. */
export function listenAsReceiver(onMessage: (m: RemoteMessage) => void) {
  const receiver = w()?.navigator.presentation?.receiver
  const connections = new Set<Connection>()
  if (receiver) void receiver.connectionList.then(list => {
    const add = (c: Connection) => { connections.add(c); c.addEventListener('message', e => { try { onMessage(JSON.parse(String(e.data))) } catch { /* ignore */ } }); c.addEventListener('close', () => connections.delete(c)) }
    list.connections.forEach(add); list.onconnectionavailable = e => add(e.connection)
  })
  return { broadcast: (m: RemoteMessage) => connections.forEach(c => { if (c.state === 'connected') c.send(JSON.stringify(m)) }) }
}
