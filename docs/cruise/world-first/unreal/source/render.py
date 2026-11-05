"""Bounded two-second MRQ benchmark using the single WorldFirst camera."""
import unreal, os, json, time, traceback, math
from pathlib import Path
ROOT=Path(__file__).parent;OUT=Path(os.environ['WORLD_FIRST_OUTPUT']);START=time.monotonic()
CAMERA_CONFIG=json.loads((ROOT/'camera-config.json').read_text()) if (ROOT/'camera-config.json').exists() else {'elevation_cm':2400,'grade':.03,'pitch':-1}
REPORT={'status':'INITIALIZING','purpose':'2second1080p30fps MRQ benchmark','temporal_samples':2,'spatial_samples':1,'engine':unreal.SystemLibrary.get_engine_version()}
STATE={}
def save():
    REPORT['elapsed_seconds']=round(time.monotonic()-START,3);(OUT/'render-report.json').write_text(json.dumps(REPORT,indent=2))
def station(t):
    phases=[(0,10,10,12),(10,40,12,12),(40,50,12,14),(50,60,14,10)];s=0.
    for a,b,v0,v1 in phases:
        if t<=a:break
        u=min(1,(t-a)/(b-a));s+=(b-a)*(v0*u+(v1-v0)*(u**3-.5*u**4))
    return s
def finish(executor,success):
    files=list((OUT/'frames').glob('*.png'));REPORT.update(status='COMPLETE' if success else 'FAILED',success=success,png_count=len(files),output_bytes=sum(x.stat().st_size for x in files));save();unreal.SystemLibrary.quit_editor()
def fail(executor,pipeline,is_fatal,error):
    REPORT['pipeline_error']=str(error);save()
def start_render(dt):
    if time.monotonic()<STATE['ready']:return
    unreal.unregister_slate_post_tick_callback(STATE['handle'])
    try:
        sub=unreal.get_editor_subsystem(unreal.MoviePipelineQueueSubsystem);q=sub.get_queue();q.delete_all_jobs()
        job=q.allocate_new_job(unreal.MoviePipelineExecutorJob);job.job_name='WorldFirst_2s_DriverEye';job.map=unreal.SoftObjectPath('/Game/WorldFirst/L_NightDescent_v4');job.sequence=unreal.SoftObjectPath(SEQ.get_path_name())
        cfg=job.get_configuration();out=cfg.find_or_add_setting_by_class(unreal.MoviePipelineOutputSetting)
        out.output_directory=unreal.DirectoryPath(str(OUT/'frames'));out.file_name_format='world-first.{frame_number}';out.output_resolution=unreal.IntPoint(1920,1080);out.use_custom_frame_rate=True;out.output_frame_rate=unreal.FrameRate(30,1);out.use_custom_playback_range=True;out.custom_start_frame=0;out.custom_end_frame=60
        cfg.find_or_add_setting_by_class(unreal.MoviePipelineDeferredPassBase)
        cfg.find_or_add_setting_by_class(unreal.MoviePipelineImageSequenceOutput_PNG)
        aa=cfg.find_or_add_setting_by_class(unreal.MoviePipelineAntiAliasingSetting);aa.spatial_sample_count=1;aa.temporal_sample_count=2;aa.engine_warm_up_count=24;aa.render_warm_up_count=8
        STATE['executor']=unreal.MoviePipelinePIEExecutor(sub);STATE['executor'].on_executor_finished_delegate.add_callable_unique(finish);STATE['executor'].on_executor_errored_delegate.add_callable_unique(fail)
        REPORT.update(status='RENDERING',render_start_seconds=round(time.monotonic()-START,3));save();sub.render_queue_with_executor_instance(STATE['executor'])
    except Exception:
        REPORT.update(status='FAILED',error=traceback.format_exc());save();unreal.SystemLibrary.quit_editor()
try:
    save();level=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem);assert level.load_level('/Game/WorldFirst/L_NightDescent_v4')
    for asset_path in unreal.EditorAssetLibrary.list_assets('/Game/WorldFirst/Materials',True,False):
        material=unreal.EditorAssetLibrary.load_asset(asset_path)
        if isinstance(material,unreal.Material):
            material.set_editor_property('used_with_instanced_static_meshes',True)
            unreal.MaterialEditingLibrary.recompile_material(material)
            unreal.EditorAssetLibrary.save_loaded_asset(material)
    actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors();cam=next(a for a in actors if a.get_actor_label()=='WorldFirst_DriverEye')
    REPORT.update(scene_actor_count=len(actors),camera_config=CAMERA_CONFIG,quality_gate='FAILED photographic review; short feasibility diagnostic only')
    path='/Game/WorldFirst/LS_Descent60'
    SEQ=unreal.EditorAssetLibrary.load_asset(path) if unreal.EditorAssetLibrary.does_asset_exist(path) else unreal.AssetToolsHelpers.get_asset_tools().create_asset('LS_Descent60','/Game/WorldFirst',unreal.LevelSequence,unreal.LevelSequenceFactoryNew())
    SEQ.set_display_rate(unreal.FrameRate(30,1));SEQ.set_playback_start(0);SEQ.set_playback_end(1800)
    for b in SEQ.get_bindings():b.remove()
    for tr in SEQ.get_tracks():SEQ.remove_track(tr)
    binding=SEQ.add_possessable(cam);track=binding.add_track(unreal.MovieScene3DTransformTrack);section=track.add_section();section.set_range(0,1801)
    channels=section.get_all_channels();samples=[]
    for frame in range(1801):
        t=frame/30;s=station(t);x=s*100;y=175;z=CAMERA_CONFIG['elevation_cm']-CAMERA_CONFIG['grade']*x+162;yaw=0;pitch=CAMERA_CONFIG['pitch']
        values=[x,y,z,0,pitch,yaw,1,1,1]
        for channel,value in zip(channels,values):channel.add_key(unreal.FrameNumber(frame),value,interpolation=unreal.MovieSceneKeyInterpolation.LINEAR)
        samples.append({'frame':frame,'time':t,'position_cm':[x,y,z],'rotation_pitch_yaw_roll':[pitch,yaw,0],'horizontal_fov_deg':76})
    cuts=SEQ.add_track(unreal.MovieSceneCameraCutTrack);cut=cuts.add_section();cut.set_range(0,1800);bid=unreal.MovieSceneObjectBindingID();bid.set_editor_property('guid',binding.get_id());cut.set_camera_binding_id(bid)
    unreal.EditorAssetLibrary.save_loaded_asset(SEQ);level.save_current_level();(ROOT/'camera-per-frame.json').write_text(json.dumps({'coordinate':'Unreal centimeters Xforward Yright Zup','frameCount':1800,'connectorFrame':1800,'samples':samples},indent=2))
    STATE['ready']=time.monotonic()+20;STATE['handle']=unreal.register_slate_post_tick_callback(start_render)
except Exception:
    REPORT.update(status='FAILED',error=traceback.format_exc());save();unreal.SystemLibrary.quit_editor()
