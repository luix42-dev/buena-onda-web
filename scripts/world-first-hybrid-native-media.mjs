import { execFileSync, spawnSync } from 'node:child_process'
import { copyFile, mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const option = (key, fallback) => process.argv.find(arg => arg.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback
const frameDirectory = option('frames'), posesPath = option('poses'), reportPath = option('report')
if (!frameDirectory || !posesPath || !reportPath) throw new Error('Provide --frames=actual-MRQ-directory --poses=actual-camera-per-frame.json --report=actual-render-report.json')
const decoder = 'C:/Users/luix4/AppData/Local/CapCut/Apps/8.8.0.3774/ffmpeg.exe'
const encoder = 'C:/Users/luix4/AppData/Local/ms-playwright/ffmpeg-1011/ffmpeg-win64.exe'
const out = 'public/cruise/experiments/world-first/hybrid', docs = 'docs/cruise/world-first/hybrid'
await mkdir(out, { recursive: true }); await mkdir(docs, { recursive: true })
const files = (await readdir(frameDirectory)).filter(name => name.toLowerCase().endsWith('.png')).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
if (files.length !== 60) throw new Error(`Expected actual60-frame bounded render, found${files.length}; do not pad/repeat source frames.`)
const renderReport = JSON.parse(await readFile(reportPath, 'utf8'))
if (renderReport.success !== true || renderReport.png_count !== 60) throw new Error('Native render report must establish successful60-frame output.')
const cameraData = JSON.parse(await readFile(posesPath, 'utf8'))
const poses = cameraData.samples.filter(sample => sample.frame >= 0 && sample.frame <= 60)
if (poses.length !== 61 || poses.some((sample, i) => sample.frame !== i)) throw new Error('Need exact frame0..59 poses plus authored connector60; sequence existence is not delivery.')
const firstPose = poses[0]
if (poses.some(sample => sample.horizontal_fov_deg !== firstPose.horizontal_fov_deg || sample.rotation_pitch_yaw_roll[0] !== firstPose.rotation_pitch_yaw_roll[0])) throw new Error('Current locked browser hybrid proof requires a constant actual lens/pitch; keep varying optics uncomposited.')
const parsed = files.map(name => name.match(/^(.*?)(\d+)(\.png)$/i))
if (parsed.some(match => !match) || parsed.some((match, i) => Number(match[2]) !== i)) throw new Error('Actual output filenames must be contiguous numbered0..59.')
const hashes = [], sizes = []
for (const filename of files) {
  const bytes = await readFile(path.join(frameDirectory, filename))
  if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.readUInt32BE(16) !== 1920 || bytes.readUInt32BE(20) !== 1080) throw new Error(`Actual native source is not1920x1080PNG: ${filename}. Upscaling would not qualify.`)
  hashes.push(createHash('sha256').update(bytes).digest('hex')); sizes.push(bytes.length)
}
if (new Set(hashes).size < 2) throw new Error('All source frames are identical; do not label a repeated still as moving native footage.')
const inputPattern = path.join(frameDirectory, `${parsed[0][1]}%0${parsed[0][2].length}d${parsed[0][3]}`)
const poseUrl = '/cruise/experiments/world-first/hybrid/native-2s-camera.json'
const camera = { horizontalFovDeg: firstPose.horizontal_fov_deg, aspect: 16 / 9, eyeHeightM: Number(option('eye-height', '1.62')), speedMps: (poses[1].position_cm[0] - firstPose.position_cm[0]) * .3, poseUrl }
const segments = [], encodedAt = performance.now()
for (let index = 0; index < 2; index++) {
  const first = index * 30, filename = `native-2s-${index ? 'b' : 'a'}.webm`, temporary = `${docs}/native-${index}-temporary.mjpg`
  try {
    execFileSync(decoder, ['-hide_banner', '-loglevel', 'error', '-y', '-threads', '1', '-framerate', '30', '-start_number', '0', '-i', inputPattern, '-vf', `trim=start_frame=${first}:end_frame=${first + 30},setpts=PTS-STARTPTS`, '-an', '-r', '30', '-c:v', 'mjpeg', '-q:v', '2', '-threads', '1', '-f', 'image2pipe', temporary], { windowsHide: true })
    execFileSync(encoder, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '30', '-i', temporary, '-an', '-r', '30', '-c:v', 'libvpx', '-b:v', '10000000', '-deadline', 'realtime', '-cpu-used', '6', '-threads', '2', `${out}/${filename}`], { windowsHide: true })
    const report = spawnSync(encoder, ['-hide_banner', '-loglevel', 'info', '-i', `${out}/${filename}`, '-an', '-r', '30', '-c:v', 'libvpx', '-b:v', '64000', '-deadline', 'realtime', '-cpu-used', '8', '-threads', '2', '-progress', 'pipe:1', '-nostats', '-f', 'webm', '-y', 'NUL'], { windowsHide: true, encoding: 'utf8' })
    const frames = Number([...report.stdout.matchAll(/^frame=(\d+)$/gm)].at(-1)?.[1])
    if (report.status !== 0 || frames !== 30 || !report.stderr.includes('Duration: 00:00:01.00') || !report.stderr.includes('1920x1080') || !report.stderr.includes('30 fps') || /Stream.*Audio:/.test(report.stderr)) throw new Error(`Actual encoded validation failed: ${frames}frames; ${report.stderr}`)
    segments.push({ id: `native-2s-${index ? 'b' : 'a'}`, url: `/cruise/experiments/world-first/hybrid/${filename}`, durationSeconds: 1, fps: 30, firstSourceFrame: first, content: 'environmentOnly', provenance: 'Actual local Unreal raster PNG frames. Project-authored geometry and locally cleared road textures; near-photographic art gate unaccepted.', camera, fileBytes: (await stat(`${out}/${filename}`)).size, validation: { decodedFrames: frames, durationSeconds: 1, fps: 30, width: 1920, height: 1080, audioStreams: 0 } })
  } finally { await unlink(temporary).catch(() => {}) }
}
const encodeMs = performance.now() - encodedAt
await copyFile(path.join(frameDirectory, files[0]), `${out}/native-2s-poster.png`)
const actualCamera = { status: 'actual-render-camera-samples-for2seconds-only', source: posesPath, coordinate: cameraData.coordinate, renderedFrames: 60, renderedDurationSeconds: 2, fps: 30, eyeHeightM: camera.eyeHeightM, frames: poses.slice(0, 60), connector: poses[60], connectorRendered: false }
await writeFile(`${out}/native-2s-camera.json`, JSON.stringify(actualCamera, null, 2))
const calibration = { camera, pitchDeg: firstPose.rotation_pitch_yaw_roll[0], verified: false }
const evidence = { status: 'actual2second-native-motion-only-art-unaccepted', frameDirectory, reportPath, posesPath, sourceFrameCount: files.length, sourceWidth: 1920, sourceHeight: 1080, sourceFrameBytes: sizes.reduce((sum, size) => sum + size, 0), sourceFrames: files.map((file, i) => ({ file, bytes: sizes[i], sha256: hashes[i] })), segments, calibration, encodedFileBytes: segments.reduce((sum, segment) => sum + segment.fileBytes, 0), encodeAndValidateMs: encodeMs, posterUrl: '/cruise/experiments/world-first/hybrid/native-2s-poster.png', nativeRenderReport: renderReport, displayReferredPng: true, linearExrMasterProduced: false, delivered60Seconds: false, generatedAt: new Date().toISOString() }
await writeFile(`${docs}/native-manifest.json`, JSON.stringify(evidence, null, 2))
if (process.argv.includes('--integrate')) {
  const manifestPath = 'public/cruise/experiments/world-first/manifest.json', manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  for (const id of ['unreal', 'hybrid']) {
    const source = manifest.sources.find(source => source.id === id)
    if (!source) throw new Error(`Missing source${id}; preserve root manifest structure.`)
    Object.assign(source, { segments, content: 'environmentOnly', qualityAccepted: false, posterUrl: evidence.posterUrl,
      status: id === 'unreal' ? 'Actual 2-second 1080p native motion checkpoint. Art quality gate failed; 60-second ride not delivered.' : 'Actual native plate + realtime Jeep at measured camera parameters. Lighting and reflection calibration unverified; art gate failed.' })
    if (id === 'hybrid') source.calibration = calibration
  }
  manifest.status = 'native2second-motion-present-art-quality-unaccepted'
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
}
console.log(JSON.stringify({ output: `${docs}/native-manifest.json`, encodedFileBytes: evidence.encodedFileBytes, encodeAndValidateMs: encodeMs, segments, calibration, integrated: process.argv.includes('--integrate') }, null, 2))
