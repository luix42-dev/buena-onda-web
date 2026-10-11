# Reproduce the GTO geometry inspection

This is a Blender Workbench geometry check, not an Unreal render or a photographic material test. Both the previously simplified GTO and the fuller original source were inspected. Neither supplies the required dashboard instruments.

1. Copy the existing `processed/gto-high-raw.glb` from the cache recorded in [ASSETS.md](../../ASSETS.md) into this directory as `gto-high-uncompressed.glb`. The script checks its exact SHA256, recorded CC0 license and transformed dimensions; do not substitute another model silently. The large binary is intentionally not committed.
2. Run the existing Blender 4.5.0 executable with `--background --factory-startup --threads 2 --python` followed by the absolute path to `inspect_gto_blender.py`. Use a separate Blender process; do not run the script inside an unsaved interactive project.
3. Inspect the six images and `inspection.json` under `geometry-diagnostics/`. Contact-sheet top row: normal driver view, glass-hidden driver view, glass-hidden dashboard detail. Bottom row: front, rear, side. Workbench does not reproduce glass transmission; hidden-glass images diagnose underlying geometry only.

The initial cold 256px canary timed out after 120.64 seconds without an image. A warmed six-view 512px run completed in 24.14 seconds; sampled peak Blender working set was 0.462 GiB. These are this machine's observed results, not portable performance guarantees. The wrapper's numeric exit code was unavailable; actual outputs and completion metadata were inspected.

Owner: `/root/cinema_assets`; images independently reviewed by `/root`. See [measurements](../measurements.json) and the [contact sheet](../gto-geometry-contact.png). No dependency or asset download was required.

## Full-source comparison

Run `inspect_gto_full_source.py` with the same Blender command to reproduce the one-frame original-source check. It references the existing cached glTF/bin and the previous project's `cruise-blender-gto.py` by explicit local paths, with source/recipe hashes recorded in its output. Those local dependencies must be present; this is not a self-contained asset distribution. It calls the existing import/normalization/material setup without simplification, consolidation or export. Output is `full-source-diagnostics/` alongside the script.

The observed full-source run completed in 25.26 seconds, exit 0, peak working set 0.606 GiB. [Actual full-source cockpit](../gto-full-source-cockpit.png), [metadata](../full-source-inspection.json). The absence of instruments persists at full geometry detail.
