// Native canvas interactions; no synthetic radio state or network fixtures.
export async function verifyRadio(page, viewport, snap, until) {
 const project=()=>page.evaluate(()=>JSON.parse(document.documentElement.dataset.physicalRadioControls||'null'));
 const click=async p=>{if(!p||p.x<0||p.y<0||p.x>=viewport.width||p.y>=viewport.height)return false;await page.mouse.click(p.x,p.y);await page.waitForTimeout(350);return true};
 const checks={},presets=[];
 for(const [index,station] of ['buena-onda-radio','jolt-radio','nts-radio','nts-radio-2'].entries()){
  await click((await project())?.presets?.[index]);presets.push({station,selected:await until(page,async()=>(await snap(page)).station===station,3000)});
 }
 checks.allPhysicalPresets=presets.every(p=>p.selected);
 await click((await project())?.presets?.[1]);await click((await project())?.seek);
 checks.physicalSeek=await until(page,async()=>(await snap(page)).station==='nts-radio',3000);
 await click((await project())?.presets?.[1]);await until(page,async()=>(await snap(page)).playing,15000);
 const knob=(await project())?.volume,volume=(await snap(page)).volume;
 if(knob){await page.mouse.move(knob.x,knob.y);await page.mouse.down();await page.mouse.move(knob.x,knob.y+24,{steps:8});await page.mouse.up();await page.waitForTimeout(350)}
 checks.physicalVolume=(await snap(page)).volume<volume-.05;
 await click((await project())?.volume);checks.physicalPowerOff=!(await snap(page)).playing;
 await click((await project())?.volume);checks.physicalPowerOn=await until(page,async()=>(await snap(page)).playing,15000);
 checks.liveFFT=(await snap(page)).spectrum>0&&(await snap(page)).playing;
 return {checks,presets,final:await snap(page)};
}
