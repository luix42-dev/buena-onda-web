import type { Material, WebGLRenderer } from 'three';
import type { MusicAudio } from '@/lib/cruise/music-audio';
/** Attach to existing shared materials; preserve any authored road shader and restore ownership on cleanup. */
export function installMiamiMaterial(material: Material, music: MusicAudio, role: 'road' | 'fixture' | 'facade') {
    const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey;
    material.onBeforeCompile = (shader, renderer: WebGLRenderer) => {
        previous.call(material, shader, renderer);
        Object.assign(shader.uniforms, { chWaves: { value: music.miami.waves }, chSequence: { value: music.miami.sequence }, chBlock: { value: music.miami.block }, chControl: { value: music.miami.uniforms } });
        shader.vertexShader = 'varying vec3 chPosition;\n' + shader.vertexShader.replace('#include <project_vertex>', `
   vec4 chWorld=vec4(transformed,1.0);
   #ifdef USE_INSTANCING
   chWorld=instanceMatrix*chWorld;
   #endif
   chPosition=(modelMatrix*chWorld).xyz;
   #include <project_vertex>`);
        shader.fragmentShader = `varying vec3 chPosition; uniform vec4 chWaves; uniform vec4 chSequence; uniform vec4 chBlock; uniform vec4 chControl;
   float chLife(float age,float duration){return smoothstep(0.,.18,age)*(1.-smoothstep(duration-.7,duration,age));}
   float chRoad(float age,float power,vec3 p){float center=-54.+age*32.;float z=p.z-abs(p.x-3.5)*.6;float band=1.-smoothstep(1.4,3.4,abs(z-center));float echo=(1.-smoothstep(.5,1.3,abs(z-center+6.)))*.35;return (band+echo)*power*chLife(age,2.6);}
   float chRow(vec3 p){float sum=0.;for(int i=0;i<6;i++){float k=float(i);if(k>3.+chControl.z)continue;float age=chSequence.x-k*.24;float z=-62.+k*11.+chControl.y-chSequence.y;float side=mod(k+chSequence.z,2.)<.5?1.:-1.;float bank=smoothstep(5.8,7.1,p.x*side)*(1.-smoothstep(14.,18.,abs(p.x)));sum+=chLife(age,2.4)*(1.-smoothstep(2.2,4.2,abs(p.z-z)))*bank;}return sum*step(p.y,7.);}
   float chFacade(vec3 p){float z=p.z-(chControl.y-chBlock.y);float block=step(-92.,z)*(1.-step(-8.,z))*step(p.x,-10.);float floorBand=1.-smoothstep(2.5,4.,abs(p.y-(2.+chBlock.x*5.)));float windows=.35+.65*step(.23,fract(z/3.));return block*floorBand*windows*chLife(chBlock.x,4.5)*step(1.5,p.y);}
  ` + shader.fragmentShader;
        const reaction = role === 'road' ? 'chRoad(chWaves.x,chWaves.y,chPosition)+chRoad(chWaves.z,chWaves.w,chPosition)' : role === 'fixture' ? 'chRow(chPosition)' : 'chFacade(chPosition)';
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `float chMask=clamp((${reaction})*chControl.x,0.,.88); outgoingLight=mix(outgoingLight,vec3(1.65,1.12,.48),chMask);\n#include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => previousKey.call(material) + '-miami-choreography-' + role;
    material.needsUpdate = true;
    return () => { material.onBeforeCompile = previous; material.customProgramCacheKey = previousKey; material.needsUpdate = true; };
}
