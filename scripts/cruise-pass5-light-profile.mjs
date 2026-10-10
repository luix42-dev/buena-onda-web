// Local-only spotlight A/B/A. Run with exclusive GPU access; never enables expensive sign metrics.
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))
const {chromium}=require('@playwright/test')
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1]}
const width=+arg('--width',1440),height=+arg('--height',900),seconds=+arg('--seconds',30),tag=arg('--tag','baseline')
const out='docs/cruise/pass5/night-profile';await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']})
const result={browser:browser.version(),date:new Date().toISOString(),viewport:{width,height},windowDpr:1,physicalDevice:false,quality:'mobile',time:'night',camera:'driver',warmupSeconds:10,runs:[]}
try{
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1})
 await ctx.route('**/*',route=>{const q=route.request();if(!['GET','HEAD'].includes(q.method())||/google-analytics|googletagmanager|\/collect\?|vitals.vercel|vercel-insights/.test(q.url()))return route.fulfill({status:204,body:''});return route.continue()})
 const page=await ctx.newPage();result.errors=[];page.on('pageerror',e=>result.errors.push(e.message))
 await page.goto('http://127.0.0.1:3040/cruise/miami-test?profile=1',{timeout:120000})
 await page.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:120000})
 await page.locator('.mm-tvgate').click()
 for(let i=0;i<3&&(await page.evaluate(()=>window.__cruise().time))!=='night';i++)await page.locator('button[aria-label^="Time of day:"]').click()
 await page.locator('button[aria-label^="Camera:"]').click()
 await page.waitForFunction(()=>window.__streetDrive.distance>=30,undefined,{timeout:60000})
 result.setup=await page.evaluate(()=>{window.__streetDrive.paused=true;window.__streetDrive.distance=30;window.__qaLights=[];const {gl,scene}=window.__three;scene.traverse(o=>{if(o.isSpotLight){let p=o.parent;while(p&&p.name!=='OceanDriveConvertible')p=p.parent;if(p)window.__qaLights.push(o)}});const ext=gl.getContext().getExtension('WEBGL_debug_renderer_info');return{state:window.__cruise(),renderer:ext?gl.getContext().getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',rendererDpr:gl.getPixelRatio(),canvas:{width:gl.domElement.width,height:gl.domElement.height},lights:window.__qaLights.map(o=>({intensity:o.intensity,distance:o.distance,shadow:o.castShadow}))}})
 for(const enabled of [true,false,true]){
  await page.evaluate(v=>{window.__qaLights.forEach(o=>{o.visible=v})},enabled)
  await page.waitForTimeout(10000)
  const r=await page.evaluate(ms=>new Promise(resolve=>{const frames=[],samples=[];let last=performance.now(),start=last;const heapStart=performance.memory?.usedJSHeapSize/1048576;const sample=setInterval(()=>{samples.push({...window.__street,heapMB:performance.memory?.usedJSHeapSize/1048576})},1000);const tick=t=>{frames.push(t-last);last=t;if(t-start<ms){requestAnimationFrame(tick);return}clearInterval(sample);const sorted=[...frames].sort((a,b)=>a-b),wins=[];let acc=0,n=0;for(const dt of frames){acc+=dt;n++;if(acc>=1000){wins.push(n*1000/acc);acc=0;n=0}}wins.sort((a,b)=>a-b);resolve({durationSeconds:(t-start)/1000,frames:frames.length,meanFps:frames.length*1000/(t-start),p5Fps:wins[Math.floor(wins.length*.05)],worstFps:wins[0],p95FrameMs:sorted[Math.floor(sorted.length*.95)],p99FrameMs:sorted[Math.floor(sorted.length*.99)],maxFrameMs:sorted.at(-1),stallsOver50ms:frames.filter(t=>t>50).length,stallsOver100ms:frames.filter(t=>t>100).length,stallsOver2000ms:frames.filter(t=>t>=2000).length,heapStartMB:heapStart,heapEndMB:performance.memory?.usedJSHeapSize/1048576,samples,frameIntervals:frames})};requestAnimationFrame(tick)}),seconds*1000)
  const index=result.runs.length;r.spotlights=enabled;result.runs.push(r)
  await page.screenshot({path:`${out}/${tag}-${width}x${height}-${index}-${enabled?'lights':'decal'}.png`})
  console.log(JSON.stringify({tag,enabled,meanFps:r.meanFps,p5Fps:r.p5Fps,p95FrameMs:r.p95FrameMs,sample:r.samples.at(-1)}))
  await writeFile(`${out}/${tag}-${width}x${height}.json`,JSON.stringify(result,null,2))
 }
}finally{await browser.close()}
