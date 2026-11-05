"""Same authored world, batched into one ISM component per mesh/material family."""
from pathlib import Path
source=(Path(__file__).parent/'build.py').read_text().split('try:\n    report();build();')[0]
exec(source.replace('L_NightDescent_v2','L_NightDescent_v4'))
BATCHES={}; BATCH_CLASS=None
def instance_class():
    path='/Game/WorldFirst/BP_MeshBatch'
    if A.does_asset_exist(path):return A.load_blueprint_class(path)
    factory=unreal.BlueprintFactory();factory.set_editor_property('parent_class',unreal.Actor)
    bp=TOOLS.create_asset('BP_MeshBatch','/Game/WorldFirst',unreal.Blueprint,factory)
    sub=unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem);lib=unreal.SubobjectDataBlueprintFunctionLibrary
    handles=sub.k2_gather_subobject_data_for_blueprint(bp)
    handle,reason=sub.add_new_subobject(unreal.AddNewSubobjectParams(parent_handle=handles[0],new_class=unreal.InstancedStaticMeshComponent,blueprint_context=bp))
    component=lib.get_object(lib.get_data(handle))
    if not component:raise RuntimeError('ISM blueprint component creation failed: '+str(reason))
    component.set_static_mesh(A.load_asset('/Engine/BasicShapes/Cube'));component.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
    component.set_editor_property('cast_shadow',False);component.set_editor_property('affect_distance_field_lighting',False)
    unreal.BlueprintEditorLibrary.compile_blueprint(bp);A.save_loaded_asset(bp)
    return A.load_blueprint_class(path)
def mesh(label,xyz,scale,material,rotation=(0,0,0),model=None):
    global COUNT,BATCH_CLASS
    model=model or CUBE; key=model.get_path_name()+'|'+material.get_path_name()
    if key not in BATCHES:
        if BATCH_CLASS is None:BATCH_CLASS=instance_class()
        actor=ACT.spawn_actor_from_class(BATCH_CLASS,unreal.Vector(0,0,0));actor.set_actor_label('WorldFirst_Batch_'+material.get_name())
        comp=actor.get_component_by_class(unreal.InstancedStaticMeshComponent);comp.set_static_mesh(model);comp.set_material(0,material);comp.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
        BATCHES[key]=(actor,comp)
    actor,comp=BATCHES[key]
    transform=unreal.Transform(location=vec(xyz),rotation=unreal.Rotator(pitch=rotation[0],yaw=rotation[1],roll=rotation[2]),scale=vec(scale))
    comp.add_instance(transform,True);COUNT+=1;return actor
try:
    report();build()
    REPORT.pop('static_mesh_actors',None)
    REPORT.update(status='BUILT_INSTANCED',mesh_instances=COUNT,mesh_batch_actors=len(BATCHES),level_actors=len(ACT.get_all_level_actors()),shadow_policy='Instanced environment geometry does not cast shadows or contribute distance fields; physical lamp illumination remains raster')
    report();STATE.update(i=0,next=time.monotonic()+35);STATE['handle']=unreal.register_slate_post_tick_callback(tick)
except Exception:
    REPORT.update(status='FAILED',error=traceback.format_exc());report();unreal.SystemLibrary.quit_editor()
