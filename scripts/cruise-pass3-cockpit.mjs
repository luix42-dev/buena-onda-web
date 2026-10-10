// Pass 3 cockpit proof: screenshots + GL draw counts for /cruise/miami-test.
// Usage: node scripts/cruise-pass3-cockpit.mjs [--tag after] [--only desktop-sunset-mobile,...]
// Headless Edge uses SwiftShader (software GL): frame times here are NOT performance data.
// Draw counts = every drawArrays/drawElements(+Instanced) issued per animation frame
// (includes shadow and rear-view-mirror passes, unlike renderer.info which resets per render()).
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:d}
const tag=arg('--tag','after'),only=arg('--only','')?.split(',').filter(Boolean)
const out='docs/cruise/pass3/cockpit';await mkdir(out,{recursive:true})
const DESKTOP={name:'desktop',viewport:{width:1600,height:900}}
const PHONE={name:'phone-landscape',viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true}
const SHOTS=[
 [DESKTOP,'driver','sunset','mobile'],[DESKTOP,'driver','night','mobile'],[DESKTOP,'driver','sunset','desktop'],[DESKTOP,'driver','night','desktop'],[DESKTOP,'driver','day','mobile'],[DESKTOP,'chase','sunset','mobile'],[DESKTOP,'chase','night','desktop'],
 [PHONE,'driver','sunset','mobile'],[PHONE,'driver','night','mobile'],
].map(([profile,camera,time,quality])=>({profile,camera,time,quality,id:`${profile.name}-${camera}-${time}-${quality}`})).filter(s=>!only.length||only.includes(s.id))

const counter=()=>{
 let n=0;window.__draws=()=>n
 for(const P of [WebGL2RenderingContext.prototype,WebGLRenderingContext.prototype])for(const f of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const o=P[f];if(o)P[f]=function(...a){n++;return o.apply(this,a)}}
}
const results=[]
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']})
try{
 // Group by profile+quality so each page load is reused for several shots (one page at a time).
 const groups=new Map();for(const s of SHOTS){const k=s.profile.name+'|'+s.quality;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s)}
 for(const shots of groups.values()){
  const {profile,quality}=shots[0];console.log('Loading',profile.name,quality,new Date().toISOString())
  const context=await browser.newContext(profile),page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(counter)
  console.log('goto');await page.goto('http://127.0.0.1:3040/cruise/miami-test',{timeout:180000})
  console.log('loaded');await page.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:180000})
  await page.waitForTimeout(4000)
  const state=()=>page.evaluate(()=>window.__cruise?.())
  if(quality==='desktop'){
   await page.getByRole('button',{name:'More options'}).click()
   await page.getByLabel('Quality').selectOption('desktop')
   await page.getByRole('button',{name:'More options'}).click()
   await page.evaluate(()=>document.activeElement?.blur?.())
   await page.waitForTimeout(3000)
  }
  for(const shot of shots){
   for(let i=0;i<6&&(await state()).camera!==shot.camera;i++){await page.keyboard.press('c');await page.waitForTimeout(400)}
   for(let i=0;i<4&&(await state()).time!==shot.time;i++){await page.getByRole('button',{name:'Change time of day'}).click();await page.waitForTimeout(400)}
   await page.waitForTimeout(3500)
   const m=await page.evaluate(()=>new Promise(r=>{const d0=window.__draws();let f=0;const t0=performance.now();const tick=()=>{if(++f<20)requestAnimationFrame(tick);else r({draws:Math.round((window.__draws()-d0)/f),msPerFrame:Math.round((performance.now()-t0)/f)})};requestAnimationFrame(tick)}))
   const headUnit=await page.evaluate(()=>{try{return JSON.parse(document.documentElement.dataset.cruiseHeadUnit||'null')}catch{return null}})
   const path=`${out}/${tag}-${shot.id}.png`;await page.screenshot({path})
   const s=await state();const info={id:shot.id,tag,path,camera:s.camera,time:s.time,quality:s.quality,drawsPerFrame:m.draws,softwareMsPerFrame:m.msPerFrame,headUnit,errors:[...errors]}
   console.log(JSON.stringify(info));results.push(info)
   if(shot.id==='desktop-driver-sunset-mobile'&&headUnit){
    // VFD tuning sweep: change station from the radio panel, capture the head unit mid-sweep.
    await page.getByRole('button',{name:'Radio',exact:true}).click()
    const chips=page.locator('.mm-chips button[aria-pressed="false"]');await chips.first().click()
    await page.getByRole('button',{name:'Close radio'}).click()
    await page.waitForTimeout(250)
    const w=shot.profile.viewport.width,h=shot.profile.viewport.height,cx=headUnit.x/100*w,cy=headUnit.y/100*h
    const sweepPath=`${out}/${tag}-vfd-tuning-sweep.png`
    await page.screenshot({path:sweepPath,clip:{x:Math.max(0,cx-w*.2),y:Math.max(0,cy-h*.16),width:w*.4,height:Math.min(h*.3,h-Math.max(0,cy-h*.16))}})
    await page.waitForTimeout(1500)
    await page.screenshot({path:`${out}/${tag}-vfd-after-tune.png`,clip:{x:Math.max(0,cx-w*.2),y:Math.max(0,cy-h*.16),width:w*.4,height:Math.min(h*.3,h-Math.max(0,cy-h*.16))}})
    console.log('sweep shots',sweepPath)
   }
  }
  await context.close()
 }
}finally{await writeFile(`${out}/${tag}-measurements.json`,JSON.stringify(results,null,2));await browser.close()}
