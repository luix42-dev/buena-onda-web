"""Eight-second environmental director cut of the preserved v4 world, with house billboards."""
import unreal, os, json, math, time, traceback
from pathlib import Path
ROOT=Path(__file__).parent; REPO=ROOT.parent.parent
OUT=Path(os.environ['WORLD_FIRST_OUTPUT']);START=time.monotonic()
A=unreal.EditorAssetLibrary;E=unreal.MaterialEditingLibrary
TOOLS=unreal.AssetToolsHelpers.get_asset_tools();ACT=unreal.get_editor_subsystem(unreal.EditorActorSubsystem);LEVEL=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
MAP='/Game/WorldFirst/L_Director_v5';ASSETS='/Game/WorldFirst/Director'
REPORT={'status':'BUILDING','content':'environmentDirector','qualityAccepted':False,'engine':unreal.SystemLibrary.get_engine_version(),'base_map':'/Game/WorldFirst/L_NightDescent_v4','map':MAP,'duration_seconds':8,'fps':30,'billboard_campaign':'vice-nights / Buena Onda house campaign','vehicle_included':False}
STATE={'index':0,'requested':False};CAMS=[];SAMPLES=[]
SHOTS=[
 {'name':'Ridge approach','start':[-1400,-1650,8600],'end':[200,-1400,8400],'target':[13500,500,6500],'fov':70},
 {'name':'House billboard one','start':[3700,-1200,7850],'end':[4100,-850,7780],'target':[6500,2000,7507.5],'fov':58},
 {'name':'City and elevated boulevard','start':[28000,-10000,13700],'end':[29600,-9300,13100],'target':[48000,0,5600],'fov':70},
 {'name':'House billboard two','start':[42000,650,6550],'end':[42700,450,6350],'target':[45000,-2200,5825],'fov':60},
]
def save():
 REPORT['elapsed_seconds']=round(time.monotonic()-START,3);(OUT/'director-report.json').write_text(json.dumps(REPORT,indent=2))
def v(p):return unreal.Vector(*p)
def camera_pose(shot,u):
 p=[a+(b-a)*u for a,b in zip(shot['start'],shot['end'])];r=unreal.MathLibrary.find_look_at_rotation(v(p),v(shot['target']));return p,r
def spawnmesh(name,p,scale,material):
 actor=ACT.spawn_actor_from_class(unreal.StaticMeshActor,v(p));actor.set_actor_label(name)
 c=actor.get_component_by_class(unreal.StaticMeshComponent);c.set_static_mesh(A.load_asset('/Engine/BasicShapes/Cube'));c.set_material(0,material);c.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION);c.set_cast_shadow(False);actor.set_actor_scale3d(v(scale));return actor
def billboard(index,x,y):
 ground=7200-.045*x;z=ground+600 if index==0 else ground+650
 mpath=ASSETS+'/M_HouseBillboard_'+str(index)
 mat=A.load_asset(mpath) if A.does_asset_exist(mpath) else TOOLS.create_asset('M_HouseBillboard_'+str(index),ASSETS,unreal.Material,unreal.MaterialFactoryNew())
 E.delete_all_material_expressions(mat);mat.set_editor_property('shading_model',unreal.MaterialShadingModel.MSM_UNLIT)
 wp=E.create_material_expression(mat,unreal.MaterialExpressionWorldPosition);uv=E.create_material_expression(mat,unreal.MaterialExpressionCustom)
 uv.set_editor_property('code',f'return float2((P.y-({y}))/1600.0+0.5,0.5-(P.z-({z}))/900.0);');uv.set_editor_property('output_type',unreal.CustomMaterialOutputType.CMOT_FLOAT2)
 inp=unreal.CustomInput();inp.set_editor_property('input_name','P');uv.set_editor_property('inputs',[inp]);assert E.connect_material_expressions(wp,'',uv,'P')
 ts=E.create_material_expression(mat,unreal.MaterialExpressionTextureSample);ts.set_editor_property('texture',A.load_asset(ASSETS+'/T_HouseViceNights'));assert E.connect_material_expressions(uv,'',ts,'UVs')
 dim=E.create_material_expression(mat,unreal.MaterialExpressionMultiply);dim.set_editor_property('const_b',.8);assert E.connect_material_expressions(ts,'RGB',dim,'A');assert E.connect_material_property(dim,'',unreal.MaterialProperty.MP_EMISSIVE_COLOR)
 E.recompile_material(mat);A.save_loaded_asset(mat)
 metal=A.load_asset('/Game/WorldFirst/Materials/M_DarkMetal')
 spawnmesh('Director_Billboard%d_Frame'%index,(x+20,y,z),(.35,16.5,9.5),metal)
 spawnmesh('Director_Billboard%d_HouseFace'%index,(x,y,z),(.08,16,9),mat)
 for side in [-1,1]:spawnmesh('Director_Billboard%d_Post%d'%(index,side),(x+20,y+side*540,ground+270),(.28,.28,5.4),metal)
 return {'campaign':'vice-nights','kind':'house/demo','source':'public/cruise/campaigns/vice-nights/fallback.png','center_cm':[x,y,z],'face_size_m':[16,9],'revenue_or_analytics_claims':False}
def finish(executor,success):
 files=list((OUT/'frames').glob('*.png'));REPORT.update(status='COMPLETE' if success else 'FAILED',success=success,png_count=len(files),output_bytes=sum(p.stat().st_size for p in files));save();unreal.SystemLibrary.quit_editor()
def fail(executor,pipeline,is_fatal,error):
 REPORT['pipeline_error']=str(error);save()
def render():
 sub=unreal.get_editor_subsystem(unreal.MoviePipelineQueueSubsystem);q=sub.get_queue();q.delete_all_jobs()
 job=q.allocate_new_job(unreal.MoviePipelineExecutorJob);job.job_name='WorldFirst_8s_Director';job.map=unreal.SoftObjectPath(MAP);job.sequence=unreal.SoftObjectPath(SEQ.get_path_name())
 cfg=job.get_configuration();out=cfg.find_or_add_setting_by_class(unreal.MoviePipelineOutputSetting);out.output_directory=unreal.DirectoryPath(str(OUT/'frames'));out.file_name_format='director.{frame_number}';out.output_resolution=unreal.IntPoint(1920,1080);out.use_custom_frame_rate=True;out.output_frame_rate=unreal.FrameRate(30,1);out.use_custom_playback_range=True;out.custom_start_frame=0;out.custom_end_frame=240
 cfg.find_or_add_setting_by_class(unreal.MoviePipelineDeferredPassBase);cfg.find_or_add_setting_by_class(unreal.MoviePipelineImageSequenceOutput_PNG)
 aa=cfg.find_or_add_setting_by_class(unreal.MoviePipelineAntiAliasingSetting);aa.spatial_sample_count=1;aa.temporal_sample_count=2;aa.engine_warm_up_count=24;aa.render_warm_up_count=8
 STATE['executor']=unreal.MoviePipelinePIEExecutor(sub);STATE['executor'].on_executor_finished_delegate.add_callable_unique(finish);STATE['executor'].on_executor_errored_delegate.add_callable_unique(fail)
 REPORT.update(status='RENDERING',render_start_seconds=round(time.monotonic()-START,3));save();sub.render_queue_with_executor_instance(STATE['executor'])
def tick(dt):
 try:
  if time.monotonic()-START>750:raise RuntimeError('Director script bounded to750seconds')
  if time.monotonic()<STATE['next']:return
  i=STATE['index']
  if i==4:
   if not STATE.get('review'):
    STATE['review']=time.monotonic();REPORT['status']='STILLS_READY_AWAITING_REVIEW';save()
   action=ROOT/'action.txt';command=action.read_text().strip() if action.exists() else ''
   if command=='render':
    action.write_text('');unreal.unregister_slate_post_tick_callback(STATE['handle']);render()
   elif command=='quit' or time.monotonic()-STATE['review']>240:
    unreal.unregister_slate_post_tick_callback(STATE['handle']);unreal.SystemLibrary.quit_editor()
   return
  path=OUT/('shot-%02d.png'%i)
  if STATE['requested']:
   if path.exists() and path.stat().st_size>100:
    STATE['index']+=1;STATE['requested']=False;STATE['next']=time.monotonic()+3
   return
  STATE['requested']=True;STATE['next']=time.monotonic()+2
  STATE['task']=unreal.AutomationLibrary.take_high_res_screenshot(1920,1080,str(path),camera=CAMS[i])
 except Exception:
  REPORT.update(status='FAILED',error=traceback.format_exc());save();unreal.SystemLibrary.quit_editor()
try:
 ROOT.mkdir(exist_ok=True);save()
 if not A.does_asset_exist(MAP):
  assert LEVEL.load_level('/Game/WorldFirst/L_NightDescent_v4')
  assert unreal.EditorLoadingAndSavingUtils.save_map(unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world(),MAP)
 assert LEVEL.load_level(MAP)
 REPORT['active_world']=unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world().get_path_name()
 assert 'L_Director_v5' in REPORT['active_world'],REPORT['active_world']
 for actor in ACT.get_all_level_actors():
  if actor.get_actor_label().startswith('Director_'):ACT.destroy_actor(actor)
 task=unreal.AssetImportTask();task.filename=str(REPO/'public/cruise/campaigns/vice-nights/fallback.png');task.destination_path=ASSETS;task.destination_name='T_HouseViceNights';task.automated=True;task.save=True;task.replace_existing=True;TOOLS.import_asset_tasks([task])
 REPORT['billboards']=[billboard(0,6500,2000),billboard(1,45000,-2200)]
 seqpath=ASSETS+'/LS_Director8';SEQ=A.load_asset(seqpath) if A.does_asset_exist(seqpath) else TOOLS.create_asset('LS_Director8',ASSETS,unreal.LevelSequence,unreal.LevelSequenceFactoryNew())
 SEQ.set_display_rate(unreal.FrameRate(30,1));SEQ.set_playback_start(0);SEQ.set_playback_end(240)
 for binding in SEQ.get_bindings():binding.remove()
 for track in SEQ.get_tracks():SEQ.remove_track(track)
 cuts=SEQ.add_track(unreal.MovieSceneCameraCutTrack)
 for i,shot in enumerate(SHOTS):
  p,r=camera_pose(shot,0);cam=ACT.spawn_actor_from_class(unreal.CameraActor,v(p),r);cam.set_actor_label('Director_Shot'+str(i));cam.get_component_by_class(unreal.CameraComponent).set_editor_property('field_of_view',float(shot['fov']));CAMS.append(cam)
  binding=SEQ.add_possessable(cam);track=binding.add_track(unreal.MovieScene3DTransformTrack);section=track.add_section();section.set_range(i*60,(i+1)*60+1);channels=section.get_all_channels()
  for j in range(61):
   p,r=camera_pose(shot,j/60);frame=i*60+j
   for channel,value in zip(channels,[*p,r.roll,r.pitch,r.yaw,1,1,1]):channel.add_key(unreal.FrameNumber(frame),value,interpolation=unreal.MovieSceneKeyInterpolation.LINEAR)
   if j<60:SAMPLES.append({'frame':frame,'time_seconds':frame/30,'shot':i,'position_cm':p,'rotation_pitch_yaw_roll':[r.pitch,r.yaw,r.roll],'horizontal_fov_deg':shot['fov'],'height_above_road_m':(p[2]-(7200-.045*p[0]))/100})
  cut=cuts.add_section();cut.set_range(i*60,(i+1)*60);bid=unreal.MovieSceneObjectBindingID();bid.set_editor_property('guid',binding.get_id());cut.set_camera_binding_id(bid)
 A.save_loaded_asset(SEQ);LEVEL.save_current_level();LEVEL.editor_set_game_view(True)
 (ROOT/'camera.json').write_text(json.dumps({'kind':'environmentDirector','coordinate':'Unreal centimeters Xforward Yright Zup','frame_count':240,'fps':30,'duration_seconds':8,'shots':SHOTS,'samples':SAMPLES},indent=2))
 REPORT.update(status='SCENE_READY',scene_actor_count=len(ACT.get_all_level_actors()),shots=SHOTS);save();STATE['next']=time.monotonic()+25;STATE['handle']=unreal.register_slate_post_tick_callback(tick)
except Exception:
 REPORT.update(status='FAILED',error=traceback.format_exc());save();unreal.SystemLibrary.quit_editor()
