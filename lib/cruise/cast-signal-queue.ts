import type { MirrorMessage } from './mirror-protocol'

type Signal = { sender: string; message: MirrorMessage; attempts: number }
type Options = {
  ready: (sender: string) => boolean
  send: (sender: string, message: MirrorMessage) => void
  onFailure: (reason: string) => void
}

/** CAF may accept an offer before its outbound channel is ready. Keep signaling
 * ordered until READY/SENDER_CONNECTED, with bounded retries for send failures. */
export function createCastSignalQueue(options: Options) {
  const pending: Signal[] = [], retired = new Set<string>()
  let owner: { sender: string; id: string } | null = null
  let retry: ReturnType<typeof setTimeout> | undefined
  let disposed = false, flushing = false
  const key = (sender: string, id: string) => JSON.stringify([sender, id])
  const retire = (sender: string, id: string) => {
    retired.add(key(sender, id))
    if (retired.size > 64) retired.delete(retired.values().next().value!)
  }
  const remove = (matches: (signal: Signal) => boolean) => {
    for (let index = pending.length - 1; index >= 0; index--) if (matches(pending[index])) pending.splice(index, 1)
  }
  const failed = (signal: Signal, reason: string) => {
    retire(signal.sender, signal.message.id)
    remove(item => item.sender === signal.sender && item.message.id === signal.message.id)
    options.onFailure(reason)
  }
  const flush = () => {
    if (disposed || flushing || retry !== undefined) return
    flushing = true
    try {
      while (pending.length && !disposed) {
        const signal = pending[0]
        if (!options.ready(signal.sender)) return
        try {
          options.send(signal.sender, signal.message)
          pending.shift()
        } catch {
          if (++signal.attempts >= 4) {
            failed(signal, 'Google Cast could not deliver the live connection messages after four attempts.')
            continue
          }
          retry = setTimeout(() => { retry = undefined; flush() }, 150 * 2 ** (signal.attempts - 1))
          return
        }
      }
    } finally { flushing = false }
  }
  return {
    send(sender: string, message: MirrorMessage) {
      if (disposed || retired.has(key(sender, message.id))) return
      const starting = message.type === 'state' && message.state === 'connecting'
      if (!owner || (starting && (owner.sender !== sender || owner.id !== message.id))) {
        if (owner) retire(owner.sender, owner.id)
        owner = { sender, id: message.id }
        pending.length = 0
        clearTimeout(retry); retry = undefined
      }
      // A rejection sent to a second device must not replace the accepted owner.
      if ((owner.sender !== sender || owner.id !== message.id)
        && !(message.type === 'state' && message.state === 'error')) return
      const signal = { sender, message, attempts: 0 }
      if (pending.length >= 256) {
        failed(signal, 'Google Cast live connection message queue exceeded its limit.')
        return
      }
      pending.push(signal)
      flush()
    },
    flush,
    disconnect(sender: string) {
      for (const signal of pending) if (signal.sender === sender) retire(sender, signal.message.id)
      remove(signal => signal.sender === sender)
      if (owner?.sender === sender) { retire(sender, owner.id); owner = null }
      clearTimeout(retry); retry = undefined
      flush()
    },
    dispose() {
      disposed = true
      clearTimeout(retry); retry = undefined
      pending.length = 0; retired.clear(); owner = null
    },
  }
}
