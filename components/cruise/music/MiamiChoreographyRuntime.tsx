'use client';
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo, useEffect, type MutableRefObject } from 'react';
import { MeshBasicMaterial, type Group } from 'three';
import type { MusicAudio } from '@/lib/cruise/music-audio';
import type { CruiseRuntime } from '@/lib/cruise/types';
export default function MiamiChoreographyRuntime({ music, runtime, active }: {
    music: MusicAudio;
    runtime: MutableRefObject<CruiseRuntime>;
    active: boolean;
}) {
    const gateway = useRef<Group>(null), observed = useRef(0);
    const surface = useMemo(() => new MeshBasicMaterial({ color: '#ffc668', transparent: true, opacity: 0 }), []);
    useEffect(() => () => surface.dispose(), [surface]);
    useFrame((_, dt) => {
        const start = performance.now(), c = music.miami;
        c.tick(music.director, dt, runtime.current.distance, music.analysisActive, active);
        const count = c.counts.a + c.counts.b + c.counts.c;
        if (count !== observed.current) {
            c.analysisToWorldMs = Math.max(0, performance.now() - music.sampledAt);
            observed.current = count;
        }
        c.uniforms[0] = active && c.settings.enabled ? c.settings.strength * (c.state === 0 ? .7 : c.state === 2 ? 1.15 : 1) : 0;
        c.uniforms[1] = runtime.current.distance;
        c.uniforms[2] = c.state;
        c.cpuMs += (performance.now() - start - c.cpuMs) * .1;
        if (gateway.current) {
            const age = c.gateway[0];
            gateway.current.visible = active && c.settings.enabled && c.settings.d && c.settings.strength > 0 && age >= 0;
            gateway.current.position.z = -98 + runtime.current.distance - c.gateway[1];
            surface.opacity = Math.min(1, Math.max(0, age)) * (1 - Math.max(0, (age - 9) / 2)) * Math.min(1, c.settings.strength);
        }
    }, -1);
    return <group ref={gateway} visible={false} name="MusicTransitionGateway">
  <mesh material={surface} position={[-8.6, 3.8, 0]}><boxGeometry args={[.55, 7.6, 1.1]}/></mesh>
  <mesh material={surface} position={[8.6, 3.8, 0]}><boxGeometry args={[.55, 7.6, 1.1]}/></mesh>
  <mesh material={surface} position={[0, 7.5, 0]}><boxGeometry args={[17.7, 1.1, 1.1]}/></mesh>
 </group>;
}
