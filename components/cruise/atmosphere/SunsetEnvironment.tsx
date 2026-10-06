'use client'

import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

const SUNSET_HDR_URL = '/cruise/environment/sky/belfast-sunset-1k.hdr'

type CachedEnvironment = {
  source: THREE.DataTexture
  target: THREE.WebGLRenderTarget
}

export type SunsetEnvironmentProps = {
  enabled: boolean
  onReady: (ready: boolean) => void
  rotation?: number
}

export default function SunsetEnvironment({
  enabled,
  onReady,
  rotation = 0,
}: SunsetEnvironmentProps) {
  const { gl, scene } = useThree()
  const [cached, setCached] = useState<CachedEnvironment | null>(null)
  const cachedRef = useRef<CachedEnvironment | null>(null)
  const restoreOwnershipRef = useRef<(() => void) | null>(null)
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    let active = true
    onReadyRef.current(false)

    void new RGBELoader().loadAsync(SUNSET_HDR_URL).then(source => {
      if (!active) {
        source.dispose()
        return
      }

      source.mapping = THREE.EquirectangularReflectionMapping
      const generator = new THREE.PMREMGenerator(gl)
      let target: THREE.WebGLRenderTarget | null = null
      try {
        generator.compileEquirectangularShader()
        target = generator.fromEquirectangular(source)
      } catch (error) {
        source.dispose()
        throw error
      } finally {
        generator.dispose()
      }

      if (!target) {
        source.dispose()
        onReadyRef.current(false)
        return
      }
      target.texture.name = 'cruise-sunset-pmrem'
      if (!active) {
        target.dispose()
        source.dispose()
        return
      }

      const resources = { source, target }
      cachedRef.current = resources
      setCached(resources)
    }).catch(() => {
      if (active) onReadyRef.current(false)
    })

    return () => {
      active = false
      restoreOwnershipRef.current?.()
      restoreOwnershipRef.current = null
      cachedRef.current?.target.dispose()
      cachedRef.current?.source.dispose()
      cachedRef.current = null
    }
  }, [gl])

  // Run after the earlier fallback EnvironmentMap effect when switching back to sunset.
  useEffect(() => {
    if (!enabled || !cached) {
      onReadyRef.current(false)
      return
    }

    const previousBackground = scene.background
    const previousEnvironment = scene.environment
    const previousBackgroundRotation = scene.backgroundRotation.clone()
    const previousEnvironmentRotation = scene.environmentRotation.clone()
    const previousBackgroundIntensity = scene.backgroundIntensity

    scene.background = cached.source
    scene.environment = cached.target.texture
    scene.backgroundRotation.set(0, rotation, 0)
    scene.environmentRotation.set(0, rotation, 0)
    scene.backgroundIntensity = 0.3

    let restored = false
    const restore = () => {
      if (restored) return
      restored = true
      if (scene.background === cached.source) {
        scene.background = previousBackground
        scene.backgroundRotation.copy(previousBackgroundRotation)
        scene.backgroundIntensity = previousBackgroundIntensity
      }
      if (scene.environment === cached.target.texture) {
        scene.environment = previousEnvironment
        scene.environmentRotation.copy(previousEnvironmentRotation)
      }
    }
    restoreOwnershipRef.current = restore
    onReadyRef.current(true)

    return () => {
      restore()
      if (restoreOwnershipRef.current === restore) restoreOwnershipRef.current = null
      onReadyRef.current(false)
    }
  }, [cached, enabled, rotation, scene])

  return null
}
