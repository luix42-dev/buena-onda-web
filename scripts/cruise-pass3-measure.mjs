// Pass 3 Gate 6 measurement. Usage: node scripts/cruise-pass3-measure.mjs [--probe] [--headful] [--only a,b,...] [--mode perf|ads] [--stop metres] [--tag suffix]
// Only meaningful for FPS if the recorded renderer is the Intel GPU (not SwiftShader). JS heap is not GPU memory.
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const has=k=>process.argv.includes(k),arg=(k,d)=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:d}
const STOP=+arg("--stop",208),TAG=arg("--tag","");const headless=!has("--headful"),only=(arg('--only','')||'').split(',').filter(Boolean)
const out='docs/cruise/pass3/perf';await mkdir(out,{recursive:true})
const ARGS=['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--enable-webgl']
const D={width:1600,height:900},P={viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true}
const RUNS=[
 {id:'a-desktop-chase-sunset-mobile',vp:{viewport:D,deviceScaleFactor:1},cam:'chase',time:'sunset',q:'mobile',ads:true},
 {id:'b-desktop-cockpit-sunset-mobile',vp:{viewport:D,deviceScaleFactor:1},cam:'driver',time:'sunset',q:'mobile',ads:true},
 {id:'c-phone-chase-sunset-mobile',vp:P,cam:'chase',time:'sunset',q:'mobile',ads:true},
 {id:'d-phone-cockpit-sunset-mobile',vp:P,cam:'driver',time:'sunset',q:'mobile',ads:true},
 {id:'e-desktop-cockpit-sunset-desktopQ',vp:{viewport:D,deviceScaleFactor:1},cam:'driver',time:'sunset',q:'desktop'},
 {id:'f-desktop-chase-night-mobile',vp:{viewport:D,deviceScaleFactor:1},cam:'chase',time:'night',q:'mobile'},
].filter(r=>!only.length||only.includes(r.id.split('-')[0])||only.includes(r.id))
const probeGL=()=>{const c=document.createElement('canvas'),g=c.getContext('webgl2')||c.getContext('webgl');if(!g)return 'NO WEBGL';const e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'(no debug info)'}
const browser=await chromium.launch({channel:'msedge',headless,args:ARGS})
const version=browser.version()
try{
 if(has('--probe')){const p=await browser.newPage();await p.goto('about:blank');console.log(JSON.stringify({headless,version,renderer:await p.evaluate(probeGL)}));process.exit(0)}
 const counter=()=>{window.__all=[];Object.defineProperty(window,'__street',{configurable:true,get(){return window.__all.at(-1)},set(v){window.__all.push(v)}});let n=0;window.__draws=()=>n;for(const P of [WebGL2RenderingContext.prototype,WebGLRenderingContext.prototype])for(const f of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const o=P[f];if(o)P[f]=function(...a){n++;return o.apply(this,a)}}}
 const MODE=arg('--mode','perf') // perf: no ?metrics (true frame pacing). ads: ?metrics=1 (sign raycasts; makes the page ~1 FPS on this machine, see RESULTS.md)
 for(const run of RUNS){
  if(MODE==='ads'&&!run.ads)continue
  const L=m=>console.log(new Date().toISOString().slice(11,19),run.id,m);L("start")
  const ctx=await browser.newContext(run.vp),page=await ctx.newPage(),errors=[],t0=Date.now()
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,160))})
  await page.addInitScript(counter)
  await page.goto('http://127.0.0.1:3040/cruise/miami-test'+(MODE==='ads'?'?metrics=1':''),{timeout:240000})
  await page.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:240000})
  L("ready");const loadMs=Date.now()-t0,renderer=await page.evaluate(probeGL)
  await page.waitForTimeout(3000)
  if(run.q==='desktop'){await page.getByRole('button',{name:'More options'}).click();await page.getByLabel('Quality').selectOption('desktop');await page.getByRole('button',{name:'More options'}).click();await page.evaluate(()=>document.activeElement?.blur?.());await page.waitForTimeout(3000)}
  const st=()=>page.evaluate(()=>window.__cruise())
  for(let i=0;i<4&&(await st()).time!==run.time;i++){await page.getByRole('button',{name:'Change time of day'}).click();await page.waitForTimeout(500)}
  await page.evaluate(()=>{window.__streetSamples=[];window.__all.length=0;window.__streetEvents=[];window.__ft=[];let l=performance.now();const t=n=>{window.__ft.push(n-l);l=n;requestAnimationFrame(t)};requestAnimationFrame(t)})
  await page.getByRole('button',{name:'▶ Cruise'}).click()
  if(run.cam==='driver')for(let i=0;i<3&&(await st()).camera!=='driver';i++){await page.keyboard.press('c');await page.waitForTimeout(400)}
  L("driving");const d0=await page.evaluate(()=>window.__draws()),f0=await page.evaluate(()=>window.__ft.length)
  const tStart=Date.now(),limit=MODE==='ads'?3.3e6:110000;let shot=false,maxD=0,fin=await st()
  while(Date.now()-tStart<limit){
   await page.waitForTimeout(MODE==='ads'?5000:1000);fin=await st();maxD=Math.max(maxD,fin.distance)
   if(!shot&&fin.distance>60){await page.screenshot({path:`${out}/${run.id}-${MODE}${TAG}.png`});shot=true}
   if(maxD>=STOP)break
  }
  const durationS=(Date.now()-tStart)/1000
  const ft=(await page.evaluate(()=>window.__ft)).slice(f0).filter(x=>x<2000),draws=await page.evaluate(()=>window.__draws())-d0
  const samples=await page.evaluate(()=>window.__all||[]),events=await page.evaluate(()=>window.__streetEvents||[])
  const mean=a=>a.reduce((x,y)=>x+y,0)/(a.length||1),q=(a,p)=>a.length?a[Math.min(a.length-1,Math.floor(a.length*p))]:null
  const wins=[];{let acc=0,c=0;for(const x of ft){acc+=x;c++;if(acc>=1000){wins.push(c*1000/acc);acc=0;c=0}}}
  const ws=[...wins].sort((a,b)=>a-b),fts=[...ft].sort((a,b)=>a-b)
  const r={id:run.id,mode:MODE,renderer,hardwareGL:/intel/i.test(renderer)&&!/swiftshader|llvmpipe/i.test(renderer),browser:'Edge '+version,headless,viewport:run.vp.viewport,dpr:run.vp.deviceScaleFactor,quality:fin.quality,time:fin.time,camera:fin.camera,runSeconds:+durationS.toFixed(1),finalDistance:fin.distance,maxDistance:maxD,loadToReadyMs:loadMs,frames:ft.length,meanFps:+(ft.length*1000/ft.reduce((a,b)=>a+b,0)).toFixed(2),p5Fps1s:ws.length?+q(ws,.05).toFixed(2):null,worst1sFps:ws.length?+ws[0].toFixed(2):null,p95FrameMs:+q(fts,.95).toFixed(2),maxFrameMs:+fts.at(-1).toFixed(1),glDrawCallsPerFrame:Math.round(draws/(ft.length||1)),jsHeapMB:+(samples.at(-1)?.heapMB??await page.evaluate(()=>performance.memory?.usedJSHeapSize/1048576)).toFixed(1),heapNote:'JS heap only, not GPU memory',errors}
  if(MODE==='ads'){
   // With metrics the page runs ~1 FPS; in-page 'continuous' seconds are inflated (real dt per sample, sim dt clamped to 0.05 s).
   // Recompute sim-time exposure from distance (speed constant 3.5 m/s): continuous qualified distance run / speed.
   const ads={};const sp=3.5
   samples.forEach(s=>{for(const a of s.ads){const o=ads[a.id]||(ads[a.id]={maxContinuousSimSeconds:0,visibleFrames:0,frames:0,maxWidthPx:0,blockers:{},_ld:null});o.frames++;o.maxWidthPx=Math.max(o.maxWidthPx,Math.round(a.width))
    if(a.visible){o.visibleFrames++;if(o._ld==null)o._ld=s.distance;o.maxContinuousSimSeconds=Math.max(o.maxContinuousSimSeconds,(s.distance-o._ld)/sp)}else{o._ld=null;if(a.blockedBy){const k=a.blockedBy.split(':').slice(0,2).join(':');o.blockers[k]=(o.blockers[k]||0)+1}}}})
   for(const o of Object.values(ads)){o.maxContinuousSimSeconds=+o.maxContinuousSimSeconds.toFixed(2);o.qualified5s=o.maxContinuousSimSeconds>=5;o.topBlockers=Object.entries(o.blockers).sort((x,y)=>y[1]-x[1]).slice(0,3);delete o.blockers;delete o._ld}
   r.ads=ads;r.trianglesMean=Math.round(mean(samples.map(s=>s.triangles)));r.inPageCallsMean=Math.round(mean(samples.map(s=>s.calls)));r.sampleCount=samples.length;r.inflatedInPageEvents=events.filter(e=>e.type==='visibility-qualified').map(e=>e.id)
  }
  console.log(JSON.stringify({...r,ads:r.ads&&Object.fromEntries(Object.entries(r.ads).map(([k,v])=>[k,v.maxContinuousSimSeconds]))}));await writeFile(`${out}/${run.id}-${MODE}${TAG}.json`,JSON.stringify({...r,samples:MODE==='ads'?samples:undefined,fps1s:wins.map(x=>+x.toFixed(1))},null,1))
  await ctx.close()
 }
}finally{await browser.close()}
