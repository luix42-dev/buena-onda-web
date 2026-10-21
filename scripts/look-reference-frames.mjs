// Extract reference frames via Edge's H.264 decoder (Playwright's ffmpeg has none).
// node scripts/look-reference-frames.mjs <video> <outDir> [count]
import {createRequire} from 'node:module'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import path from 'node:path'
const require=createRequire(new URL('../../cruise-master-20261005/package.json',import.meta.url)),{chromium}=require('@playwright/test')
const [video,out,count='12']=process.argv.slice(2)
await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage()
const bytes=await readFile(path.resolve(video))
await page.route('http://ref.local/**',r=>r.request().url().endsWith('.mp4')?r.fulfill({body:bytes,contentType:'video/mp4'}):r.fulfill({body:'<video src="/v.mp4" muted playsinline></video>',contentType:'text/html'}))
await page.goto('http://ref.local/')
const info=await page.evaluate(async n=>{
 const v=document.querySelector('video');v.muted=true;await new Promise(r=>v.readyState>=1?r():v.addEventListener('loadedmetadata',r,{once:true}))
 const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const g=c.getContext('2d'),frames=[]
 // Routed bodies are not seekable; sample during real playback instead.
 const step=v.duration/n;let next=0
 await new Promise(done=>{const tick=(_,m)=>{if(m.mediaTime>=next&&frames.length<n){g.drawImage(v,0,0);frames.push({t:m.mediaTime,url:c.toDataURL('image/png')});next+=step}if(frames.length<n&&!v.ended)v.requestVideoFrameCallback(tick);else done()};v.requestVideoFrameCallback(tick);v.addEventListener('ended',done,{once:true});v.play()})
 return {w:v.videoWidth,h:v.videoHeight,duration:v.duration,frames}
},Number(count))
for(const [i,f] of info.frames.entries())await writeFile(`${out}/ref-${String(i).padStart(2,'0')}-${f.t.toFixed(2)}s.png`,Buffer.from(f.url.split(',')[1],'base64'))
console.log(info.w,info.h,info.duration,info.frames.length)
await browser.close()
