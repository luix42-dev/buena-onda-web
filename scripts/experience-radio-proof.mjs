import { createRequire } from 'node:module'
import { mkdir,writeFile } from 'node:fs/promises'
const require=createRequire(import.meta.url)
let chromium
try{({chromium}=require('@playwright/test'))}catch{({chromium}=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))('@playwright/test'))}
const out='docs/cruise/experience/evidence/phase3';await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--autoplay-policy=document-user-activation-required']})
const context=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true})
await context.addInitScript(()=>{window.__proofAudio=[];window.Audio=new Proxy(window.Audio,{construct(t,a){const media=Reflect.construct(t,a);window.__proofAudio.push(media);return media}})})
const page=await context.newPage(),result={at:new Date().toISOString(),browser:browser.version(),environment:'Windows desktop Edge; actual Jolt playback, marked metadata fixtures',checks:{},errors:[]}
page.on('pageerror',e=>result.errors.push(e.message))
const open=()=>page.getByRole('button',{name:'Tune & discover',exact:true}).click()
try{
 await page.goto('http://127.0.0.1:3076/cruise/experience?listen=1',{waitUntil:'domcontentloaded',timeout:240000})
 await page.getByRole('button',{name:'Start listening',exact:true}).waitFor({timeout:120000})
 result.checks.noAutoplay=await page.evaluate(()=>window.__proofAudio.every(a=>a.paused))
 await page.getByRole('button',{name:'Start listening',exact:true}).click()
 await page.waitForFunction(()=>window.__proofAudio.some(a=>!a.paused&&a.currentTime>2),null,{timeout:35000});result.checks.realAudio=true
 await open()
 await page.getByLabel('Search stations').fill('dublab')
 result.checks.search=await page.locator('.hr-directory ul li').count()===1
 await page.getByLabel('Search stations').fill('')
 await page.getByRole('button',{name:'Favorite Jolt Radio',exact:true}).click()
 await page.getByRole('button',{name:'Favorite NTS 1',exact:true}).click()
 await page.getByRole('button',{name:'My presets (2)',exact:true}).click()
 await page.getByRole('button',{name:'Move NTS 1 up',exact:true}).click()
 result.checks.manualOrder=(await page.locator('.hr-directory ol li strong').allTextContents()).join('|')==='NTS 1|Jolt Radio'
 await page.getByRole('button',{name:'Stations',exact:true}).click()
 await page.getByLabel('Remember my last station',{exact:true}).check()
 await page.getByRole('button',{name:'Tune NTS 1',exact:true}).click()
 await page.waitForTimeout(250)
 await page.reload({waitUntil:'domcontentloaded'})
 await page.waitForFunction(()=>window.__jeepNight?.().station==='nts-radio',null,{timeout:30000})
 result.checks.rememberedWithoutAutoplay=await page.evaluate(()=>window.__proofAudio.every(a=>a.paused))
 await page.goto('http://127.0.0.1:3076/cruise/experience?listen=1&station=jolt-radio',{waitUntil:'domcontentloaded'})
 await page.waitForFunction(()=>window.__jeepNight?.().station==='jolt-radio',null,{timeout:30000});result.checks.explicitLinkWins=true
 await page.getByRole('button',{name:'Start listening',exact:true}).click();await open()
 // Deliberate official-shaped metadata fixture: NOT a live identification.
 await page.route('**/api/cruise/human-radio/now-playing?station=*',async route=>{const now=Date.now(),id=new URL(route.request().url()).searchParams.get('station'),source='https://dublab.airtime.pro/api/live-info';await route.fulfill({json:{stationId:id,kind:'track',artist:'QA test artist',title:'FIXTURE - not a live identification',show:'QA fixture',dj:null,available:true,confidence:'provider',source,provenance:{type:'official-metadata',url:source,verifiedAt:new Date(now).toISOString()},observedAt:new Date(now).toISOString(),expiresAt:new Date(now+20000).toISOString(),message:'QA fixture'}})})
 await page.getByRole('button',{name:'Tune dublab',exact:true}).click()
 await page.waitForFunction(()=>!document.querySelector('.hr-program button')?.disabled,null,{timeout:30000})
 await page.getByRole('button',{name:'Save song',exact:true}).click()
 await page.getByRole('button',{name:'My Finds (1)',exact:true}).click()
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export My Finds',exact:true}).click();await(await downloading).saveAs(`${out}/fixture-export.json`)
 result.checks.verifiedFixtureSaveExport=await page.locator('.hr-finds li').count()===1
 await page.screenshot({path:`${out}/my-finds-FIXTURE.png`})
 await page.reload({waitUntil:'domcontentloaded'});await open()
 await page.getByRole('button',{name:'My Finds (1)',exact:true}).click();result.checks.persistence=await page.locator('.hr-finds li').count()===1
 await page.getByRole('button',{name:'Stations',exact:true}).click()
 await page.unroute('**/api/cruise/human-radio/now-playing?station=*')
 await page.route('**/api/cruise/human-radio/now-playing?station=*',r=>r.fulfill({status:503,json:{error:'Deliberate QA outage'}}))
 await page.route('https://stream-relay-geo.ntslive.net/**',r=>r.abort())
 await page.getByRole('button',{name:'Tune NTS 1',exact:true}).click();await page.waitForTimeout(14000)
 result.checks.metadataFallback=await page.getByText('Track information unavailable',{exact:true}).isVisible()
 result.checks.noUnverifiedSave=await page.getByRole('button',{name:'Save song',exact:true}).isDisabled()
 result.checks.stationRetainedOnFailure=await page.evaluate(()=>window.__jeepNight?.().station==='nts-radio')
 await page.screenshot({path:`${out}/metadata-outage.png`})
 result.checks.noPageExceptions=result.errors.length===0
 if(Object.values(result.checks).some(v=>v!==true))process.exitCode=1
}catch(e){result.failure=e.stack||String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{})}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify(result,null,2))}
