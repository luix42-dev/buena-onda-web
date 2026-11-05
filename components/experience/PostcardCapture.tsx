'use client'
import { useEffect, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'

export type PostcardCaptureRequest = { resolve: (blob: Blob) => void; reject: (error: Error) => void }
/** Consume exactly one requested frame after CruiseGlow's priority-1 render. */
export default function PostcardCapture({ requestRef }: { requestRef: MutableRefObject<PostcardCaptureRequest | null> }) {
  useFrame(({ gl }) => {
    const request = requestRef.current
    if (!request) return
    requestRef.current = null
    try {
      gl.domElement.toBlob(blob => blob ? request.resolve(blob) : request.reject(new Error('No scene image was available. Try again after the scenery appears.')), 'image/png')
    } catch { request.reject(new Error('The browser could not export this scene. Cross-origin image permissions may prevent capture; copying the link still works.')) }
  }, 2)
  useEffect(() => () => {
    if (requestRef.current) { requestRef.current.reject(new Error('The scenery closed before capture. Return to scenery and try again.')); requestRef.current = null }
  }, [requestRef])
  return null
}
