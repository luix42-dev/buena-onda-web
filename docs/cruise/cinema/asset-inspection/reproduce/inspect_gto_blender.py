"""Geometry diagnostics only. Run with portable Blender --background --python this_file.

No dependencies, downloads, source writes or saved .blend. Workbench is deliberately
not a material/photorealism test. See README.md for provenance and grid mapping.
"""
import bpy
import json
import hashlib
from array import array
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'gto-high-uncompressed.glb'
OUT = HERE / 'geometry-diagnostics'
OUT.mkdir(exist_ok=True)
assert SOURCE.is_file(), str(SOURCE)
assert 'CC0' in (HERE / 'GTO-LICENSE.txt').read_text(), 'Missing local CC0 record'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == '819c98b0702c1238b1525434afc3937b08194d6de037e3d2d566b90004114e0c', 'Source changed; remeasure bounds first'
metadata = json.loads((HERE / 'bounds.json').read_text())

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
bpy.context.view_layer.update()
corners = [obj.matrix_world @ Vector(c) for obj in meshes for c in obj.bound_box]
low = Vector(tuple(min(v[i] for v in corners) for i in range(3)))
high = Vector(tuple(max(v[i] for v in corners) for i in range(3)))
source_low, source_high = metadata['gltfWorldBounds']['min'], metadata['gltfWorldBounds']['max']
expected_low = Vector((source_low[0], -source_high[2], source_low[1]))
expected_high = Vector((source_high[0], -source_low[2], source_high[1]))
assert (low - expected_low).length < 0.002 and (high - expected_high).length < 0.002, 'Import differs from measured GLB bounds; stop instead of guessing scale'

# GLB is +Y-up, forward -Z; Blender importer maps that to +Z-up, forward +Y.
# Driver sits on negative X, verified by STEERING_WHEEL accessor bounds.
# The old conversion baked SCALE=.59 into mesh coordinates; DO NOT apply it again.
# Old FL/RL labels conflict with forward_axis and cockpit layout. Do not use wheel
# names to orient these cameras or configure a future vehicle rig without review.
shots = [
    ('01-driver-workbench', (-0.30, -0.14, 1.17), (-0.30, 1.85, 0.88), 25, False),
    ('02-driver-glass-hidden', (-0.30, -0.14, 1.17), (-0.30, 1.85, 0.88), 25, True),
    ('03-dashboard-glass-hidden', (-0.30, -0.18, 1.07), (-0.10, 0.90, 0.80), 35, True),
    ('04-front', (0.0, 7.2, 2.15), (0.0, 0.0, 0.68), 48, False),
    ('05-rear', (0.0, -7.2, 2.15), (0.0, 0.0, 0.68), 48, False),
    ('06-side', (-7.2, 0.0, 1.85), (0.0, 0.0, 0.68), 48, False),
]
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.resolution_x = scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = False
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = 'BOTH'
scene.display.shading.show_specular_highlight = True
scene.display.shading.background_type = 'WORLD'
scene.world = bpy.data.worlds.new('DiagnosticWorld')
scene.world.color = (0.055, 0.055, 0.055)
scene.view_settings.view_transform = 'Standard'
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2

camera_data = bpy.data.cameras.new('DiagnosticCamera')
camera = bpy.data.objects.new('DiagnosticCamera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.clip_start = 0.015
camera_data.clip_end = 100
glass = [obj for obj in meshes if obj.name.upper().startswith('GLASS')]
records = []
for name, position, target, lens, hide_glass in shots:
    for obj in glass:
        obj.hide_render = hide_glass
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.lens = lens
    scene.render.filepath = str(OUT / (name + '.png'))
    bpy.ops.render.render(write_still=True)
    records.append(dict(name=name, position=position, target=target, lens_mm=lens,
                        hidden_glass=[obj.name for obj in glass] if hide_glass else []))

# Compose existing PNGs with Blender's own image API; no Pillow installation.
# 3 columns, 2 rows. First three cockpit views on top, exteriors below.
width, height = 1536, 1024
pixels = array('f', [0.0]) * (width * height * 4)
for index, record in enumerate(records):
    image = bpy.data.images.load(str(OUT / (record['name'] + '.png')), check_existing=False)
    data = array('f', [0.0]) * (512 * 512 * 4)
    image.pixels.foreach_get(data)
    col, row = index % 3, 1 - index // 3
    for y in range(512):
        dest = ((row * 512 + y) * width + col * 512) * 4
        pixels[dest:dest + 2048] = data[y * 2048:(y + 1) * 2048]
    bpy.data.images.remove(image)
sheet = bpy.data.images.new('GTOGeometryContact', width=width, height=height, alpha=True)
sheet.pixels.foreach_set(pixels)
sheet.filepath_raw = str(OUT / 'contact-geometry.png')
sheet.file_format = 'PNG'
sheet.save()
(OUT / 'inspection.json').write_text(json.dumps(dict(
    status='geometry diagnostic only; not a cinematic material test',
    source=str(SOURCE), blender=bpy.app.version_string,
    bounds_blender=dict(min=list(low), max=list(high)),
    explicit_import_scale=1.0,
    measured_gltf_world_bounds=metadata['gltfWorldBounds'],
    axes='Z-up, forward +Y, driver negative X',
    contact_order='top row 01/02/03; bottom row 04/05/06',
    mesh_objects=[obj.name for obj in meshes], shots=records,
), indent=2) + '\n')
print('GTO_DIAGNOSTICS_COMPLETE', str(OUT))
