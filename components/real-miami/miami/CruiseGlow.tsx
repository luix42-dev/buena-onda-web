'use client'

import { useEffect, useMemo, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'

/** Bloom/halation adapted to our existing WebGL renderer; no upstream code/assets. */
export default function CruiseGlow({ enabled, blend, radioFocused, director = false, filmic = true }: { enabled: boolean; blend: MutableRefObject<number>; radioFocused: boolean; director?: boolean; filmic?: boolean }) {
  const { gl, scene, camera, size } = useThree()
  useEffect(() => { const previous = gl.info.autoReset; gl.info.autoReset = false; return () => { gl.info.autoReset = previous } }, [gl])
  const pipeline = useMemo(() => {
    const target = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType })
    const composer = new EffectComposer(gl, target)
    const render = new RenderPass(scene, camera)
    // One small HDR gather instead of a multi-resolution blur pyramid.
    const glow = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, texel: { value: new T.Vector2() }, strength: { value: .22 }, toneMappingExposure: { value: 1 }, hueKeep: { value: .35 }, grade: { value: 0 }, flare: { value: 0 }, warm: { value: 0 }, grain: { value: 0 }, seed: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 texel; uniform float strength, hueKeep, grade, flare, warm, grain, seed;
        varying vec2 vUv;
        #include <tonemapping_pars_fragment>
        vec3 bright(vec2 offset){vec3 c=texture2D(tDiffuse,vUv+offset*texel).rgb;return c*smoothstep(.45,1.3,dot(c,vec3(.2126,.7152,.0722)));}
        void main(){vec3 color=texture2D(tDiffuse,vUv).rgb;
          vec3 halo=bright(vec2(3.,0.))+bright(vec2(-3.,0.))+bright(vec2(0.,3.))+bright(vec2(0.,-3.));
          halo+=(bright(vec2(7.,7.))+bright(vec2(-7.,7.))+bright(vec2(7.,-7.))+bright(vec2(-7.,-7.)))*.5;
          color+=halo*strength/6.;
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
          vec4 display=sRGBTransferOETF(vec4(graded,1.));
          if(grain>.001){float n=fract(sin(dot(vUv*1000.+seed,vec2(12.9898,78.233)))*43758.5453);display.rgb+=(n-.5)*grain;}
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
  }, [pipeline, gl, size.width, size.height])
  useEffect(() => () => { pipeline.glow.dispose(); pipeline.edges.dispose(); pipeline.composer.dispose() }, [pipeline])
  useFrame((_, dt) => {
    gl.info.reset()
    if (!enabled) { gl.render(scene, camera); return }
    pipeline.glow.uniforms.strength.value = radioFocused ? .025 : .08 + blend.current * .18
    pipeline.glow.uniforms.hueKeep.value = radioFocused ? .05 : .35
    pipeline.glow.uniforms.toneMappingExposure.value = gl.toneMappingExposure
    const u = pipeline.glow.uniforms, k = 1 - Math.exp(-Math.min(dt, .1) * 3), on = director && !radioFocused ? 1 : 0
    u.grade.value += (on - u.grade.value) * k
    u.flare.value = filmic ? u.grade.value : 0
    u.grain.value = filmic ? u.grade.value * .035 : 0
    u.warm.value = 1 - blend.current
    u.seed.value = (u.seed.value + 17.13) % 1000
    pipeline.composer.render(dt)
  }, 1)
  return null
}
