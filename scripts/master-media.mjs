import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
const out='docs/cruise/master',ffmpeg=process.env.FFMPEG_PATH||'C:/Users/luix4/AppData/Local/ms-playwright/ffmpeg-1011/ffmpeg-win64.exe'
const reviews=JSON.parse(await readFile(`${out}/review-final.json`,'utf8')),radio=JSON.parse(await readFile(`${out}/radio-video.json`,'utf8'))
await mkdir(`${out}/frames`,{recursive:true})
function run(args){execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{stdio:'pipe'})}
const chase=reviews.find(r=>r.profile==='desktop'&&r.mode==='chase'),start=Math.max(0,chase.readyMs/1000+1.2)
run(['-ss',String(start),'-i',chase.video,'-t','55','-c','copy',`${out}/chase-gameplay.webm`])
run(['-ss',String(start+5),'-i',chase.video,'-frames:v','1',`${out}/billboard-review.png`])
if(radio.video&&!radio.failure)run(['-ss',String(Math.max(0,radio.drivingVideoOffsetMs/1000-.5)),'-i',radio.video,'-t','55','-c','copy',`${out}/cockpit-radio-gameplay.webm`])
for(let second=24;second<=29;second++)run(['-ss',String(second),'-i',chase.video,'-frames:v','1',`${out}/frames/buena-chase-${second}s.png`])
await writeFile(`${out}/media.json`,JSON.stringify({chase:{source:chase.video,trimStart:start,requestedDuration:55},cockpit:{source:radio.video,trimStart:radio.drivingVideoOffsetMs/1000-.5,requestedDuration:55},note:'Actual Playwright gameplay. Recordings are silent: live audio playback is verified separately through media events and advancing currentTime. Frame captures are native-resolution, unretouched.'},null,2))
console.log('Wrote gameplay clips and six native Buena Onda approach frames.')
