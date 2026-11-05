// Continuous drive trial in the handoff's format, plus audio-continuity toggles.
// node scripts/look-soak.mjs <baseUrl> <outFile> <seconds> <view> [toggles=1]
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
import path from 'node:path'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const [base='http://127.0.0.1:3067',outFile='docs/cruise/look-20261021/perf/soak.json',secondsArg='600',view='driver',toggles='1']=process.argv.slice(2)
await mkdir(path.dirname(outFile),{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']})
const report={at:new Date().toISOString(),base,browser:browser.version(),viewport:{width:1280,height:720},dpr:1,quality:'auto',view,seconds:Number(secondsArg),errors:[],contextLost:0,toggles:[],samples:[]}
const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1}),page=await context.newPage()
page.on('pageerror',e=>report.errors.push(e.message))
await page.addInitScript(()=>{window.__reviewAudio=[];const Native=window.Audio;window.Audio=new Proxy(Native,{construct(target,args){const a=new target(...args);window.__reviewAudio.push(a);return a}});window.__lost=0;document.addEventListener('webglcontextlost',()=>{window.__lost++},true)})
const snap=()=>page.evaluate(()=>{const d=window.__jeepNight?.(),a=window.__reviewAudio.filter(x=>x.currentSrc);return{at:Date.now(),fps:d?.fps,drawCalls:d?.drawCalls,renderDpr:d?.renderDpr,odometer:d?.distance,view:d?.camera,playing:d?.playing,station:d?.station,audio:a.map(x=>({t:x.currentTime,paused:x.paused,src:x.currentSrc.slice(0,60)})),heap:performance.memory?.usedJSHeapSize,lost:window.__lost,ads:window.__miamiAds?.().performance}})
const save=()=>writeFile(outFile,JSON.stringify(report,null,1))
try{
 const begin=Date.now()
 await page.goto(`${base}/cruise/prototype?diagnostics=1`,{waitUntil:'domcontentloaded',timeout:180000})
 await page.getByRole('button',{name:'Play Cruise',exact:true}).click({timeout:120000})
 await page.waitForFunction(()=>window.__jeepNight?.()?.ready&&window.__miamiGeo?.()?.routeLength>0,null,{timeout:180000})
 report.readyMs=Date.now()-begin
 await page.waitForTimeout(10000)
 if(toggles==='1'){
  // Audio must never reset: the same element keeps advancing through every toggle.
  const step=async(name,act)=>{const before=await snap();await act();await page.waitForTimeout(2500);const after=await snap();const a=before.audio[0],b=after.audio[0]
   report.toggles.push({name,elementsBefore:before.audio.length,elementsAfter:after.audio.length,sameSrc:a?.src===b?.src,advanced:!!a&&!!b&&b.t>a.t,before:a,after:b})}
  const views=await page.locator('select[aria-label="Camera view"] option').evaluateAll(o=>o.map(x=>x.value))
  for(const v of views)await step(`camera:${v}`,()=>page.locator('select[aria-label="Camera view"]').selectOption(v))
  const settings=async()=>{await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click()}
  for(const q of['low','high','auto'])await step(`quality:${q}`,async()=>{await settings();await page.getByLabel('Scenery quality').selectOption(q);await page.getByRole('button',{name:'Close menu',exact:true}).click()})
  await step('3d:off',async()=>{await settings();await page.getByRole('button',{name:'Listen without 3D',exact:true}).click()})
  await step('3d:on',async()=>{await page.getByRole('button',{name:'Return to scenery'}).first().click();await page.getByRole('button',{name:'Close menu',exact:true}).click({timeout:5000}).catch(()=>{})})
  await step('tv:on',async()=>{await page.getByRole('button',{name:'Phone & TV',exact:true}).click();await page.getByLabel('TV presentation',{exact:true}).check();await page.getByRole('button',{name:'Close help',exact:true}).click()})
  report.tvSwitchedView=(await snap()).view
  await step('tv:off',async()=>{await page.getByRole('button',{name:'Phone & TV',exact:true}).click();await page.getByLabel('TV presentation',{exact:true}).uncheck();await page.getByRole('button',{name:'Close help',exact:true}).click()})
  await page.evaluate(()=>document.activeElement?.blur())
 }
 await page.locator('select[aria-label="Camera view"]').selectOption(view);await page.evaluate(()=>document.activeElement?.blur())
 await page.waitForTimeout(3000)
 const start=Date.now()
 while(Date.now()-start<Number(secondsArg)*1000){report.samples.push(await snap());if(report.samples.length%12===0)await save();await page.waitForTimeout(5000)}
 report.elapsedSeconds=(Date.now()-start)/1000
}catch(e){report.errors.push('harness: '+e.message)}
const fps=report.samples.map(s=>s.fps).filter(Number.isFinite).sort((a,b)=>a-b),dc=report.samples.map(s=>s.drawCalls)
const audio=report.samples.map(s=>s.audio[0]?.t).filter(Number.isFinite)
report.summary={samples:report.samples.length,fpsMean:fps.reduce((a,b)=>a+b,0)/fps.length,fpsP5:fps[Math.floor(fps.length*.05)],fpsMin:fps[0],fpsMax:fps.at(-1),drawCalls:[Math.min(...dc),Math.max(...dc)],dpr:[...new Set(report.samples.map(s=>s.renderDpr))],maxHeapMiB:Math.max(...report.samples.map(s=>s.heap||0))/1048576,
 km:(report.samples.at(-1)?.odometer-report.samples[0]?.odometer)/1000,nonAdvancingAudioIntervals:audio.slice(1).filter((t,i)=>t<=audio[i]).length,audioSamples:audio.length,contextLost:report.samples.at(-1)?.lost,adMeasureAvgMs:report.samples.at(-1)?.ads?.averageMs,adMeasureMaxMs:report.samples.at(-1)?.ads?.maxMs,readyMs:report.readyMs,pageErrors:report.errors.length}
await save();await browser.close()
console.log(JSON.stringify({summary:report.summary,toggles:report.toggles.map(t=>[t.name,t.elementsBefore,t.elementsAfter,t.sameSrc,t.advanced]),tvView:report.tvSwitchedView,errors:report.errors.slice(0,5)}))
