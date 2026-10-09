import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'

const require=createRequire(import.meta.url)
let chromium
try{({chromium}=require('@playwright/test'))}catch{({chromium}=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))('@playwright/test'))}
const out='docs/cruise/master'
const quick=process.argv.includes('--quick')
const reviewFinal=process.argv.includes('--review-final')
const visibilityOnly=process.argv.includes('--visibility-only')||reviewFinal
const suffix=reviewFinal?'-review':visibilityOnly?'-final':''
const resultName=quick?'quick':reviewFinal?'review-final':visibilityOnly?'visibility-final':'measurements'
const url=process.env.CRUISE_PROOF_URL||'http://127.0.0.1:3040/cruise/miami-test'
await mkdir(out,{recursive:true})
const results=[]
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl']})
const profiles=quick?[{name:'desktop',viewport:{width:1440,height:1000}}]:[
 {name:'desktop',viewport:{width:1440,height:1000}},
 {name:'android-landscape-emulation',viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true},
]
const snapshot=page=>page.evaluate(()=>({drive:{...window.__streetDrive},sample:window.__street,events:window.__streetEvents||[]}))
async function holdTouch(page,context,label,milliseconds){
 const button=page.getByRole('button',{name:label,exact:true});await button.scrollIntoViewIfNeeded()
 const box=await button.boundingBox(),cdp=await context.newCDPSession(page)
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]})
 await page.waitForTimeout(milliseconds)
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
 await cdp.detach()
}
async function functional(page,context,profile){
 const checks={}
 await page.getByRole('button',{name:'Restart',exact:true}).click()
 await page.getByRole('button',{name:'Start cruise',exact:true}).click()
 const before=await snapshot(page)
 if(profile.hasTouch)await holdTouch(page,context,'Steer left',1100)
 else{await page.locator('canvas').click({position:{x:20,y:20}});await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1100);await page.keyboard.up('ArrowLeft')}
 const after=await snapshot(page)
 checks.steering={method:profile.hasTouch?'CDP emulated touch hold':'keyboard ArrowLeft',before:before.drive.lateral,after:after.drive.lateral,passed:after.drive.lateral<before.drive.lateral-.2}
 await page.getByRole('button',{name:'Pause cruise',exact:true}).click()
 const pauseA=await snapshot(page);await page.waitForTimeout(1200);const pauseB=await snapshot(page)
 checks.pause={passed:Math.abs(pauseA.drive.distance-pauseB.drive.distance)<.01,reportedSpeed:pauseB.sample?.speed}
 await page.getByRole('button',{name:'Start cruise',exact:true}).click()
 await page.getByRole('button',{name:'Directory',exact:true}).click()
 await page.getByRole('region',{name:'Business directory'}).getByRole('button',{name:'Buena Onda Record Store',exact:true}).click()
 checks.explorePauses=(await snapshot(page)).drive.paused&&await page.getByRole('dialog').isVisible()
 await page.getByRole('button',{name:'Back to street',exact:true}).click()
 await page.getByRole('button',{name:'Directory',exact:true}).click()
 await page.getByRole('button',{name:'Radio',exact:true}).click()
 const radio=page.getByRole('region',{name:'Radio controls'})
 await radio.getByRole('button',{name:'Jolt Radio',exact:true}).click()
 await page.locator('.mm-stage').scrollIntoViewIfNeeded()
 const controls=await page.evaluate(()=>JSON.parse(document.documentElement.dataset.physicalRadioControls||'null'))
 const bounds=await page.locator('canvas').boundingBox()
 if(controls?.presets?.[2]&&bounds){
  const point=controls.presets[2]
  if(profile.hasTouch)await page.touchscreen.tap(bounds.x+point.x,bounds.y+point.y)
  else await page.mouse.click(bounds.x+point.x,bounds.y+point.y)
  await page.waitForTimeout(500)
 }
 checks.physicalPresetWorked=await radio.locator('strong').textContent()==='NTS 1'
 await radio.getByRole('button',{name:'NTS 1',exact:true}).click()
 if(await radio.getByRole('button',{name:'Play radio',exact:true}).isVisible())await radio.getByRole('button',{name:'Play radio',exact:true}).click()
 try{await radio.getByRole('button',{name:'Pause radio',exact:true}).waitFor({timeout:18000});checks.radioPlaying=true}catch{checks.radioPlaying=false}
 checks.radioStatus=await radio.getByRole('status').textContent()
 const volume=radio.getByRole('slider',{name:'Radio volume'})
 await volume.focus();await volume.press('Home')
 for(let i=0;i<7;i++)await volume.press('ArrowRight')
 checks.volume=await volume.inputValue()
 await page.screenshot({path:`${out}/${profile.name}-cockpit-radio-playing.png`,fullPage:true})
 const audioBeforeSwitch=await page.evaluate(()=>window.__proofAudio||[])
 const oldCamera=(await snapshot(page)).sample.camera
 await page.getByRole('button',{name:oldCamera==='driver'?'Chase view':'Cockpit view',exact:true}).click()
 await page.waitForTimeout(1400)
 checks.cameraSwitch={before:oldCamera,after:(await snapshot(page)).sample.camera,audioStillPlaying:await radio.getByRole('button',{name:'Pause radio',exact:true}).isVisible()}
 checks.audioEvidence=await page.evaluate(()=>window.__proofAudio||[])
 checks.audioContinuedAcrossCamera=checks.audioEvidence.some((item,index)=>item.currentTime>(audioBeforeSwitch[index]?.currentTime||0)+.2&&!item.paused)
 // Drive remained paused after Explore; stream time should still advance.
 checks.audioContinuesWhileDrivingPaused=(await snapshot(page)).drive.paused&&checks.audioContinuedAcrossCamera
 await page.screenshot({path:`${out}/${profile.name}-radio-functional.png`,fullPage:true})
 if(await radio.getByRole('button',{name:'Pause radio',exact:true}).isVisible())await radio.getByRole('button',{name:'Pause radio',exact:true}).click()
 await page.getByRole('button',{name:'Radio',exact:true}).click()
 checks.noHorizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)
 if(profile.name==='desktop'){
  checks.timeModes={}
  for(const time of ['day','night']){
   await page.getByRole('combobox',{name:'Time of day',exact:true}).selectOption(time)
   await page.waitForTimeout(1500)
   await page.screenshot({path:`${out}/desktop-${time}.png`,fullPage:true})
   checks.timeModes[time]=await page.getByRole('combobox',{name:'Time of day',exact:true}).inputValue()
  }
  await page.getByRole('combobox',{name:'Time of day',exact:true}).selectOption('sunset')
  checks.vehicles={}
  for(const id of ['classic-coupe','coastal-coupe']){
   await page.getByRole('combobox',{name:'Vehicle',exact:true}).selectOption(id)
   await page.waitForFunction(()=>document.querySelector('.miami-master')?.dataset.ready==='true',undefined,{timeout:45000})
   await page.waitForTimeout(2000)
   await page.screenshot({path:`${out}/desktop-${id}.png`,fullPage:true})
   await page.getByRole('button',{name:'Cockpit view',exact:true}).click()
   await page.waitForTimeout(1500)
   await page.screenshot({path:`${out}/desktop-${id}-cockpit.png`,fullPage:true})
   await page.getByRole('button',{name:'Chase view',exact:true}).click()
   checks.vehicles[id]={ready:await page.locator('.miami-master').getAttribute('data-ready'),sample:(await snapshot(page)).sample}
  }
 }else{
  await page.setViewportSize({width:390,height:844})
  await page.getByRole('button',{name:'Cockpit view',exact:true}).click()
  await page.getByRole('button',{name:'Radio',exact:true}).click()
  await page.waitForTimeout(1800)
  await page.screenshot({path:`${out}/phone-portrait-radio.png`,fullPage:true})
  checks.portrait={viewport:{width:390,height:844},radioVisible:await radio.isVisible(),noHorizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),canvas:await page.locator('canvas').boundingBox()}
 }
 checks.events=(await snapshot(page)).events
 return checks
}
async function mobileLayoutCheck(page,context){
 const initial=await page.evaluate(()=>{
  const box=selector=>{const r=document.querySelector(selector)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,fullyInViewport:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}:null}
  return {canvas:box('canvas'),left:box('[aria-label="Steer left"]'),right:box('[aria-label="Steer right"]'),noHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth}
 })
 await page.screenshot({path:`${out}/android-landscape-viewport${suffix}.png`,fullPage:false})
 await page.getByRole('button',{name:'Restart',exact:true}).click()
 await page.getByRole('button',{name:'Start cruise',exact:true}).click()
 const before=(await snapshot(page)).drive.lateral
 await holdTouch(page,context,'Steer left',700)
 const after=(await snapshot(page)).drive.lateral
 await page.getByRole('button',{name:'Pause cruise',exact:true}).click()
 await page.screenshot({path:`${out}/android-landscape-touch${suffix}.png`,fullPage:true})
 await page.getByRole('button',{name:'Directory',exact:true}).click()
 await page.getByRole('region',{name:'Business directory'}).getByRole('button',{name:'Buena Onda Record Store',exact:true}).click()
 await page.getByRole('dialog').evaluate(element=>{element.tabIndex=-1;element.focus()})
 const modalBefore=await snapshot(page)
 await page.keyboard.press('Space')
 await page.keyboard.press('ArrowUp')
 await page.evaluate(()=>window.scrollTo(0,0))
 await page.waitForTimeout(50)
 const startBox=await page.getByRole('button',{name:'Start cruise',exact:true}).boundingBox()
 if(startBox)await page.mouse.click(startBox.x+startBox.width/2,startBox.y+startBox.height/2)
 await page.waitForTimeout(500)
 const modalAfter=await snapshot(page)
 const modalBlocksResume=modalAfter.drive.paused&&Math.abs(modalAfter.drive.distance-modalBefore.drive.distance)<.01&&await page.getByRole('dialog').isVisible()
 await page.keyboard.press('Escape')
 let escapeCloses=false
 try{await page.getByRole('dialog').waitFor({state:'hidden',timeout:2000});escapeCloses=true}catch{}
 return {initial,controlsAndRoadFit:!!(initial.canvas?.fullyInViewport&&initial.left?.fullyInViewport&&initial.right?.fullyInViewport&&initial.noHorizontalOverflow),touchSteering:{before,after,passed:after<before-.2},modalBlocksResume,escapeCloses}
}
try{
 for(const profile of profiles){for(const mode of ['chase','driver']){
  console.log(`Loading ${profile.name} / ${mode}`)
  const record=!quick&&profile.name==='desktop'&&(mode==='chase'||reviewFinal)
  const context=await browser.newContext({...profile,...(record?{recordVideo:{dir:`${out}/video${suffix}`,size:profile.viewport}}:{})})
  await context.addInitScript(()=>{
   const OriginalAudio=window.Audio;window.__proofAudio=[]
   window.Audio=class extends OriginalAudio{constructor(src){super(src);const item={events:[],src:src||'',currentTime:0,readyState:0,paused:true};window.__proofAudio.push(item);for(const event of ['playing','pause','error','waiting','timeupdate'])this.addEventListener(event,()=>{if(event!=='timeupdate')item.events.push({event,time:performance.now()});item.src=this.currentSrc;item.currentTime=this.currentTime;item.readyState=this.readyState;item.paused=this.paused})}}
  })
  const page=await context.newPage(),errors=[],consoleErrors=[],failedRequests=[]
  page.setDefaultTimeout(25000)
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),location:m.location()})})
  page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()?.errorText}))
  page.on('response',r=>{if(r.status()>=400)failedRequests.push({url:r.url(),status:r.status()})})
  const start=Date.now()
  await page.goto(url,{timeout:180000})
  await page.waitForFunction(()=>document.querySelector('.miami-master')?.dataset.ready==='true'&&window.__street?.calls>0,undefined,{timeout:180000})
  const readyMs=Date.now()-start
  if(mode==='driver')await page.getByRole('button',{name:'Cockpit view',exact:true}).click()
  await page.waitForTimeout(1500)
  const gpu=await page.evaluate(()=>{const c=document.querySelector('canvas'),g=c?.getContext('webgl2')||c?.getContext('webgl');if(!g)return null;const e=g.getExtension('WEBGL_debug_renderer_info');return{renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),vendor:e?g.getParameter(e.UNMASKED_VENDOR_WEBGL):g.getParameter(g.VENDOR),canvas:[c.width,c.height],css:[c.clientWidth,c.clientHeight],dpr:devicePixelRatio}})
  await page.evaluate(()=>{window.__streetSamples=[];window.__streetEvents=[]})
  await page.getByRole('button',{name:'Start cruise',exact:true}).click()
  const markers=quick?[35]:[40,80,125]
  const driveStart=Date.now()
  for(const distance of markers){
   await page.waitForFunction(d=>window.__streetDrive?.distance>=d,distance,{timeout:60000})
   await page.screenshot({path:`${out}/${profile.name}-${mode}-${distance}m${suffix}.png`,fullPage:true})
  }
  if(!quick)await page.waitForTimeout(Math.max(0,62000-(Date.now()-driveStart)))
  const samples=await page.evaluate(()=>window.__streetSamples||[])
  const events=await page.evaluate(()=>window.__streetEvents||[])
  const resources=await page.evaluate(()=>{
   const entries=performance.getEntriesByType('resource')
   return {requests:entries.length,transferBytes:entries.reduce((sum,r)=>sum+(r.transferSize||0),0),encodedBodyBytes:entries.reduce((sum,r)=>sum+(r.encodedBodySize||0),0),decodedBodyBytes:entries.reduce((sum,r)=>sum+(r.decodedBodySize||0),0),note:'Resource Timing entries; cross-origin transfers without Timing-Allow-Origin may report zero bytes.'}
  })
  const active=samples.filter(s=>s.speed>0)
  const ads={}
  for(const sample of samples)for(const ad of sample.ads){const old=ads[ad.id];if(!old||ad.maxContinuous>old.maxContinuous)ads[ad.id]={...ad,atRouteDistance:sample.distance}}
  const info={profile:profile.name,emulation:!!profile.isMobile,emulationDescription:profile.isMobile?'Desktop Edge with mobile viewport/touch emulation; no Android OS or physical hardware':null,recording:record,mode,quality:'Mobile quality / DPR 1',viewport:profile.viewport,browser:await browser.version(),readyMs,gpu,resources,durationMs:Date.now()-driveStart,samples,events,summary:{fps:active.reduce((a,s)=>a+s.fps,0)/active.length,meanWindowP95Ms:active.reduce((a,s)=>a+s.p95,0)/active.length,ads},errors,consoleErrors,failedRequests}
  // Stop video after ordinary driving; interactions are separate evidence.
  if(record){
   if(reviewFinal){
    await page.getByRole('button',{name:'Restart',exact:true}).click()
    await page.getByRole('button',{name:'Start cruise',exact:true}).click()
    const before=(await snapshot(page)).drive.lateral
    await page.keyboard.down('ArrowLeft');await page.waitForTimeout(900);await page.keyboard.up('ArrowLeft')
    const after=(await snapshot(page)).drive.lateral
    info.keyboardAfterStart={before,after,passed:after<before-.2,note:'Start button retains focus; no canvas click workaround.'}
   }
   const video=page.video();await context.close();info.video=await video.path()
  }
  else{
   if(!quick&&mode==='driver'){try{if(!visibilityOnly)info.functional=await functional(page,context,profile);else if(profile.hasTouch)info.mobileLayout=await mobileLayoutCheck(page,context)}catch(error){info.functional={failed:String(error)}}}
   await context.close()
  }
  results.push(info)
  await writeFile(`${out}/${resultName}.json`,JSON.stringify(results,null,2))
  console.log(JSON.stringify({profile:info.profile,mode,readyMs,summary:info.summary,errors:info.errors,functional:info.functional},null,2))
 }}
}finally{await writeFile(`${out}/${resultName}.json`,JSON.stringify(results,null,2));await browser.close()}
