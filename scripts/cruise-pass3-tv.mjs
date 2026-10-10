// Pass 3 Gate 5 TV-mode emulation soak. Usage: node scripts/cruise-pass3-tv.mjs [--minutes 6] [--skip4k]
// Emulation only: no physical TV, Chromecast or AirPlay. FPS here is from the in-page status (hardware GL only if renderer says Intel).
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:d}
const minutes=+arg('--minutes',6),out='docs/cruise/pass3/perf';await mkdir(out,{recursive:true})
const URL_='http://127.0.0.1:3040/cruise/miami-test?tv=1'
const probeGL=()=>{const g=document.createElement('canvas').getContext('webgl2');const e=g?.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'?'}
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--enable-webgl','--autoplay-policy=no-user-gesture-required']})
const R={browser:'Edge '+browser.version(),notes:[],physicalDevices:'BLOCKED — PHYSICAL DEVICE REQUIRED (TV / Chromecast / AirPlay)'}
try{
 const ctx=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1}),page=await ctx.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,200))})
 await page.goto(URL_,{timeout:240000})
 const gate=page.locator('.mm-tvgate');await gate.waitFor({timeout:60000})
 await page.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:240000})
 R.renderer=await page.evaluate(probeGL)
 R.gate={visible:await gate.isVisible(),focused:await page.evaluate(()=>document.activeElement?.classList.contains('mm-tvgate')),text:(await gate.innerText()).replace(/\n/g,' / ')}
 await page.screenshot({path:`${out}/tv-gate-1080p.png`})
 await page.keyboard.press('Enter') // gate is focused; Enter activates button
 await page.waitForTimeout(100)
 if(await gate.count())await gate.click().catch(()=>{})
 await page.waitForTimeout(3000)
 R.afterGate={gateGone:(await gate.count())===0,state:await page.evaluate(()=>window.__cruise()),uiButtons:await page.evaluate(()=>[...document.querySelectorAll('main button, main select, main nav')].filter(e=>e.offsetParent).map(e=>(e.getAttribute('aria-label')||e.textContent||e.tagName).slice(0,30)))}
 await page.screenshot({path:`${out}/tv-driving-1080p.png`})
 // keyboard checks
 const s0=await page.evaluate(()=>window.__cruise());await page.keyboard.press('Enter');await page.waitForTimeout(800);const s1=await page.evaluate(()=>window.__cruise());await page.keyboard.press('Enter');await page.waitForTimeout(800);const s2=await page.evaluate(()=>window.__cruise())
 R.keys={enterToggle:{before:s0.playing,afterOne:s1.playing,afterTwo:s2.playing,ok:s0.playing!==s1.playing&&s2.playing===s0.playing}}
 await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ChannelUp'})));await page.waitForTimeout(1500);const u=await page.evaluate(()=>window.__cruise())
 await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ChannelDown'})));await page.waitForTimeout(1500);const d=await page.evaluate(()=>window.__cruise())
 R.keys.channel={start:s2.station,up:u.station,down:d.station,ok:u.station!==s2.station&&d.station===s2.station}
 await page.waitForTimeout(2000);R.keys.playingAfterKeys=(await page.evaluate(()=>window.__cruise())).playing
 // soak
 const log=[],t0=Date.now();let lastD=0,loops=0,cams=new Set()
 while(Date.now()-t0<minutes*60000){
  const x=await page.evaluate(()=>({c:window.__cruise(),status:document.querySelector('.mm-status span')?.textContent||'',heap:performance.memory?.usedJSHeapSize/1048576,restarts:(window.__streetEvents||[]).filter(e=>e.type==='restart').length,fade:document.querySelector('.mm-fade')?.classList.contains('on')}))
  const fps=+(x.status.match(/(\d+) FPS/)?.[1]??NaN)
  if(x.c.distance<lastD-50)loops++;lastD=x.c.distance;cams.add(x.c.camera)
  log.push({t:Math.round((Date.now()-t0)/1000),playing:x.c.playing,source:x.c.source,station:x.c.station,track:x.c.track,camera:x.c.camera,distance:x.c.distance,fps,heapMB:x.heap&&+x.heap.toFixed(1),restarts:x.restarts,fade:x.fade})
  await page.waitForTimeout(5000)
 }
 const xs=log.map(l=>l.t/60),ys=log.map(l=>l.heapMB).filter(v=>v!=null),n=ys.length,mx=xs.slice(0,n).reduce((a,b)=>a+b)/n,my=ys.reduce((a,b)=>a+b)/n
 const slope=ys.reduce((a,y,i)=>a+(xs[i]-mx)*(y-my),0)/xs.slice(0,n).reduce((a,x)=>a+(x-mx)**2,0)
 const fp=log.map(l=>l.fps).filter(Number.isFinite)
 R.soak={minutes,samples:log.length,loopsObserved:loops,maxRestartEvents:Math.max(...log.map(l=>l.restarts)),camerasSeen:[...cams],playingAlways:log.every(l=>l.playing),playingFalseCount:log.filter(l=>!l.playing).length,stations:[...new Set(log.map(l=>l.station))],sources:[...new Set(log.map(l=>l.source))],heapStartMB:ys[0],heapEndMB:ys.at(-1),heapMaxMB:Math.max(...ys),heapSlopeMBperMin:+slope.toFixed(2),meanFps:+(fp.reduce((a,b)=>a+b,0)/fp.length).toFixed(1),minFps:Math.min(...fp),fadeSeen:log.some(l=>l.fade),errors}
 R.log=log;await writeFile(`${out}/tv-soak.json`,JSON.stringify(R,null,1))
 await ctx.close()
 if(!process.argv.includes('--skip4k')){
  try{const c2=await browser.newContext({viewport:{width:3840,height:2160},deviceScaleFactor:1}),p2=await c2.newPage();await p2.goto(URL_,{timeout:240000});await p2.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:240000});await p2.keyboard.press('Enter');await p2.waitForTimeout(8000);await p2.screenshot({path:`${out}/tv-driving-4k.png`});R.shot4k='tv-driving-4k.png';await c2.close()}catch(e){R.shot4k='FAILED: '+e.message.slice(0,150)}
  await writeFile(`${out}/tv-soak.json`,JSON.stringify(R,null,1))
 }
 console.log(JSON.stringify({...R,log:undefined},null,1))
}finally{await browser.close()}
