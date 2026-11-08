'use client'

type Layer = {
  canvas: HTMLCanvasElement; frame: HTMLIFrameElement | null
  stream: MediaStream; video: HTMLVideoElement; createdAt: number; closed: boolean
}

export function televisionViewport(phoneWidth: number, phoneHeight: number) {
  const width = Math.max(phoneWidth, phoneHeight * 16 / 9), height = width * 9 / 16
  return { width, height, left: (phoneWidth - width) / 2, top: (phoneHeight - height) / 2 }
}

export function mirrorVideoSize(viewWidth: number, viewHeight: number, pixelRatio = 1) {
  const portrait = viewHeight > viewWidth
  const scale = Math.min(Math.max(1, Math.min(2, pixelRatio)), (portrait ? 720 : 1280) / Math.max(1, viewWidth), (portrait ? 1280 : 720) / Math.max(1, viewHeight))
  return { scale, width: Math.max(2, Math.floor(viewWidth * scale / 2) * 2), height: Math.max(2, Math.floor(viewHeight * scale / 2) * 2) }
}

function visible(node: Element) {
  for (let current: Element | null = node; current; current = current.parentElement) {
    const style = current.ownerDocument.defaultView?.getComputedStyle(current)
    if (!style) return false
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
  }
  const box = node.getBoundingClientRect()
  return box.width > 1 && box.height > 1
}

/** Capture actual render surfaces, including the City iframe + transparent cockpit. */
export function createMirrorVideo(listeningCard: () => { station: string; track: string } | null = () => null) {
  const output = document.createElement('canvas')
  const context = output.getContext('2d', { alpha: false })
  if (!context || typeof output.captureStream !== 'function') throw new Error('Live casting is not supported by this browser.')
  output.width = 1280; output.height = 720
  const stream = output.captureStream(30)
  if (!stream.getVideoTracks().length) throw new Error('This browser could not share the Cruise picture.')
  const layers = new Map<HTMLCanvasElement, Layer>()
  let disposed = false, animation = 0, lastFrame = 0, lastScan = -Infinity
  let sceneMissingSince: number | null = null, cityMissingSince: number | null = null
  let cityExpected = false
  let ordered: Layer[] = []
  const closeLayer = (layer: Layer) => {
    layer.closed = true
    layer.video.pause(); layer.video.srcObject = null
    layer.stream.getTracks().forEach(track => track.stop())
  }
  const dispose = () => {
    if (disposed) return
    disposed = true; cancelAnimationFrame(animation)
    layers.forEach(closeLayer); layers.clear(); ordered = []
    stream.getTracks().forEach(track => track.stop())
  }
  const fail = (message: string) => {
    if (disposed) return
    dispose()
    window.dispatchEvent(new CustomEvent('cruise:mirror-video-error', { detail: { message } }))
  }
  const scan = () => {
    const surfaces: { canvas: HTMLCanvasElement; frame: HTMLIFrameElement | null }[] = []
    cityExpected = false
    // The City renderer is a same-origin embedded surface beneath the cockpit.
    for (const frame of document.querySelectorAll<HTMLIFrameElement>('.ocean-drive-game iframe')) {
      if (!visible(frame)) continue
      cityExpected = true
      try {
        for (const canvas of frame.contentDocument?.querySelectorAll<HTMLCanvasElement>('canvas') || []) {
          if (visible(canvas)) surfaces.push({ canvas, frame })
        }
        if (!frame.contentDocument && frame.contentWindow?.location.origin !== location.origin) {
          throw new Error('The City picture is not available to Cruise.')
        }
      } catch { throw new Error('The City picture cannot be shared. Reload Cruise and try casting again.') }
    }
    for (const canvas of document.querySelectorAll<HTMLCanvasElement>('.jn-world canvas')) {
      if (visible(canvas)) surfaces.push({ canvas, frame: null })
    }
    const keep = new Set(surfaces.map(item => item.canvas))
    for (const [canvas, layer] of layers) if (!keep.has(canvas)) { closeLayer(layer); layers.delete(canvas) }
    ordered = surfaces.map(({ canvas, frame }) => {
      const existing = layers.get(canvas)
      if (existing) return existing
      let captured: MediaStream | null = null
      try {
        captured = canvas.captureStream(30)
        if (!captured.getVideoTracks().length) throw new Error('No video track')
        const video = document.createElement('video')
        video.muted = true; video.playsInline = true; video.srcObject = captured
        const layer = { canvas, frame, stream: captured, video, createdAt: performance.now(), closed: false }
        layers.set(canvas, layer)
        void video.play().catch(() => {
          if (!layer.closed) fail('Cruise could not start sharing this view. Tap Cast to try again.')
        })
        return layer
      } catch {
        captured?.getTracks().forEach(track => track.stop())
        throw new Error('This Cruise view cannot be shared. Reload Cruise and try casting again.')
      }
    })
  }
  const draw = (now: number) => {
    if (disposed) return
    animation = requestAnimationFrame(draw)
    const elapsed = now - lastFrame, interval = 1000 / 30
    if (elapsed + .1 < interval) return
    // Carry fractional frame time; resetting to now can reduce 60 Hz to 20 fps.
    lastFrame += Math.max(1, Math.floor((elapsed + .1) / interval)) * interval
    try {
      if (now - lastScan > 250) { lastScan = now; scan() }
      // Mobile layout/visual viewport dimensions can differ during rotation or
      // embedded City resize. Map the actual wide surface, not the phone viewport.
      const primary = ordered.find(layer => layer.frame)?.frame || ordered[0]?.canvas
      const bounds = primary?.getBoundingClientRect()
      const capture = bounds && bounds.width > 1 && bounds.height > 1 ? bounds : televisionViewport(innerWidth, innerHeight)
      const width = 1280, height = 720, scale = width / capture.width
      context.fillStyle = '#10191c'; context.fillRect(0, 0, width, height)
      const listening = listeningCard()
      if (listening) {
        sceneMissingSince = null; cityMissingSince = null
        context.textAlign = 'center'
        context.fillStyle = '#d4a674'; context.font = `${Math.max(14, width * .024)}px sans-serif`
        context.fillText('BUENA ONDA CRUISE / RADIO', width / 2, height * .38, width * .84)
        context.fillStyle = '#eee5d3'; context.font = `${Math.max(26, width * .06)}px Georgia, serif`
        context.fillText(listening.station, width / 2, height * .5, width * .84)
        context.fillStyle = '#c8c4b9'; context.font = `${Math.max(16, width * .026)}px sans-serif`
        context.fillText(listening.track || 'Take the long way to good music.', width / 2, height * .59, width * .84)
        return
      }
      let drawn = 0, cityDrawn = false
      for (const layer of ordered) {
        const track = layer.stream.getVideoTracks()[0]
        if (layer.video.readyState < 2 || !layer.video.videoWidth || track?.readyState !== 'live' || track.muted) {
          if (now - layer.createdAt > 12000) { fail('The Cruise picture stopped sharing. Keep the drive open and tap Cast again.'); return }
          continue
        }
        // captureStream -> video retains the source alpha. Only the final output
        // is opaque, so the City remains visible through the cockpit windows.
        const box = layer.canvas.getBoundingClientRect(), parent = layer.frame?.getBoundingClientRect()
        const sx = parent ? parent.width / (layer.frame?.contentWindow?.innerWidth || parent.width) : 1
        const sy = parent ? parent.height / (layer.frame?.contentWindow?.innerHeight || parent.height) : 1
        context.save()
        if (parent) { context.beginPath(); context.rect((parent.left - capture.left) * scale, (parent.top - capture.top) * scale, parent.width * scale, parent.height * scale); context.clip() }
        context.drawImage(layer.video, ((parent?.left || 0) + box.left * sx - capture.left) * scale,
          ((parent?.top || 0) + box.top * sy - capture.top) * scale, box.width * sx * scale, box.height * sy * scale)
        context.restore()
        drawn++
        if (layer.frame) cityDrawn = true
        layer.createdAt = now
      }
      if (drawn) sceneMissingSince = null
      else sceneMissingSince ??= now
      if (!cityExpected || cityDrawn) cityMissingSince = null
      else cityMissingSince ??= now
      if (sceneMissingSince !== null && now - sceneMissingSince > 12000) fail('Open the Cruise scenery on your phone, then tap Cast again.')
      else if (cityMissingSince !== null && now - cityMissingSince > 15000) fail('The City picture is still loading. Wait for the drive to appear, then cast again.')
    } catch (error) {
      fail(error instanceof Error ? error.message : 'The Cruise picture could not be shared. Tap Cast to try again.')
    }
  }
  try { scan(); animation = requestAnimationFrame(draw) }
  catch (error) { dispose(); throw error }
  return { stream, dispose }
}
