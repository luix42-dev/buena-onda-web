import{createRequire}from'node:module';
import{writeFile}from'node:fs/promises';
import{fileURLToPath}from'node:url';
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test');
const {chromiumSwitches}=require(fileURLToPath(new URL('../../cruise-master-20261005/node_modules/playwright-core/lib/server/chromium/chromiumSwitches.js',import.meta.url)));
const blocked=chromiumSwitches(false,'msedge',false).find(arg=>arg.startsWith('--disable-features=')),features=blocked.split('=')[1].split(',').filter(f=>f!=='CalculateNativeWinOcclusion');
const base=process.env.CRUISE_TEST_URL||'http://127.0.0.1:3066',result={url:base,point:18906.5,camera:'chase',method:'Actual headed Edge billboard followed by real minimization or an actual foreground/background tab transition in this isolated browser only. document.hidden is observed, never mocked. Native Chrome casting session untouched.',checks:{}};
const browser=await chromium.launch({channel:'msedge',headless:false,ignoreDefaultArgs:[blocked,'--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],args:[`--disable-features=${features.join(',')}`,'--start-minimized','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']});
const until=async(fn,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return true;await new Promise(r=>setTimeout(r,200))}return false};
try{
 const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),cdp=await context.newCDPSession(page),{windowId}=await cdp.send('Browser.getWindowForTarget');
 await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});
 await page.goto(`${base}/cruise?diagnostics=1`,{timeout:90000});
 result.checks.ready=await until(()=>page.evaluate(()=>window.__jeepNight?.().ready),60000);
 await page.getByRole('button',{name:'Start the drive',exact:true}).click();await page.getByRole('button',{name:'Pause drive',exact:true}).click();
 await page.getByRole('button',{name:'Switch cockpit and chase camera'}).click();await page.evaluate(m=>window.__miamiInspect(m),result.point);
 result.checks.initialWorldReadable=await until(()=>page.evaluate(()=>window.__miamiAds?.().samples.some(s=>s.readable)),7000);
 result.checks.initialCue=await until(()=>page.getByRole('complementary',{name:'Along your drive'}).count(),7000);
 await page.waitForTimeout(2500);
 const capture=()=>page.evaluate(()=>({visibility:document.visibilityState,hidden:document.hidden,cuePresent:!!document.querySelector('[data-recently-seen]'),ads:window.__miamiAds(),events:window.__cruiseAnalytics||[],vehicle:window.__jeepNight()}));
 result.before=await capture();await page.screenshot({path:'docs/cruise/miami-ads/hidden-visible-chase.png'});
 await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'minimized'}});
 result.checks.actualHidden=await until(()=>page.evaluate(()=>document.hidden),3000);result.visibilityMethod='minimized own automation window';
 if(!result.checks.actualHidden){
  await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});
  const foreground=await context.newPage();await foreground.goto('about:blank');await foreground.bringToFront();
  result.visibilityMethod='actual background tab in own headed Edge';result.checks.actualHidden=await until(()=>page.evaluate(()=>document.hidden),3000);
 }
 await page.waitForTimeout(1000);result.hiddenStart=await capture();await page.waitForTimeout(3000);result.hiddenEnd=await capture();
 result.checks.hiddenCueSuppressed=result.checks.actualHidden&&!result.hiddenEnd.cuePresent;
 result.checks.hiddenSamplesReset=result.checks.actualHidden&&result.hiddenEnd.ads.samples.every(s=>!s.visible&&!s.viewable&&!s.readable);
 const exposures=s=>s.events.filter(e=>e.name==='cruise_ad_exposure').length;
 result.checks.noHiddenExposure=result.checks.actualHidden&&exposures(result.hiddenEnd)===exposures(result.hiddenStart);
 await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});await page.bringToFront();
 result.checks.resumedVisible=await until(()=>page.evaluate(()=>!document.hidden),3000);result.resumed=await capture();
 result.checks.radioPreserved=result.resumed.vehicle.playing&&result.before.vehicle.station===result.resumed.vehicle.station;
 await context.close();
}finally{await writeFile('docs/cruise/miami-ads/hidden-results.json',JSON.stringify(result,null,2));await browser.close()}
console.log(JSON.stringify({checks:result.checks,visibilityMethod:result.visibilityMethod}));if(Object.values(result.checks).some(v=>v===false))process.exitCode=1;
