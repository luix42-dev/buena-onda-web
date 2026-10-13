import{createRequire}from'node:module';import{mkdir,writeFile}from'node:fs/promises'
if(process.argv.includes('--ads')){await import('./miami-ads-proof.mjs');process.exit()}
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const out='docs/cruise/real-miami-integration',result={method:'Actual integrated /cruise route in separate headless Edge. No mocked application, assets or audio. Mobile sizes are desktop emulation. Native Chrome TV session untouched.',runs:[]}
await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']})
try{
 for(const viewport of[{width:1280,height:720},{width:390,height:844}]){
  const context=await browser.newContext({viewport,...(viewport.width===390?{isMobile:true,hasTouch:true}:{})}),page=await context.newPage(),run={viewport,errors:[],checks:{},cars:[]};result.runs.push(run)
  await context.addInitScript(()=>{const Original=Audio;window.__routeAudio={created:0};function Observed(...args){window.__routeAudio.created++;return new Original(...args)}Observed.prototype=Original.prototype;window.Audio=Observed})
  page.on('pageerror',e=>run.errors.push(e.message));await page.goto('http://127.0.0.1:3064/cruise?diagnostics=1',{waitUntil:'domcontentloaded',timeout:180000})
  await page.waitForFunction(()=>window.__jeepNight?.().ready,{},{timeout:90000});run.checks.newGarage=await page.locator('.rp-lineup button').count()===3
  for(const [id,name]of[['wrangler','Choose 2012 Wrangler'],['eighties','Choose 1987 Fiero GT'],['cadillac','Choose 1959 Eldorado Biarritz']]){
   await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(id=>{const s=window.__jeepNight?.();return s?.ready&&s.vehicle===id},id,{timeout:60000});await page.waitForTimeout(1000)
   run.cars.push(await page.evaluate(()=>window.__jeepNight()));await page.screenshot({path:`${out}/route-${viewport.width}-${id}-garage.png`})
  }
  run.checks.imagesLoaded=await page.locator('.rp img').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth>0));run.checks.noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);run.layout=await page.evaluate(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {class:n.className,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};return {height:innerHeight,width:innerWidth,scene:rect(document.querySelector('.jn')),picker:rect(document.querySelector('.rp')),cards:[...document.querySelectorAll('.rp-lineup button')].map(rect),credits:[...document.querySelectorAll('.jn-credits,.jn-extra-credit')].map(rect)}});run.checks.cardsWithinViewport=run.layout.cards.every(r=>r.x>=0&&r.y>=0&&r.right<=viewport.width&&r.bottom<=viewport.height)
  await page.getByRole('button',{name:/LET.S CRUISE|Start the drive/i}).click();await page.waitForFunction(()=>!window.__jeepNight?.().garage,{},{timeout:15000});await page.waitForTimeout(6000)
  run.started=await page.evaluate(()=>window.__jeepNight());run.audioOwners=await page.evaluate(()=>window.__routeAudio);run.checks.cruising=run.started.distance>0&&!run.started.garage
  await page.getByRole('button',{name:'Radio',exact:true}).click();await page.waitForTimeout(1300);run.checks.radioFocused=(await page.evaluate(()=>window.__jeepNight())).radioFocused;await page.screenshot({path:`${out}/route-${viewport.width}-cadillac-radio.png`})
  await page.getByRole('button',{name:'Back to drive',exact:true}).click();await page.getByRole('button',{name:/Return to garage|^Garage$/}).click();await page.waitForTimeout(500)
  run.checks.returnGarage=(await page.evaluate(()=>window.__jeepNight())).garage;run.checks.audioOwnerRetained=run.audioOwners.created===(await page.evaluate(()=>window.__routeAudio)).created
  await page.getByRole('button',{name:'Cast Cruise to a TV or display'}).click();run.checks.truthfulCast=(await page.getByRole('region',{name:'Cast Cruise'}).innerText()).includes('Cast tab');await page.screenshot({path:`${out}/route-${viewport.width}-cast.png`});await context.close()
 }
 for(const query of['experience=legacy','campaign=vice-nights']){
  const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),run={query,errors:[],checks:{}};result.runs.push(run);page.on('pageerror',e=>run.errors.push(e.message))
  await page.goto('http://127.0.0.1:3064/cruise?'+query,{waitUntil:'domcontentloaded',timeout:180000});await page.locator('.launch-lineup button').first().waitFor({timeout:60000});run.checks.legacyThreeCars=await page.locator('.launch-lineup button').count()===3;run.checks.newSceneAbsent=await page.locator('.jn').count()===0;run.labels=await page.locator('.launch-lineup button').allTextContents();await page.screenshot({path:`${out}/route-${query.startsWith('experience')?'legacy':'campaign'}-garage.png`});await context.close()
 }
}finally{await writeFile(`${out}/route-results.json`,JSON.stringify(result,null,2));await browser.close()}
console.log(JSON.stringify(result,null,2));if(result.runs.some(r=>r.errors.length||Object.values(r.checks).some(v=>v===false)))process.exitCode=1
