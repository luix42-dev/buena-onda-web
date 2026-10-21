# Actual REA attempts

20 October 2026, worktree `cruise-os-20261015`. No REA result is claimed.

## Documented preview command

The official [installation guide](https://github.com/morluto/rea/blob/main/docs/installation.md#review-setup-changes) documents client-scoped dry-run setup and JSON output. Executed:

```powershell
npx --yes rea-agents setup --client codex --dry-run --json
```

Actual result: exit1, approximately9.3seconds.

```text
npm error code ENOTCACHED
npm error request to https://registry.npmjs.org/rea-agents failed: cache mode is 'only-if-cached' but no cached response is available.
npm error Log files were not written due to an error writing to the directory: C:\Users\luix4\AppData\Local\npm-cache\_logs
```

The same command was submitted through the required network/sandbox escalation flow, with the explanation that it previews changes rather than applying configuration or installing native engines. That tool approval was **aborted by the user after3.7seconds**. It returned no CLI output or session/process ID. This was an interrupted approval, not an automatic safety-review rejection and not a successful preview.

## Follow-up state

A bounded `Win32_Process` query for Node command lines matching `rea-agents|rea.mjs` returned no process. The ordinary global `rea-agents` package path still does not exist. Codex configuration still has no REA registration mention. No configuration content, credential or key was printed. No client/global configuration was modified by this task.

No actual REA package version, setup plan, doctor report, MCP connection or Evidence record was obtained. No Ghidra/Java installation was attempted. Source analysis was not attempted through another unapproved package runner, because the package needed for the documented CLI was unavailable after the interrupted download approval.

## Owned-source investigation completed independently

Direct source inspection, **not REA output**, established the useful investigation boundary:

- `components/real-miami/audio/useCruiseAudio.ts:226`: `attemptPlay` retains source revision, avoids rearming a timeout on an already healthy current station, and ignores rejected `play()` promises belonging to old revisions or withdrawn playback intent.
- The audio element is created in the hook effect aroundline485; cleanup pauses/releases it and destroys HLS aroundline601. Effect dependencies are callbacks plus optional music support, rather than the selected cockpit camera or OS panel.
- `components/real-miami/jeep/JeepNight.tsx:172` owns `useCruiseAudio`; camera changes and Park/Resume change view/driving state rather than directly calling audio pause. `chooseCamera` aroundline228 changes view and closes overlays. This supports the intended separation at source level; it does not prove runtime continuity or rule out component remounts, dependency changes, browser policy, stream failure or stale media events.

Recommendation: retain the existing focused browser continuity tests and verify actual media time while switching cameras/panels and stations. A future REA static source graph could corroborate ownership but cannot establish real audibility. No app edits were made and no new defect was asserted without reproduction.

**Exact blocker:** no cached/installed REA package, sandbox registry access denied, and the required elevated retry was interrupted before yielding a result. Continuing with REA requires a successful authorized package retrieval or an existing callable REA server. A restart alone cannot supply the absent package. Source-only CLI analysis, once the package exists, is documented to work without MCP registration or a client restart.
