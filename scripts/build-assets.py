"""Create original low-poly kitchen props and matching order portraits with Blender.
Run: blender --background --python scripts/build-assets.py
Outputs editable assets/kitchen.blend, compact mesh data and transparent PNGs.
"""
import bpy, math, json, os, gzip
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
def mat(name,hex,rough=.56,metal=0):
    if name in materials:return materials[name]
    srgb=[int(hex[i:i+2],16)/255 for i in (0,2,4)]
    rgb=tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in srgb)
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    materials[name]=m;return m
crust=mat('Toasted honey crust','D99130');crumb=mat('Soft cream crumb','FFE0A0');score=mat('Bread scoring','F4C76E');seed=mat('Sesame','FFF0BD')
leaf=mat('Lettuce leaf','51952D');leaflight=mat('Leaf edge','83BD3F');stem=mat('Leaf vein','BFDA74')
raw=mat('Pork pink','E87578');fat=mat('Pork marbling','FFD0B6');cut=mat('Prepared pork','E59A8B');cooked=mat('Roasted pork','B65B27');caramel=mat('Caramel crust','743813');burnt=mat('Charcoal','322E29')
red=mat('Chili sauce','DA3922',.3);label=mat('Bottle label','FFECC0');gold=mat('Mustard cap','EDB23C');white=mat('Porcelain','FFFBEB',.22);blue=mat('Plate blue glaze','62A8C2',.25)
steel=mat('Brushed steel','C9DBDF',.26,.7);edge=mat('Blade edge','F0FAFC',.18,.65);wood=mat('Walnut handle','784325');brass=mat('Handle rivet','D8B576',.3,.55)
def finish(o,m,location=(0,0,0),scale=(1,1,1),smooth=False):
    o.location=location;o.scale=scale;o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons:p.use_smooth=True
    return o
def ell(name,loc,scale,m,segments=16,rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1)
    o=bpy.context.object;o.name=name;return finish(o,m,loc,scale,True)
def box(name,loc,size,m,bevel=.025,rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;finish(o,m,loc,size)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        modifier=o.modifiers.new('Soft manufactured edges','BEVEL');modifier.width=bevel;modifier.segments=2
        o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    if rot:o.rotation_euler=rot
    return o
def cyl(name,loc,radius,depth,m,vertices=20,r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=radius,radius2=radius if r2 is None else r2,depth=depth)
    o=bpy.context.object;o.name=name;return finish(o,m,loc,smooth=True)
def torus(name,loc,r,thick,m):
    bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,major_radius=r,minor_radius=thick)
    o=bpy.context.object;o.name=name;return finish(o,m,loc,smooth=True)
def tube(name,points,r,m):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=4;curve.bevel_depth=r;curve.bevel_resolution=1
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for p,co in zip(spline.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
def loaf(z=0,top=False):
    ell('Baguette crust',(0,0,z+.17),(.51,.24,.17 if not top else .13),crust,24,10)
    if top:ell('Bread cut face',(0,0,z+.075),(.48,.22,.035),crumb,24,6)
    for i in range(4):
        x=(i-1.5)*.21
        tube('Diagonal bread opening',[(x-.045,-.12,z+.28),(x,0,z+.33),(x+.045,.105,z+.285)],.021,score)
        tube('Light raised scoring',[(x-.06,-.115,z+.289),(x-.015,0,z+.342),(x+.03,.1,z+.294)],.009,crumb)
    for i in range(15):
        x=math.sin(i*9.1)*.4;y=math.cos(i*4.7)*.135
        zz=z+.17+(.16 if not top else .12)*math.sqrt(max(.05,1-(x/.51)**2-(y/.24)**2))
        o=ell('Sesame seed',(x,y,zz+.008),(.012,.024,.007),seed,8,4);o.rotation_euler.z=i*1.7
def pork(state):
    if state=='raw':
        ell('Pork steak',(0,0,.135),(.39,.28,.12),raw)
        ring=torus('Ivory fat edge',(0,0,.19),.24,.033,fat);ring.scale=(1.32,.83,.6)
        for i in range(3):tube('Marbling',[(-.2+i*.08,-.13,.229),(-.12+i*.08,.01,.257),(-.02+i*.08,.14,.23)],.012,fat)
    else:
        for i in range(4):
            x=(i-1.5)*.17;y=(i%2-.5)*.07
            box('Pork slice',(x,y,.08),(.20,.42,.115),{'chopped':cut,'cooked':cooked,'burnt':burnt}[state],.045,rot=(0,0,-.1))
            if state=='cooked':
                for j in [-1,1]:box('Grill mark',(x+j*.048,y,.14),(.02,.3,.006),caramel,.005,rot=(0,0,-.1))
            elif state=='chopped':box('Fat stripe',(x,y-.1,.141),(.15,.028,.006),fat,.009)
def lettuce(chopped=False):
    if chopped:
        for i in range(7):
            a=i*2.4;x=math.sin(a)*.22;y=math.cos(a)*.18
            o=ell('Prepared lettuce',(x,y,.05+(i%2)*.035),(.13,.085,.032),leaflight if i%2 else leaf,12,6);o.rotation_euler.z=a
            tube('Leaf vein',[(x-.07,y,.09),(x,y,.095),(x+.07,y,.09)],.008,stem)
    else:
        for i in range(9):
            a=i*2.4;r=.13 if i<6 else .06
            x,y=math.sin(a)*r,math.cos(a)*r;z=.11+(i//3)*.07
            o=ell('Lettuce cupped leaf',(x,y,z),(.2,.14,.1),leaflight if i%3 else leaf,12,6);o.rotation_euler=(.2*math.cos(a),.2*math.sin(a),a)
            tube('Crisp leaf vein',[(x-.12*math.sin(a),y-.12*math.cos(a),z+.055),(x,y,z+.102),(x+.1*math.sin(a),y+.1*math.cos(a),z+.06)],.008,stem)
def sauce():
    cyl('Squeeze bottle',(0,0,.24),.17,.43,red,r2=.15)
    ell('Rounded shoulder',(0,0,.44),(.15,.15,.09),red)
    cyl('Cream label',(0,0,.23),.174,.17,label)
    cyl('Gold cap',(0,0,.53),.095,.09,gold)
    cyl('Squeeze nozzle',(0,0,.64),.059,.16,gold,16,r2=.012)
    tube('Chili on label',[(-.047,-.177,.28),(.02,-.19,.24),(.048,-.175,.17)],.029,red)
    tube('Chili stem',[(-.047,-.18,.286),(-.038,-.18,.321)],.011,leaf)
def plate():
    cyl('Plate foot',(0,0,.027),.43,.045,white,32,r2=.53)
    cyl('Plate face',(0,0,.053),.5,.018,white,32)
    torus('Blue rim',(0,0,.068),.49,.012,blue)
def sandwich(veg,spicy):
    ell('Bread bottom',(0,0,.085),(.51,.24,.08),crust,24,8)
    ell('Bread crumb',(0,0,.14),(.49,.225,.032),crumb,24,6)
    for i in range(5):
        x=(i-2)*.165
        box('Roast pork filling',(x,-.018,.205),(.185,.42,.10),cooked,.035,rot=(0,0,.12))
        for k in [-1,1]:box('Pork sear stripe',(x+k*.045,-.015,.26),(.018,.32,.007),caramel,.004)
    if veg:
        for i in range(6):
            x=(i-2.5)*.145;o=ell('Ruffled lettuce edge',(x,-.005,.27),(.13,.285,.037),leaflight if i%2 else leaf,12,6);o.rotation_euler.z=(i%2-.5)*.3
            ell('Cucumber pale center',(x,-.08,.306),(.078,.12,.009),stem,12,4)
    loaf(.18 if not veg else .23,True)
    if spicy:
        points=[((i-5)*.082,-.231-(i%2)*.035,.29+(i%2)*.015) for i in range(11)]
        tube('Visible chili zigzag',points,.023,red)

builders={'bread':loaf,'meat-raw':lambda:pork('raw'),'meat-chopped':lambda:pork('chopped'),'meat-cooked':lambda:pork('cooked'),'meat-burnt':lambda:pork('burnt'),'vegetable-raw':lettuce,'vegetable-chopped':lambda:lettuce(True),'sauce':sauce,'plate':plate}
for key,veg,spicy in [('classic',False,False),('herb',True,False),('spicy',False,True),('loaded',True,True)]:builders['dish-'+key]=lambda v=veg,s=spicy:sandwich(v,s)
models={};collections={}
for key,build in builders.items():
    col=bpy.data.collections.new(key);bpy.context.scene.collection.children.link(col)
    before=set(bpy.data.objects);build();objects=list(set(bpy.data.objects)-before)
    for o in objects:
        for c in list(o.users_collection):c.objects.unlink(o)
        col.objects.link(o)
    collections[key]=col
    bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();groups={}
    for obj in objects:
        evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh();mesh.calc_loop_triangles();matrix=obj.matrix_world;normal_matrix=matrix.to_3x3().inverted().transposed()
        for tri in mesh.loop_triangles:
            m=mesh.materials[tri.material_index];color=list(m.diffuse_color[:3]);bs=m.node_tree.nodes.get('Principled BSDF')
            group=groups.setdefault(m.name,{'color':color,'roughness':bs.inputs['Roughness'].default_value,'metalness':bs.inputs['Metallic'].default_value,'positions':[],'normals':[]})
            for li in tri.loops:
                vi=mesh.loops[li].vertex_index;p=matrix@mesh.vertices[vi].co;n=(normal_matrix@mesh.corner_normals[li].vector).normalized()
                group['positions'].extend(round(v,5) for v in (p.x,p.z,-p.y));group['normals'].extend(round(v,4) for v in (n.x,n.z,-n.y))
        evaluated.to_mesh_clear()
    models[key]=list(groups.values())
with open(os.path.join(OUT,'kitchen-meshes.json'),'w',encoding='utf-8') as f:json.dump(models,f,separators=(',',':'))
with gzip.open(os.path.join(OUT,'kitchen-meshes.json.gz'),'wb',compresslevel=9) as f:f.write(json.dumps(models,separators=(',',':')).encode())

# A consistent studio light and camera make HUD pictures match the physical props.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=192;scene.render.resolution_y=160;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.world.color=(.32,.32,.32);scene.view_settings.view_transform='AgX'
def area(name,loc,power,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.15))-o.location).to_track_quat('-Z','Y').to_euler()
area('Large warm key',(-3,-4,6),420,4);area('Cool fill',(3,1,3),230,3)
data=bpy.data.cameras.new('Portrait camera');camera=bpy.data.objects.new('Portrait camera',data);scene.collection.objects.link(camera)
camera.location=(1.5,-2.4,2.6);camera.rotation_euler=(Vector((0,0,.22))-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=1.45;scene.camera=camera
for key in ['bread','meat-raw','meat-cooked','vegetable-raw','vegetable-chopped','sauce','dish-classic','dish-herb','dish-spicy','dish-loaded']:
    data.ortho_scale=1.45 if key.startswith('dish-') else 1.16 if key=='bread' else .95
    for name,col in collections.items():col.hide_render=name!=key and not(name=='plate' and key.startswith('dish-'))
    if key.startswith('dish-'):
        for obj in collections[key].objects:obj.location.z+=.075
    scene.render.filepath=os.path.join(OUT,key+'.png');bpy.ops.render.render(write_still=True)
    if key.startswith('dish-'):
        for obj in collections[key].objects:obj.location.z-=.075
for name,col in collections.items():col.hide_render=name not in ['dish-loaded','plate'];col.hide_viewport=col.hide_render
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.shading.color_type='MATERIAL'
            area.spaces.active.region_3d.view_distance=3
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'kitchen.blend'))
print('COOKINGDUAL_ASSETS_READY',len(models),os.path.join(OUT,'kitchen-meshes.json'))
