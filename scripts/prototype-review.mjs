import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))
const {chromium}=require('@playwright/test')
const out='docs/cruise/prototype-20261020/browser'
await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl']})
const report={at:new Date().toISOString(),browser:browser.version(),viewport:{width:1280,height:720},dpr:1,errors:[],samples:[],checks:{},limitations:'Headless Edge on this Windows laptop. No physical phone, television, audible listening or GPU-memory measurement. Media currentTime measures decoded playback, not speaker output.'}
const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1})
const page=await context.newPage()
page.on('pageerror',e=>report.errors.push(e.message))
await page.addInitScript(()=>{window.__reviewAudio=[];const Native=window.Audio;window.Audio=new Proxy(Native,{construct(target,args){const a=new target(...args);window.__reviewAudio.push(a);return a}})})
const snapshot=()=>page.evaluate(()=>({at:Date.now(),drive:window.__jeepNight?.(),geo:window.__miamiGeo?.(),feel:window.__countachFeel?.(),audio:window.__reviewAudio.map(a=>({time:a.currentTime,paused:a.paused,ready:a.readyState,error:a.error?.code,source:a.currentSrc})),heap:performance.memory?.usedJSHeapSize}))
const save=()=>writeFile(`${out}/results.json`,JSON.stringify(report,null,2))
try{
 const begin=Date.now()
 await page.goto('http://127.0.0.1:3097/cruise/prototype?diagnostics=1',{waitUntil:'domcontentloaded',timeout:180000})
 await page.getByRole('button',{name:'Play Cruise',exact:true}).waitFor({timeout:90000})
 await page.screenshot({path:`${out}/entry.png`})
 await page.getByRole('button',{name:'Play Cruise',exact:true}).click()
 await page.waitForFunction(()=>window.__jeepNight?.()?.ready&&window.__miamiGeo?.()?.routeLength>0,null,{timeout:180000})
 report.readyMs=Date.now()-begin
 await page.waitForTimeout(10000)
 await page.screenshot({path:`${out}/cockpit.png`})
 report.initial=await snapshot()
 await page.getByLabel('Camera view',{exact:true}).selectOption('chase')
 await page.waitForTimeout(3000)
 await page.screenshot({path:`${out}/chase.png`})
 report.afterCamera=await snapshot()
 await page.getByLabel('Camera view',{exact:true}).selectOption('driver')
 await page.getByRole('button',{name:/Along the drive/}).click({timeout:15000})
 await page.screenshot({path:`${out}/businesses.png`})
 report.checks.businessDirectory=await page.getByRole('dialog').getByText('House and demo businesses.',{exact:false}).isVisible()
 await page.getByRole('button',{name:'Back to drive',exact:true}).click()
 await page.getByRole('button',{name:'Phone & TV',exact:true}).click()
 await page.screenshot({path:`${out}/tv-help.png`})
 report.checks.tvHelp=await page.getByRole('heading',{name:'Phone & TV',exact:true}).isVisible()
 await page.getByLabel('TV presentation',{exact:true}).check()
 await page.getByRole('button',{name:'Close help',exact:true}).click()
 await page.evaluate(()=>document.activeElement?.blur())
 await page.mouse.move(640,350);await page.waitForTimeout(7500)
 report.checks.tvControlsRecede=await page.locator('.prototype-tv').evaluate(e=>e.classList.contains('ptv-idle'))
 await page.keyboard.press('Tab');await page.waitForTimeout(500)
 report.checks.tvKeyboardRecovers=await page.locator('.prototype-tv').evaluate(e=>!e.classList.contains('ptv-idle'))
 await page.getByRole('button',{name:'Phone & TV',exact:true}).click();await page.getByLabel('TV presentation',{exact:true}).uncheck();await page.getByRole('button',{name:'Close help',exact:true}).click()
 await page.getByRole('button',{name:'Save station',exact:true}).click()
 report.checks.favoriteSaved=await page.getByRole('button',{name:'Save station',exact:true}).getAttribute('aria-pressed')==='true'
 report.stations=[]
 for(const [name,id] of [['NTS 1','nts-radio'],['dublab','dublab'],['Jolt Radio','jolt-radio']]){
  await page.getByRole('button',{name:'Choose station',exact:true}).click()
  await page.getByRole('button',{name:`Tune ${name}`,exact:true}).click()
  await page.waitForFunction(id=>window.__jeepNight?.()?.station===id,id,{timeout:15000})
  await page.waitForFunction(()=>window.__jeepNight?.()?.playing,null,{timeout:25000}).catch(()=>{})
  await page.waitForTimeout(3000);report.stations.push({name,...await snapshot()})
  await page.keyboard.press('Escape')
 }
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click()
 const beforeQuality=await snapshot()
 await page.locator('label').filter({hasText:'Scenery quality'}).locator('select').selectOption('low')
 await page.waitForTimeout(2000)
 await page.getByRole('button',{name:'Listen without 3D',exact:true}).click();await page.waitForTimeout(2500)
 report.listeningOnly=await snapshot()
 report.checks.audioIndependent=report.listeningOnly.audio.some((a,i)=>!a.paused&&a.source===beforeQuality.audio[i]?.source&&a.time>beforeQuality.audio[i].time)
 await page.locator('.os-glovebox').getByRole('button',{name:'Return to scenery',exact:true}).click();await page.waitForTimeout(3000)
 await page.locator('label').filter({hasText:'Scenery quality'}).locator('select').selectOption('auto')
 await page.getByRole('button',{name:'Close menu',exact:true}).click();await page.evaluate(()=>document.activeElement?.blur())
 // A real elapsed-time soak. No clock manipulation or route teleports.
 report.soakStart=await snapshot();const soak=Date.now()
 const duration=Number(process.env.REVIEW_SECONDS||1200)
 for(let i=0;i<duration;i+=5){
   await page.waitForTimeout(5000);report.samples.push(await snapshot())
   if(i%60===0){await save();console.log(JSON.stringify({elapsedSeconds:(Date.now()-soak)/1000,last:report.samples.at(-1).drive}))}
 }
 report.soakSeconds=(Date.now()-soak)/1000;report.soakEnd=await snapshot()
 await page.screenshot({path:`${out}/after-soak.png`})
 report.checks.moving=report.soakEnd.drive.distance>report.soakStart.drive.distance+100
 report.checks.audioAcrossCamera=report.afterCamera.audio.some((a,i)=>!a.paused&&a.source===report.initial.audio[i]?.source&&a.time>report.initial.audio[i].time)
 report.checks.noPageExceptions=report.errors.length===0
 report.checks.opaqueTires=report.soakEnd.feel?.tires.every(t=>!t.transparent&&t.depthWrite&&t.opacity===1)
 for(const [name,size] of [['portrait',{width:390,height:844}],['landscape',{width:844,height:390}]]){
  await page.setViewportSize(size);await page.waitForTimeout(2000);await page.screenshot({path:`${out}/${name}.png`})
  report.checks[`${name}NoOverflow`]=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)
 }
 await save();console.log(JSON.stringify({done:true,checks:report.checks,soakSeconds:report.soakSeconds}))
}catch(error){report.failure=String(error);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await save();throw error}
finally{await browser.close()}
