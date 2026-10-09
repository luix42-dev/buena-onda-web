# Cruise street experiment — technical decision

Inspected 2026-10-09. Research is read-only; no accounts, purchases, API generation, publishing, or engine installations.

## Decision: retain Three.js / React Three Fiber

| Path | Browser delivery and tradeoff | Decision |
|---|---|---|
| Existing Three r170 / R3F | Client GPU renders locally; preserves radio, React UI, GLB loaders and analytics. WebGL2 required. Asset quality, framing and draw calls remain the immediate bottlenecks. | Implement the street here. |
| New Three WebGPU renderer | Current official renderer supports WebGPU with WebGL2 fallback; that does not prove compatibility or faster rendering in this pinned r170 app. | Separate future benchmark, not a prerequisite. |
| Godot Web | WebAssembly + WebGL2 Compatibility renderer. Current docs exclude Forward+/Mobile rendering on web. Porting UI/audio and gameplay brings no demonstrated fidelity advantage. Single-thread export avoids multithread isolation restrictions. | No migration. |
| Unreal native / Pixel Streaming | Strong native rendering potential. Epic's browser route renders a packaged application on a desktop/server and sends video/audio over WebRTC, with input returned remotely. Requires host GPU, networking and streaming operations; network latency is additional to rendering latency. | No server streaming or migration under current constraints. |

Official sources: [Three WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [Three WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html), [Godot Web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html), [Epic Pixel Streaming](https://dev.epicgames.com/documentation/en-us/unreal-engine/pixel-streaming-in-unreal-engine). None supplies a performance guarantee for this Android target. No new rendering engine was benchmarked.

## Teleoperator reference: evidence boundaries

The browser text fetcher could not access the site, but ordinary HTTP GET succeeded for the public [shell](https://teleoperator.mindblown.ai/), [game document](https://teleoperator.mindblown.ai/?mb=game), [boot script](https://teleoperator.mindblown.ai/boot.js), and [public application bundle](https://teleoperator.mindblown.ai/app.js). Source-level observations below are not tested gameplay or screenshots.

| Topic | Observed | Inferred / unknown |
|---|---|---|
| Renderer | Public bundle contains navigator.gpu.requestAdapter and createRenderPipeline calls; game metadata describes WebGPU. | Runtime fallback and actual device compatibility not established by this audit. |
| World | Bundle includes road/sidewalk/median/shore surface classification, named street arrays, interpolated height functions and a spatial grid for road queries. | Full authored/procedural split and complete geometry budgets unknown. |
| Loading | boot.js starts asset requests early and provides a shared Promise cache; distribution flags identify compressed binaries. | Actual transferred size, sustained loading and streaming behavior unmeasured. |
| Quality | Boot tiers desktop/mobile/safe; comments and code select tiers from device/input signals, saved settings and recovery state. Safe mode reduces rendering scale and effects; sustained low-FPS adaptation is described. | Published performance claims and memory targets are not measurements on our hardware. |
| Materials / lighting | Bundle references local texture/lightmap paths, GPU texture arrays, shadow-related rendering and LOD mesh construction. | No verified texture license or complete light transport reconstruction. |
| Cars / controls | Public page describes several vehicle choices; game has render and minimap canvases. | Actual handling, camera comfort, car quality and mobile usability have not been played by this research agent. |

Reusable techniques: share road/curb/parcel coordinates; reserve shop sightlines before decoration; use explicit mobile quality budgets; preload only required assets; use one shared fetch cache; measure sustained frame time and recover to a cheaper preset. These are independent engineering techniques, not imported implementation. No Teleoperator source or assets were copied into Cruise.

The lead additionally attempted a headless Edge visit to the public game frame. The screenshot operation timed out after 30 seconds; no usable gameplay recording or persisted adapter result was obtained. This does not establish that the game is broken or that WebGPU is unsupported. Gameplay remains unverified in this environment.

## REA

[REA](https://github.com/morluto/rea) is MIT-licensed and supports website script/network observations and static JavaScript analysis. Its normal setup modifies agent configuration and requires restart; native analysis can require separate tools. The one-off static CLI exists, but adds no material evidence over the bounded public script inspection above for this task. REA was investigated, not installed or run. Its software license grants no right to reuse inspected game assets.

## Mindblown hosting

Read the actual [skill.md](https://mindblown.ai/skill.md) over HTTPS (version 1.2.1), without invoking its publishing instructions. It accepts HTML and local dependencies, imposes a 200 MB / 2,000-file limit per version, and runs a rendering check. Publishing is immediately public. Its documented CSP permits self/data/blob and selected hosted library exceptions, excluding general external origins. Consequently existing Jolt/NTS remote streams cannot be assumed to work; under the documented policy they are incompatible. The Next radio API also needs a server, not just uploaded files. The injected SDK controls visitor sound and reports activity; integrating it requires separate validation. No documented pricing or physical Android guarantee was established. Do not call the service free or ready for complete Cruise.

Keep the existing Next hosting architecture for review: static GLBs/textures run on client GPUs; the existing radio catalog API retains its current server/storage dependency. This experiment adds no recurring GPU service. Actual hosting bills depend on the owner's current plan, bandwidth and catalog use; account costs were not inspected. No deployment performed.
