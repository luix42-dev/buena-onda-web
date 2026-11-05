import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))
const {chromium}=require('@playwright/test')
const out='docs/cruise/os/visual-20261020/performance'
await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl']})
const report={at:new Date().toISOString(),browser:browser.version(),viewport:{width:1280,height:720},dpr:1,quality:'auto',limitations:'One 30-second moving trial per variant after five-second warmup, Windows headless Edge; not physical mobile, full-loop or thermal testing. FPS values are scene one-second averages; JS heap is not GPU memory.',runs:[]}
try{
 for(const [name,url] of [['original','http://127.0.0.1:3081/cruise/os'],['rooms','http://127.0.0.1:3096/cruise/os?visual=rooms']]){
  const page=await browser.newPage({viewport:report.viewport,deviceScaleFactor:1})
  await page.addInitScript(()=>{window.__visualAudio=[];const NativeAudio=window.Audio;window.Audio=new Proxy(NativeAudio,{construct(target,args){const audio=new target(...args);window.__visualAudio.push(audio);return audio}})})
  const run={name,errors:[],samples:[]};report.runs.push(run)
  page.on('pageerror',e=>run.errors.push(e.message))
  const nav=Date.now()
  await page.goto(url+(url.includes('?')?'&':'?')+'diagnostics=1&at=17.5&time=night',{waitUntil:'domcontentloaded',timeout:120000})
  await page.getByRole('button',{name:'Start the drive',exact:true}).click({timeout:60000})
  await page.waitForFunction(()=>window.__jeepNight?.()?.ready&&window.__miamiGeo?.()?.routeLength>0,null,{timeout:120000})
  run.readyMs=Date.now()-nav
  await page.waitForTimeout(5000)
  for(let i=0;i<30;i++){
   await page.waitForTimeout(1000)
   run.samples.push(await page.evaluate(()=>({drive:window.__jeepNight(),geo:window.__miamiGeo(),heap:performance.memory?.usedJSHeapSize})))
  }
  await page.screenshot({path:`${out}/${name}-moving.png`})
  const fps=run.samples.map(s=>s.drive.fps).sort((a,b)=>a-b)
  run.metrics={averageFps:fps.reduce((a,b)=>a+b,0)/fps.length,p5OneSecondFps:fps[Math.floor(fps.length*.05)],minimumOneSecondFps:fps[0],dpr:[...new Set(run.samples.map(s=>s.drive.renderDpr))],drawCalls:[Math.min(...run.samples.map(s=>s.drive.drawCalls)),Math.max(...run.samples.map(s=>s.drive.drawCalls))],drivenMeters:run.samples.at(-1).drive.distance-run.samples[0].drive.distance,maxJsHeapBytes:Math.max(...run.samples.map(s=>s.heap||0))}
  const audio=()=>page.evaluate(()=>window.__visualAudio.map(a=>({time:a.currentTime,paused:a.paused,error:a.error?.code,src:a.currentSrc})))
  run.audioBefore=await audio()
  await page.mouse.click(600,100);await page.keyboard.press('v');await page.waitForTimeout(1500)
  run.afterCamera=await page.evaluate(()=>window.__jeepNight())
  await page.keyboard.press('r');await page.waitForTimeout(1500)
  run.afterRadio=await page.evaluate(()=>window.__jeepNight())
  run.stationDrawerVisible=await page.getByRole('dialog').filter({has:page.getByRole('button',{name:'Surprise me',exact:false})}).count()>0
  run.audioAfter=await audio()
  run.checks={moving:run.metrics.drivenMeters>30,noPageExceptions:run.errors.length===0,cameraChanges:run.afterCamera.camera==='chase',stationDrawerVisible:run.stationDrawerVisible,audioAdvancesAcrossViews:run.audioBefore.some((a,i)=>!a.paused&&run.audioAfter[i]?.src===a.src&&run.audioAfter[i]?.time>a.time)}
  await page.close();console.log(JSON.stringify({name,metrics:run.metrics,checks:run.checks}))
  await writeFile(`${out}/results.json`,JSON.stringify(report,null,2))
 }
}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(report,null,2))}
