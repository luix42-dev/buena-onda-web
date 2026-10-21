import {createRequire} from 'node:module'
import {writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl']}),page=await browser.newPage({viewport:{width:1280,height:720}})
const report={at:new Date().toISOString(),scope:'Staged local geometric opportunity and separate deliberate directory inspection. Not attention, unique reach or an attributed conversion.'}
try{
 await page.goto('http://127.0.0.1:3097/cruise/prototype?diagnostics=1',{waitUntil:'domcontentloaded',timeout:180000});await page.getByRole('button',{name:'Play Cruise',exact:true}).click({timeout:60000})
 await page.waitForFunction(()=>window.__jeepNight?.()?.ready&&window.__miamiAds?.()?.placements.length,null,{timeout:180000})
 await page.getByLabel('Camera view',{exact:true}).selectOption('chase');await page.evaluate(()=>{window.__miamiInspect(window.__miamiAds().placements.find(p=>p.surface==='billboard').routeMeters-25);document.activeElement?.blur()});await page.keyboard.press('Space');await page.waitForTimeout(4500)
 await page.getByRole('button',{name:/Along the drive/}).click();const buttons=page.locator('.prototype-business li button');report.directory=await buttons.allTextContents()
 const choice=buttons.filter({hasText:'Branches'});await((await choice.count())?choice:buttons.first()).click();report.inspected=await page.locator('.prototype-business h2').textContent()
 await page.locator('.prototype-business details summary').click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download local demo observations',exact:true}).click();await(await download).saveAs('docs/cruise/prototype-20261020/capture/business-demo.json')
 await page.screenshot({path:'docs/cruise/prototype-20261020/capture/business-card.png'})
}catch(e){report.failure=String(e);throw e}finally{await writeFile('docs/cruise/prototype-20261020/capture/business-inspection.json',JSON.stringify(report,null,2));await browser.close()}
