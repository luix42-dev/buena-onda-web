"""One matched full-source cockpit diagnostic. No decimation, export or source writes.

Reuses the earlier local normalization/material recipe by importing its functions,
never calling main(). Run only after the lead releases the Unreal/GPU hold.
"""
from pathlib import Path
import importlib.util
import hashlib
import json
import bpy

HERE = Path(__file__).resolve().parent
CACHE = Path('D:/10-VENTURES/12-buena-onda/Buena Onda_1780506618159/cruise-phase1/.dream-loop/vehicle-candidates/pontiac-gto')
RECIPE = Path('D:/10-VENTURES/12-buena-onda/cruise-master-20261005/scripts/cruise-blender-gto.py')
FULL = CACHE / 'pontiac_gto_extended.gltf'
assert 'CC0' in (CACHE / 'LICENSE.txt').read_text()
assert hashlib.sha256(FULL.read_bytes()).hexdigest() == '95a7fe37b6ab4a4552799c0b98f5ae85acdb16af431c8fb491f365bcc640de5f'
assert (CACHE / 'pontiac_gto.bin').stat().st_size == 31626392
spec = importlib.util.spec_from_file_location('original_gto_recipe', RECIPE)
recipe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recipe)
recipe.SOURCE = str(FULL)

# Keep the proven camera/render setup identical. Replace only import preparation,
# known source hash check, glass discovery, output directory and selected shot.
source = (HERE / 'inspect_gto_blender.py').read_text().split('# Compose existing PNGs')[0]
source = source.replace("OUT = HERE / 'geometry-diagnostics'", "OUT = HERE / 'full-source-diagnostics'")
source = source.replace("assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == '819c98b0702c1238b1525434afc3937b08194d6de037e3d2d566b90004114e0c', 'Source changed; remeasure bounds first'", "# Full-source hash and license checked by wrapper.")
source = source.replace('bpy.ops.import_scene.gltf(filepath=str(SOURCE))', 'recipe.import_and_prepare()  # full geometry; canonical transform/materials, no decimate()')
source = source.replace("assert (low - expected_low).length < 0.002 and (high - expected_high).length < 0.002, 'Import differs from measured GLB bounds; stop instead of guessing scale'", "assert max(abs((high-low)[i] - (expected_high-expected_low)[i]) for i in range(3)) < 0.10, 'Full source normalized size differs unexpectedly; stop'")
source = source.replace('scene = bpy.context.scene\n', "shots = [shot for shot in shots if shot[0] == '02-driver-glass-hidden']\nscene = bpy.context.scene\n")
source = source.replace("glass = [obj for obj in meshes if obj.name.upper().startswith('GLASS')]", "glass = [obj for obj in meshes if recipe.material_name(obj) == 'WindowGlass']")
exec(compile(source, str(HERE / 'inspect_gto_blender.py'), 'exec'))
(OUT / 'inspection.json').write_text(json.dumps(dict(
    source=str(FULL), recipe=str(RECIPE),
    source_sha256=hashlib.sha256(FULL.read_bytes()).hexdigest(),
    recipe_sha256=hashlib.sha256(RECIPE.read_bytes()).hexdigest(),
    normalization='existing canonical_transform: center axle, scale .59, rotate -90deg Z, floor offset; baked once',
    simplification='none; no decimate() or consolidation call',
    imported_triangles=sum(recipe.triangles(obj) for obj in meshes),
    bounds_blender=dict(min=list(low), max=list(high)),
    hidden_glass=[obj.name for obj in glass],
    camera=records[0],
    limitation='Workbench geometry comparison only; no photographic material test',
), indent=2) + '\n')
print('FULL_SOURCE_DIAGNOSTIC_COMPLETE', str(OUT))
