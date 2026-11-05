// Local production-build loop QA; desktop Edge emulation, not a physical device benchmark.
import {createRequire} from 'node:module'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))
const {chromium}=require('@playwright/test')
const out='docs/cruise/pass6/loop';await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']})
const report={date:new Date().toISOString(),browser:browser.version(),physicalDevice:false,viewport:{width:844,height:390},windowDpr:3,quality:'mobile',checks:[],runs:[],errors:[],notes:['Real local Next production build on port 3041.','Profile probe positions the car near the endpoint before sampling; not a full-lap test.','Hidden-tab scenario overrides document.hidden and dispatches visibilitychange; not OS suspension.','RAF state samples supplement recordings, not proof of every presented GPU frame.','All mutation requests and analytics are intercepted.','Recorded run is not an FPS benchmark.']}
const check=(name,pass,evidence)=>{report.checks.push({name,pass,evidence});console.log(pass?'PASS':'FAIL',name)}
async function reviewVideo(){
  const first=report.runs[0],jump=first.samples.find((x,i)=>i&&first.samples[i-1].distance-x.distance>100),review=await browser.newPage();
  const data=(await readFile(out+'/loop-check.webm')).toString('base64');
  const sheet=await review.evaluate(async({data,center})=>{const v=document.createElement('video');v.muted=true;v.src='data:video/webm;base64,'+data;await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j});const c=document.createElement('canvas');c.width=1688;c.height=639;const g=c.getContext('2d');g.fillStyle='#151515';g.fillRect(0,0,c.width,c.height);for(let i=0;i<12;i++){const t=Math.max(.01,center-1.2+i*.2);v.currentTime=t;await new Promise(r=>v.onseeked=r);const x=(i%4)*422,y=Math.floor(i/4)*213;g.drawImage(v,x,y+18,422,195);g.fillStyle='white';g.font='12px sans-serif';g.fillText(t.toFixed(2)+' s',x+5,y+13)}return c.toDataURL('image/png').split(',')[1]},{data,center:(first.startPageMs+jump.t)/1000});
  await writeFile(out+'/transition-contact-sheet.png',Buffer.from(sheet,'base64'));await review.close();
}
if(process.argv.includes('--review-only')){try{Object.assign(report,JSON.parse(await readFile(out+'/results.json','utf8')));await reviewVideo()}finally{await browser.close()}process.exit(0)}
let ctx,page,video
try{
 ctx=await browser.newContext({viewport:report.viewport,deviceScaleFactor:3,isMobile:true,hasTouch:true,recordVideo:{dir:out,size:report.viewport}})
 await ctx.route('**/*',r=>!['GET','HEAD'].includes(r.request().method())||/google-analytics|googletagmanager|vercel-insights/.test(r.request().url())?r.fulfill({status:204,body:''}):r.continue())
 page=await ctx.newPage();video=page.video();page.on('pageerror',e=>report.errors.push(e.message))
 await page.goto('http://127.0.0.1:3041/cruise/miami-test?profile=1',{timeout:120000})
 await page.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:120000})
 await page.locator('.mm-tvgate').click()
 await page.getByRole('button',{name:'Radio stations',exact:true}).click()
 await page.getByRole('button',{name:/Jolt/}).click()
 await page.getByRole('button',{name:'Close radio',exact:true}).click()
 await page.waitForFunction(()=>window.__cruise().playing||document.querySelector('.mm-now-text b')?.textContent==='Tap play to tune in'||window.__cruise().error,undefined,{timeout:12000})
 if(!await page.evaluate(()=>window.__cruise().playing))await page.getByRole('button',{name:'Play radio',exact:true}).click()
 await page.waitForFunction(()=>window.__cruise().playing&&window.__cruise().source==='live',undefined,{timeout:30000})
 const setCamera=async desired=>{
  for(let i=0;i<6&&await page.evaluate(()=>window.__cruise().camera)!==desired;i++)await page.locator('button[aria-label^="Camera:"]').click()
  await page.waitForFunction(c=>window.__cruise().camera===c,desired)
 }
 for(const scenario of [{camera:'chase',reduced:false},{camera:'driver',reduced:false},{camera:'side',reduced:false},{camera:'aerial',reduced:false},{camera:'low',reduced:false},{camera:'hood',reduced:false},{camera:'chase',reduced:true},{camera:'driver',reduced:true},{camera:'chase',reduced:false,hidden:true}]){
  const id=`${scenario.camera}-${scenario.reduced?'reduced':'normal'}${scenario.hidden?'-hidden':''}`
  await page.emulateMedia({reducedMotion:scenario.reduced?'reduce':'no-preference'})
  await setCamera(scenario.camera)
  // This test setup teleport is deliberately outside the sampled interval.
  await page.evaluate(()=>{window.__streetDrive.paused=true;window.__streetDrive.distance=209.8})
  await page.waitForTimeout(1500)
  await page.screenshot({path:`${out}/${id}-before.png`})
  const run=await page.evaluate(async scenario=>{
   const samples=[],start=performance.now();let hiddenAt=null,restored=false,resetSeen=false,raf=0,done=false
   const setHidden=value=>{Object.defineProperty(document,'hidden',{configurable:true,value});document.dispatchEvent(new Event('visibilitychange'))}
   return await new Promise(resolve=>{
    let timeout
    const finish=timedOut=>{if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(timeout);if(hiddenAt!==null&&!restored)setHidden(false);resolve({scenario,timedOut,startPageMs:start,durationMs:performance.now()-start,samples})}
    const tick=()=>{
     const state=window.__cruise(),{camera,gl}=window.__three,cover=document.querySelector('.mm-fade'),opacity=Number(getComputedStyle(cover).opacity),t=performance.now()-start
     samples.push({t,distance:state.distance,mode:state.camera,paused:state.paused,playing:state.playing,source:state.source,opacity,hidden:document.hidden,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),renderFrame:gl.info.render.frame,canvas:[gl.domElement.width,gl.domElement.height]})
     if(state.distance<15)resetSeen=true
     if(scenario.hidden&&hiddenAt===null&&cover.classList.contains('on')){hiddenAt=t;setHidden(true)}
     if(hiddenAt!==null&&!restored&&t-hiddenAt>=350){restored=true;setHidden(false)}
     if(resetSeen&&!state.paused&&state.distance>2&&opacity<=.001){finish(false);return}
     raf=requestAnimationFrame(tick)
    }
    timeout=setTimeout(()=>finish(true),12000)
    tick();window.__streetDrive.paused=false
   })
  },scenario)
  report.runs.push({id,...run})
  const s=run.samples,jumps=s.flatMap((x,i)=>i&&s[i-1].distance-x.distance>100?[i]:[])
  const moves=s.flatMap((x,i)=>i&&Math.hypot(...x.position.map((v,k)=>v-s[i-1].position[k]))>100?[i]:[])
  check(`${id}: reset only under opaque cover`,jumps.length===1&&jumps.every(i=>s[i].opacity>=.999),{jumps:jumps.map(i=>s[i])})
  check(`${id}: camera snaps only under opaque cover`,moves.length===1&&moves.every(i=>s[i].opacity>=.999),{moves:moves.map(i=>s[i])})
  const expected=scenario.reduced?scenario.camera:scenario.camera==='driver'?'chase':'driver'
  const resetIndex=jumps[0],uncovered=resetIndex===undefined?null:s.slice(resetIndex+1).find(x=>x.opacity<.999)
  check(`${id}: new shot rendered before uncover`,!!uncovered&&uncovered.mode===expected&&uncovered.renderFrame>s[resetIndex].renderFrame,{expected,uncovered})
  check(`${id}: resumes automatically`,!run.timedOut&&s.at(-1).distance>2&&!s.at(-1).paused,{last:s.at(-1)})
  check(`${id}: radio remains playing`,s.every(x=>x.playing),{samples:s.length,notPlaying:s.filter(x=>!x.playing).length,nonLiveSamples:s.filter(x=>x.source!=='live').length})
  check(`${id}: live analysis returns after transition`,s.at(-1).source==='live',{source:s.at(-1).source})
  if(scenario.hidden)check(`${id}: no reset while hidden`,s.filter(x=>x.hidden).length>0&&s.filter(x=>x.hidden).every(x=>x.distance>200&&x.paused))
  await page.screenshot({path:`${out}/${id}-after.png`})
  await writeFile(`${out}/${id}.json`,JSON.stringify(run,null,2))
 }
 await page.emulateMedia({reducedMotion:'no-preference'})
 await page.getByRole('button',{name:'Garage and options',exact:true}).click()
 await page.getByLabel('Quality',{exact:true}).selectOption('desktop')
 await page.getByRole('button',{name:'Close',exact:true}).click()
 for(let i=0;i<3&&await page.evaluate(()=>window.__cruise().time)!=='night';i++)await page.locator('button[aria-label^="Time of day:"]').click()
 await page.waitForTimeout(2000)
 const quality=await page.evaluate(()=>{const {gl,scene}=window.__three,lights=[];scene.traverseVisible(o=>{if(o.isSpotLight&&o.intensity>0)lights.push({castShadow:o.castShadow,intensity:o.intensity})});return{windowDpr:devicePixelRatio,rendererDpr:gl.getPixelRatio(),canvas:[gl.domElement.width,gl.domElement.height],lights,state:window.__cruise()}})
 check('Desktop DPR capped at1.25 on DPR3 window',quality.windowDpr===3&&quality.rendererDpr===1.25,quality)
 check('Desktop night retains two shadowless headlights',quality.lights.length===2&&quality.lights.every(x=>!x.castShadow),quality.lights)
 await page.screenshot({path:`${out}/desktop-night-dpr125.png`})
 await setCamera('driver')
 const mirrorSample=async()=>page.evaluate(async()=>{const {gl,scene}=window.__three,original=gl.render;let mirror=0,main=0;gl.render=function(...args){const target=gl.getRenderTarget();if(target&&target.width===384&&target.height===112)mirror++;else if(!target)main++;return original.apply(this,args)};await new Promise(r=>setTimeout(r,4000));gl.render=original;const materials=[];scene.traverse(o=>{if(o.material?.name?.startsWith('Convertible'))materials.push({name:o.material.name,metalness:o.material.metalness,roughness:o.material.roughness,clearcoat:o.material.clearcoat,clearcoatRoughness:o.material.clearcoatRoughness,env:o.material.envMapIntensity})});return{mirror,main,ratio:mirror/main,materials}})
 const nightMirror=await mirrorSample();check('Night mirror performs zero reflection passes',nightMirror.main>10&&nightMirror.mirror===0,nightMirror)
 for(let i=0;i<3&&await page.evaluate(()=>window.__cruise().time)!=='sunset';i++)await page.locator('button[aria-label^="Time of day:"]').click()
 await page.waitForTimeout(1500);const sunsetMirror=await mirrorSample();check('Sunset mirror renders every third main frame',sunsetMirror.main>10&&Math.abs(sunsetMirror.ratio-1/3)<.03,sunsetMirror)
 await page.getByRole('button',{name:'Garage and options',exact:true}).click();await page.getByLabel('Quality',{exact:true}).selectOption('mobile');await page.getByRole('button',{name:'Close',exact:true}).click()
 for(let i=0;i<3&&await page.evaluate(()=>window.__cruise().time)!=='night';i++)await page.locator('button[aria-label^="Time of day:"]').click()
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(1500)
 const largeNight=await page.evaluate(()=>({dpr:window.__three.gl.getPixelRatio(),state:window.__cruise()}));check('Large Mobile night uses measured DPR0.85',largeNight.dpr===.85,largeNight)
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1200);const smallNight=await page.evaluate(()=>window.__three.gl.getPixelRatio());check('Phone-sized Mobile night retains DPR1',smallNight===1,{dpr:smallNight})
 await page.setViewportSize({width:1440,height:900});await page.locator('button[aria-label^="Time of day:"]').click();await page.waitForTimeout(1200);const largeDay=await page.evaluate(()=>({dpr:window.__three.gl.getPixelRatio(),state:window.__cruise()}));check('Large Mobile daylight retains DPR1',largeDay.dpr===1&&largeDay.state.time!=='night',largeDay)


}catch(e){report.failure=e.stack||e.message;console.log('FAIL',e.message)}finally{
 if(ctx)await ctx.close()
 if(video){await video.saveAs(`${out}/loop-check.webm`);await video.delete()}
 if(report.runs[0]?.startPageMs && !report.failure){try{
  await reviewVideo()
 }catch(e){report.contactSheetError=String(e)}}
 await browser.close();report.passed=!report.failure&&!report.errors.length&&report.checks.every(x=>x.pass)
 await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1
}
