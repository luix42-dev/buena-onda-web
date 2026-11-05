// Moving capture of the look (real-time browser rendering, no broadcast audio in the file).
// node scripts/look-motion.mjs <baseUrl> <outDir> <meters> <seconds> [view]
import {createRequire} from 'node:module'
import {mkdir,rename,writeFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import path from 'node:path'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const [base='http://127.0.0.1:3067',out='docs/cruise/look-20261021/motion',metersArg='1240',secondsArg='16',view='low']=process.argv.slice(2)
const ffmpeg=path.join(process.env.LOCALAPPDATA,'ms-playwright','ffmpeg-1011','ffmpeg-win64.exe')
await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']}),report={at:new Date().toISOString(),base,view,meters:Number(metersArg),seconds:Number(secondsArg),clips:[]}
for(const [device,viewport]of[['desktop',{width:1280,height:720}],['phone',{width:390,height:844}]]){
 const context=await browser.newContext({viewport,isMobile:device==='phone',hasTouch:device==='phone',recordVideo:{dir:out,size:viewport}}),page=await context.newPage(),t0=Date.now()
 await page.goto(`${base}/cruise/prototype?diagnostics=1`,{waitUntil:'domcontentloaded',timeout:180000})
 await page.getByRole('button',{name:'Play Cruise',exact:true}).click({timeout:120000})
 await page.waitForFunction(()=>window.__jeepNight?.()?.ready&&window.__miamiGeo?.()?.routeLength>0,null,{timeout:180000})
 await page.locator('select[aria-label="Camera view"]').selectOption(view)
 await page.evaluate(m=>window.__miamiInspect(m),Number(metersArg));await page.waitForTimeout(2500)
 const start=(Date.now()-t0)/1000,frames=[]
 const sampler=setInterval(()=>page.evaluate(()=>window.__jeepNight()).then(s=>frames.push({fps:s.fps,dc:s.drawCalls,speed:s.speed,playing:s.playing})).catch(()=>{}),1000)
 await page.waitForTimeout(Number(secondsArg)*1000);clearInterval(sampler)
 const raw=await page.video().path();await context.close()
 const file=`${out}/look-${device}-${view}-moving.webm`
 // Trim the loading portion; Playwright's bundled ffmpeg decodes/encodes VP8 only.
 const r=spawnSync(ffmpeg,['-y','-ss',String(start),'-i',raw,'-t',secondsArg,'-c:v','libvpx','-b:v','2M',file],{encoding:'utf8'})
 if(r.status===0)await rename(raw,`${raw}.untrimmed.webm`).catch(()=>{})
 report.clips.push({device,file,trimmedFrom:start,ffmpegStatus:r.status,samples:frames})
}
await browser.close();await writeFile(`${out}/motion-report.json`,JSON.stringify(report,null,1))
console.log(JSON.stringify(report.clips.map(c=>({file:c.file,ff:c.ffmpegStatus,fps:c.samples.map(s=>Math.round(s.fps))}))))
