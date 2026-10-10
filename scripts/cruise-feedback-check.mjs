// Local production app checks; no production mutations or physical-cast claims.
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))
const {chromium}=require('@playwright/test')
const out='docs/cruise/feedback/functional';await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']})
const report={date:new Date().toISOString(),browser:browser.version(),physicalDevice:false,checks:[],errors:[],stations:[],scenes:[]}
const check=(name,pass,evidence)=>{report.checks.push({name,pass,evidence});console.log(pass?'PASS':'FAIL',name)}
try{
 const ctx=await browser.newContext({viewport:{width:1440,height:900}})
 await ctx.route('**/*',r=>!['GET','HEAD'].includes(r.request().method())||/google-analytics|googletagmanager|vercel-insights/.test(r.request().url())?r.fulfill({status:204,body:''}):r.continue())
 await ctx.addInitScript(()=>{window.__presentationStarts=0;window.PresentationRequest=class{start(){window.__presentationStarts++;return Promise.reject(new Error('Unexpected separate receiver launch'))}}})
 const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message))
 await page.goto('http://127.0.0.1:3041/cruise/miami-test?profile=1',{timeout:120000})
 await page.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:120000})
 await page.locator('.mm-tvgate').click()
 await page.getByRole('button',{name:'Cast to TV',exact:true}).click()
 check('Cast keeps this scene, URL and tab',ctx.pages().length===1&&!page.url().includes('tv=1')&&await page.locator('.mm-stage canvas').count()===1,{url:page.url(),pages:ctx.pages().length})
 check('Cast does not request a separate presentation',await page.evaluate(()=>window.__presentationStarts===0),await page.locator('section[aria-label="Cast to TV"]').innerText())
 await page.screenshot({path:out+'/mirror-instructions.png'})
 await page.getByRole('button',{name:'Back to the Cruise',exact:true}).click()
 for(const name of ['Jolt Radio','NTS 1','NTS 2','Rinse France','The Lot Radio','Kiosk Radio','dublab']){
  await page.getByRole('button',{name:'Radio stations',exact:true}).click()
  const station=page.getByRole('button',{name:new RegExp(name,'i')})
  if(!await station.count()){check(name+' available in radio',false);await page.getByRole('button',{name:'Close radio',exact:true}).click();continue}
  await station.click();await page.getByRole('button',{name:'Close radio',exact:true}).click()
  await page.waitForTimeout(1500)
  if(!await page.evaluate(()=>window.__cruise().requested)){const play=page.getByRole('button',{name:'Play radio',exact:true});if(await play.count())await play.click()}
  await page.waitForFunction(()=>window.__cruise().playing&&window.__cruise().source==='live',undefined,{timeout:30000}).catch(()=>{})
  const state=await page.evaluate(()=>window.__cruise());report.stations.push({name,...state});check(name+' plays with live analysis',state.playing&&state.source==='live'&&state.station===({'Jolt Radio':'jolt-radio','NTS 1':'nts-radio','NTS 2':'nts-radio-2','Rinse France':'rinse-france','The Lot Radio':'the-lot-radio','Kiosk Radio':'kiosk-radio','dublab':'dublab'})[name],state)
 }
 await page.getByRole('button',{name:'Cast to TV',exact:true}).click();const during=await page.evaluate(()=>window.__cruise());check('Opening mirror instructions preserves radio playback',during.playing,during);await page.getByRole('button',{name:'Back to the Cruise',exact:true}).click()
 // Controlled test positions, not a claim of a full-lap soak.
 for(const distance of [40,190,210,250,330,400,420,520,620]){
  await page.evaluate(d=>{window.__streetDrive.paused=true;window.__streetDrive.distance=d},distance);await page.waitForTimeout(1800)
  const scene=await page.evaluate(()=>({state:window.__cruise(),render:window.__three.gl.info.render,memory:window.__three.gl.info.memory}));report.scenes.push(scene)
  await page.screenshot({path:`${out}/route-${distance}.png`});check('Route reaches '+distance+'m',Math.abs(scene.state.distance-distance)<1,scene)
 }
 // Inspect every existing exterior/cockpit camera at a controlled station.
 await page.evaluate(()=>{window.__streetDrive.paused=true;window.__streetDrive.distance=40})
 for(const camera of ['chase','driver','side','aerial','low','hood']){
  for(let i=0;i<6&&await page.evaluate(()=>window.__cruise().camera)!==camera;i++)await page.locator('button[aria-label^="Camera:"]').click()
  await page.waitForTimeout(1600);await page.screenshot({path:`${out}/car-${camera}.png`})
 }
 await page.getByRole('button',{name:'Garage and options',exact:true}).click();await page.getByRole('button',{name:'Auto director (cinematic cameras)',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click()
 const camera=await page.evaluate(()=>window.__cruise().camera);await page.waitForTimeout(17000);const next=await page.evaluate(()=>window.__cruise().camera);check('Director still changes shots',camera!==next,{camera,next})
 await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Radio stations',exact:true}).click();await page.screenshot({path:out+'/landscape-stations.png'});await page.getByRole('button',{name:'Close radio',exact:true}).click()
 await ctx.close()
}catch(e){report.errors.push(e.stack);console.error(e.message)}finally{await browser.close();report.passed=report.errors.length===0&&report.checks.every(x=>x.pass);await writeFile(out+'/results.json',JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1}
