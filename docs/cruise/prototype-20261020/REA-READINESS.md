# REA readiness: bounded investigation

Checked 20 October 2026. **REA documentation and local prerequisites were investigated; REA and Ghidra were not executed, installed or configured.** No app edits, native decompilation, browser launch or paid service call occurred.

Update: the documented `npx --yes rea-agents setup --client codex --dry-run --json` was actually attempted. npm failed with `ENOTCACHED` under sandbox cache-only networking; the required elevated retry approval was interrupted by the user before producing output. No REA package version/plan/result was obtained and no matching REA Node process remains. See [exact attempts and owned-source findings](rea/ATTEMPTS.md). Source-only CLI analysis needs no Codex restart once its package is available; package retrieval is the present blocker. No configuration mutation occurred.

## Appropriate Cruise target

Target identity: owned source `components/real-miami/audio/useCruiseAudio.ts` at repository base `f9bae00f0fc04ebdcdd12c7257fddf2db7e1d0fe`, unchanged by this prototype. Git blob `1aa25b50347372afa37d527a979ee112e4bed250`; SHA256 `78FD3BD10746DB110FB22A505DB86C0E5F9319362317919B4F0A5391DCE5D45D`. The investigation question is whether camera/scene changes recreate or pause its audio owner, and how stale playback promises are rejected. This identifies a source module, not a native executable or decompiled game version.

Investigate one owned-source question: **Can a delayed event from the previous station cancel the newly selected station or stop radio during an OS panel/camera transition?**

The implementation is already available: `components/real-miami/audio/useCruiseAudio.ts:66`, revision tracking at line75, playback attempts at226, media-event handlers at489–592, and cleanup at601–630. `components/real-miami/jeep/JeepNight.tsx:172` owns the hook above panel/view state. The source explicitly guards HLS errors with source revisions and distinguishes current-source errors. These are inspected code facts, not a new runtime continuity proof or a claim that a defect exists.

Read this source and test its actual station-change lifecycle first. Native decompilation of a game, browser, audio decoder or third-party executable would not answer the React ownership question more directly. Do not copy protected game code/assets. Existing earlier work already documents a similar decision in `docs/cruise/master/RESEARCH.md:35`.

## What the official workflow offers

REA provides local analysis through MCP or CLI; static JavaScript inspection does not require a native engine. REA-authored code is MIT licensed. Agent/model processing has its own data policy. These facts establish neither a commercial tool entitlement nor a right to reuse inspected assets. [Official README](https://github.com/morluto/rea#readme)

For Codex, documented setup previews registration/workflow changes, requires approval, and requires a restart afterward. A scoped `setup --client codex --dry-run --json` plans rather than applies. `doctor --client codex --json` checks that registration. The documentation distinguishes repository-main capabilities from the published package; a currently installed version and actual schemas must be checked before relying on a named operation. No setup or doctor command was run here. [Installation and setup](https://github.com/morluto/rea/blob/main/docs/installation.md)

Proposed source workflow, if REA is installed later: analyze an explicit directory containing only the owned audio module and relevant dependencies, retain its Evidence identity, inspect the module, then use `trace_application_feature` or `trace_javascript_semantics` on the source-revision/event ownership path. Those tools consume prior authenticated analysis Evidence; static reachability does not prove execution or causation. Follow actual connected schemas rather than inventing request arguments. [JavaScript workflows](https://github.com/morluto/rea/blob/main/docs/javascript-application-workflows.md)

An optional runtime supplement could attach to a dedicated loopback-CDP Chromium profile while a tester performs one station switch. `list_browser_targets`, `inspect_web_page` and `observe_web_session` provide observations; passive CDP capture does not itself drive interactions or prove audible output. The guide warns that attach/disconnect can disturb another client's emulation. Use a disposable profile, keep the debugging interface local, and minimize captured URL/source/storage detail. Our existing focused browser harness may already provide the needed evidence with less setup. This runtime workflow was not performed. [Browser observation](https://github.com/morluto/rea/blob/main/docs/browser-observation.md)

## Actual local readiness

| Check | Observed result |
| --- | --- |
| Node | v24.14.0; meets documented 24.x minimum24.11 for ordinary REA workflows |
| `rea` command / global npm package | Not found on PATH or at the ordinary npm `rea-agents` location |
| Personal REA skill | Neither checked `.agents/skills/reverse-engineer-anything` nor `.codex/skills/reverse-engineer-anything` exists |
| Codex registration / exposed tools | Config contains no REA/Ghidra mention; no REA/Ghidra MCP namespace was exposed in this session |
| `.rea` state | Ordinary `C:/Users/luix4/.rea` path absent |
| Browser executables | Existing local Edge and Chrome executable paths verified; no browser started |
| Native provider | No Java, `ghidraRun` or `analyzeHeadless` on PATH; no Ghidra path found in bounded conventional directories or checked project notes |
| Provider environment | `GHIDRA_INSTALL_DIR`, `GHIDRA_HEADLESS_PATH`, `JAVA_HOME`, `REA_ANALYSIS_PROVIDER` unset; values/secrets were not printed |

These bounded checks do not prove that no installation exists elsewhere on the machine. No recursive disk search was performed.

Windows native REA/Ghidra is documented as an experimental read-only boundary. It requires local NTFS, an existing Ghidra12.1.x installation, a compatible full64-bit JDK (current12.1 uses21+), matching native controls and an eligible explicit native target. The guide does not establish general Windows parity; REA does not install Ghidra or Java. Ghidra is unnecessary for this JavaScript target. [Windows Ghidra guide](https://github.com/morluto/rea/blob/main/docs/windows-ghidra-p0.md)

## Blocker, costs and decision

The exact blocker to claiming **actual REA use** is absent verified CLI/MCP/skill installation in this session; no REA operation or Evidence record exists. Native work additionally lacks a verified Ghidra/JDK/provider setup and a justified native target. Configuration outside this task's read-only scope was left untouched.

The source/browser path requires no commercial native-engine purchase according to the documented requirements. Installation/network/disk overhead and model inference still exist; no recurring dollar quote was verified, and no claim of free model usage is made. Hopper/IDA are separate licensed tools and are not needed here. **Proceed with available Cruise source and focused continuity tests now; reserve REA setup for an explicit need for its retained Evidence graph or cross-layer analysis.**
