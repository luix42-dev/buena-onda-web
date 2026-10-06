'use client'

import { useEffect, useMemo, useState, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { moduleZ } from '@/lib/cruise/constants'
import type { CruiseQuality, CruiseRuntime } from '@/lib/cruise/types'
import type { PersonPlacement } from './CruisePeople'

export default function RiggedPeople({ placements, runtime, quality, selected }: {
  placements: PersonPlacement[]; runtime: MutableRefObject<CruiseRuntime>; quality: CruiseQuality
  selected: MutableRefObject<Set<number>>
}) {
  const [sources, setSources] = useState<GLTF[]>([])
  useEffect(() => {
    let active = true
    const geometry = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), skeletons = new Set<THREE.Skeleton>()
    const dispose = () => { geometry.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); skeletons.forEach(item => item.dispose()) }
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    void Promise.allSettled(['casual', 'suit'].map(name => loader.loadAsync(`/cruise/people/${name}.glb`))).then(results => {
      const loaded = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
      loaded.forEach(source => source.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        geometry.add(object.geometry)
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
        if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton)
      }))
      if (active) setSources(loaded); else dispose()
    })
    const ids = selected.current
    return () => { active = false; ids.clear(); dispose() }
  }, [selected])
  const actors = useMemo(() => {
    if (!sources.length) return []
    return Array.from({ length: quality === 'high' ? 6 : 2 }, (_, index) => {
      const source = sources[index % sources.length], body = clone(source.scene)
      const sharedSkeletons = new Map<string, THREE.Skeleton>()
      body.traverse(object => {
        if (!(object instanceof THREE.SkinnedMesh)) return
        const skeleton = object.skeleton
        const key = skeleton.bones.map(bone => bone.uuid).join('|') + JSON.stringify(skeleton.boneInverses.map(matrix => matrix.elements))
        const shared = sharedSkeletons.get(key)
        if (shared) { object.skeleton = shared; skeleton.dispose() } else sharedSkeletons.set(key, skeleton)
      })
      body.updateMatrixWorld(true)
      const bounds = new THREE.Box3().setFromObject(body)
      const mixer = new THREE.AnimationMixer(body)
      const idle = source.animations.find(clip => clip.name === 'Idle')
      const walk = source.animations.find(clip => clip.name === 'Walk')
      const actions = [idle, walk].map(clip => clip ? mixer.clipAction(clip) : null)
      body.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = quality === 'high'; object.frustumCulled = false } })
      const group = new THREE.Group(); group.add(body); group.visible = false
      return { group, body, mixer, actions, height: Math.max(.1, bounds.max.y - bounds.min.y), bottom: bounds.min.y, person: -1 }
    })
  }, [sources, quality])
  useEffect(() => () => { actors.forEach(actor => {
    actor.mixer.stopAllAction(); actor.mixer.uncacheRoot(actor.body)
    const skeletons = new Set<THREE.Skeleton>()
    actor.body.traverse(object => { if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton) })
    skeletons.forEach(skeleton => skeleton.dispose())
  }) }, [actors])
  useFrame(({ camera }, delta) => {
    const nearest = placements.map((person, index) => {
      const z = moduleZ(person.moduleIndex, runtime.current.distance) + person.localZ
      return { person, index, z, distance: Math.hypot(person.x - camera.position.x, z - camera.position.z) }
    }).filter(item => item.distance < 42 && item.z < camera.position.z + 10).sort((a, b) => a.distance - b.distance).slice(0, actors.length)
    selected.current.clear()
    actors.forEach((actor, slot) => {
      const item = nearest[slot]; actor.group.visible = !!item
      if (!item) return
      selected.current.add(item.index)
      const walking = item.person.motion > .5
      if (actor.person !== item.index) {
        actor.mixer.stopAllAction()
        const action = actor.actions[walking ? 1 : 0] || actor.actions[0]
        if (action) { action.reset().play(); action.time = item.person.phase % action.getClip().duration }
        actor.person = item.index
      }
      const scale = item.person.height / actor.height
      const phase = runtime.current.time * .18 + item.person.phase
      const offsetX = walking ? Math.sin(phase) * .3 : 0
      const offsetZ = walking ? Math.cos(phase) * 3 : 0
      actor.group.scale.setScalar(scale)
      actor.group.position.set(item.person.x + offsetX, .21 - actor.bottom * scale, item.z + offsetZ)
      actor.group.rotation.y = walking ? Math.atan2(.3 * Math.cos(phase), -3 * Math.sin(phase)) : item.person.x < 0 ? Math.PI * .15 : -Math.PI * .15
      actor.mixer.update(Math.min(delta, .05))
    })
    document.documentElement.dataset.cruisePeople = JSON.stringify({ tier: quality, rigged: selected.current.size, pool: actors.length })
  })
  return <group name="NearbyRiggedPeople" dispose={null}>{actors.map((actor, index) => <primitive key={index} object={actor.group} />)}</group>
}
