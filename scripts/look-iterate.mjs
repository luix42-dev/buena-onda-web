// Fast look iteration: hero inventory + parked shots on a hero straight.
// node scripts/look-iterate.mjs <baseUrl> <outDir> <tag> [query] [viewport WxH] [views]
import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const [base='http://127.0.0.1:3067',out='docs/cruise/look-20261021/iterate',tag='a',query='',vp='1280x720',viewsArg='low,driver',metersArg='']=process.argv.slice(2)
const [width,height]=vp.split('x').map(Number),phone=width<height
await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']})
const page=await(await browser.newContext({viewport:{width,height},isMobile:phone,hasTouch:phone})).newPage()
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,300))})
await page.goto(`${base}/cruise/prototype?diagnostics=1${query}`,{waitUntil:'domcontentloaded',timeout:300000})
await page.getByRole('button',{name:'Play Cruise',exact:true}).click({timeout:300000})
await page.waitForFunction(()=>window.__jeepNight?.()?.ready&&window.__miamiGeo?.()?.routeLength>0&&window.__miamiAds,null,{timeout:300000})
const heroes=await page.evaluate(()=>window.__miamiAds().placements.filter(p=>p.surface==='hero').map(p=>({id:p.id,start:p.runStart,end:p.routeMeters,street:p.street})))
console.log('heroes',JSON.stringify(heroes))
const meters=metersArg?metersArg.split(',').map(Number):heroes.slice(0,2).map(h=>h.start+Math.min(120,(h.end-h.start)*.4))
for(const m of meters)for(const view of viewsArg.split(',')){
 await page.locator('select[aria-label="Camera view"]').selectOption(view)
 await page.evaluate(m=>window.__miamiInspect(m),m)
 if(!(await page.evaluate(()=>window.__jeepNight().paused))){await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Space')}
 await page.waitForTimeout(3000)
 await page.screenshot({path:`${out}/${tag}-${vp}-${view}-${Math.round(m)}m.png`})
 const s=await page.evaluate(()=>({fps:window.__jeepNight().fps,dc:window.__jeepNight().drawCalls,ads:window.__miamiAds().samples.filter(x=>x.visible).map(x=>[x.placement.id,x.placement.campaign.id,Math.round(x.distance),x.readable]),perf:window.__miamiAds().performance}))
 console.log(view,Math.round(m),JSON.stringify(s))
 await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Space')
}
console.log('errors',errors.slice(0,8))
await browser.close()
