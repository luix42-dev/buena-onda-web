'use client'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import type { NightState } from '../nightdrive/state'
import { retrowaveRoadSample, retrowaveSkywayMix } from '../nightdrive/road'
import { COMPANION_FULL_BODY, TALK_BASE, type Line } from '@/lib/cruise/nova/persona'
import type { GiantAd } from '@/lib/cruise/nova/giant-ads'

const AHEAD = 280, LATERAL = -36, HEIGHT = 72

function material(body: T.Texture, face: T.Texture) {
  return new T.ShaderMaterial({
    uniforms: { body: { value: body }, face: { value: face }, uTime: { value: 0 }, uFade: { value: 0 }, uTalk: { value: 0 } },
    transparent: true, depthWrite: false, blending: T.NormalBlending, side: T.DoubleSide, fog: false, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D body, face; uniform float uTime, uFade, uTalk; varying vec2 vUv;
      void main(){
        vec4 b=texture2D(body,vUv);
        vec3 col=b.rgb;
        // Only NOVA's face is borrowed from her existing synced talking clip.
        // The soft oval avoids a hard seam against the new full-body portrait.
        vec2 d=(vUv-vec2(.507,.885))/vec2(.115,.078);
        float oval=1.-smoothstep(.69,1.,length(d));
        vec2 faceUv=vec2(.5,.58)+d*vec2(.235,.18);
        vec3 talking=texture2D(face,faceUv).rgb;
        col=mix(col,talking,oval*uTalk*.9);
        float scan=.93+.07*sin(vUv.y*390.-uTime*7.);
        float pulse=1.+uTalk*.055*sin(uTime*10.);
        vec3 tint=mix(vec3(.78,1.04,1.08),vec3(1.08,.79,1.05),vUv.x);
        float edge=smoothstep(0.,.045,vUv.y);
        gl_FragColor=vec4(col*tint*scan*pulse,b.a*uFade*.91*edge);
      }`,
  })
}

/** Full-body NOVA accompanies Retrowave's elevated chapter; radio and voice remain owned by their existing controllers. */
export default function BridgeNova({ state, ad, line, speaking, enabled }: {
  state: MutableRefObject<NightState>; ad: GiantAd | null; line: Line | null; speaking: boolean; enabled: boolean
}) {
  const body = useMemo(() => new T.TextureLoader().load(COMPANION_FULL_BODY, texture => { texture.colorSpace = T.SRGBColorSpace }), [])
  const video = useMemo(() => { const item = document.createElement('video'); item.muted = true; item.playsInline = true; item.preload = 'metadata'; return item }, [])
  const face = useMemo(() => { const item = new T.VideoTexture(video); item.colorSpace = T.SRGBColorSpace; return item }, [video])
  const projection = useMemo(() => {
    const shader = material(body, face), plane = new T.Mesh(new T.PlaneGeometry(HEIGHT * 1024 / 1536, HEIGHT), shader)
    plane.position.y = HEIGHT / 2; plane.frustumCulled = false; plane.renderOrder = 2
    const holder = new T.Group(); holder.add(plane); holder.visible = false
    return { holder, plane, shader }
  }, [body, face])
  // The greetings have new audio; keep the body portrait still until their talking videos are re-rendered.
  const clip = ad?.id || (line?.id==='first_encounter'||line?.id==='welcome_back'?null:line?.id) || null
  const activeClip = useRef<string | null>(null), ready = useRef(false), reduced = useRef(false)
  const speakingNow = useRef(speaking); speakingNow.current = speaking
  useEffect(() => { reduced.current = matchMedia('(prefers-reduced-motion: reduce)').matches }, [])
  useEffect(() => {
    if (activeClip.current === clip) return
    activeClip.current = clip; ready.current = false; video.pause(); video.removeAttribute('src')
    if (clip) {
      const id = clip
      // Same container as GiantNova picks, so a clip both play is downloaded once.
      video.src = `${TALK_BASE}${clip}-giant.${video.canPlayType('video/webm; codecs="vp9"') ? 'webm' : 'mp4'}`
      video.onloadeddata = () => { if (activeClip.current === id) { ready.current = true; if (speakingNow.current) { video.currentTime = 0; void video.play().catch(() => { ready.current = false }) } } }
      video.onerror = () => { if (activeClip.current === id) ready.current = false }
      video.load()
    }
  }, [clip, video])
  useEffect(() => {
    if (speaking && clip && ready.current) { video.currentTime = 0; void video.play().catch(() => { ready.current = false }) }
    else video.pause()
  }, [speaking, clip, video])
  useEffect(() => () => { projection.plane.geometry.dispose(); projection.shader.dispose(); body.dispose(); face.dispose(); video.pause(); video.removeAttribute('src'); video.load() }, [projection, body, face, video])
  useEffect(() => {
    if (new URLSearchParams(location.search).get('diagnostics') !== '1') return
    const w = window as Window & { __bridgeNova?: () => unknown }
    w.__bridgeNova = () => ({ visible: projection.holder.visible, fade: projection.shader.uniforms.uFade.value, talking: projection.shader.uniforms.uTalk.value, clip: activeClip.current })
    return () => { delete w.__bridgeNova }
  }, [projection])
  useFrame((frame, delta) => {
    const s = state.current, u = projection.shader.uniforms, sky = retrowaveSkywayMix(s.distance)
    const on = enabled && speaking && !s.paused
    const targetFade = on ? T.MathUtils.smoothstep(sky, .38, .9) : 0
    u.uFade.value = T.MathUtils.damp(u.uFade.value, targetFade, speaking ? 7 : 11, delta)
    projection.holder.visible = u.uFade.value > .015
    if (!projection.holder.visible) return
    const origin = retrowaveRoadSample(s.distance, s.seed), at = retrowaveRoadSample(s.distance + AHEAD, s.seed)
    projection.holder.position.set(at.x - origin.x + Math.cos(at.yaw) * LATERAL, at.y - origin.y + 1.5, at.z - origin.z - Math.sin(at.yaw) * LATERAL)
    projection.holder.rotation.y = Math.atan2(frame.camera.position.x - projection.holder.position.x, frame.camera.position.z - projection.holder.position.z)
    projection.plane.position.y = HEIGHT / 2 + (reduced.current ? 0 : Math.sin(frame.clock.elapsedTime * .8) * .35)
    u.uTime.value = reduced.current ? 0 : frame.clock.elapsedTime
    u.uTalk.value = T.MathUtils.damp(u.uTalk.value, speaking && ready.current && !video.paused ? 1 : 0, 8, delta)
  })
  return <primitive object={projection.holder} dispose={null}/>
}
