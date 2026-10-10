'use client'
import { useMemo } from 'react'
import qrcode from '@/lib/vendor/qrcode-generator.js'

/** Crisp SVG QR code. Dark modules on cream so TVs and phone cameras read it easily. */
export default function QrCode({ value, size = 128, label }: { value: string; size?: number; label?: string }) {
  const path = useMemo(() => {
    const q = qrcode(0, 'M'); q.addData(value); q.make()
    const n = q.getModuleCount(); let d = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`
    return { d, n: n + 4 }
  }, [value])
  return <svg role="img" aria-label={label ?? `QR code for ${value}`} width={size} height={size} viewBox={`0 0 ${path.n} ${path.n}`} shapeRendering="crispEdges">
    <rect width={path.n} height={path.n} fill="#fbf3e2" /><path d={path.d} fill="#141020" />
  </svg>
}
