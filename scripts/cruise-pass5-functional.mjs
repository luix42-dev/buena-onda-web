// Local integration checks. All network mutations are intercepted, including beacons.
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const out='docs/cruise/pass5/functional';await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']})
const result={date:new Date().toISOString(),browser:browser.version(),physicalDevice:false,checks:[],errors:[],notes:['Tab visibility change is simulated through the visibilitychange contract.','Drive position is advanced through the existing local profile probe for boundary tests.','No production writes or real checkout.']}
const check=(name,pass,evidence)=>{result.checks.push({name,pass,evidence});console.log(pass?'PASS':'FAIL',name)}
try{
 const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:844,height:390}}})
 await ctx.route('**/*',r=>!['GET','HEAD'].includes(r.request().method())||/google-analytics|googletagmanager|vercel-insights/.test(r.request().url())?r.fulfill({status:204,body:''}):r.continue())
 const p=await ctx.newPage();p.on('pageerror',e=>result.errors.push(e.message));await p.goto('http://127.0.0.1:3040/cruise/miami-test?profile=1',{timeout:120000})
 await p.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:120000})
 const state=()=>p.evaluate(()=>window.__cruise())
 check('Start gate focused',await p.waitForFunction(()=>document.activeElement?.classList.contains('mm-tvgate'),undefined,{timeout:5000}).then(()=>true,()=>false))
 await p.keyboard.press('Tab');check('Start gate isolates underlying controls',await p.evaluate(()=>!document.activeElement?.closest('[inert]')));await p.locator('.mm-tvgate').focus()
 await p.keyboard.press('c');check('Camera shortcut blocked before Start',(await state()).camera==='chase')
 await p.locator('.mm-tvgate').click();await p.waitForFunction(()=>window.__cruise().playing,undefined,{timeout:12000}).catch(()=>{})
 check('Start unlocks radio and automatic driving',(await state()).running&&(await state()).playing,await state())
 check('Debug metrics hidden by default',await p.locator('.mm-status').evaluate(e=>getComputedStyle(e).display==='none'))
 check('No rendered weapon meshes',await p.evaluate(()=>{const names=[];window.__three.scene.traverseVisible(o=>{if(o.isMesh&&/pistol|gun|weapon|rifle|knife/i.test(o.name))names.push(o.name)});return names.length===0}))
 await p.getByRole('button',{name:'Radio stations',exact:true}).click();await p.getByRole('button',{name:/Jolt/}).click();await p.getByRole('button',{name:'Close radio',exact:true}).click()
 const live=await p.waitForFunction(()=>window.__cruise().source==='live'&&window.__cruise().playing,undefined,{timeout:30000}).then(()=>true,()=>false)
 check('Jolt analysis becomes live',live,await state())
 const samples=[];for(let i=0;i<20;i++){await p.waitForTimeout(250);samples.push(await state())}
 check('Jolt real analysis varies',new Set(samples.map(x=>x.energy)).size>3&&samples.every(x=>x.source==='live'),{min:Math.min(...samples.map(x=>x.energy)),max:Math.max(...samples.map(x=>x.energy))})
 const banner=()=>p.evaluate(()=>{let values=[];window.__three.scene.traverse(o=>{if(o.isInstancedMesh&&o.count===24&&o.geometry.parameters?.width===.32)values=Array.from({length:24},(_,i)=>o.instanceMatrix.array[i*16+5])});return values})
 const bandSamples=[];for(let i=0;i<8;i++){bandSamples.push(await banner());await p.waitForTimeout(250)}
 const onBands=bandSamples[0].map((_,i)=>bandSamples.reduce((n,s)=>n+s[i],0)/bandSamples.length);await p.getByRole('button',{name:'Pause radio',exact:true}).click();await p.waitForTimeout(2400);const offBands=await banner()
 check('Music drives actual banner geometry; pause settles it',onBands.length===24&&offBands.length===24&&onBands.reduce((a,b)=>a+b,0)>offBands.reduce((a,b)=>a+b,0),( {onBands,offBands,state:await state()} ))
 await p.getByRole('button',{name:'Play radio',exact:true}).click();await p.waitForFunction(()=>window.__cruise().playing&&window.__cruise().source==='live',undefined,{timeout:12000}).catch(()=>{})
 for(let i=0;i<6;i++){await p.locator('button[aria-label^="Camera:"]').click();await p.waitForTimeout(400);check('Camera keeps radio '+i,(await state()).playing&&((await state()).source==='live'),await state())}
 await p.locator('button[aria-label^="Camera:"]').click();await p.waitForTimeout(1000)
 // Click a physical radio preset using its projected 3D location, not a React handler.
 const projectPreset=index=>p.evaluate(i=>{const {scene,camera}=window.__three;const presets=scene.getObjectByName('CockpitPresets');const v=presets.position.clone().set(0,0,0),m=presets.matrix.clone();presets.getMatrixAt(i,m);v.applyMatrix4(m);presets.localToWorld(v);v.project(camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2}},index)
 const point=await projectPreset(2)
 const prev=(await state()).station;await p.mouse.click(point.x,point.y);await p.waitForTimeout(1800)
 check('Physical cockpit preset is clickable',(await state()).station!==prev,{point,before:prev,after:(await state()).station})
 await p.getByRole('button',{name:'Garage and options'}).click();await p.getByRole('button',{name:'Buena Onda Record Store',exact:true}).click();await p.waitForTimeout(500)
 check('Store detail pauses driving',(await state()).paused)
 await p.keyboard.press('Escape');await p.waitForTimeout(700);check('Closing detail resumes driving',(await state()).running&&!((await state()).paused))
 // Close Garage left behind the detail, if still present.
 const garageClose=p.getByRole('button',{name:'Close',exact:true});if(await garageClose.count())await garageClose.click()
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await p.waitForTimeout(300);check('Hidden tab pauses ride',(await state()).paused)
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});await p.waitForTimeout(700);check('Visible tab resumes ride',(await state()).running)
 await p.getByRole('button',{name:'Garage and options'}).click();await p.getByRole('button',{name:'Restart',exact:true}).click();await p.waitForTimeout(500);check('Restart keeps automatic ride running',(await state()).running)
 await p.getByRole('button',{name:'Close',exact:true}).click()
 const speed=await p.evaluate(()=>window.__streetDrive.speed);await p.keyboard.down('ArrowUp');await p.keyboard.down('a');await p.waitForTimeout(600);await p.keyboard.up('ArrowUp');await p.keyboard.up('a');check('Manual acceleration removed',await p.evaluate(s=>window.__streetDrive.speed===s,speed))
 await p.evaluate(()=>window.__streetDrive.distance=75);await p.waitForTimeout(1200);check('Hidden Avenue has no unsolicited cards',await p.locator('.mm-sponsor,.av-ticker,.mm-avenue').count()===0)
 await p.evaluate(()=>window.__streetDrive.distance=209.8);await p.waitForTimeout(2300);check('Street automatically loops',(await state()).distance<15&&(await state()).running,await state())
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(1000);check('Portrait resize no overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+2))
 const dock=await p.locator('.mm-dock').boundingBox();check('Portrait dock is compact',dock.height<=116,dock)
 const portraitPoint=await projectPreset(3),portraitStation=(await state()).station
 await p.mouse.click(portraitPoint.x,portraitPoint.y);await p.waitForTimeout(700)
 check('Portrait rightmost cockpit preset is visible and clickable',portraitPoint.x>0&&portraitPoint.x<390&&portraitPoint.y>0&&portraitPoint.y<dock.y&&(await state()).station!==portraitStation,{point:portraitPoint,before:portraitStation,after:(await state()).station})
 await p.screenshot({path:`${out}/portrait-cockpit.png`})
 await p.setViewportSize({width:844,height:390});await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(600)
 const a=await p.locator('.mm-eq').evaluate(e=>[...e.children].map(b=>b.style.transform));await p.waitForTimeout(700);const b=await p.locator('.mm-eq').evaluate(e=>[...e.children].map(b=>b.style.transform));check('Reduced-motion dock EQ is static',JSON.stringify(a)===JSON.stringify(b),{a,b})
 await p.screenshot({path:`${out}/landscape-cockpit.png`})
 await p.getByRole('button',{name:'Garage and options'}).click();await p.getByLabel('Quality',{exact:true}).selectOption('desktop');await p.getByRole('button',{name:'Close',exact:true}).click()
 for(let i=0;i<3&&(await state()).time!=='night';i++)await p.locator('button[aria-label^="Time of day:"]').click()
 await p.waitForTimeout(2500);const desktopLights=await p.evaluate(()=>{let n=0;window.__three.scene.traverseVisible(o=>{if(o.isSpotLight&&o.intensity>0)n++});return n})
 check('Desktop night retains two real headlights',desktopLights===2,{desktopLights,state:await state()});await p.screenshot({path:`${out}/desktop-quality-night.png`})
 await p.goto('http://127.0.0.1:3040/cruise/miami-test?avenue=preview');await p.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:120000});await p.locator('.mm-tvgate').click();await p.waitForTimeout(800)
 check('Unauthenticated preview stays hidden',await p.locator('.av-drawer,.av-ticker,.mm-avenue').count()===0)
 await p.goto('http://127.0.0.1:3040/cruise/miami-test?tv=1');await p.waitForFunction(()=>document.querySelector('main')?.dataset.ready==='true',undefined,{timeout:120000});await p.keyboard.press('Enter');await p.waitForTimeout(3000)
 check('TV Enter starts automatic ride and radio',(await state()).running&&(await state()).playing&&await p.locator('.mm-tvgate').count()===0,await state())
 await p.screenshot({path:`${out}/tv.png`});await ctx.close();await p.video().saveAs(`${out}/interaction.webm`);await p.video().delete()
}catch(e){result.failure=e.message;console.log('FAIL',e.message)}finally{await browser.close();result.passed=!result.failure&&!result.errors.length&&result.checks.every(x=>x.pass);await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1}
