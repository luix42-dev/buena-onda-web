// Local Next browser evidence. All mutation/analytics requests intercepted; video excludes radio audio.
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
import {cpus} from 'node:os'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))
const {chromium}=require('@playwright/test')
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1]}
const mode=arg('--mode','inspect'),target=arg('--target','lab'),seconds=Number(arg('--seconds',mode==='soak'?1800:300)),phase=arg('--phase',mode+'-'+target)
const out='docs/cruise/nightdrive/'+phase;await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']})
const viewport={width:1440,height:900},recording=mode==='journey'||mode==='inspect'
const report={date:new Date().toISOString(),mode,target,browser:browser.version(),viewport,physicalDevice:false,quality:'mobile',sky:'night',station:'jolt-radio',recording,notes:['Desktop Edge on Windows, phone viewports are emulation.','No production mutations. Video does not record third-party radio audio.','Own synthesized ambience recording is separate from radio.'],checks:[],errors:[],samples:[]}
let ctx,page,video
const check=(name,pass,detail)=>{report.checks.push({name,pass,detail});console.log(pass?'PASS':'FAIL',name)}
const state=()=>page.evaluate(()=>window.__nightdrive?.()||window.__cruise?.())
async function options(fn){await page.getByRole('button',{name:'Options',exact:true}).click();await fn();await page.getByRole('button',{name:'Close panel',exact:true}).click()}
async function camera(cam){if(target==='lab')await options(()=>page.getByLabel('Camera',{exact:true}).selectOption(cam));else for(let i=0;i<6&&(await state()).camera!==cam;i++)await page.locator('button[aria-label^="Camera:"]').first().click()}
async function ambient(on){await options(async()=>{const box=page.getByLabel('Ambiance',{exact:true});if(await box.isChecked()!==on)await box.click()})}
async function snapshot(name){const s=await state();await page.screenshot({path:out+'/'+name+'.png'});await writeFile(out+'/'+name+'.json',JSON.stringify(s,null,2));return s}
async function beginFrames(){await page.evaluate(()=>{window.__ndFrames={values:[],last:performance.now(),previous:0,resets:0,contextLost:false};const a=window.__ndFrames;document.querySelector('canvas').addEventListener('webglcontextlost',()=>a.contextLost=true);const tick=t=>{a.values.push(t-a.last);a.last=t;const s=window.__nightdrive?.()||window.__cruise?.();if(s.distance<a.previous-1)a.resets++;a.previous=s.distance;a.raf=requestAnimationFrame(tick)};a.raf=requestAnimationFrame(tick)})}
async function sample(){return page.evaluate(()=>{const a=window.__ndFrames,frames=a.values.splice(0),sorted=[...frames].sort((x,y)=>x-y),s=window.__nightdrive?.()||window.__cruise?.(),canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),ext=gl?.getExtension('WEBGL_debug_renderer_info');const windows=[];let n=0,t=0;for(const dt of frames){n++;t+=dt;if(t>=1000){windows.push(n*1000/t);n=0;t=0}}windows.sort((x,y)=>x-y);return{state:s,fps:frames.length*1000/frames.reduce((x,y)=>x+y,0),p5Fps:windows[Math.floor(windows.length*.05)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],maxFrameMs:sorted.at(-1),heapMB:performance.memory?.usedJSHeapSize/1048576,buffer:[canvas.width,canvas.height],windowDpr:devicePixelRatio,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',resets:a.resets,contextLost:a.contextLost}})}
async function startOwnRecording(){await page.evaluate(()=>{const stream=window.__nightAmbience?.recordingStream();if(!stream)return;const chunks=[];const rec=new MediaRecorder(stream,{mimeType:'audio/webm;codecs=opus'});rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};window.__ownAudio={rec,chunks};rec.start()})}
async function saveOwnRecording(){const data=await page.evaluate(async()=>{const a=window.__ownAudio;if(!a)return null;await new Promise(r=>{a.rec.onstop=r;a.rec.stop()});const bytes=new Uint8Array(await new Blob(a.chunks,{type:'audio/webm'}).arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text)});if(data)await writeFile(out+'/generated-ambience-only.webm',Buffer.from(data,'base64'))}
try{
 ctx=await browser.newContext({viewport,deviceScaleFactor:1,...(recording?{recordVideo:{dir:out,size:viewport}}:{})})
 await ctx.route('**/*',r=>!['GET','HEAD'].includes(r.request().method())||/google-analytics|googletagmanager|vercel-insights/.test(r.request().url())?r.fulfill({status:204,body:''}):r.continue())
 page=await ctx.newPage();video=page.video();page.on('pageerror',e=>report.errors.push(e.message))
 const t=Date.now(),url='http://127.0.0.1:3041/cruise/miami-test'+(target==='lab'?'/nightdrive?profile=1':'?profile=1')
 await page.goto(url,{timeout:120000});await page.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:120000})
 report.loadToReadyMs=Date.now()-t
 if(target==='lab'){
  const before=await state();check('Ambience locked before gesture',before.ambience.state==='locked'&&before.ambience.nodeCount===0,before.ambience)
  await page.keyboard.press('Tab')
  const gateState=await state()
  check('Keyboard gate focuses Start without unlocking audio',await page.getByRole('button',{name:'Start the Cruise',exact:true}).evaluate(el=>document.activeElement===el)&&!gateState.playing&&!gateState.requested&&gateState.ambience.state==='locked'&&gateState.ambience.nodeCount===0,gateState.ambience)
  await page.getByRole('button',{name:'Start the Cruise',exact:true}).click()
 }else{
  await page.locator('.mm-tvgate').click();await page.getByRole('button',{name:'Radio stations',exact:true}).click();await page.getByRole('button',{name:/Jolt/}).click();await page.getByRole('button',{name:'Close radio',exact:true}).click();await page.waitForTimeout(1500)
  if(!(await state()).requested)await page.getByRole('button',{name:'Play radio',exact:true}).click()
  for(let i=0;i<3&&(await state()).time!=='night';i++)await page.locator('button[aria-label^="Time of day:"]').click()
 }
 await page.waitForFunction(()=>{const s=window.__nightdrive?.()||window.__cruise?.();return s.playing&&s.source==='live'},undefined,{timeout:45000})
 check('Jolt plays with live analysis',(await state()).playing&&(await state()).source==='live')
 if(mode==='inspect'){
  await beginFrames();await startOwnRecording();await page.waitForTimeout(45000);report.samples.push(await sample());await saveOwnRecording()
  let s=await snapshot('desktop-la');check('Driving accelerates and remains continuous',s.distance>300&&s.speed>9&&report.samples[0].resets===0,{distance:s.distance,speed:s.speed,overtakes:s.overtakes})
  await ambient(false);await page.waitForTimeout(700);s=await state();check('Ambiance Off silences its graph without pausing radio',s.ambience.targetGain===0&&s.ambience.state==='suspended'&&s.playing,s.ambience)
  await ambient(true);await page.waitForTimeout(1000);s=await state();check('Ambiance resumes same graph',s.ambience.state==='running'&&s.ambience.nodeCount<20,s.ambience)
  await page.getByRole('button',{name:'Pause radio',exact:true}).click();await page.waitForTimeout(700);s=await state();check('Radio Pause silences ambience',!s.playing&&s.ambience.targetGain===0)
  await page.getByRole('button',{name:'Play radio',exact:true}).click();await page.waitForFunction(()=>window.__nightdrive().playing,undefined,{timeout:30000})
  for(const [view,size] of Object.entries({desktop:{width:1440,height:900},landscape:{width:844,height:390},portrait:{width:390,height:844}})){
   await page.setViewportSize(size)
   for(const cam of ['la','driver']){await camera(cam);await page.waitForTimeout(2000);await snapshot(view+'-'+cam);check(view+' '+cam+' radio retained',(await state()).playing)}
   check(view+' no page overflow',await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2))
  }
  await page.setViewportSize(viewport);await page.getByRole('button',{name:'Cast to TV',exact:true}).click();await snapshot('cast');check('Cast keeps current lab',page.url().includes('/nightdrive')&&(await state()).playing);await page.getByRole('button',{name:'Close panel',exact:true}).click()
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);const initial=(await state()).camera;await page.getByRole('button',{name:'Auto Director',exact:true}).click();await page.waitForTimeout(24000);check('Reduced motion holds camera',(await state()).camera===initial)
  report.final=await state()
 }else if(mode==='controls'){
  for(const mood of ['cruise','midnight-run','night-drive']){
   await options(()=>page.getByLabel('Driving mood',{exact:true}).selectOption(mood));await page.waitForTimeout(700)
   check('Driving mood selects '+mood,(await state()).mood===mood)
  }
  for(const cam of ['side','aerial','low','hood']){await camera(cam);await page.waitForTimeout(1000);await snapshot('controls-'+cam);check('Fixed camera '+cam+' retains radio',(await state()).camera===cam&&(await state()).playing)}
  await camera('la')
  await page.evaluate(()=>{window.__controlCanvas=document.querySelector('canvas');window.__controlDistance=window.__nightdrive().distance})
  for(const station of ['nts-radio','jolt-radio']){
   await page.getByRole('button',{name:'Radio stations',exact:true}).click();await page.getByLabel('Station',{exact:true}).selectOption(station);await page.getByRole('button',{name:'Close panel',exact:true}).click();await page.waitForTimeout(1500)
   await page.waitForFunction(id=>{const s=window.__nightdrive();return s.station===id&&s.playing},station,{timeout:45000})
   check('Station plays '+station,(await state()).station===station&&(await state()).playing)
  }
  check('Station switching retains Canvas and forward journey',await page.evaluate(()=>document.querySelector('canvas')===window.__controlCanvas&&window.__nightdrive().distance>=window.__controlDistance))
  await options(()=>page.getByLabel('Ambiance level',{exact:true}).press('Home'));await page.waitForTimeout(700)
  check('Zero ambiance gain leaves radio playing',(await state()).ambience.targetGain===0&&(await state()).playing)
  await options(async()=>{for(let i=0;i<4;i++)await page.getByLabel('Ambiance level',{exact:true}).press('ArrowRight')});await page.waitForTimeout(700)
  check('Ambiance gain restores its graph',(await state()).ambience.targetGain>0)
  check('Metrics hidden by default',await page.locator('.nd-metrics').count()===0)
  report.final=await snapshot('controls')
  try{
   const cdp=await browser.newBrowserCDPSession(),before=await cdp.send('SystemInfo.getProcessInfo'),startCpu=Date.now()
   await page.waitForTimeout(10000)
   const after=await cdp.send('SystemInfo.getProcessInfo'),duration=(Date.now()-startCpu)/1000,previous=new Map(before.processInfo.map(p=>[p.id,p.cpuTime]))
   const processes=after.processInfo.filter(p=>previous.has(p.id)),cpuSeconds=processes.reduce((sum,p)=>sum+Math.max(0,p.cpuTime-previous.get(p.id)),0)
   report.cpuSample={durationSeconds:duration,processCount:processes.length,logicalProcessors:cpus().length,cpuSeconds,averageCoreEquivalents:cpuSeconds/duration,percentAllLogicalCpu:100*cpuSeconds/duration/cpus().length,notes:'One 10-second browser process-family CPU sample after controls. Includes GPU-process CPU, not GPU utilization. Only processes present at both boundaries counted.'}
   await cdp.detach()
  }catch(e){report.cpuSample={unavailable:String(e.message)}}
 }else if(mode==='perf'){
  for(const [view,size] of Object.entries({desktop:{width:1440,height:900},landscape:{width:844,height:390},portrait:{width:390,height:844}})){
   await page.setViewportSize(size)
   for(const cam of ['la','driver']){
    await camera(cam);await page.waitForTimeout(2000);await beginFrames();await page.waitForTimeout(seconds*1000);const s=await sample();s.view=view;s.camera=cam;s.durationSeconds=seconds;report.samples.push(s);console.log('PERF',view,cam,s.fps.toFixed(2),s.p5Fps.toFixed(2));await writeFile(out+'/results.json',JSON.stringify(report,null,2));await page.evaluate(()=>cancelAnimationFrame(window.__ndFrames.raf))
   }
  }
 }else{
  if(target==='lab'&&mode==='journey'){await camera('chase');await ambient(false)}
  if(target==='miami')await camera('chase')
  await beginFrames();if(target==='lab'&&mode==='journey')await startOwnRecording()
  const started=Date.now();let switched=false
  for(let i=0;i<Math.ceil(seconds/30);i++){
   await page.waitForTimeout(Math.max(0,started+Math.min(seconds,(i+1)*30)*1000-Date.now()))
   const s=await sample();s.elapsedSeconds=(Date.now()-started)/1000;report.samples.push(s)
   console.log('SAMPLE',Math.round(s.elapsedSeconds),s.state.camera,s.fps.toFixed(2),'FPS',Math.round(s.state.distance),'m',s.state.district||'',s.heapMB?.toFixed(1),'MB')
   if(target==='lab'&&mode==='journey'&&!switched&&s.elapsedSeconds>=seconds/2){await ambient(true);switched=true;report.ambienceEnabledAtSeconds=(Date.now()-started)/1000}
   if(i===0||i===Math.ceil(seconds/30)-1||i%10===9)await snapshot('at-'+Math.round(s.elapsedSeconds)+'s')
   await writeFile(out+'/results.json',JSON.stringify(report,null,2))
  }
  report.actualDurationSeconds=(Date.now()-started)/1000
  if(target==='lab'&&mode==='journey')await saveOwnRecording()
  const last=report.samples.at(-1)
  check('No WebGL context loss',!last.contextLost)
  check('Radio remained playing at every sample',report.samples.every(s=>s.state.playing))
  if(target==='lab'){
   check('No backward reset',last.resets===0)
   check('Repeated chunk recycling',last.state.chunksGenerated>30,last.state.chunksGenerated)
   check('Both district types visited',new Set(report.samples.map(s=>s.state.district)).size===2)
   check('Same-lane longitudinal traffic gap stays above 8 m',last.state.minTrafficGap>8,last.state.minTrafficGap)
  }
 }
}catch(e){report.failure=e.stack;console.error(e.message)}finally{
 if(ctx)await ctx.close();if(video){await video.saveAs(out+'/recording.webm');await video.delete()}
 await browser.close();report.passed=!report.failure&&!report.errors.length&&report.checks.every(c=>c.pass)
 await writeFile(out+'/results.json',JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1
}
