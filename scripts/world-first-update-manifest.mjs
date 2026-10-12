import {readFile,writeFile,access} from 'node:fs/promises'
const path='public/cruise/experiments/world-first/manifest.json'
const data=JSON.parse(await readFile(path,'utf8'))
const diagnostic=JSON.parse(await readFile('docs/cruise/world-first/hybrid/diagnostic-manifest.json','utf8'))
for(const clip of diagnostic.clips){if(clip.validation.decodedFrames!==135||clip.validation.durationSeconds!==4.5||clip.validation.fps!==30||clip.validation.audioStreams!==0)throw new Error('Diagnostic clip verification failed');await access(`public${clip.url}`)}
const ref=data.sources.find(s=>s.id==='reference');ref.segments=diagnostic.clips;ref.status='9-second local reference diagnostic, two contiguous clips. Not an authored world.'
await writeFile(path,JSON.stringify(data,null,2)+'\n')
console.log(JSON.stringify({referenceSeconds:diagnostic.clips.reduce((n,s)=>n+s.durationSeconds,0),bytes:diagnostic.clips.reduce((n,s)=>n+s.fileBytes,0),qualityAccepted:false}))
