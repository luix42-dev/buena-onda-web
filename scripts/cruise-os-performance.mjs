import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))
const {chromium}=require('@playwright/test')
const seconds=Math.max(60,Math.min(180,Number(process.env.PERF_SECONDS)||120))
const out=process.env.PERF_OUT||'docs/cruise/os/evidence/performance'
await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--autoplay-policy=document-user-activation-required']})
const report={date:new Date().toISOString(),browser:browser.version(),viewport:{width:1280,height:720},browserDpr:1,quality:'auto',sampling:'One-second scene FPS averages, ten warm-up samples excluded. Sequential fresh browser contexts. Production servers, same car and route start. No other automated browser/build during measurement.',limitations:'Not physical-device, per-frame, full-loop or thermal validation. JS heap excludes GPU memory. One trial per variant; external streams/network remain variable.',runs:[]}
try{
 for(const [name,url] of [['original','http://127.0.0.1:3077/cruise/experience'],['os',process.env.OS_URL||'http://127.0.0.1:3081/cruise/os']].filter(([name])=>!process.env.PERF_VARIANT||process.env.PERF_VARIANT===name)){
  const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1})
  await context.addInitScript(()=>{window.__osLongTasks=[];try{new PerformanceObserver(list=>{for(const entry of list.getEntries())if(window.__osLongTasks.length<500)window.__osLongTasks.push({start:entry.startTime,duration:entry.duration})}).observe({type:'longtask',buffered:true})}catch{}})
  const page=await context.newPage(),run={name,url,errors:[],consoleErrors:[],samples:[]};report.runs.push(run)
  page.on('pageerror',e=>run.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')run.consoleErrors.push(m.text().slice(0,250))})
  try{
   const nav=Date.now();await page.goto(`${url}?diagnostics=1`,{waitUntil:'domcontentloaded',timeout:180000});run.domReadyMs=Date.now()-nav
   const start=page.getByRole('button',{name:'Start Cruising',exact:true});await start.waitFor({timeout:180000});run.startAvailableMs=Date.now()-nav
   await start.click();const launched=Date.now()
   await page.waitForFunction(()=>window.__jeepNight?.()?.ready&&window.__miamiGeo?.()?.routeLength>0,null,{timeout:120000});run.vehicleAndRouteReadyMs=Date.now()-launched
   for(let second=1;second<=seconds;second++){
    await page.waitForTimeout(1000)
    run.samples.push(await page.evaluate(()=>({drive:window.__jeepNight?.(),geo:window.__miamiGeo?.(),heap:performance.memory?.usedJSHeapSize,at:performance.now(),overflow:document.documentElement.scrollWidth>innerWidth})))
    if(second===15||second===seconds)await page.screenshot({path:`${out}/${name}-${second}s.png`})
   }
   run.wallSeconds=(Date.now()-launched)/1000
   const samples=run.samples.slice(10).filter(s=>s.drive?.ready&&s.drive?.fps>0),fps=samples.map(s=>s.drive.fps),sorted=[...fps].sort((a,b)=>a-b)
   run.metrics={samples:fps.length,averageFps:fps.reduce((a,b)=>a+b,0)/fps.length,minOneSecondAverageFps:sorted[0],p5OneSecondAverageFps:sorted[Math.floor(sorted.length*.05)],samplesBelow30:fps.filter(x=>x<30).length,dprRange:[Math.min(...samples.map(s=>s.drive.renderDpr)),Math.max(...samples.map(s=>s.drive.renderDpr))],maxJsHeapBytes:Math.max(...samples.map(s=>s.heap||0)),drivenMeters:run.samples.at(-1)?.drive?.distance-run.samples[0]?.drive?.distance}
   run.renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null})
   run.longTasks=await page.evaluate(()=>window.__osLongTasks)
   run.checks={sceneMoves:run.metrics.drivenMeters>100,audioPlaying:run.samples.at(-1)?.drive?.playing===true,noPageErrors:!run.errors.length,noOverflow:run.samples.every(s=>!s.overflow)}
  }catch(error){run.failure=error.stack||String(error)}
  await context.close();await writeFile(`${out}/results.json`,JSON.stringify(report,null,2))
 }
}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report.runs.map(({name,metrics,checks,failure})=>({name,metrics,checks,failure})),null,2))}
