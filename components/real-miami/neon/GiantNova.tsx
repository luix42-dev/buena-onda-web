'use client'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import type { NightState } from '../nightdrive/state'
import { retrowaveRoadSample, retrowaveSkywayMix } from '../nightdrive/road'
import { COMPANION_PORTRAIT, TALK_BASE } from '@/lib/cruise/nova/persona'
import type { GiantAd } from '@/lib/cruise/nova/giant-ads'

/** Giant NOVA (Look v2 Retrowave): an advertising apparition. When useGiantAds puts a house ad on air, a
 * skyline-scale hologram of her rises at the avenue's vanishing point and speaks it, lips synced to the ad voice.
 * She never voices companion lines (those stay in the in-car caption card); the DOM shows the ad disclosure.
 * The render's black background is keyed out by luminance, so only NOVA is projected. */
// Keep the complete head below the camera's top edge in chase and cockpit views.
const AHEAD = 145, HEIGHT = 60, BASE = -7, NEAR = 40, LINGER = 1

function holoMaterial(map: T.Texture) {
  return new T.ShaderMaterial({
    uniforms: { map: { value: map }, uTime: { value: 0 }, uFade: { value: 0 }, uGlitch: { value: 1 } },
    // Normal blending with a luminance key: additive lost her darks (eyes, brows, lip line) and read as a pale blob.
    transparent: true, depthWrite: false, blending: T.NormalBlending, toneMapped: false, side: T.DoubleSide, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D map; uniform float uTime, uFade, uGlitch; varying vec2 vUv;
      void main(){
        vec2 uv=vUv;
        // Horizontal slices tear while she forms and dissolves.
        float band=floor(uv.y*48.+uTime*24.);
        float tear=step(.9,fract(sin(band*91.7)*4375.5))*(1.-uFade)*uGlitch;
        uv.x+=tear*.06*sin(uTime*70.);
        vec3 c=texture2D(map,uv).rgb;
        float l=dot(c,vec3(.2126,.7152,.0722));
        float scan=.82+.18*sin(vUv.y*320.-uTime*6.);
        float flicker=.93+.07*sin(uTime*31.)*sin(uTime*11.);
        // Keep her natural colour (no gain: bloom already lifts it), pushed slightly toward the avenue's cyan/magenta.
        vec3 tint=mix(vec3(.6,.95,1.12),vec3(1.12,.6,.95),smoothstep(.3,.9,vUv.x));
        vec3 col=mix(c,c*tint,.3)*.82;
        // Soft bottom edge so she rises out of the street haze rather than being cut off.
        float edge=smoothstep(0.,.18,vUv.y)*smoothstep(0.,.04,vUv.x)*smoothstep(1.,.96,vUv.x);
        // Key out the black render background; a hologram stays slightly see-through.
        float a=smoothstep(.006,.045,l)*.88*scan*flicker*uFade*edge;
        gl_FragColor=vec4(col,a);
      }`,
  })
}

export default function GiantNova({ state, ad, speaking, enabled }: { state: MutableRefObject<NightState>; ad: GiantAd | null; speaking: boolean; enabled: boolean }) {
  const still = useMemo(() => new T.TextureLoader().load(COMPANION_PORTRAIT, t => { t.colorSpace = T.SRGBColorSpace }), [])
  const video = useMemo(() => { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; return v }, [])
  const moving = useMemo(() => { const t = new T.VideoTexture(video); t.colorSpace = T.SRGBColorSpace; return t }, [video])
  const giant = useMemo(() => {
    const material = holoMaterial(still)
    const plane = new T.Mesh(new T.PlaneGeometry(HEIGHT * 1080 / 1350, HEIGHT), material)
    plane.position.y = BASE + HEIGHT / 2; plane.frustumCulled = false; plane.renderOrder = 2
    const holder = new T.Group(); holder.add(plane); holder.visible = false
    return { holder, plane, material, drop: 0 }
  }, [still])
  useEffect(() => () => { giant.material.dispose(); still.dispose(); moving.dispose(); video.removeAttribute('src'); video.load() }, [giant, still, moving, video])
  const show = useRef({ id: '', at: 0, start: 0, until: Infinity, playing: false, ready: false })
  const reduced = useRef(false)
  useEffect(() => { reduced.current = matchMedia('(prefers-reduced-motion: reduce)').matches }, [])

  // A new ad: pick the clip and place her ahead at the vanishing point.
  useEffect(() => {
    const sh = show.current
    if (!ad || !enabled) { if (sh.id) sh.until = Math.min(sh.until, state.current.elapsed + LINGER); return }
    if (ad.id === sh.id) return
    const s = state.current
    Object.assign(sh, { id: ad.id, at: s.distance + AHEAD, start: s.elapsed, until: Infinity, playing: false, ready: false })
    const webm = video.canPlayType('video/webm; codecs="vp9"') ? 'webm' : 'mp4'
    video.src = `${TALK_BASE}${ad.id}-giant.${webm}`
    video.onloadeddata = () => { if (show.current.id === ad.id) show.current.ready = true }
    video.onerror = () => { show.current.ready = false }
    video.load()
    giant.material.uniforms.map.value = still
    giant.holder.visible = true
  }, [ad, enabled]) // eslint-disable-line react-hooks/exhaustive-deps -- refs and stable three objects

  // The voice is audible: start the clip from its first frame so lips follow the words.
  useEffect(() => {
    const sh = show.current
    if (!speaking || !sh.id || retrowaveSkywayMix(state.current.distance) >= .65) return
    video.currentTime = 0
    void video.play().then(() => { sh.playing = true; giant.material.uniforms.map.value = moving }).catch(() => { sh.playing = false })
  }, [speaking]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (new URLSearchParams(location.search).get('diagnostics') !== '1') return
    const w = window as Window & { __giantNova?: () => unknown }
    w.__giantNova = () => ({ visible: giant.holder.visible, id: show.current.id, ahead: show.current.at - state.current.distance, fade: giant.material.uniforms.uFade.value, drop: giant.drop, ready: show.current.ready, playing: show.current.playing, position: giant.holder.position.toArray().map(v => Math.round(v)) })
    return () => { delete w.__giantNova }
  }, [giant, state])
  useFrame((frame, delta) => {
    const s = state.current, sh = show.current, u = giant.material.uniforms
    u.uTime.value = frame.clock.elapsedTime
    u.uGlitch.value = reduced.current ? 0 : 1
    if (!sh.id) giant.holder.visible = false
    if (!giant.holder.visible) return
    // The bridge chapter has its own full-body projection; keep the older head-only ad off that stage.
    giant.plane.visible = retrowaveSkywayMix(s.distance) < .65
    if (!enabled || s.paused) sh.until = Math.min(sh.until, s.elapsed + .6)
    // Dissolve before the car reaches her; she is a skyline projection, never something to drive through.
    if (sh.at - s.distance < NEAR) sh.until = Math.min(sh.until, s.elapsed + 1.2)
    const origin = retrowaveRoadSample(s.distance, s.seed), p = retrowaveRoadSample(sh.at, s.seed)
    giant.holder.position.set(p.x - origin.x, p.y - origin.y, p.z - origin.z)
    giant.holder.rotation.y = Math.atan2(-giant.holder.position.x, -giant.holder.position.z)
    // Exterior cameras look downward, so lower the projection slightly in those views.
    const exterior = frame.camera.position.y > 1.8 ? 1 : 0
    giant.drop += (exterior * 17 - giant.drop) * Math.min(1, delta * 3)
    giant.plane.position.y = BASE + HEIGHT / 2 - giant.drop
    const remaining = sh.until - s.elapsed
    u.uFade.value = T.MathUtils.damp(u.uFade.value, enabled && giant.plane.visible && remaining > 0 ? 1 : 0, speaking ? 7 : 5, delta)
    if (remaining <= 0) {
      giant.holder.visible = false; video.pause(); sh.id = ''; sh.playing = false
      u.map.value = still
    }
  })
  return <primitive object={giant.holder} dispose={null}/>
}
