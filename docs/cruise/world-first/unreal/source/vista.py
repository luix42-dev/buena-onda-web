from pathlib import Path
exec((Path(__file__).parent/'build-instanced.py').read_text().split('try:\n    report();build()')[0])
def pose(t):
    x=station(t)*100;return (x,175,7200-.045*x+162),(-3.,0.,0.)
try:
    assert LEVEL.load_level('/Game/WorldFirst/L_NightDescent_v4')
    CUBE=A.load_asset('/Engine/BasicShapes/Cube'); allactors=ACT.get_all_level_actors()
    CAM=next(a for a in allactors if a.get_actor_label()=='WorldFirst_DriverEye')
    moved=lowered=hidden=0
    for actor in allactors:
        comp=actor.get_component_by_class(unreal.InstancedStaticMeshComponent)
        if comp:
            material=comp.get_material(0);name=material.get_name();n=comp.get_instance_count()
            if (name.startswith('M_Windows') and n<20) or name=='M_Facade' or (name=='M_Concrete' and n<100):
                actor.set_actor_hidden_in_game(True);actor.set_is_temporarily_hidden_in_editor(True);hidden+=1;continue
            road=name in ['M_Asphalt','M_Concrete','M_Marking','M_Center','M_DarkMetal','M_WarmFixture']
            city=name.startswith('M_Windows')
            if road or city:
                for i in range(n):
                    tr=comp.get_instance_transform(i,True);p=tr.translation;sc=tr.scale3d;rot=tr.rotation.rotator()
                    if road:
                        p.z+=4800-.015*p.x
                        if name in ['M_Asphalt','M_Concrete','M_Marking','M_Center'] or (name=='M_DarkMetal' and sc.x>10 and sc.z<1):rot.pitch=-math.degrees(math.atan(.045))
                        moved+=1
                    else:
                        h=sc.z*100
                        target=min(h,600+(abs(int(p.x+p.y))%1900)) if i%5 else min(h,9000)
                        p.z=target/2;sc.z=target/100;lowered+=1
                    comp.update_instance_transform(i,unreal.Transform(location=p,rotation=rot,scale=sc),True,i==n-1,True)
        elif isinstance(actor,unreal.PointLight):
            p=actor.get_actor_location();p.z+=4800-.015*p.x;actor.set_actor_location(p,False,False)
    # Rebuild the failed road graph: the previous mask used a nonexistent input pin.
    roadmat=A.load_asset('/Game/WorldFirst/Materials/M_Asphalt')
    E.delete_all_material_expressions(roadmat)
    position=E.create_material_expression(roadmat,unreal.MaterialExpressionWorldPosition)
    uv=E.create_material_expression(roadmat,unreal.MaterialExpressionCustom);uv.set_editor_property('code','return P.xy / 210.0;');uv.set_editor_property('output_type',unreal.CustomMaterialOutputType.CMOT_FLOAT2)
    inp=unreal.CustomInput();inp.set_editor_property('input_name','P');uv.set_editor_property('inputs',[inp]);assert E.connect_material_expressions(position,'',uv,'P')
    for name,prop in [('color',unreal.MaterialProperty.MP_BASE_COLOR),('normal',unreal.MaterialProperty.MP_NORMAL),('roughness',unreal.MaterialProperty.MP_ROUGHNESS)]:
        texture=A.load_asset('/Game/WorldFirst/Textures/T_Asphalt_'+name);ts=E.create_material_expression(roadmat,unreal.MaterialExpressionTextureSample);ts.set_editor_property('texture',texture)
        ts.set_editor_property('sampler_type',unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL if name=='normal' else (unreal.MaterialSamplerType.SAMPLERTYPE_MASKS if name=='roughness' else unreal.MaterialSamplerType.SAMPLERTYPE_COLOR))
        assert E.connect_material_expressions(uv,'',ts,'UVs')
        if name=='color':
            mul=E.create_material_expression(roadmat,unreal.MaterialExpressionMultiply);mul.set_editor_property('const_b',.32);assert E.connect_material_expressions(ts,'RGB',mul,'A');assert E.connect_material_property(mul,'',prop)
        else:assert E.connect_material_property(ts,'RGB' if name=='normal' else 'R',prop)
    E.recompile_material(roadmat);A.save_loaded_asset(roadmat)
    warm=A.load_asset('/Game/WorldFirst/Materials/M_WarmFixture')
    for row in range(9):
        x=45000+row*13000
        for col in range(60):
            y=-60000+col*2000
            mesh('FarStreetLight',(x,y,35),(.5,.5,.05),warm)
    for i in range(180):
        x=R.uniform(25000,175000);y=R.uniform(-85000,85000);h=R.uniform(550,1800)
        mesh('LowUrbanBlock',(x,y,h/2),(R.uniform(10,22),R.uniform(10,24),h/100),A.load_asset('/Game/WorldFirst/Materials/M_Windows_%02d'%(i%10)))
    setpose(0);LEVEL.save_current_level()
    metadata={'contractRevision':'native-vista-2','coordinate':'Unreal cm Xforward Yright Zup','start_road_elevation_m':72,'grade':-.045,'horizontal_fov_deg':76,'eye_height_m':1.62,'world_pitch_deg':-3,'duration_s':60,'fps':30,'samples':[{'time':t,'position_cm':pose(t)[0],'rotation_pitch_yaw_roll':pose(t)[1],'horizontal_fov_deg':76} for t in range(61)]}
    (ROOT/'camera.json').write_text(json.dumps(metadata,indent=2));(ROOT/'camera-config.json').write_text(json.dumps({'elevation_cm':7200,'grade':.045,'pitch':-3},indent=2))
    REPORT.update(status='VISTA_REVISED',contractRevision='native-vista-2',moved_road_instances=moved,lowered_city_instances=lowered,hidden_batch_actors=hidden,level_actors=len(ACT.get_all_level_actors()),new_mesh_instances=COUNT,road_texture_connections='All checked true; inspect fresh compile log and pixels');report()
    STATE.update(i=0,next=time.monotonic()+20);STATE['handle']=unreal.register_slate_post_tick_callback(tick)
except Exception:
    REPORT.update(status='FAILED',error=traceback.format_exc());report();unreal.SystemLibrary.quit_editor()
