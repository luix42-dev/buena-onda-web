# Exact change manifest

Branch: `experiment/cruise-cockpit-feel-20261020`. Base: `f9bae00f0fc04ebdcdd12c7257fddf2db7e1d0fe`. Final commit is reported with the delivered preview; `git show --name-only HEAD` reproduces its file list.

## Versioned web code, tests and evidence

- `.gitignore`
- `app/(site)/cruise/prototype/PrototypeClient.tsx`
- `app/(site)/cruise/prototype/page.tsx`
- `components/cruise-os/CruiseOS.tsx`
- `components/cruise/CruiseSiteFrame.tsx`
- `components/experience/PrototypeBusinessBridge.tsx`
- `components/experience/PrototypeOpening.tsx`
- `components/experience/PrototypeTV.tsx`
- `components/experience/prototype-business.ts`
- `components/experience/prototype-opening.css`
- `components/experience/prototype-tv.css`
- `components/human-radio/RadioPrivacyBoundary.tsx`
- `components/real-miami/CampaignBridge.tsx`
- `components/real-miami/jeep/Countach.tsx`
- `components/real-miami/jeep/JeepNight.tsx`
- `components/real-miami/miami/MiamiWorld.tsx`
- `components/real-miami/nightdrive/state.ts`
- `components/real-miami/vehicle/countachSteering.ts`
- `components/real-miami/vehicle/rollingWheels.tsx`
- `docs/cruise/os/PROTOTYPE-BUSINESSES.md`
- `docs/cruise/prototype-20261020/COMPARE.html`
- `docs/cruise/prototype-20261020/FILES.md`
- `docs/cruise/prototype-20261020/PERFORMANCE.md`
- `docs/cruise/prototype-20261020/PLAYTEST.md`
- `docs/cruise/prototype-20261020/REA-READINESS.md`
- `docs/cruise/prototype-20261020/README.md`
- `docs/cruise/prototype-20261020/browser-run.log`
- `docs/cruise/prototype-20261020/browser/after-soak.png`
- `docs/cruise/prototype-20261020/browser/businesses.png`
- `docs/cruise/prototype-20261020/browser/chase.png`
- `docs/cruise/prototype-20261020/browser/cockpit.png`
- `docs/cruise/prototype-20261020/browser/entry.png`
- `docs/cruise/prototype-20261020/browser/harness-return-to-scenery-strict-locator.png`
- `docs/cruise/prototype-20261020/browser/landscape.png`
- `docs/cruise/prototype-20261020/browser/portrait.png`
- `docs/cruise/prototype-20261020/browser/results.json`
- `docs/cruise/prototype-20261020/browser/tv-help.png`
- `docs/cruise/prototype-20261020/build.log`
- `docs/cruise/prototype-20261020/business-inspection.log`
- `docs/cruise/prototype-20261020/capture-run.log`
- `docs/cruise/prototype-20261020/capture/24dc8b15606794f86d6f6ec980e10307.webm`
- `docs/cruise/prototype-20261020/capture/before-loaded-entry.png`
- `docs/cruise/prototype-20261020/capture/before-matching-cockpit.png`
- `docs/cruise/prototype-20261020/capture/business-card.png`
- `docs/cruise/prototype-20261020/capture/business-demo.json`
- `docs/cruise/prototype-20261020/capture/business-inspection.json`
- `docs/cruise/prototype-20261020/capture/business-observations.png`
- `docs/cruise/prototype-20261020/capture/cruise-drive-18s.webm`
- `docs/cruise/prototype-20261020/capture/drive-advertising.png`
- `docs/cruise/prototype-20261020/capture/frame-extract.log`
- `docs/cruise/prototype-20261020/capture/prototype-loaded-entry.png`
- `docs/cruise/prototype-20261020/capture/prototype-matching-cockpit.png`
- `docs/cruise/prototype-20261020/capture/qualified-world-ad.png`
- `docs/cruise/prototype-20261020/capture/report.json`
- `docs/cruise/prototype-20261020/capture/video-first-frame.png`
- `docs/cruise/prototype-20261020/current-level.json`
- `docs/cruise/prototype-20261020/describe-editor.json`
- `docs/cruise/prototype-20261020/describe-objects.json`
- `docs/cruise/prototype-20261020/describe-programmatic.json`
- `docs/cruise/prototype-20261020/describe-slate.json`
- `docs/cruise/prototype-20261020/duplicate-waterfront.json`
- `docs/cruise/prototype-20261020/final-build-id.txt`
- `docs/cruise/prototype-20261020/final-build.log`
- `docs/cruise/prototype-20261020/final-followup-tests.log`
- `docs/cruise/prototype-20261020/final-smoke.json`
- `docs/cruise/prototype-20261020/final-smoke.log`
- `docs/cruise/prototype-20261020/find-waterfront.json`
- `docs/cruise/prototype-20261020/gpu-snapshot.txt`
- `docs/cruise/prototype-20261020/load-review.json`
- `docs/cruise/prototype-20261020/native-baseline.json`
- `docs/cruise/prototype-20261020/native-list-final.json`
- `docs/cruise/prototype-20261020/native-memory-checkpoint.json`
- `docs/cruise/prototype-20261020/native-requests/capture-baseline.json`
- `docs/cruise/prototype-20261020/native-requests/current-level.json`
- `docs/cruise/prototype-20261020/native-requests/describe-assets.json`
- `docs/cruise/prototype-20261020/native-requests/describe-editor.json`
- `docs/cruise/prototype-20261020/native-requests/describe-objects.json`
- `docs/cruise/prototype-20261020/native-requests/describe-programmatic.json`
- `docs/cruise/prototype-20261020/native-requests/describe-scene.json`
- `docs/cruise/prototype-20261020/native-requests/describe-skills.json`
- `docs/cruise/prototype-20261020/native-requests/describe-slate.json`
- `docs/cruise/prototype-20261020/native-requests/duplicate-waterfront.json`
- `docs/cruise/prototype-20261020/native-requests/find-waterfront.json`
- `docs/cruise/prototype-20261020/native-requests/list.json`
- `docs/cruise/prototype-20261020/native-requests/load-review.json`
- `docs/cruise/prototype-20261020/native-requests/material-lighting-skills.json`
- `docs/cruise/prototype-20261020/native-requests/programmatic-environment.json`
- `docs/cruise/prototype-20261020/native-requests/read-live-actors.json`
- `docs/cruise/prototype-20261020/native-requests/read-skills.json`
- `docs/cruise/prototype-20261020/native-requests/save-review.json`
- `docs/cruise/prototype-20261020/native-requests/slate-observe.json`
- `docs/cruise/prototype-20261020/native-requests/slate-snapshot.json`
- `docs/cruise/prototype-20261020/native-skills.json`
- `docs/cruise/prototype-20261020/performance.json`
- `docs/cruise/prototype-20261020/programmatic-environment.json`
- `docs/cruise/prototype-20261020/rea/ATTEMPTS.md`
- `docs/cruise/prototype-20261020/read-skills.json`
- `docs/cruise/prototype-20261020/recovery-run.log`
- `docs/cruise/prototype-20261020/recovery/blocked-stream.png`
- `docs/cruise/prototype-20261020/recovery/radio-only-mobile.png`
- `docs/cruise/prototype-20261020/recovery/results.json`
- `docs/cruise/prototype-20261020/save-review.json`
- `docs/cruise/prototype-20261020/slate-observe.json`
- `docs/cruise/prototype-20261020/slate-snapshot.json`
- `docs/cruise/prototype-20261020/tested-build-id.txt`
- `docs/cruise/prototype-20261020/tests.log`
- `docs/cruise/prototype-20261020/unreal-baseline.png`
- `lib/cruise-os/vehicle-feel.ts`
- `lib/human-radio/explore.ts`
- `scripts/countach-geometry.mjs`
- `scripts/inspect-countach.mjs`
- `scripts/native-mcp-probe.mjs`
- `scripts/prototype-ad-inspect.mjs`
- `scripts/prototype-capture.mjs`
- `scripts/prototype-final-smoke.mjs`
- `scripts/prototype-recovery.mjs`
- `scripts/prototype-report.mjs`
- `scripts/prototype-review.mjs`
- `scripts/start-native-prototype.ps1`
- `tests/cruise-os-input.test.ts`
- `tests/cruise/countach-steering.test.ts`
- `tests/cruise/vehicle-feel.test.ts`
- `tests/prototype-business.test.ts`
- `tsconfig.json`

- `docs/cruise/prototype-20261020/whitespace-check.txt`

## Native changes outside this web worktree

These are local, ignored experimental project files; they are not represented as committed browser assets.

- `cruise-publish-20261006/.vercel/cinema-probe/CinemaProbe.uproject`: enabled installed AllToolsets after backup.
- `cruise-publish-20261006/.vercel/cinema-probe/Content/BuenaOndaPrototype20261020/Lvl_WaterfrontReview.umap`: saved duplicate of original waterfront map, 1,167,454 bytes. No cinematic/material/sign upgrade applied.
- `cruise-publish-20261006/.vercel/cinema-probe/.codex/config.toml`: official engine-generated 59-byte Codex local endpoint configuration; existing unrelated configuration preserved.

Recovery point: `cinema-probe/recovery/prototype-20261020-231440`. Original map SHA256 remains `DA6586C477F9BBF9918D7896781C14A9717E8A6E63E7123A93F13B8CCBCB1CB0`. Native runs and MCP evidence remain in that project as transient inspection artifacts; relevant responses/image/memory excerpts are copied into this report directory.

## Validation history

An early browser harness stopped on a strict locator because Settings and the listening fallback both offered Return to scenery; scoping the intended dialog resolved the harness ambiguity. Its screenshot is retained as `browser/harness-return-to-scenery-strict-locator.png`, not described as a final product failure. The first share harness assumed synchronous clipboard completion/native Web Share absence; final coverage explicitly tests the clipboard fallback and records the fixture. Final results and controlled-failure records are separately labeled.

Both the successful 20-minute bundle and the final UI bundle remain on disk. No public deployment, purchase, paid API generation, payments or external outreach occurred.
