import {createRequire} from 'node:module'
import {mkdir,writeFile,rename} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const out='docs/cruise/prototype-20261020/capture';await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl']})
const report={at:new Date().toISOString(),errors:[],notes:'Real browser rendering, staged existing route position for comparison/capture. No recorded station audio. This is not the continuous soak performance trial.'}
try{
 let meters
 for(const variant of ['prototype','before']){
  const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,...(variant==='prototype'?{recordVideo:{dir:out,size:{width:1280,height:720}}}:{})})
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message))
  await page.goto(`http://127.0.0.1:${variant==='prototype'?'3097/cruise/prototype':'3096/cruise/os'}?diagnostics=1&visual=rooms&car=countach&time=night`,{waitUntil:'domcontentloaded',timeout:180000})
  await page.waitForFunction(()=>window.__jeepNight?.()?.ready,null,{timeout:180000})
  await page.screenshot({path:`${out}/${variant}-loaded-entry.png`})
  await page.getByRole('button',{name:variant==='prototype'?'Play Cruise':'Start the drive',exact:true}).click()
  await page.waitForFunction(()=>window.__miamiGeo?.()?.routeLength>0,null,{timeout:120000})
  if(variant==='prototype')report.renderer=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c?.getContext('webgl2')||c?.getContext('webgl');if(!gl)return null;const e=gl.getExtension('WEBGL_debug_renderer_info');return{vendor:e?gl.getParameter(e.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}})
  if(variant==='prototype'){
   await page.waitForFunction(()=>window.__miamiAds?.()?.placements.length>0,null,{timeout:30000})
   meters=await page.evaluate(()=>window.__miamiAds().placements.find(p=>p.surface==='billboard')?.routeMeters-60)
   if(!Number.isFinite(meters))throw Error('No real billboard position available')
   report.captureRouteMeters=meters
  }
  await page.evaluate(m=>window.__miamiInspect(m),meters)
  await page.getByRole('button',{name:'Dismiss radio guide',exact:true}).click().catch(()=>{})
  await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Space');await page.waitForTimeout(2500)
  await page.screenshot({path:`${out}/${variant}-matching-cockpit.png`})
  if(variant==='prototype'){
   report.parked=await page.evaluate(()=>({drive:window.__jeepNight(),feel:window.__countachFeel?.()}))
   await page.getByLabel('Camera view',{exact:true}).selectOption('chase')
   await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Space')
   await page.evaluate(()=>{window.__captureFrames=[];window.__captureDone=false;let last;function sample(t){if(last)window.__captureFrames.push(t-last);last=t;if(!window.__captureDone)requestAnimationFrame(sample)}requestAnimationFrame(sample)})
   await page.waitForTimeout(20000)
   report.recordingFrameIntervals=await page.evaluate(()=>{window.__captureDone=true;const d=window.__captureFrames.slice().sort((a,b)=>a-b);return{count:d.length,medianMs:d[Math.floor(d.length*.5)],p95Ms:d[Math.floor(d.length*.95)],maxMs:d.at(-1),note:'rAF interval proxy during video recording, not GPU timestamps or the20-minute soak.'}})
   report.adState=await page.evaluate(()=>{const s=window.__miamiAds();return{placements:s.placements.length,performance:s.performance,samples:s.samples.filter(s=>s.visible).map(s=>({id:s.placement.id,campaign:s.placement.campaign.name,viewable:s.viewable,readable:s.readable,duration:s.visibleDurationMs,width:s.pixelWidth,height:s.pixelHeight,occlusion:s.occlusion}))}})
   await page.screenshot({path:`${out}/drive-advertising.png`})
   const video=page.video();await context.close();report.rawVideo=await video.path()
   const ffmpeg=path.join(process.env.LOCALAPPDATA,'ms-playwright','ffmpeg-1011','ffmpeg-win64.exe')
   // Take the final18seconds of actual moving gameplay; no music is embedded.
   execFileSync(ffmpeg,['-y','-sseof','-18','-i',report.rawVideo,'-an','-c:v','libvpx','-b:v','1800k',`${out}/cruise-drive-18s.webm`],{stdio:'pipe'})
  }else await context.close()
 }
}catch(e){report.failure=String(e);throw e}finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close()}
