import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))
const {chromium}=require('@playwright/test')
const out='docs/cruise/feedback/soak';await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']})
const report={date:new Date().toISOString(),browser:browser.version(),physicalDevice:false,viewport:{width:1440,height:900},windowDpr:1,quality:'mobile',sky:'night',camera:'director',station:'The Lot Radio',durationSeconds:600,errors:[],samples:[],notes:['One desktop Edge GPU browser; emulation, not a phone.','JS heap and WebGL resource counts are indicators, not GPU memory or proof against all leaks.','Frame-rate changes across Director views cannot be treated as a fixed-camera benchmark.','No production mutations; public live audio only.']}
let page
try{
 const ctx=await browser.newContext({viewport:report.viewport})
 await ctx.route('**/*',r=>!['GET','HEAD'].includes(r.request().method())||/google-analytics|googletagmanager|vercel-insights/.test(r.request().url())?r.fulfill({status:204,body:''}):r.continue())
 page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message))
 await page.goto('http://127.0.0.1:3041/cruise/miami-test?profile=1',{timeout:120000});await page.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:120000});await page.locator('.mm-tvgate').click()
 await page.getByRole('button',{name:'Radio stations',exact:true}).click();await page.getByRole('button',{name:/The Lot Radio/}).click();await page.getByRole('button',{name:'Close radio',exact:true}).click();await page.waitForTimeout(2000)
 if(!await page.evaluate(()=>window.__cruise().requested))await page.getByRole('button',{name:'Play radio',exact:true}).click()
 await page.waitForFunction(()=>window.__cruise().playing&&window.__cruise().source==='live',undefined,{timeout:30000})
 for(let i=0;i<3&&await page.evaluate(()=>window.__cruise().time)!=='night';i++)await page.locator('button[aria-label^="Time of day:"]').click()
 await page.getByRole('button',{name:'Garage and options',exact:true}).click();await page.getByRole('button',{name:'Auto director (cinematic cameras)',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click()
 await page.evaluate(()=>{window.__streetDrive.distance=0;window.__streetDrive.paused=false;const p=window.__soak={frames:[],resets:[],last:performance.now(),distance:0,playingFailures:0,contextLost:false};document.querySelector('.mm-stage canvas').addEventListener('webglcontextlost',()=>p.contextLost=true);const tick=t=>{const s=window.__cruise();p.frames.push(t-p.last);p.last=t;if(s.distance<p.distance-100)p.resets.push({time:t,distance:s.distance,opacity:Number(getComputedStyle(document.querySelector('.mm-fade')).opacity)});if(!s.playing)p.playingFailures++;p.distance=s.distance;p.raf=requestAnimationFrame(tick)};p.raf=requestAnimationFrame(tick)})
 const started=Date.now()
 for(let i=0;i<20;i++){
  await page.waitForTimeout(Math.max(0,started+(i+1)*30000-Date.now()))
  const s=await page.evaluate(()=>{const p=window.__soak,frames=p.frames.splice(0),sorted=[...frames].sort((a,b)=>a-b),{gl}=window.__three,e=gl.getContext().getExtension('WEBGL_debug_renderer_info');return{state:window.__cruise(),meanFps:frames.length*1000/frames.reduce((a,b)=>a+b,0),p95FrameMs:sorted[Math.floor(sorted.length*.95)],maxFrameMs:sorted.at(-1),heapMB:performance.memory?.usedJSHeapSize/1048576,resources:{...gl.info.memory},drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles,rendererDpr:gl.getPixelRatio(),buffer:[gl.domElement.width,gl.domElement.height],gpu:e?gl.getContext().getParameter(e.UNMASKED_RENDERER_WEBGL):'unknown',resets:[...p.resets],playingFailures:p.playingFailures,contextLost:p.contextLost}})
  s.elapsedSeconds=(Date.now()-started)/1000;report.samples.push(s);console.log('SOAK',Math.round(s.elapsedSeconds),s.state.camera,s.meanFps.toFixed(1),'FPS',s.heapMB?.toFixed(1),'MB',s.resets.length,'loops')
  if([0,9,19].includes(i))await page.screenshot({path:`${out}/at-${(i+1)*30}s.png`})
  await writeFile(out+'/results.json',JSON.stringify(report,null,2))
 }
 report.actualDurationSeconds=(Date.now()-started)/1000
 const end=report.samples.at(-1);report.passed=report.errors.length===0&&!end.contextLost&&end.playingFailures===0&&end.resets.length>=2&&end.resets.every(r=>r.opacity>=.999)
 await page.evaluate(()=>cancelAnimationFrame(window.__soak.raf));await ctx.close()
}catch(e){report.errors.push(e.stack);report.passed=false;console.error(e.message)}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1}
