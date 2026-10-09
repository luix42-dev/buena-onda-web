import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const local=createRequire(import.meta.url)
let chromium
try{({chromium}=local('@playwright/test'))}catch{({chromium}=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url))('@playwright/test'))}
const out='docs/cruise/master';await mkdir(`${out}/video-radio`,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl']})
const evidence={errors:[]}
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:`${out}/video-radio`,size:{width:1440,height:1000}}})
 await context.addInitScript(()=>{const Original=window.Audio;window.__radioMedia=[];window.Audio=class extends Original{constructor(src){super(src);const item={time:0,playing:false,src:''};window.__radioMedia.push(item);this.addEventListener('timeupdate',()=>Object.assign(item,{time:this.currentTime,playing:!this.paused,src:this.currentSrc}))}}})
 const videoStart=Date.now(),page=await context.newPage();page.on('pageerror',e=>evidence.errors.push(e.message))
 await page.goto('http://127.0.0.1:3040/cruise/miami-test',{timeout:120000});await page.waitForFunction(()=>window.__street?.calls>0&&document.querySelector('.miami-master')?.dataset.ready==='true')
 await page.getByRole('button',{name:'Directory',exact:true}).click();await page.getByRole('button',{name:'Buena Onda Record Store',exact:true}).click();await page.locator('.mm-backdrop').click({position:{x:10,y:10}});await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});evidence.escapeAfterBackdropClick=true;await page.getByRole('button',{name:'Directory',exact:true}).click()
 await page.getByRole('button',{name:'Cockpit view',exact:true}).click();await page.getByRole('button',{name:'Radio',exact:true}).click();await page.getByRole('button',{name:'NTS 1',exact:true}).click();await page.getByRole('button',{name:'Play radio',exact:true}).click();await page.getByRole('button',{name:'Pause radio',exact:true}).waitFor({timeout:20000});await page.getByRole('button',{name:'Radio',exact:true}).click()
 await page.getByRole('button',{name:'Start cruise',exact:true}).click();const start=Date.now();evidence.drivingVideoOffsetMs=start-videoStart
 for(const distance of [40,80,125]){await page.waitForFunction(d=>window.__streetDrive?.distance>=d,distance,{timeout:60000});await page.screenshot({path:`${out}/radio-driving-${distance}m.png`})}
 await page.waitForTimeout(Math.max(0,55000-(Date.now()-start)));evidence.media=await page.evaluate(()=>window.__radioMedia);evidence.drive=await page.evaluate(()=>({...window.__streetDrive}));await page.getByRole('button',{name:'Pause cruise',exact:true}).click()
 await page.getByRole('button',{name:'Restart',exact:true}).click();await page.getByLabel('Time of day').selectOption('night');await page.waitForTimeout(2000);await page.screenshot({path:`${out}/night-cockpit-review.png`});await page.getByRole('button',{name:'Chase view',exact:true}).click();await page.waitForTimeout(1500);await page.screenshot({path:`${out}/night-chase-review.png`})
 await page.getByLabel('Time of day').selectOption('sunset');await page.getByLabel('Quality').selectOption('desktop');await page.evaluate(()=>window.__streetSamples=[]);await page.waitForTimeout(10000);evidence.desktopShadowsPausedSamples=await page.evaluate(()=>window.__streetSamples);await page.screenshot({path:`${out}/desktop-shadows-review.png`})
 const video=page.video();await context.close();evidence.video=await video.path()
}catch(e){evidence.failure=String(e)}finally{await browser.close();await writeFile(`${out}/radio-video.json`,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence))}
