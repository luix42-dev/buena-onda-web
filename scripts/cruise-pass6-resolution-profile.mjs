// Local-only production renderer DPR A/B/A. Exclusive GPU; no sign raycasts or production writes.
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1]}
const width=+arg('--width',1440),height=+arg('--height',900),seconds=+arg('--seconds',20),lowDpr=+arg('--dpr',.9)
const base=arg('--url','http://127.0.0.1:3041'),out=arg('--out','docs/cruise/pass6/resolution-profile');await mkdir(out,{recursive:true})
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Local loopback origin required')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']})
const result={browser:browser.version(),date:new Date().toISOString(),base,viewport:{width,height},windowDpr:1,physicalDevice:false,quality:'mobile',time:'night',camera:'driver',warmupSeconds:10,runs:[]}
try{
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1})
 await ctx.route('**/*',route=>{const q=route.request();if(!['GET','HEAD'].includes(q.method())||/google-analytics|googletagmanager|\/collect\?|vitals.vercel|vercel-insights/.test(q.url()))return route.fulfill({status:204,body:''});return route.continue()})
 const page=await ctx.newPage();result.errors=[];page.on('pageerror',e=>result.errors.push(e.message))
 await page.goto(`${base}/cruise/miami-test?profile=1`,{timeout:120000})
 await page.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:120000})
 await page.locator('.mm-tvgate').click()
 for(let i=0;i<3&&(await page.evaluate(()=>window.__cruise().time))!=='night';i++)await page.locator('button[aria-label^="Time of day:"]').click()
 await page.locator('button[aria-label^="Camera:"]').click()
 // Jolt is the lead's local production live-analysis station; select through the public UI.
 await page.locator('.mm-station').click()
 const jolt=page.getByRole('button',{name:/Jolt/i}).first()
 if(await jolt.count())await jolt.click()
 const close=page.getByRole('button',{name:'Close radio',exact:true});if(await close.count())await close.click()
 await page.waitForFunction(()=>window.__cruise().playing||document.querySelector('.mm-now-text b')?.textContent==='Tap play to tune in'||window.__cruise().error,undefined,{timeout:12000})
 if(!(await page.evaluate(()=>window.__cruise().playing)))await page.getByRole('button',{name:'Play radio',exact:true}).click()
 await page.waitForFunction(()=>window.__cruise().playing&&window.__cruise().source==='live',undefined,{timeout:30000})
 await page.waitForFunction(()=>window.__streetDrive.distance>=30,undefined,{timeout:60000})
 result.setup=await page.evaluate(()=>{window.__streetDrive.paused=true;window.__streetDrive.distance=30;const {gl}=window.__three,e=gl.getContext().getExtension('WEBGL_debug_renderer_info');return{state:window.__cruise(),renderer:e?gl.getContext().getParameter(e.UNMASKED_RENDERER_WEBGL):'unknown'}})
 for(const dpr of [1,lowDpr,1]){
  await page.evaluate(v=>window.__three.gl.setPixelRatio(v),dpr)
  await page.waitForTimeout(10000)
  const r=await page.evaluate(ms=>new Promise(resolve=>{const frames=[],samples=[];let last=performance.now(),start=last;const timer=setInterval(()=>samples.push({...window.__street}),1000);function tick(t){frames.push(t-last);last=t;if(t-start<ms){requestAnimationFrame(tick);return}clearInterval(timer);const sorted=[...frames].sort((a,b)=>a-b),wins=[];let acc=0,n=0;for(const dt of frames){acc+=dt;n++;if(acc>=1000){wins.push(n*1000/acc);acc=0;n=0}}wins.sort((a,b)=>a-b);const {gl}=window.__three;resolve({durationSeconds:(t-start)/1000,meanFps:frames.length*1000/(t-start),p5Fps:wins[Math.floor(wins.length*.05)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],maxFrameMs:sorted.at(-1),rendererDpr:gl.getPixelRatio(),buffer:{width:gl.domElement.width,height:gl.domElement.height},state:window.__cruise(),samples,frameIntervals:frames})}requestAnimationFrame(tick)}),seconds*1000)
  r.requestedDpr=dpr;result.runs.push(r)
  await page.screenshot({path:`${out}/${width}x${height}-${result.runs.length}-${dpr}.png`})
  await writeFile(`${out}/${width}x${height}.json`,JSON.stringify(result,null,2))
  console.log(JSON.stringify({dpr,meanFps:r.meanFps,p5Fps:r.p5Fps,p95FrameMs:r.p95FrameMs,buffer:r.buffer,state:r.state}))
 }
}finally{await browser.close()}
