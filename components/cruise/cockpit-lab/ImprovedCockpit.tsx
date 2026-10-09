'use client'

import { RoundedBox } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { Group, Material, Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from 'three'
import { HERO_X } from '@/lib/cruise/constants'
import RetroJeep from '../vehicle/RetroJeep'
import type { HeroCarProps } from '../vehicle/HeroCar'

/** Local technical-art variant. Original car, radio and cached textures stay intact. */
type Props = Pick<HeroCarProps, 'runtime'> & Partial<Omit<HeroCarProps, 'runtime'>> & { improved: boolean }

export default function ImprovedCockpit({ improved, quality = 'low', camera = 'driver', timeOfDay = 'day', weather = 'clear', parked = true, ...props }: Props) {
  const root = useRef<Group>(null)
  useEffect(() => {
    if (!improved || !root.current) return
    const originals = new Map<Mesh, Material | Material[]>()
    const owned = new Map<Material, Material>()
    const tune = (source: Material) => {
      const existing = owned.get(source)
      if (existing) return existing
      const material = source.clone()
      owned.set(source, material)
      if (!(material instanceof MeshStandardMaterial)) return material
      const hex = material.color.getHexString()
      // These colors identify existing RetroJeep material families (they have no names).
      // Keep the original gauge artwork and PhysicalRadio emissive display unchanged.
      if (hex === '46504a') {
        material.color.set('#292c2a')
        material.roughness = .84
        material.metalness = 0
        material.bumpScale = .0011
        material.envMapIntensity = .46
        material.roughnessMap = material.bumpMap
      } else if (hex === '181e1c') {
        material.color.set('#151715')
        material.roughness = .88
        material.bumpScale = .00065
        material.envMapIntensity = .25
      } else if (hex === '151e1c') {
        material.color.set('#202321')
        material.roughness = .76
        material.metalness = .03
      } else if (['929a91', 'c1c7bd'].includes(hex)) {
        material.color.set('#90938d')
        material.roughness = .4
        material.metalness = .82
        material.envMapIntensity = .7
      } else if (hex === '454d49') {
        material.color.set('#424743')
        material.roughness = .55
        material.envMapIntensity = .55
      } else if (hex === 'e3e1d4') {
        material.color.set('#b6b5a7')
        material.roughness = .42
        material.metalness = .24
        material.envMapIntensity = .6
        if (material instanceof MeshPhysicalMaterial) {
          material.clearcoat = .24
          material.clearcoatRoughness = .36
        }
      }
      // Flat silver mirror plates read as white stickers without a reflected world.
      if (hex === 'aabdb9') {
        material.color.set('#546260')
        material.metalness = .85
        material.roughness = .25
        material.envMapIntensity = .6
      }
      return material
    }
    root.current.getObjectByName('HeroCar')?.traverse(object => {
      if (!(object instanceof Mesh)) return
      originals.set(object, object.material)
      object.material = Array.isArray(object.material) ? object.material.map(tune) : tune(object.material)
      // One known dashboard backing panel in RetroJeep; do not recolor body or pillars.
      if (Math.abs(object.position.y - 1.15) < .0001 && Math.abs(object.position.z + .642) < .0001 && object.material instanceof MeshStandardMaterial) {
        const backing = object.material.clone()
        backing.color.set('#333731')
        backing.roughness = .82
        backing.metalness = .08
        if (backing instanceof MeshPhysicalMaterial) backing.clearcoat = .04
        owned.set(object.material, backing)
        object.material = backing
      }
    })
    return () => {
      originals.forEach((material, mesh) => { mesh.material = material })
      owned.forEach(material => material.dispose())
    }
  }, [improved])

  return <group ref={root} name="CockpitLabVariant">
    <RetroJeep {...props} quality={quality} camera={camera} timeOfDay={timeOfDay} weather={weather} parked={parked} />
    {improved && <group position-x={HERO_X} name="CockpitLabTrim">
      {/* A physical instrument brow shades the dials and gives the flat panel depth. */}
      <RoundedBox args={[.548, .035, .102]} position={[-.421, 1.361, -.439]} radius={.015} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial color="#252925" roughness={.83} />
      </RoundedBox>
      {[-.691, -.151].map(x => <RoundedBox key={x} args={[.013, .169, .035]} position={[x, 1.264, -.449]} radius={.005} smoothness={2} castShadow>
        <meshStandardMaterial color="#252925" roughness={.83} />
      </RoundedBox>)}
      {/* Thin inset radio perimeter: never cover the original clickable head unit. */}
      {[1.194, 1.056].map(y => <RoundedBox key={y} args={[.373, .009, .013]} position={[.055, y, -.457]} radius={.003} smoothness={2} castShadow>
        <meshStandardMaterial color="#131714" roughness={.91} />
      </RoundedBox>)}
      {[-.127, .237].map(x => <RoundedBox key={x} args={[.009, .136, .013]} position={[x, 1.125, -.457]} radius={.003} smoothness={2} castShadow>
        <meshStandardMaterial color="#131714" roughness={.91} />
      </RoundedBox>)}
      {/* Cowl seam hides the disconnected dash/paint junction at seated eye height. */}
      <RoundedBox args={[1.35, .014, .027]} position={[0, 1.443, -.626]} radius={.005} smoothness={2} receiveShadow>
        <meshStandardMaterial color="#111713" roughness={.94} />
      </RoundedBox>
      {/* Raised half-door inserts close the low side openings at the seated POV.
          These are real cabin surfaces, not a screen-space mask for the plate. */}
      {[-1, 1].map(side => <group key={side} name={side < 0 ? 'LabDriverDoorInsert' : 'LabPassengerDoorInsert'}>
        <RoundedBox args={[.055, .292, 1.24]} position={[side * .695, 1.217, .015]} radius={.012} smoothness={2} castShadow receiveShadow>
          <meshStandardMaterial color="#b6b5a7" metalness={.24} roughness={.48} />
        </RoundedBox>
        <RoundedBox args={[.019, .219, 1.122]} position={[side * .658, 1.217, .024]} radius={.008} smoothness={2} receiveShadow>
          <meshStandardMaterial color="#30332f" roughness={.86} />
        </RoundedBox>
        <RoundedBox args={[.086, .048, 1.27]} position={[side * .689, 1.365, .006]} radius={.016} smoothness={3} castShadow receiveShadow>
          <meshStandardMaterial color="#282c28" roughness={.82} />
        </RoundedBox>
      </group>)}
    </group>}
  </group>
}
