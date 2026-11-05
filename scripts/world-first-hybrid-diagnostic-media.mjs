import { execFileSync, spawnSync } from 'node:child_process'
import { mkdir, writeFile, stat, readFile, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'

// Existing tools only. CapCut decodes MP4; Playwright's encoder accepts MJPEG image2pipe.
const decoder = 'C:/Users/luix4/AppData/Local/CapCut/Apps/8.8.0.3774/ffmpeg.exe'
const encoder = 'C:/Users/luix4/AppData/Local/ms-playwright/ffmpeg-1011/ffmpeg-win64.exe'
const source = '../33secref.mp4'
const out = 'public/cruise/experiments/world-first/hybrid'
const docs = 'docs/cruise/world-first/hybrid'
await mkdir(out, { recursive: true }); await mkdir(docs, { recursive: true })
const clips = []
for (let index = 0; index < 2; index++) {
  const first = index * 135, filename = `founder-diagnostic-${index ? 'b' : 'a'}.webm`
  const temporary = `${docs}/diagnostic-${index}-temporary.mjpg`
  let validation
  try {
    execFileSync(decoder, ['-hide_banner', '-loglevel', 'error', '-y', '-threads', '1', '-i', source, '-vf', `trim=start_frame=${first}:end_frame=${first + 135},setpts=PTS-STARTPTS`, '-an', '-r', '30', '-c:v', 'mjpeg', '-q:v', '3', '-threads', '1', '-f', 'image2pipe', temporary], { windowsHide: true })
    execFileSync(encoder, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '30', '-i', temporary, '-an', '-r', '30', '-c:v', 'libvpx', '-b:v', '1000k', '-deadline', 'realtime', '-cpu-used', '8', '-threads', '1', `${out}/${filename}`], { windowsHide: true })
    // Validate actual encoded packet count/duration, not the trim recipe alone.
    const report = spawnSync(encoder, ['-hide_banner', '-loglevel', 'info', '-i', `${out}/${filename}`, '-an', '-r', '30', '-c:v', 'libvpx', '-b:v', '64000', '-deadline', 'realtime', '-cpu-used', '8', '-threads', '1', '-progress', 'pipe:1', '-nostats', '-f', 'webm', '-y', 'NUL'], { windowsHide: true, encoding: 'utf8' })
    const frames = Number([...report.stdout.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1])
    if (report.status !== 0 || frames !== 135 || !report.stderr.includes('Duration: 00:00:04.50')) throw new Error(`Actual encoded validation failed: ${report.status}, ${frames} frames\n${report.stderr}`)
    validation = { decodedFrames: frames, durationSeconds: 4.5, fps: 30, audioStreams: 0, method: 'Actual VP8 decode/reencode frame counter and demuxer duration.' }
  } finally { await unlink(temporary).catch(() => {}) }
  clips.push({ id: `founder-diagnostic-${index ? 'b' : 'a'}`, url: `/cruise/experiments/world-first/hybrid/${filename}`, durationSeconds: 4.5, fps: 30, firstSourceFrame: first, content: 'diagnosticReference', provenance: 'Founder-supplied33secref.mp4; local diagnostic use only; not licensed final authored world.', fileBytes: (await stat(`${out}/${filename}`)).size, validation })
}
const manifest = { status: 'diagnostic-reference-not-authored-world', source, sourceSha256: createHash('sha256').update(await readFile(source)).digest('hex'), sourceFrames: 981, sourceSeconds: 32.7, sourceWidth: 368, sourceHeight: 496, sourceAudioStreams: 0, clips, contiguousJoin: 'A[0,135) then B[135,270); no duplicated or missing source frame by trim recipe; browser handoff must be measured.', loop: false, rights: 'User-supplied reference retained locally for diagnostic comparison only. No distribution/deployment or final authorship claim.', tools: { decoder, encoder }, generatedAt: new Date().toISOString() }
await writeFile(`${docs}/diagnostic-manifest.json`, JSON.stringify(manifest, null, 2))
console.log(JSON.stringify({ clips, output: `${docs}/diagnostic-manifest.json` }, null, 2))
