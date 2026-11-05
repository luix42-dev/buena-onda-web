import { execFileSync, spawnSync } from 'node:child_process'
import { readFile, readdir, mkdir, writeFile, copyFile, stat, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
const frames=process.argv[2]
if(!frames)throw new Error('Pass actual director MRQ frames directory')
const docs='docs/cruise/world-first/director',out='public/cruise/experiments/world-first/director'
await mkdir(docs,{recursive:true});await mkdir(out,{recursive:true})
const files=(await readdir(frames)).filter(n=>/^director\.\d+\.png$/.test(n)).sort()
if(files.length!==240||files.some((n,i)=>Number(n.match(/\d+/)[0])!==i))throw new Error('Need actual contiguous240frames; no padding/repeats')
const report=JSON.parse(await readFile(path.join(frames,'../director-report.json'),'utf8'))
if(report.success!==true||report.png_count!==240)throw new Error('Actual render must succeed')
if(report.active_world!=='/Game/WorldFirst/L_Director_v5.L_Director_v5')throw new Error('Must render camera bindings authored in actual v5 world')
const hashes=[]
for(const file of files){const b=await readFile(path.join(frames,file));if(b.readUInt32BE(16)!==1920||b.readUInt32BE(20)!==1080)throw new Error('Expected1080pPNG');hashes.push({file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')})}
const decoder='C:/Users/luix4/AppData/Local/CapCut/Apps/8.8.0.3774/ffmpeg.exe',encoder='C:/Users/luix4/AppData/Local/ms-playwright/ffmpeg-1011/ffmpeg-win64.exe'
const temporary='.vercel/world-first-director/encode-temporary.mjpg',video=out+'/director-8s.webm',started=performance.now()
try{
 execFileSync(decoder,['-hide_banner','-loglevel','error','-y','-threads','1','-framerate','30','-start_number','0','-i',path.join(frames,'director.%04d.png'),'-frames:v','240','-an','-c:v','mjpeg','-q:v','2','-threads','1','-f','image2pipe',temporary],{windowsHide:true})
 execFileSync(encoder,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-c:v','mjpeg','-framerate','30','-i',temporary,'-an','-r','30','-c:v','libvpx','-b:v','10000000','-deadline','realtime','-cpu-used','6','-threads','2',video],{windowsHide:true})
 const decoded=spawnSync(encoder,['-hide_banner','-loglevel','info','-i',video,'-an','-r','30','-c:v','libvpx','-b:v','64000','-deadline','realtime','-cpu-used','8','-threads','2','-progress','pipe:1','-nostats','-f','webm','-y','NUL'],{windowsHide:true,encoding:'utf8'})
 const n=Number([...decoded.stdout.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1])
 if(decoded.status!==0||n!==240||!decoded.stderr.includes('Duration: 00:00:08.00')||!decoded.stderr.includes('1920x1080')||!decoded.stderr.includes('30 fps')||/Stream.*Audio:/.test(decoded.stderr))throw new Error('Encoded clip validation failed '+decoded.stderr)
 await copyFile(path.join(frames,files[60]),out+'/poster.png')
 const camera=JSON.parse(await readFile('.vercel/world-first-director/camera.json','utf8'))
 await writeFile(out+'/camera.json',JSON.stringify(camera,null,2))
 const manifest={status:'actual-eight-second-environment-director-cut',qualityAccepted:false,id:'director',name:'City director / house billboards',content:'environmentOnly',provenance:'Actual UE5.8 native raster frames of latest v4 world copied to v5; two existing Buena Onda/Vice Nights house billboards added as world geometry.',videoUrl:'/cruise/experiments/world-first/director/director-8s.webm',posterUrl:'/cruise/experiments/world-first/director/poster.png',cameraUrl:'/cruise/experiments/world-first/director/camera.json',durationSeconds:8,fps:30,width:1920,height:1080,decodedFrames:n,audioStreams:0,codec:'VP8',webBytes:(await stat(video)).size,sourcePngBytes:hashes.reduce((s,f)=>s+f.bytes,0),uniqueSourceFrames:new Set(hashes.map(f=>f.sha256)).size,sourceFrameDirectory:frames,frames:hashes,renderReport:report,encodeAndValidateSeconds:(performance.now()-started)/1000,billboardExposureAnalyticsMeasured:false,vehicleIncluded:false,linearMasterProduced:false,generatedAt:new Date().toISOString()}
 await writeFile(docs+'/manifest.json',JSON.stringify(manifest,null,2));await writeFile(out+'/manifest.json',JSON.stringify(manifest,null,2));console.log(JSON.stringify({video,webBytes:manifest.webBytes,sourcePngBytes:manifest.sourcePngBytes,decodedFrames:n,encodeAndValidateSeconds:manifest.encodeAndValidateSeconds}))
}finally{await unlink(temporary).catch(()=>{})}

