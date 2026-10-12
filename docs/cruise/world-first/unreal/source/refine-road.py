"""Refine the saved checkpoint with existing CC0 road scans and near terraces."""
from pathlib import Path
exec((Path(__file__).parent/'build-instanced.py').read_text().split('try:\n    report();build()')[0])
try:
    assert LEVEL.load_level('/Game/WorldFirst/L_NightDescent_v4')
    CUBE=A.load_asset('/Engine/BasicShapes/Cube')
    CAM=next(a for a in ACT.get_all_level_actors() if a.get_actor_label()=='WorldFirst_DriverEye')
    tasks=[]
    for name in ['color','normal','roughness']:
        task=unreal.AssetImportTask();task.filename=str(ROOT/'textures'/(name+'.png'));task.destination_path='/Game/WorldFirst/Textures';task.destination_name='T_Asphalt_'+name;task.automated=True;task.save=True;task.replace_existing=True;tasks.append(task)
    TOOLS.import_asset_tasks(tasks)
    textures={n:A.load_asset('/Game/WorldFirst/Textures/T_Asphalt_'+n) for n in ['color','normal','roughness']}
    textures['normal'].set_editor_property('srgb',False);textures['normal'].set_editor_property('compression_settings',unreal.TextureCompressionSettings.TC_NORMALMAP);textures['normal'].set_editor_property('flip_green_channel',True)
    textures['roughness'].set_editor_property('srgb',False);textures['roughness'].set_editor_property('compression_settings',unreal.TextureCompressionSettings.TC_MASKS)
    for tex in textures.values():A.save_loaded_asset(tex)
    road=A.load_asset('/Game/WorldFirst/Materials/M_Asphalt')
    # World-position XY gives one metric texture phase across every road segment.
    position=E.create_material_expression(road,unreal.MaterialExpressionWorldPosition)
    mask=E.create_material_expression(road,unreal.MaterialExpressionComponentMask);mask.set_editor_property('r',True);mask.set_editor_property('g',True);mask.set_editor_property('b',False);E.connect_material_expressions(position,'',mask,'Input')
    multiply=E.create_material_expression(road,unreal.MaterialExpressionMultiply);multiply.set_editor_property('const_b',1/210.);E.connect_material_expressions(mask,'',multiply,'A')
    for n,prop in [('color',unreal.MaterialProperty.MP_BASE_COLOR),('normal',unreal.MaterialProperty.MP_NORMAL),('roughness',unreal.MaterialProperty.MP_ROUGHNESS)]:
        ts=E.create_material_expression(road,unreal.MaterialExpressionTextureSample);ts.set_editor_property('texture',textures[n]);ts.set_editor_property('sampler_type',unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL if n=='normal' else (unreal.MaterialSamplerType.SAMPLERTYPE_MASKS if n=='roughness' else unreal.MaterialSamplerType.SAMPLERTYPE_COLOR));E.connect_material_expressions(multiply,'',ts,'UVs')
        if n=='color':
            darken=E.create_material_expression(road,unreal.MaterialExpressionMultiply);darken.set_editor_property('const_b',.24);E.connect_material_expressions(ts,'RGB',darken,'A');E.connect_material_property(darken,'',prop)
        else:E.connect_material_property(ts,'RGB' if n=='normal' else 'R',prop)
    E.recompile_material(road);A.save_loaded_asset(road)
    dark=A.load_asset('/Game/WorldFirst/Materials/M_Facade');curb=A.load_asset('/Game/WorldFirst/Materials/M_Concrete')
    for i in range(28):
        x=1200+i*2650
        for side in [-1,1]:
            if side==1 and 42000<x<64000:continue
            y=side*(1900+R.uniform(0,950));w=R.uniform(1000,1650);d=R.uniform(1300,2300);h=R.uniform(700,1350);base=rz(x)
            wm=A.load_asset('/Game/WorldFirst/Materials/M_Windows_%02d'%(i%10))
            mesh('Refined_Terrace_%02d_%d'%(i,side),(x,y,base+h/2),(d/100,w/100,h/100),wm)
            mesh('Refined_Parapet_%02d_%d'%(i,side),(x,y,base+h+30),(d/100+.12,w/100+.12,.6),curb)
            for floor in range(1,int(h//330)):
                mesh('Refined_Balcony_%02d_%d_%d'%(i,side,floor),(x,y-side*(w/2+35),base+floor*330),(d/100,.75,.1),dark)
    setpose(0);LEVEL.save_current_level();REPORT.update(status='REFINED',road_textures='Poly Haven Clean Asphalt CC0; original webp losslessly converted to PNG',road_tile_cm=210,new_mesh_actors=COUNT);report()
    STATE.update(i=0,next=time.monotonic()+35);STATE['handle']=unreal.register_slate_post_tick_callback(tick)
except Exception:
    REPORT.update(status='FAILED',error=traceback.format_exc());report();unreal.SystemLibrary.quit_editor()
