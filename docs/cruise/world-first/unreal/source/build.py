import unreal, math, random, json, time, os, traceback
from pathlib import Path
OUT=Path(os.environ['WORLD_FIRST_OUTPUT']); ROOT=Path(__file__).parent
START=time.monotonic(); R=random.Random(1976)
A=unreal.EditorAssetLibrary; E=unreal.MaterialEditingLibrary
ACT=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
LEVEL=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
TOOLS=unreal.AssetToolsHelpers.get_asset_tools()
REPORT={'status':'BUILDING','engine':unreal.SystemLibrary.get_engine_version(),'camera_kind':'driver-eye environment plate','renderer':'DX11 deferred raster; no Lumen/RT','seed':1976}
STATE={}; COUNT=0
def report():
    REPORT['elapsed_s']=round(time.monotonic()-START,2)
    (OUT/'report.json').write_text(json.dumps(REPORT,indent=2))
def vec(v):return unreal.Vector(*v)
def mat(name,color,emission=None,rough=.6,code=None):
    if A.does_asset_exist('/Game/WorldFirst/Materials/'+name):return A.load_asset('/Game/WorldFirst/Materials/'+name)
    m=TOOLS.create_asset(name,'/Game/WorldFirst/Materials',unreal.Material,unreal.MaterialFactoryNew())
    c=E.create_material_expression(m,unreal.MaterialExpressionConstant3Vector)
    c.set_editor_property('constant',unreal.LinearColor(*color,1));E.connect_material_property(c,'',unreal.MaterialProperty.MP_BASE_COLOR)
    s=E.create_material_expression(m,unreal.MaterialExpressionConstant);s.set_editor_property('r',rough);E.connect_material_property(s,'',unreal.MaterialProperty.MP_ROUGHNESS)
    if code:
        uv=E.create_material_expression(m,unreal.MaterialExpressionTextureCoordinate)
        custom=E.create_material_expression(m,unreal.MaterialExpressionCustom)
        custom.set_editor_property('code',code); custom.set_editor_property('output_type',unreal.CustomMaterialOutputType.CMOT_FLOAT3)
        inp=unreal.CustomInput();inp.set_editor_property('input_name','UV');custom.set_editor_property('inputs',[inp])
        E.connect_material_expressions(uv,'',custom,'UV');E.connect_material_property(custom,'',unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    elif emission:
        ec=E.create_material_expression(m,unreal.MaterialExpressionConstant3Vector);ec.set_editor_property('constant',unreal.LinearColor(*emission,1));E.connect_material_property(ec,'',unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    E.recompile_material(m);A.save_loaded_asset(m);return m
def mesh(label,xyz,scale,material,rotation=(0,0,0),model=None):
    global COUNT
    a=ACT.spawn_actor_from_class(unreal.StaticMeshActor,vec(xyz),unreal.Rotator(pitch=rotation[0],yaw=rotation[1],roll=rotation[2]));a.set_actor_label(label)
    c=a.static_mesh_component;c.set_static_mesh(model or CUBE);c.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION);c.set_material(0,material);a.set_actor_scale3d(vec(scale));COUNT+=1;return a
def rz(x):return 2400-.03*x
def cy(x):return 0.
def station(t):
    s=0.
    for a,b,v0,v1 in [(0,10,10,12),(10,40,12,12),(40,50,12,14),(50,60,14,10)]:
        if t<=a:break
        u=min(1,(t-a)/(b-a));s+=(b-a)*(v0*u+(v1-v0)*(u**3-.5*u**4))
    return s
def pose(t):
    x=station(t)*100; return (x,175,rz(x)+162),(-1.0,0,0)
def setpose(t):
    p,r=pose(t);CAM.set_actor_location(vec(p),False,False);CAM.set_actor_rotation(unreal.Rotator(pitch=r[0],yaw=r[1],roll=r[2]),False)
    unreal.EditorLevelLibrary.set_level_viewport_camera_info(vec(p),CAM.get_actor_rotation())
def build():
    global CUBE,CAM
    assert LEVEL.new_level('/Game/WorldFirst/L_NightDescent_v2',False)
    CUBE=A.load_asset('/Engine/BasicShapes/Cube'); cylinder=A.load_asset('/Engine/BasicShapes/Cylinder')
    asphalt=mat('M_Asphalt',(.018,.024,.035),(.001,.0015,.0025),.58)
    curb=mat('M_Concrete',(.16,.17,.18),(.002,.0025,.004),.82)
    metal=mat('M_DarkMetal',(.025,.033,.042),rough=.4)
    marking=mat('M_Marking',(.5,.49,.38),(.045,.042,.029),.8)
    yellow=mat('M_Center',(.45,.31,.065),(.075,.04,.008))
    ground=mat('M_Ground',(.006,.012,.014),(.001,.002,.0025))
    dark=mat('M_Facade',(.017,.022,.032),(.001,.002,.003))
    water=mat('M_Water',(.006,.015,.025),(.002,.009,.017),.16)
    glow=mat('M_WarmFixture',(.2,.12,.04),(12,6.3,2.6))
    sky=mat('M_Sky',(.003,.006,.014),(.008,.018,.041))
    sky.set_editor_property('two_sided',True);sky.set_editor_property('shading_model',unreal.MaterialShadingModel.MSM_UNLIT);E.recompile_material(sky);A.save_loaded_asset(sky)
    mesh('NightSky',(0,0,0),(10000,10000,10000),sky,model=A.load_asset('/Engine/BasicShapes/Sphere'))
    mesh('Valley',(120000,0,-3000),(5000,5000,2),ground)
    mesh('Bay',(170000,72000,-300),(1200,1300,.2),water)
    window=[]
    for j in range(10):
        cols=6+j%4*3; floors=12+j*3
        code=f'''float2 p=UV*float2({cols},{floors}); float2 cell=floor(p); float2 f=frac(p); float h=frac(sin(dot(cell,float2(127.1,311.7))+{j*39.17})*43758.5453); float pane=step(.17,f.x)*step(f.x,.78)*step(.16,f.y)*step(f.y,.69); float lit=step(.39,h)*pane; float3 warm=lerp(float3(1,.39,.13),float3(.63,.76,1),step(.84,h)); return warm*lit*(.35+h*2.2)+float3(.0015,.002,.003);'''
        window.append(mat('M_Windows_%02d'%j,(.017+j*.001,.022+j*.001,.029+j*.001),code=code))
    for i in range(255):
        x=-3000+i*650;y=cy(x);z=rz(x); pitch=-math.degrees(math.atan(.03));yaw=0
        mesh('Road_%03d'%i,(x,y,z-10),(6.6,14,.2),asphalt,(pitch,yaw,0))
        for side in [-1,1]:
            mesh('Shoulder_%s_%03d'%(side,i),(x,y+side*850,z-1),(6.6,3,.30),curb,(pitch,yaw,0))
            mesh('Edge_%s_%03d'%(side,i),(x,y+side*680,z+.7),(6.55,.095,.014),marking,(pitch,yaw,0))
            mesh('LaneDivider_%s_%03d'%(side,i),(x,y+side*350,z+.8),(2.8,.10,.014),marking,(pitch,yaw,0))
            if i%2==0:mesh('Rail_%s_%03d'%(side,i),(x,y+side*1010,z+65),(13.1,.07,.13),metal,(pitch,yaw,0))
        mesh('Lane_%03d'%i,(x,y,z+1),(2.8,.13,.02),yellow,(pitch,yaw,0))
    for i in range(65):
        x=-1500+i*2600;y=cy(x);z=rz(x)
        for side in [-1,1]:
            yy=y+side*885
            mesh('LampPole_%d_%d'%(i,side),(x,yy,z+435),(.13,.13,8.7),metal,model=cylinder)
            mesh('LampArm_%d_%d'%(i,side),(x,yy-side*90,z+864),(.09,1.8,.09),metal)
            mesh('LampHead_%d_%d'%(i,side),(x,yy-side*180,z+852),(.8,.32,.065),glow)
            light=ACT.spawn_actor_from_class(unreal.PointLight,vec((x,yy-side*180,z+825)))
            c=light.get_component_by_class(unreal.PointLightComponent);c.set_intensity(3400);c.set_attenuation_radius(1750);c.set_light_color(unreal.LinearColor(1,.66,.36,1),False);c.set_cast_shadows(False)
    # Close terraces stay low; distant towers establish a broad open horizon.
    n=0
    for layer,lo,hi,num in [(0,9000,82000,55),(1,85000,135000,95),(2,140000,250000,160)]:
        for i in range(num):
            x=R.uniform(lo,hi); y=R.uniform(-80000,80000)
            if abs(y)<1500:y=math.copysign(R.uniform(1700,4000),y)
            h=R.uniform(600,2000) if layer==0 else R.uniform(1300,10500)
            if layer==1 and i%13==0:h*=1.7
            w=R.uniform(900,2400);d=R.uniform(900,2600);base=rz(x)-100 if layer==0 else 0
            mesh('District%d_Building%03d'%(layer,i),(x,y,base+h/2),(d/100,w/100,h/100),window[i%10])
            if i%4==0:mesh('Crown_%03d'%n,(x,y,base+h+90),(d*.68/100,w*.67/100,1.8),dark)
            n+=1
    # Distant low neighborhoods extend the continuous city light field.
    for i in range(230):
        x=R.uniform(80000,210000);y=R.uniform(-120000,120000);h=R.uniform(300,1200)
        mesh('Neighborhood_%03d'%i,(x,y,h/2),(R.uniform(7,19),R.uniform(6,16),h/100),window[i%10])
    moon=ACT.spawn_actor_from_class(unreal.DirectionalLight,vec((0,0,5000)),unreal.Rotator(pitch=-32,yaw=-45,roll=0))
    moon_component=moon.get_component_by_class(unreal.DirectionalLightComponent)
    moon_component.set_intensity(.12);moon_component.set_light_color(unreal.LinearColor(.36,.51,1,1),False)
    moon_component.set_cast_shadows(True)
    fog=ACT.spawn_actor_from_class(unreal.ExponentialHeightFog,vec((0,0,-2000)))
    f=fog.get_component_by_class(unreal.ExponentialHeightFogComponent);f.set_editor_property('fog_density',.012);f.set_editor_property('fog_height_falloff',.15);f.set_fog_inscattering_color(unreal.LinearColor(.005,.012,.025,1));f.set_editor_property('start_distance',12000)
    pp=ACT.spawn_actor_from_class(unreal.PostProcessVolume,vec((0,0,0)));pp.set_editor_property('unbound',True)
    s=pp.get_editor_property('settings')
    for k,v in [('override_auto_exposure_min_brightness',True),('auto_exposure_min_brightness',1.),('override_auto_exposure_max_brightness',True),('auto_exposure_max_brightness',1.),('override_auto_exposure_bias',True),('auto_exposure_bias',0.),('override_bloom_intensity',True),('bloom_intensity',.4),('override_vignette_intensity',True),('vignette_intensity',.17),('override_motion_blur_amount',True),('motion_blur_amount',.35)]:s.set_editor_property(k,v)
    pp.set_editor_property('settings',s)
    CAM=ACT.spawn_actor_from_class(unreal.CameraActor,vec((0,175,2562)));CAM.set_actor_label('WorldFirst_DriverEye');CAM.get_component_by_class(unreal.CameraComponent).set_editor_property('field_of_view',76.)
    setpose(0);LEVEL.editor_set_game_view(True);LEVEL.save_current_level()
    samples=[{'time':t,'position_cm':pose(t)[0],'rotation_pitch_yaw_roll':pose(t)[1],'horizontal_fov_deg':76} for t in range(61)]
    (ROOT/'camera.json').write_text(json.dumps({'coordinate':'Unreal cm Xforward Yright Zup; browser=(UE.Y/100,UE.Z/100,-UE.X/100)','eye_height_m':1.62,'duration_s':60,'fps':30,'samples':samples},indent=2))
    REPORT.update(status='BUILT',static_mesh_actors=COUNT,build_seconds=round(time.monotonic()-START,2),map='/Game/WorldFirst/L_NightDescent_v2',representative_times=[0,18,36,54],window_materials=10,buildings=540)
    report()
def tick(dt):
    try:
        if time.monotonic()-START>650:raise RuntimeError('650second internal bounded screenshot deadline')
        if time.monotonic()<STATE['next']:return
        idx=STATE['i']
        if idx>=4:
            if not STATE.get('complete'):
                REPORT['status']='FOUR_FRAMES_WRITTEN';report();STATE['complete']=time.monotonic()
            command=ROOT/'next-action.txt'
            action=command.read_text().strip() if command.exists() else ''
            if action in ['refine','render']:
                command.write_text('');unreal.unregister_slate_post_tick_callback(STATE['handle'])
                nextout=OUT/action;nextout.mkdir(exist_ok=True);os.environ['WORLD_FIRST_OUTPUT']=str(nextout)
                target=ROOT/(action+'.py');exec(compile(target.read_text(),str(target),'exec'),{'__file__':str(target)})
            elif action=='quit' or time.monotonic()-STATE['complete']>180:
                unreal.unregister_slate_post_tick_callback(STATE['handle']);unreal.SystemLibrary.quit_editor()
            return
        path=OUT/('frame-%02ds.png'%[0,18,36,54][idx])
        if STATE.get('requested'):
            if path.exists() and path.stat().st_size>100:
                STATE['i']+=1;STATE['requested']=False
                if STATE['i']<4:setpose([0,18,36,54][STATE['i']])
                STATE['next']=time.monotonic()+4;report()
            return
        STATE['requested']=True;STATE['next']=time.monotonic()+2
        STATE['task']=unreal.AutomationLibrary.take_high_res_screenshot(1920,1080,str(path),camera=CAM)
    except Exception:
        REPORT.update(status='FAILED',error=traceback.format_exc());report();unreal.SystemLibrary.quit_editor()
try:
    report();build();STATE.update(i=0,next=time.monotonic()+35);STATE['handle']=unreal.register_slate_post_tick_callback(tick)
except Exception:
    REPORT.update(status='FAILED',error=traceback.format_exc());report();unreal.SystemLibrary.quit_editor()
