import {createRequire} from 'node:module'
import {readFile,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl']})
const context=await browser.newContext({viewport:{width:360,height:640},permissions:['clipboard-read','clipboard-write']})
const page=await context.newPage(),report={at:new Date().toISOString(),checks:{},errors:[],scope:'Final build UI/share check, desktop Edge with resized viewports. Not physical touch or television testing.'}
page.on('pageerror',e=>report.errors.push(e.message))
try{
 await page.goto('http://127.0.0.1:3097/cruise/prototype?diagnostics=1',{waitUntil:'domcontentloaded',timeout:180000})
 for(const [name,size]of [['portrait',{width:360,height:640}],['landscape',{width:844,height:390}]]){
  await page.setViewportSize(size);const button=page.getByRole('button',{name:'Play Cruise',exact:true});await button.waitFor({timeout:60000});const b=await button.boundingBox()
  report.checks[`${name}PlayFitsAt100Percent`]=!!b&&b.x>=0&&b.y>=0&&b.x+b.width<=size.width&&b.y+b.height<=size.height
 }
 await page.setViewportSize({width:1280,height:720})
 const clicked=Date.now();await page.getByRole('button',{name:'Play Cruise',exact:true}).click()
 await page.locator('.os-radio-hint').waitFor({timeout:180000})
 await page.locator('.os-radio-hint').waitFor({state:'detached',timeout:55000})
 report.guideGoneAfterMs=Date.now()-clicked;report.checks.guideAutoHides=true
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click()
 // Exercise the real clipboard fallback explicitly; native OS share-sheet hardware is unavailable.
 await page.evaluate(()=>Object.defineProperty(navigator,'share',{value:undefined,configurable:true}))
 report.shareFixture='Native navigator.share disabled for clipboard fallback coverage; no OS share-sheet claim.'
 await page.getByRole('button',{name:'Share this drive',exact:true}).click()
 await page.waitForFunction(async()=>!!(await navigator.clipboard.readText()).includes('/cruise/prototype'),null,{timeout:5000})
 report.copiedUrl=await page.evaluate(()=>navigator.clipboard.readText())
 report.checks.shareReturnsToPrototype=new URL(report.copiedUrl).pathname==='/cruise/prototype'
 await page.getByRole('button',{name:'Close menu',exact:true}).click()
 const capture=JSON.parse(await readFile('docs/cruise/prototype-20261020/capture/report.json','utf8'))
 await page.evaluate(m=>window.__miamiInspect(m),capture.captureRouteMeters);await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Space');await page.waitForTimeout(2500)
 await page.screenshot({path:'docs/cruise/prototype-20261020/capture/prototype-matching-cockpit.png'})
 await page.getByLabel('Camera view',{exact:true}).selectOption('chase')
 const candidates=await page.evaluate(()=>window.__miamiAds().placements.filter(p=>p.surface==='billboard').slice(0,20).map(p=>({id:p.id,meters:p.routeMeters})))
 report.adProbe=[];let best
 for(const candidate of candidates){
  await page.evaluate(m=>window.__miamiInspect(m),candidate.meters-25);await page.waitForTimeout(850)
  const sample=await page.evaluate(id=>{const s=window.__miamiAds().samples.find(s=>s.placement.id===id);return s?{id,visible:s.visible,viewable:s.viewable,readable:s.readable,width:s.pixelWidth,height:s.pixelHeight,occlusion:s.occlusion,campaign:s.placement.campaign.name}:null},candidate.id)
  report.adProbe.push(sample);if(sample?.readable){best=candidate;break}
 }
 if(best){
  await page.waitForTimeout(3000);report.checks.actualWorldAdQualified=true
  await page.screenshot({path:'docs/cruise/prototype-20261020/capture/qualified-world-ad.png'})
  await page.getByRole('button',{name:/Along the drive/}).click();await page.locator('.prototype-business details summary').click()
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download local demo observations',exact:true}).click();await(await download).saveAs('docs/cruise/prototype-20261020/capture/business-demo.json')
  await page.screenshot({path:'docs/cruise/prototype-20261020/capture/business-observations.png'})
 }
 const before=await context.newPage();await before.goto('http://127.0.0.1:3096/cruise/os?diagnostics=1&visual=rooms&car=countach&time=night',{waitUntil:'domcontentloaded',timeout:180000})
 await before.getByRole('button',{name:'Start the drive',exact:true}).click({timeout:60000});await before.waitForFunction(()=>window.__jeepNight?.()?.ready&&window.__miamiGeo?.()?.routeLength>0,null,{timeout:180000})
 await before.evaluate(m=>window.__miamiInspect(m),capture.captureRouteMeters);await before.getByRole('button',{name:'Dismiss radio guide',exact:true}).click()
 await before.evaluate(()=>document.activeElement?.blur());await before.keyboard.press('Space');await before.waitForTimeout(2500)
 await before.screenshot({path:'docs/cruise/prototype-20261020/capture/before-matching-cockpit.png'})
}catch(e){report.failure=String(e);throw e}finally{await writeFile('docs/cruise/prototype-20261020/final-smoke.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report))}
