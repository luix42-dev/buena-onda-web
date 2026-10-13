import{createRequire}from'node:module';
import{readFile,writeFile}from'node:fs/promises';
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test'),out='docs/cruise/miami-ads',base=process.env.CRUISE_TEST_URL||'http://127.0.0.1:3066';
const earlier=JSON.parse(await readFile(`${out}/after-results.json`,'utf8')),car=earlier.runs.find(r=>r.viewport.width===390).cars.find(c=>c.vehicle==='cadillac'),points=car.scan.filter(scan=>scan.samples.some(s=>s.visible&&s.occlusion<=.5&&s.pixelWidth>=64&&s.pixelHeight>=24)).map(s=>s.meters);
if(!points.length)throw Error('No actual partially visible Cadillac approach in original evidence');
const result={url:base,viewport:{width:390,height:844},method:'Targeted actual Cadillac portrait companion-cue retest at previously recorded partly visible billboard approaches. Strict world-readable/viewable and exposure flags are inspected separately. No repeated FPS benchmark.',points,checks:{},errors:[]};
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']});
const until=async(page,fn,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return true;await page.waitForTimeout(150)}return false};
try{
 const context=await browser.newContext({viewport:result.viewport,isMobile:true,hasTouch:true});await context.addInitScript(()=>{window.__adProofAudio={created:0};const A=Audio;function Observe(...args){window.__adProofAudio.created++;return new A(...args)}Observe.prototype=A.prototype;window.Audio=Observe});
 const page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.goto(`${base}/cruise?diagnostics=1`,{timeout:90000});await until(page,()=>page.evaluate(()=>window.__jeepNight?.().ready),60000);
 await page.getByRole('button',{name:'Start the drive',exact:true}).click();await page.getByRole('button',{name:'Pause drive',exact:true}).click();await page.getByRole('combobox',{name:'Cruise vehicle'}).selectOption('cadillac');result.checks.ready=await until(page,()=>page.evaluate(()=>window.__jeepNight().vehicle==='cadillac'&&window.__jeepNight().ready),30000);
 for(const point of points){await page.evaluate(m=>window.__miamiInspect(m),point);if(await until(page,()=>page.locator('[aria-label="Along your drive"][data-recently-seen="false"]').count(),3000)){result.point=point;break}}
 const cue=page.getByRole('complementary',{name:'Along your drive'});result.checks.actualCue=!!result.point;
 result.state=await page.evaluate(()=>({vehicle:window.__jeepNight(),ads:window.__miamiAds(),events:window.__cruiseAnalytics||[],audioOwner:window.__adProofAudio.created}));
 await page.screenshot({path:`${out}/after-390-cadillac-cockpit-ad.png`});
 if(result.checks.actualCue){
  result.placement=await cue.getAttribute('data-placement');const sample=result.state.ads.samples.find(s=>s.placement.id===result.placement);result.sample=sample;
  result.checks.actualPartialFace=sample.visible&&sample.occlusion<=.5&&sample.pixelWidth>=64&&sample.pixelHeight>=24&&sample.facing>=.35&&sample.projectedArea>=.003;
  result.checks.strictWorldNotQualified=!sample.viewable&&!sample.readable;
  await page.getByRole('button',{name:'Radio',exact:true}).click();await page.waitForTimeout(700);result.checks.radioHidesCue=await cue.count()===0;await page.screenshot({path:`${out}/after-390-cadillac-radio.png`});await page.getByRole('button',{name:'Back to drive',exact:true}).click();await until(page,()=>cue.count(),4000);
  const owner=result.state.audioOwner,opened=context.waitForEvent('page');await cue.locator('a').click();const popup=await opened;await popup.waitForLoadState('domcontentloaded',{timeout:45000});result.popup={url:popup.url(),body:(await popup.locator('body').innerText()).slice(0,300)};await popup.close();await page.bringToFront();
  result.after=await page.evaluate(()=>({vehicle:window.__jeepNight(),events:window.__cruiseAnalytics||[],audioOwner:window.__adProofAudio.created}));result.checks.popupPreservesRadio=result.after.audioOwner===owner&&result.after.vehicle.playing&&result.after.vehicle.station===result.state.vehicle.station;
  result.checks.noWorldExposure=result.after.events.filter(e=>e.name==='cruise_ad_exposure').length===result.state.events.filter(e=>e.name==='cruise_ad_exposure').length;
 }
 result.checks.noErrors=result.errors.length===0;await context.close();
}finally{await writeFile(`${out}/cadillac-portrait-retest.json`,JSON.stringify(result,null,2));await browser.close()}
console.log(JSON.stringify({checks:result.checks,point:result.point}));if(Object.values(result.checks).some(v=>v===false))process.exitCode=1;
