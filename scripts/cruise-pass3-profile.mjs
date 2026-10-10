// Pass 3 performance bisection. Usage: node scripts/cruise-pass3-profile.mjs [--cam chase|driver] [--at metres] [--depth 1|2] [--root 5,1] [--vehicle island-trail|classic-coupe|coastal-coupe]
// Pauses the cruise, then hides one scene subtree at a time and records rAF FPS. Desktop 1600x900, sunset, Mobile preset.
// Relative cost only: a dev server on a shared laptop iGPU. Uses ?profile (exposes window.__three); not for normal use.
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:d}
const VEHICLE=arg('--vehicle',''),ROOT=(arg('--root','')||'').split(',').filter(Boolean).map(Number),CAM=arg('--cam','chase'),AT=+arg('--at',30),DEPTH=+arg('--depth',2),out='docs/cruise/pass3/perf';await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--enable-webgl']})
try{
 const page=await (await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1})).newPage()
 await page.goto('http://127.0.0.1:3040/cruise/miami-test?profile=1',{timeout:240000})
 await page.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:240000});await page.waitForTimeout(2500)
 const st=()=>page.evaluate(()=>window.__cruise())
 if(VEHICLE){await page.getByRole('button',{name:'More options'}).click();await page.getByLabel('Vehicle').selectOption(VEHICLE);await page.getByRole('button',{name:'More options'}).click()
  await page.waitForFunction(v=>window.__cruise().vehicle===v&&document.querySelector('main')?.dataset.ready==='true',VEHICLE,{timeout:240000});await page.waitForTimeout(2500)}
 for(let i=0;i<4&&(await st()).time!=='sunset';i++){await page.getByRole('button',{name:'Change time of day'}).click();await page.waitForTimeout(400)}
 await page.getByRole('button',{name:'▶ Cruise'}).click()
 if(CAM==='driver')for(let i=0;i<3&&(await st()).camera!=='driver';i++){await page.keyboard.press('c');await page.waitForTimeout(300)}
 while((await st()).distance<AT)await page.waitForTimeout(200)
 await page.keyboard.press('Space');await page.waitForTimeout(1500)
 const fps=ms=>page.evaluate(ms=>new Promise(r=>{let n=0;const t0=performance.now();const f=t=>{n++;if(t-t0<ms)requestAnimationFrame(f);else r(n*1000/(t-t0))};requestAnimationFrame(f)}),ms)
 // Label every subtree up to DEPTH so it can be toggled by path.
 const nodes=await page.evaluate(([depth,root])=>{let scene=window.__three.scene;for(const i of root)scene=scene.children[i];const list=[];const walk=(o,path,d)=>{let meshes=0,tris=0;o.traverse(c=>{if(c.isMesh||c.isInstancedMesh){meshes++;const g=c.geometry,n=g.index?g.index.count:(g.attributes.position?.count||0);tris+=n/3*(c.count||1)}});if(d>0)list.push({path,name:o.name||o.type,meshes,tris:Math.round(tris),visible:o.visible});if(d<depth&&o.children.length)o.children.forEach((c,i)=>walk(c,[...path,i],d+1))};walk(scene,root,0);return list},[DEPTH,ROOT])
 const toggle=(path,v)=>page.evaluate(([path,v])=>{let o=window.__three.scene;for(const i of path)o=o.children[i];o.visible=v},[path,v])
 const base=[];for(let i=0;i<3;i++)base.push(await fps(3000));const baseline=base.reduce((a,b)=>a+b)/base.length
 const results=[]
 for(const n of nodes.filter(n=>n.visible&&n.meshes>0&&(n.path.length===ROOT.length+1||n.meshes>=5))){
  await toggle(n.path,false);await page.waitForTimeout(300);const f=await fps(2500);await toggle(n.path,true);await page.waitForTimeout(200)
  results.push({...n,fpsHidden:+f.toFixed(1),gain:+(f-baseline).toFixed(1)})
 }
 const shadows=await page.evaluate(()=>window.__three.gl.shadowMap.enabled)
 let noShadows=null
 if(shadows){await page.evaluate(()=>{const {gl,scene}=window.__three;gl.shadowMap.enabled=false;scene.traverse(o=>{if(o.material)[].concat(o.material).forEach(m=>m.needsUpdate=true)})});await page.waitForTimeout(800);noShadows=+(await fps(3000)).toFixed(1)}
 const info=await page.evaluate(()=>{const {gl}=window.__three;return {calls:gl.info.render.calls,triangles:gl.info.render.triangles,programs:gl.info.programs?.length,textures:gl.info.memory.textures,pixelRatio:gl.getPixelRatio()}})
 results.sort((a,b)=>b.gain-a.gain)
 const r={vehicle:VEHICLE||'ocean-convertible',cam:CAM,at:AT,baseline:+baseline.toFixed(1),baselineRuns:base.map(x=>+x.toFixed(1)),shadowsEnabled:shadows,fpsWithoutShadows:noShadows,info,results}
 await writeFile(`${out}/profile-${VEHICLE?VEHICLE+'-':''}${CAM}${ROOT.length?'-'+ROOT.join('.'):''}.json`,JSON.stringify(r,null,1))
 console.log(JSON.stringify({...r,results:results.slice(0,14).map(x=>`${x.gain>=0?'+':''}${x.gain} ${x.name} [${x.path}] meshes=${x.meshes} tris=${x.tris}`)},null,1))
}finally{await browser.close()}
