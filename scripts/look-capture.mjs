// Matched still captures for the "Look" milestone.
// node scripts/look-capture.mjs <baseUrl> <outDir> <label> [meters,...] [query]
// Same route meters, Night, parked, for every camera the build offers.
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const [base='http://127.0.0.1:3097',out='docs/cruise/look-20261021/capture',label='before',metersArg='113.54,1460',query='']=process.argv.slice(2)
const meters=metersArg.split(',').map(Number)
const viewports=[['desktop',{width:1280,height:720}],['phone',{width:390,height:844}]]
await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']})
const report={at:new Date().toISOString(),base,label,shots:[],errors:[]}
for(const [device,viewport]of viewports){
 const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:device==='phone',hasTouch:device==='phone'}),page=await context.newPage()
 page.on('pageerror',e=>report.errors.push(`${device}: ${e.message}`))
 page.on('response',r=>{if(r.status()>=400)report.errors.push(`${device} HTTP ${r.status()} ${r.url()}`)})
 page.on('console',m=>{if(m.type()==='error'||/context lost|CONTEXT_LOST/i.test(m.text()))report.errors.push(`${device} console: ${m.text().slice(0,200)}`)})
 await page.addInitScript(()=>{window.__contextLost=0;document.addEventListener('webglcontextlost',()=>{window.__contextLost++},true)})
 const t0=Date.now()
 await page.goto(`${base}/cruise/prototype?diagnostics=1${query}`,{waitUntil:'domcontentloaded',timeout:180000})
 await page.getByRole('button',{name:'Play Cruise',exact:true}).click({timeout:120000})
 await page.waitForFunction(()=>window.__jeepNight?.()?.ready&&window.__miamiGeo?.()?.routeLength>0,null,{timeout:180000})
 report[`${device}ReadyMs`]=Date.now()-t0
 const views=await page.locator('select[aria-label="Camera view"] option').evaluateAll(o=>o.map(x=>x.value)).catch(()=>[])
 for(const m of meters){
  for(const view of views){
   await page.locator('select[aria-label="Camera view"]').selectOption(view)
   await page.evaluate(m=>window.__miamiInspect(m),m)
   await page.evaluate(()=>{const s=window.__jeepNight();return s}).then(s=>{if(!s.paused)return page.evaluate(()=>document.activeElement?.blur()).then(()=>page.keyboard.press('Space'))})
   await page.waitForTimeout(3500)
   const file=`${out}/${label}-${device}-${view}-${Math.round(m)}m.png`
   await page.screenshot({path:file})
   const s=await page.evaluate(()=>({...window.__jeepNight(),geo:window.__miamiGeo()}))
   const lost=await page.evaluate(()=>window.__contextLost)
   report.shots.push({file,device,view,meters:m,contextLost:lost,fps:s.fps,drawCalls:s.drawCalls,renderDpr:s.renderDpr,street:s.geo.street,timeMode:s.timeMode,paused:s.paused})
   // Resume so the next teleport re-parks from a moving state.
   await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Space');await page.waitForTimeout(300)
  }
 }
 await context.close()
}
await browser.close()
await writeFile(`${out}/${label}-report.json`,JSON.stringify(report,null,1))
console.log(JSON.stringify(report.shots.map(s=>[s.file.split('/').pop(),s.view,Math.round(s.fps),s.drawCalls,s.contextLost]),null,0),report.errors.slice(0,10))
