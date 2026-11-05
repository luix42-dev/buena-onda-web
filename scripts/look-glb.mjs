// Countach GLB before/after: same look build, compressed default vs ?glb=source, cold cache each trial.
// node scripts/look-glb.mjs <baseUrl> <outFile> [trials]
import {createRequire} from 'node:module'
import {writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const [base='http://127.0.0.1:3067',outFile='docs/cruise/look-20261021/perf/glb.json',trialsArg='3']=process.argv.slice(2)
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']})
// Throttle profile: ~9 Mbit/s down, 40 ms RTT (a decent 4G link). Emulation, not a carrier measurement.
const networks={unthrottled:null,'4g-9mbps':{offline:false,latency:40,downloadThroughput:9e6/8,uploadThroughput:3e6/8}}
const results=[]
for(const [network,conditions]of Object.entries(networks))for(const variant of['compressed','source'])for(let trial=0;trial<Number(trialsArg);trial++){
 const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage()
 if(conditions){const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',conditions)}
 const t0=Date.now()
 await page.goto(`${base}/cruise/prototype?diagnostics=1${variant==='source'?'&glb=source':''}`,{waitUntil:'domcontentloaded',timeout:300000})
 await page.getByRole('button',{name:'Play Cruise',exact:true}).click({timeout:300000})
 await page.waitForFunction(()=>window.__jeepNight?.()?.ready,null,{timeout:300000,polling:100})
 const readyMs=Date.now()-t0
 const glb=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>/countach(-opt)?\.glb/.test(e.name)).map(e=>({name:e.name.split('/').pop(),transferBytes:e.transferSize,bodyBytes:e.encodedBodySize,fetchMs:Math.round(e.duration)})))
 results.push({network,variant,trial,readyMs,glb});console.log(network,variant,trial,readyMs,JSON.stringify(glb))
 await context.close()
}
await browser.close()
const summary={}
for(const r of results){const k=`${r.network}/${r.variant}`;(summary[k]??=[]).push(r)}
for(const k of Object.keys(summary)){const list=summary[k],avg=f=>Math.round(list.reduce((a,r)=>a+f(r),0)/list.length);summary[k]={trials:list.length,readyMsMean:avg(r=>r.readyMs),glbFetchMsMean:avg(r=>r.glb[0]?.fetchMs??0),glbBytes:list[0].glb[0]?.bodyBytes}}
await writeFile(outFile,JSON.stringify({at:new Date().toISOString(),base,note:'Cold browser context per trial; server local; throttle via CDP emulation. readyMs = navigation to vehicle+route ready after pressing Play, not first audible music.',summary,results},null,1))
console.log(JSON.stringify(summary,null,1))
