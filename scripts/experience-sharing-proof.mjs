import { createRequire } from 'node:module'
import { mkdir,writeFile,readFile } from 'node:fs/promises'
const require=createRequire(import.meta.url)
let chromium
try{({chromium}=require('@playwright/test'))}catch{({chromium}=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))('@playwright/test'))}
const out=`docs/cruise/experience/evidence/${process.env.SHARING_PHASE||'phase4'}`;await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--autoplay-policy=document-user-activation-required']})
const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,acceptDownloads:true,permissions:['clipboard-read','clipboard-write']})
const page=await context.newPage(),result={at:new Date().toISOString(),browser:browser.version(),environment:'Desktop Windows Edge, local development, genuine scene capture and opted-in QA counters; not audience data',checks:{},errors:[],requestHosts:[]}
page.on('pageerror',e=>result.errors.push(e.message));const hosts=new Set();page.on('request',r=>{try{hosts.add(new URL(r.url()).hostname)}catch{}})
const options=()=>page.getByRole('button',{name:'Cruise options',exact:true}).click()
const diagnostics=()=>page.locator('.experience-metrics summary').click()
try{
 const target=new URL(process.env.EXPERIENCE_URL||'http://127.0.0.1:3076/cruise/experience');target.searchParams.set('diagnostics','1')
 await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:240000})
 await page.getByRole('button',{name:'Start Cruising',exact:true}).waitFor({timeout:120000})
 result.checks.metricsOffByDefault=await page.evaluate(()=>localStorage.getItem('buena-onda:experience:metrics:v1')===null&&localStorage.getItem('buena-onda:experience:metrics-consent:v1')!=='on')
 await page.getByRole('button',{name:'Start Cruising',exact:true}).click()
 await options();await diagnostics();await page.getByLabel('Save technical counters in this browser').check()
 await page.locator('#opening-options .opening-done').click()
 await page.waitForTimeout(5000);console.log('post-start',await page.evaluate(()=>({drive:window.__jeepNight?.(),geo:window.__miamiGeo?.()})))
 await page.getByRole('button',{name:'Capture postcard',exact:true}).waitFor({timeout:160000})
 await page.getByRole('button',{name:'Capture postcard',exact:true}).click()
 await page.getByRole('dialog').waitFor({timeout:20000})
 await page.screenshot({path:`${out}/postcard-preview.png`})
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download PNG',exact:true}).click();await(await pending).saveAs(`${out}/actual-gameplay-postcard.png`)
 const sharp=require('sharp'),image=sharp(await readFile(`${out}/actual-gameplay-postcard.png`)),meta=await image.metadata(),stats=await image.extract({left:0,top:0,width:meta.width,height:Math.floor(meta.height/2)}).stats()
 result.capture={width:meta.width,height:meta.height,bytes:(await readFile(`${out}/actual-gameplay-postcard.png`)).length,sceneChannelStddev:stats.channels.map(c=>c.stdev)}
 result.checks.actualNonblankPng=meta.width>=720&&meta.height>720&&stats.channels.slice(0,3).some(c=>c.stdev>10)
 await page.getByRole('button',{name:'Copy Cruise link',exact:true}).click()
 const copied=await page.evaluate(()=>navigator.clipboard.readText()),link=new URL(copied)
 result.checks.shareLinkPreservesScene=link.pathname==='/cruise/experience'&&link.searchParams.get('car')==='countach'&&!!link.searchParams.get('at')&&!!link.searchParams.get('station')
 await page.getByRole('button',{name:'Close postcard preview',exact:true}).click()
 await options();await diagnostics()
 const exporting=page.waitForEvent('download');await page.getByRole('button',{name:'Export diagnostics',exact:true}).click();await(await exporting).saveAs(`${out}/QA-local-diagnostics.json`)
 const report=JSON.parse(await readFile(`${out}/QA-local-diagnostics.json`,'utf8'))
 result.checks.honestLocalCounters=report.scope.includes('This browser only')&&report.totals.session_start===1&&report.totals.at_15_seconds===1&&report.totals.at_60_seconds===1&&report.totals.postcard_share===1&&report.totals.listening_seconds>0
 result.checks.noTasteIdentifiers=!/"(stationId|artist|title|url|visitorId|sessionId)"/.test(JSON.stringify(report))
 await page.getByRole('button',{name:'Delete diagnostics and turn off',exact:true}).click();await page.waitForTimeout(2200)
 result.checks.deletionStopsCollection=await page.evaluate(()=>localStorage.getItem('buena-onda:experience:metrics:v1')===null&&localStorage.getItem('buena-onda:experience:metrics-consent:v1')==='off')
 result.requestHosts=[...hosts];result.checks.noMarketingRequests=!result.requestHosts.some(host=>/google-analytics|googletagmanager|facebook|clarity\.ms/.test(host))
 if(process.env.CHECK_LOW_QUALITY==='1'){
 result.checks.manualLowDpr=await page.evaluate(()=>window.__jeepNight?.().renderDpr===.75)
 await page.locator('#opening-options select').nth(1).selectOption('high')
 await page.waitForFunction(()=>window.__jeepNight?.().renderDpr===1,null,{timeout:10000})
 await page.waitForTimeout(5000)
 result.checks.manualHighDpr=await page.evaluate(()=>window.__jeepNight?.().renderDpr===1)
 }
 result.checks.noPageExceptions=result.errors.length===0
 await page.screenshot({path:`${out}/diagnostics-deleted.png`})
 if(Object.values(result.checks).some(v=>v!==true))process.exitCode=1
}catch(e){result.failure=e.stack||String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{})}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify(result,null,2))}
