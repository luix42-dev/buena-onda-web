'use client'

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { renderHold } from '@/lib/cruise/render-hold'
import * as T from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { wetStreakUniforms } from './wetStreaks'

/** Bloom/halation adapted to our existing WebGL renderer; no upstream code/assets. */
export default function CruiseGlow({ enabled, blend, radioFocused, director = false, filmic = true, motion, neon = false, look = false, cabin = false, restrained = false }: { neon?: boolean; enabled: boolean; blend: MutableRefObject<number>; radioFocused: boolean; director?: boolean; filmic?: boolean; motion?: MutableRefObject<number>; look?: boolean; cabin?: boolean; restrained?: boolean }) {
  const { gl, scene, camera, size, viewport } = useThree()
  const still = useRef(false)
  useEffect(() => { const media = matchMedia('(prefers-reduced-motion: reduce)'), changed = () => { still.current = media.matches }; changed(); media.addEventListener('change', changed); return () => media.removeEventListener('change', changed) }, [])
  useEffect(() => { const previous = gl.info.autoReset; gl.info.autoReset = false; return () => { gl.info.autoReset = previous } }, [gl])
  const pipeline = useMemo(() => {
    const target = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType })
    const composer = new EffectComposer(gl, target)
    const render = new RenderPass(scene, camera)
    // One small HDR gather instead of a multi-resolution blur pyramid.
    const glow = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, texel: { value: new T.Vector2() }, strength: { value: .22 }, wide: { value: 0 }, toneMappingExposure: { value: 1 }, hueKeep: { value: .35 }, grade: { value: 0 }, flare: { value: 0 }, warm: { value: 0 }, grain: { value: 0 }, seed: { value: 0 }, rush: { value: 0 }, look: { value: 0 }, soft: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 texel; uniform float strength, hueKeep, grade, flare, warm, grain, seed, rush, wide, look, soft;
        varying vec2 vUv;
        #include <tonemapping_pars_fragment>
        vec3 bright(vec2 offset){vec3 c=texture2D(tDiffuse,vUv+offset*texel).rgb;return c*smoothstep(.85,1.8,dot(c,vec3(.2126,.7152,.0722)));} // realistic: only genuinely bright sources bloom
        void main(){vec3 color=texture2D(tDiffuse,vUv).rgb;
          // The Look: VHS softness as a slight horizontal chroma split (two taps).
          if(soft>.001){color.r=mix(color.r,texture2D(tDiffuse,vUv+vec2(.9,0.)*texel).r,soft);color.b=mix(color.b,texture2D(tDiffuse,vUv-vec2(.9,0.)*texel).b,soft);}
          // Speed: radial streak toward the edges only; the road ahead and the dash stay sharp.
          if(rush>.001){vec2 d=vUv-vec2(.5,.47);float m=smoothstep(.12,.55,length(d*vec2(1.6,1.)))*rush;
            if(m>.002){vec3 acc=color;for(int i=1;i<=4;i++){acc+=texture2D(tDiffuse,vUv-d*m*.035*float(i)).rgb;}color=acc/5.;}}
          vec3 halo=bright(vec2(3.,0.))+bright(vec2(-3.,0.))+bright(vec2(0.,3.))+bright(vec2(0.,-3.));
          halo+=(bright(vec2(7.,7.))+bright(vec2(-7.,7.))+bright(vec2(7.,-7.))+bright(vec2(-7.,-7.)))*.5;
          color+=halo*strength/6.;
          // Neon Run: a second, much wider ring so signs bloom into the rain haze.
          if(wide>.001){vec3 far=bright(vec2(16.,0.))+bright(vec2(-16.,0.))+bright(vec2(0.,16.))+bright(vec2(0.,-16.))+(bright(vec2(30.,18.))+bright(vec2(-30.,18.))+bright(vec2(30.,-18.))+bright(vec2(-30.,-18.)))*.6;color+=far*wide/7.;}
          // Director: horizontal anamorphic streak on bright neon only (6 taps, skipped when off).
          if(flare>.001){vec3 streak=(bright(vec2(12.,0.))+bright(vec2(-12.,0.)))*.5+(bright(vec2(26.,0.))+bright(vec2(-26.,0.)))*.3+(bright(vec2(44.,0.))+bright(vec2(-44.,0.)))*.16;color+=streak*vec3(.55,.75,1.15)*flare*strength*.55;}
          vec3 mapped=ACESFilmicToneMapping(color);float peak=max(max(color.r,color.g),max(color.b,.00001));
          vec3 hue=color/peak*ACESFilmicToneMapping(vec3(peak)).g;
          // FXAA consumes display-space color, even when this pass writes to an offscreen target.
          vec3 graded=mix(mapped,hue,hueKeep);
          if(grade>.001){
            float l=dot(graded,vec3(.2126,.7152,.0722));
            // Teal/steel shadows; sodium + magenta highlights at night, warm gold at sunset.
            graded=mix(graded,graded*vec3(.82,.98,1.1),(1.-smoothstep(.0,.42,l))*grade*.75);
            vec3 high=mix(vec3(.05,.012,.03),vec3(.06,.03,-.025),warm);
            graded+=high*smoothstep(.35,.95,l)*grade;
            graded=max(vec3(0.),(graded-.012*grade)/(1.-.012*grade));
            vec2 q=vUv-.5;graded*=1.-grade*.42*smoothstep(.18,.62,dot(q,q)*1.6);
          }
          if(look>.001){
            float l=dot(graded,vec3(.2126,.7152,.0722));
            // Cool navy shadows, lifted blacks, a touch of saturation, soft vignette.
            graded=mix(graded,graded*vec3(.84,.98,1.14),(1.-smoothstep(0.,.45,l))*look*.7);
            graded=mix(vec3(l),graded,1.+.15*look);
            graded=vec3(.016,.022,.042)*look+graded*(1.-.03*look);
            vec2 q=vUv-.5;graded*=1.-look*.4*smoothstep(.16,.7,dot(q,q)*1.7);
          }
          vec4 display=sRGBTransferOETF(vec4(graded,1.));
          if(grain>.001){float n=fract(sin(dot(vUv*1000.+seed,vec2(12.9898,78.233)))*43758.5453);display.rgb+=(n-.5)*grain;}
          // Faint floating specks (dust in the beam), sparse and two pixels wide.
          if(soft>.001){vec2 cell=floor(vUv/texel*.5);float r=fract(sin(dot(cell+floor(seed*.05),vec2(41.3,289.1)))*43758.5453);display.rgb+=step(.99965,r)*.22*soft;}
          gl_FragColor=display;
        }`,
    })
    glow.material.toneMapped = false
    const edges = new ShaderPass(FXAAShader)
    edges.material.toneMapped = false
    composer.addPass(render); composer.addPass(glow); composer.addPass(edges)
    return { composer, glow, edges }
  }, [gl, scene, camera])
  useEffect(() => {
    pipeline.composer.setPixelRatio(gl.getPixelRatio())
    pipeline.composer.setSize(size.width, size.height)
    pipeline.glow.uniforms.texel.value.set(1 / (size.width * gl.getPixelRatio()), 1 / (size.height * gl.getPixelRatio()))
    pipeline.edges.uniforms.resolution.value.copy(pipeline.glow.uniforms.texel.value)
  }, [pipeline, gl, size.width, size.height, viewport.dpr])
  useEffect(() => () => { pipeline.glow.dispose(); pipeline.edges.dispose(); pipeline.composer.dispose() }, [pipeline])
  useFrame((_, dt) => {
    gl.info.reset()
    // Warm-up: the frame runs, nothing is drawn (see render-hold); the scene's real target is published for it.
    renderHold.target = enabled ? pipeline.composer.readBuffer : null
    if (renderHold.active) return
    wetStreakUniforms.post.value = enabled ? 1 : 0
    if (!enabled) { gl.render(scene, camera); return }
    // FXAA softens the small lettering on the physical head unit.
    pipeline.edges.enabled = !radioFocused
    // Look v2 Retrowave keeps the Neon Run palette but not its halo: the wide ring and anamorphic streak
    // sample 16-44 px away, which reads as doubled signs rather than glow (Luis: "just confusing").
    const retro = neon && look
    // Realism pass (Luis: glow "kinda exaggerated"): roughly half the previous halo everywhere.
    pipeline.glow.uniforms.strength.value = radioFocused ? .02 : retro ? .09 : neon ? .3 : look ? restrained ? .035 + blend.current * .065 : .06 + blend.current * .15 : .05 + blend.current * .1
    pipeline.glow.uniforms.wide.value = neon && !retro && !radioFocused ? .5 : 0
    // Neon keeps saturated hues instead of bleaching signs to white.
    pipeline.glow.uniforms.hueKeep.value = radioFocused ? .05 : neon || look ? .6 : .35
    pipeline.glow.uniforms.toneMappingExposure.value = gl.toneMappingExposure
    const u = pipeline.glow.uniforms, k = 1 - Math.exp(-Math.min(dt, .1) * 3), on = (director || neon) && !radioFocused ? 1 : 0
    u.grade.value += (on - u.grade.value) * k
    u.flare.value = filmic && !retro ? u.grade.value * (restrained ? .18 : .45) : 0
    // Look v2: post is a per-camera preset. Exterior keeps the full VHS look; the cabin keeps
    // half the grade but no chroma smear, no specks and only a whisper of grain, so gauges and the radio stay crisp.
    const lookTarget = look && !radioFocused ? (restrained ? (cabin ? .4 : .55) : cabin ? .5 : 1) : 0
    const softTarget = look && !radioFocused && !cabin ? (restrained ? .12 : 1) : 0
    u.look.value += (lookTarget - u.look.value) * k
    u.soft.value += (softTarget - u.soft.value) * k
    const grain = cabin ? u.look.value * .016 : filmic ? Math.max(u.grade.value * .035, u.look.value * .045) : u.look.value * .03
    u.grain.value = restrained ? Math.min(.012, grain) : grain
    u.warm.value = neon ? 0 : 1 - blend.current
    // Reduced motion: grain and specks hold still.
    if (!still.current) u.seed.value = (u.seed.value + 17.13) % 1000
    u.rush.value = radioFocused ? 0 : motion?.current ?? 0
    pipeline.composer.render(dt)
  }, 1)
  return null
}
