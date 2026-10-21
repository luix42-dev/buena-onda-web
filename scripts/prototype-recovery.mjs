import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const out='docs/cruise/prototype-20261020/recovery';await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true})
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
const report={at:new Date().toISOString(),errors:[],checks:{},scope:'Controlled browser-network outage fixture in radio-only mode. Emulated viewport; not a physical phone or real provider outage.'}
page.on('pageerror',e=>report.errors.push(e.message))
await page.addInitScript(()=>{window.__recoveryAudio=[];const Native=window.Audio;window.Audio=new Proxy(Native,{construct(target,args){const a=new target(...args);window.__recoveryAudio.push(a);return a}})})
try{
 await page.route('**/api/cruise/human-radio/now-playing?*',r=>r.abort('failed'))
 await page.route('https://dublab.out.airtime.pro/**',r=>r.abort('failed'))
 await page.goto('http://127.0.0.1:3097/cruise/prototype?listen=1',{waitUntil:'domcontentloaded',timeout:120000})
 await page.getByRole('button',{name:'Play radio',exact:true}).click({timeout:60000})
 await page.getByRole('button',{name:'Choose station',exact:true}).click()
 await page.getByRole('button',{name:'Tune dublab',exact:true}).click()
 await page.waitForTimeout(15000)
 report.failureText=await page.locator('.os-radio-error').allTextContents()
 report.blockedState=await page.evaluate(()=>window.__jeepNight?.())
 report.checks.failureCommunicated=report.failureText.some(Boolean)&&report.blockedState.station==='dublab'&&!report.blockedState.playing
 await page.screenshot({path:`${out}/blocked-stream.png`})
 report.checks.metadataFallback=await page.getByText('Track information unavailable',{exact:false}).count()>0
 await page.getByRole('button',{name:'Tune Jolt Radio',exact:true}).click()
 await page.waitForFunction(()=>window.__jeepNight?.()?.playing,null,{timeout:30000})
 await page.waitForTimeout(3000)
 report.recovered=await page.evaluate(()=>({drive:window.__jeepNight(),audio:window.__recoveryAudio.map(a=>({time:a.currentTime,paused:a.paused,error:a.error?.code,source:a.currentSrc}))}))
 report.checks.recoversToAnotherStation=report.recovered.drive.station==='jolt-radio'&&report.recovered.audio.some(a=>!a.paused&&a.time>1&&!a.error)
 await page.getByRole('button',{name:'Close Choose a station',exact:true}).click()
 await page.getByRole('button',{name:'Save station',exact:true}).click()
 report.checks.favoriteSelected=await page.getByRole('button',{name:'Save station',exact:true}).getAttribute('aria-pressed')==='true'
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Save station',exact:true}).waitFor({timeout:60000})
 report.checks.favoriteSurvivesReload=await page.getByRole('button',{name:'Save station',exact:true}).getAttribute('aria-pressed')==='true'
 await page.screenshot({path:`${out}/radio-only-mobile.png`})
}catch(error){report.failure=String(error);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error}
finally{await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report))}
