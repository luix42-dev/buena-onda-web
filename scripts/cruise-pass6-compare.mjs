// Read-only browser QA: production mutation requests and analytics are intercepted.
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))
const {chromium}=require('@playwright/test')
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1]}
const phase=arg('--phase','before'),only=arg('--only','local').split(','),perf=process.argv.includes('--perf'),seconds=+arg('--seconds',60),wantedTime=arg('--time',perf?'night':'')
const out=`docs/cruise/pass6/${phase}`;await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']})
const sizes={portrait:{width:390,height:844},landscape:{width:844,height:390},desktop:{width:1440,height:900}}
const selected=arg('--views','portrait,landscape,desktop').split(',')
const targets={original:'https://www.buenaondalifestyle.com/cruise',live:'https://www.buenaondalifestyle.com/cruise/miami-test',local:arg('--local-url','http://127.0.0.1:3040/cruise/miami-test')}
const report={phase,date:new Date().toISOString(),browser:browser.version(),physicalDevice:false,recording:!perf,notes:['Mutation requests intercepted; no production writes.','Original sunset and manual quality controls N/A if LaunchExperience is served.','Recorded runs are visual evidence, not benchmarks. JS heap is not GPU memory.'],runs:[]}
try{for(const target of only)for(const view of selected){
 const id=`${target}-${view}${perf?'-night-perf':''}`,viewport=sizes[view],errors=[],blocked=[]
 console.log('START',id)
 const ctx=await browser.newContext({viewport,deviceScaleFactor:view==='desktop'?1:3,isMobile:view!=='desktop',hasTouch:view!=='desktop',...(perf?{}:{recordVideo:{dir:out,size:viewport}})})
 await ctx.route('**/*',route=>{const req=route.request();if(!['GET','HEAD'].includes(req.method())||/google-analytics|googletagmanager|\/collect\?|vitals.vercel|vercel-insights/.test(req.url())){blocked.push({method:req.method(),path:new URL(req.url()).pathname});return route.fulfill({status:204,body:''})}return route.continue()})
 await ctx.addInitScript(()=>{localStorage.setItem('buena-onda-radio-help-v1','seen');window.__qaFrames=[];window.__qaGL=[];const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...a){const g=original.apply(this,a);if(g&&/webgl/.test(a[0])&&!window.__qaGL.includes(g))window.__qaGL.push(g);return g};let last=performance.now();function tick(t){window.__qaFrames.push(t-last);last=t;requestAnimationFrame(tick)}requestAnimationFrame(tick)})
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));const t0=Date.now()
 const r={id,url:targets[target],viewport,windowDpr:view==='desktop'?1:3,requestedStation:arg('--station','default'),errors,blocked};report.runs.push(r)
 const probe=()=>page.evaluate(()=>({state:window.__cruise?.()||null,dataset:{...(document.querySelector('[data-cruise]')?.dataset||{})},gl:window.__qaGL.filter(g=>g.canvas.width>100).map(g=>{const ext=g.getExtension('WEBGL_debug_renderer_info');return{renderer:ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',width:g.canvas.width,height:g.canvas.height,cssWidth:g.canvas.clientWidth,cssHeight:g.canvas.clientHeight}}),heapMB:performance.memory?.usedJSHeapSize/1048576,overflow:document.documentElement.scrollHeight>innerHeight+2,buttons:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden').map(e=>({name:e.getAttribute('aria-label')||e.textContent,rect:e.getBoundingClientRect().toJSON()}))}))
 try{
  r.http=(await page.goto(targets[target],{timeout:120000})).status()
  if(target==='original'){
   await page.waitForFunction(()=>document.querySelector('[data-vehicle-ready="true"]'),undefined,{timeout:120000})
   if(wantedTime==='night')await page.getByRole('button',{name:'Night Drive',exact:true}).click()
   await page.locator('.launch-start').click()
   await page.waitForFunction(()=>document.querySelector('[data-ready="true"][data-garage="false"]'),undefined,{timeout:120000})
  }else{
   await page.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:120000})
   if(await page.locator('.mm-tvgate').count())await page.locator('.mm-tvgate').click()
   else{await page.locator('.mm-go').click();await page.getByRole('button',{name:'Radio',exact:true}).click();await page.getByRole('button',{name:'Close radio',exact:true}).click()}
   if(arg('--station','')==='jolt'){
    await page.getByRole('button',{name:'Radio stations',exact:true}).click();await page.getByRole('button',{name:/Jolt/}).click();await page.getByRole('button',{name:'Close radio',exact:true}).click()
    // An isolated build has no owned playlist: its initial failure clears playback intent.
    // Selecting a station preserves that paused state, so use the real Play control to start it.
    await page.waitForFunction(()=>window.__cruise().playing||document.querySelector('.mm-now-text b')?.textContent==='Tap play to tune in'||window.__cruise().error,undefined,{timeout:12000})
    if(!(await probe()).state.playing)await page.getByRole('button',{name:'Play radio',exact:true}).click()
    await page.waitForFunction(()=>window.__cruise().playing&&window.__cruise().source==='live',undefined,{timeout:30000})
   }
   if(wantedTime){const timeButton=page.locator('button[aria-label="Change time of day"],button[aria-label^="Time of day:"]');for(let i=0;i<3&&(await probe()).state.time!==wantedTime;i++)await timeButton.click()}
  }
  if(target==='local' && arg('--quality','mobile')==='desktop'){await page.getByRole('button',{name:'Garage and options',exact:true}).click();await page.getByLabel('Quality',{exact:true}).selectOption('desktop');await page.getByRole('button',{name:'Close',exact:true}).click();}r.quality=arg('--quality','mobile');r.loadToReadyMs=Date.now()-t0;await page.waitForTimeout(3500)
  for(const cam of ['chase','driver']){
   if(target==='local'){await page.waitForFunction(()=>{const e=document.querySelector('.mm-fade');return e&&!e.classList.contains('on')&&Number(getComputedStyle(e).opacity)<.001});await page.evaluate(()=>{window.__streetDrive.paused=true;window.__streetDrive.distance=0});for(let attempt=0;attempt<6&&(await probe()).state.camera!==cam;attempt++)await page.locator('button[aria-label^="Camera:"]').first().click();await page.waitForTimeout(1800);}else if(cam==='driver'){await page.mouse.move(50,50);await page.locator('button[aria-label^="Change camera"],button[aria-label^="Camera:"]').first().click();await page.waitForTimeout(1800)}
   if(perf){await page.evaluate(()=>{if(window.__streetDrive){window.__streetDrive.distance=0;window.__streetDrive.paused=false;}window.__qaFrames=[];window.__qaCameras={};window.__qaCameraSample=true;const check=()=>{if(!window.__qaCameraSample)return;const cam=window.__cruise?.().camera;window.__qaCameras[cam]=(window.__qaCameras[cam]||0)+1;requestAnimationFrame(check)};requestAnimationFrame(check)});const start=Date.now();await page.waitForTimeout(seconds*1000);const frames=await page.evaluate(()=>window.__qaFrames),sorted=[...frames].sort((a,b)=>a-b);const windows=[];let total=0,n=0;for(const dt of frames){total+=dt;n++;if(total>=1000){windows.push(n*1000/total);total=0;n=0}}windows.sort((a,b)=>a-b);const sampledCameras=await page.evaluate(()=>{window.__qaCameraSample=false;return window.__qaCameras});r[cam]={...(await probe()),sampledCameras,seconds:(Date.now()-start)/1000,frames:frames.length,meanFps:frames.length*1000/frames.reduce((a,b)=>a+b,0),p95FrameMs:sorted[Math.floor(sorted.length*.95)],p5Fps:windows[Math.floor(windows.length*.05)],maxFrameMs:sorted.at(-1),stallsOver250ms:frames.filter(x=>x>250).length};console.log('MEASURED',id,cam,r[cam].meanFps.toFixed(2));if(target==='local'&&Object.keys(sampledCameras).some(c=>c!==cam))throw Error('Camera changed during '+cam+' benchmark')}
   else{if(target==='local')await page.evaluate(()=>{if(window.__streetDrive){window.__streetDrive.distance=40;window.__streetDrive.paused=true;}});await page.waitForTimeout(5000);await page.mouse.move(viewport.width/2,viewport.height/2);r[cam]=await probe();await page.screenshot({path:`${out}/${id}-${cam}.png`})}
  }
 }catch(e){r.failure=e.message;r.failureProbe=await probe().catch(()=>null);console.log('FAIL',id,e.message.slice(0,150))}
 const video=page.video();await ctx.close();if(video){r.video=`${id}.webm`;await video.saveAs(`${out}/${r.video}`);await video.delete()}
 await writeFile(`${out}/${id}.json`,JSON.stringify({...r,browser:report.browser,date:report.date,physicalDevice:false,recording:!perf},null,2))
 await writeFile(`${out}/${perf?'performance':'comparison'}.json`,JSON.stringify(report,null,2));console.log('DONE',id)
}}finally{await browser.close();if(report.runs.some(r=>r.failure||r.errors.length))process.exitCode=1}
