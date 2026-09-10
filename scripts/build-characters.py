"""Original Blender characters based on the user's dog reference sheets.
Rigid limb meshes, vertex colours and shared materials keep mobile draw calls low.
blender --background --python scripts/build-characters.py
"""
import bpy, math, json, gzip, os, random
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(602)
materials={}
joint='body'
origins={}

def mat(name,hex,rough=.76):
    if name in materials:return materials[name]
    rgb=[int(hex[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Roughness'].default_value=rough
    materials[name]=m;return m

yellow=mat('Golden plush','EBC365');gold=mat('Ear honey','D9AB50');muzzle=mat('Soft taupe muzzle','A39772')
black=mat('Licorice nose','242722',.35);eye=mat('Glossy dark eyes','151917',.16);white=mat('Catchlights','FFF4DA',.25)
cloth=mat('Weathered grey linen','797D6C');clothEdge=mat('Ragged edge','666B5C');patch=mat('Olive canvas patches','97916A');thread=mat('Heavy stitching','C4B78C')
green=mat('Sage green plush','89976A');greenDark=mat('Sculpted folds','76845C');lip=mat('Cream lips','D5D0AE');crease=mat('Mouth crease','414737')

def finish(o,name,m,loc,scale=(1,1,1)):
    o.name=name;o.location=loc;o.scale=scale;o.data.materials.append(m);o['joint']=joint
    if o.type=='MESH':
        for p in o.data.polygons:p.use_smooth=True
    return o
def ell(name,loc,scale,m,segments=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1)
    return finish(bpy.context.object,name,m,loc,scale)
def tube(name,points,r,m):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=3;c.bevel_depth=r;c.bevel_resolution=1
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);o['joint']=joint;return o
def shirt():
    # Four irregular rings follow the torso; the hem and neckline are visibly torn.
    n=32;verts=[];faces=[]
    for ring,(z,rx,ry) in enumerate([(.37,.46,.33),(.61,.537,.383),(.93,.527,.38),(1.19,.443,.327)]):
        for i in range(n):
            a=i*math.tau/n
            zz=z+((.045 if i%2 else -.036) if ring in [0,3] else .012*math.sin(i*2.3))
            verts.append((math.cos(a)*rx,.015+math.sin(a)*ry,zz))
    for k in range(3):
        for i in range(n):j=(i+1)%n;faces.append((k*n+i,k*n+j,(k+1)*n+j,(k+1)*n+i))
    mesh=bpy.data.meshes.new('Hand cut ragged shirt');mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new('Ragged linen shirt',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,cloth,(0,0,0))
    sol=o.modifiers.new('Visible fabric hem','SOLIDIFY');sol.thickness=.012
    for i in range(0,n,3):
        a=i*math.tau/n
        tube('Frayed neckline',[(math.cos(a)*.432,.015+math.sin(a)*.314,1.19),(math.cos(a)*.444,.015+math.sin(a)*.322,1.15)],.009,clothEdge)
def patchwork(x,z,w,h):
    y=-.341
    points=[(x-w/2,y,z-h/2+.015),(x+w/2,y-.008,z-h/2),(x+w/2-.025,y-.012,z+h/2),(x-w/2+.01,y,z+h/2-.015)]
    mesh=bpy.data.meshes.new('Patch panel');mesh.from_pydata(points,[],[(0,1,2,3)]);mesh.update()
    o=bpy.data.objects.new('Mended canvas patch',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,patch,(0,0,0))
    tube('Dark patch seam',points+[points[0]],.009,clothEdge)
    for i in range(5):
        xx=x-w/2+i*w/4
        for zz in [z-h/2,z+h/2]:tube('Patch stitch',[(xx-.005,y-.018,zz-.025),(xx+.008,y-.023,zz+.026)],.008,thread)
    for i in range(1,4):
        zz=z-h/2+i*h/4
        for xx in [x-w/2,x+w/2]:tube('Side stitch',[(xx-.023,y-.025,zz-.006),(xx+.024,y-.025,zz+.008)],.008,thread)
def ragged_dog():
    global joint,origins
    joint='body';origins={'body':(0,0,0),'arm-left':(-.48,0,1.08),'arm-right':(.48,0,1.08),'leg-left':(-.24,0,.23),'leg-right':(.24,0,.23)}
    ell('Round golden body',(0,.025,.75),(.515,.357,.63),yellow,24,16)
    ell('Soft oval head',(0,0,1.35),(.5,.35,.60),yellow,28,18)
    for side in [-1,1]:
        o=ell('Floppy dog ear',(side*.477,-.018,1.40),(.15,.125,.36),gold);o.rotation_euler.y=side*-.17
        ell('Black button eye',(side*.174,-.327,1.51),(.067,.040,.086),eye)
        ell('Eye glint',(side*.174-.017,-.365,1.548),(.018,.008,.023),white,12,8)
        ell('Plush cheek',(side*.111,-.328,1.268),(.166,.074,.117),muzzle)
    ell('Rounded triangular nose',(0,-.413,1.322),(.105,.07,.072),black)
    ell('Nose shine',(-.025,-.467,1.35),(.036,.008,.012),muzzle,12,8)
    tube('Nose philtrum',[(0,-.407,1.30),(0,-.415,1.235)],.012,black)
    tube('Friendly smile',[(-.172,-.354,1.232),(-.106,-.402,1.195),(0,-.425,1.19),(.106,-.402,1.195),(.172,-.354,1.232)],.011,black)
    ell('Small wagging tail',(0,.365,.47),(.12,.15,.12),gold)
    shirt();patchwork(.18,.82,.265,.235);patchwork(-.26,.49,.18,.16)
    for i in range(4):
        x=-.2+i*.045;tube('Visible shirt repair',[(x,-.345,.78),(x+.02,-.35,.83)],.009,thread)
    for side,label in [(-1,'left'),(1,'right')]:
        joint='arm-'+label
        o=ell('Linen sleeve',(side*.475,0,.99),(.14,.16,.22),cloth);o.rotation_euler.y=side*-.24
        ell('Golden paw',(side*.535,-.025,.724),(.123,.137,.19),yellow)
        for i in [-1,0,1]:tube('Paw toe seam',[(side*.535+i*.034,-.143,.674),(side*.535+i*.033,-.147,.715)],.005,gold)
        joint='leg-'+label
        ell('Short ankle',(side*.235,.016,.185),(.134,.144,.148),yellow)
        ell('Round foot',(side*.235,-.08,.096),(.163,.205,.09),gold)
        for i in [-1,1]:tube('Little toe',[(side*.235+i*.05,-.256,.087),(side*.235+i*.05,-.235,.136)],.005,muzzle)
    joint='body'
def dog_tick():
    global joint,origins
    joint='body';origins={'body':(0,0,0),'arm-left':(-.57,.02,1.01),'arm-right':(.57,.02,1.01),'leg-left':(-.32,0,.22),'leg-right':(.32,0,.22)}
    ell('Sage oval body',(0,0,1.03),(.662,.404,.86),green,32,20)
    for side in [-1,1]:
        tube('Black curled feeler',[(side*.38,0,1.70),(side*.47,.015,1.86),(side*.58,.03,1.89),(side*.64,.045,1.82)],.052,black)
        ell('Heavy sleepy eye socket',(side*.166,-.379,1.392),(.131,.043,.078),greenDark)
        ell('Narrow black eye',(side*.167,-.413,1.39),(.085,.022,.024),eye)
        ell('Eye reflection',(side*.173-.016,-.434,1.398),(.022,.004,.006),white,12,6)
        tube('Heavy upper eyelid',[(side*.167-.093,-.411,1.412),(side*.167,-.436,1.431),(side*.167+.09,-.411,1.412)],.025,green)
        tube('Under eye fold',[(side*.167-.078,-.410,1.345),(side*.167,-.432,1.326),(side*.167+.078,-.410,1.345)],.014,greenDark)
    ell('Long dog nose',(0,-.421,1.216),(.073,.086,.131),black)
    for side in [-1,1]:ell('Nostril',(side*.067,-.448,1.161),(.054,.049,.053),black)
    ell('Muzzle pad',(0,-.371,.989),(.237,.075,.115),greenDark)
    tube('Cream upper lip',[(-.19,-.437,.984),(-.105,-.465,1.020),(0,-.477,1.006),(.105,-.465,1.020),(.19,-.437,.984)],.034,lip)
    tube('Grumpy mouth crease',[(-.185,-.458,.967),(-.075,-.481,.979),(0,-.487,.975),(.075,-.481,.979),(.185,-.458,.967)],.012,crease)
    tube('Cream lower lip',[(-.19,-.435,.955),(0,-.469,.931),(.19,-.435,.955)],.031,lip)
    for i in range(3):
        z=.67+i*.065;w=.08+i*.024;tube('Soft chin fold',[(-w,-.395,z),(0,-.42,z-.025),(w,-.395,z)],.013,greenDark)
    for x in [-.047,0,.047]:tube('Forehead wrinkle',[(x,-.343,1.59),(x+.006,-.36,1.55),(x,-.369,1.515)],.011,greenDark)
    for side,label in [(-1,'left'),(1,'right')]:
        joint='arm-'+label
        o=ell('Long green arm',(side*.60,.007,.82),(.088,.115,.30),green);o.rotation_euler.y=side*-.13
        ell('Round green hand',(side*.625,-.025,.57),(.079,.10,.105),greenDark)
        joint='leg-'+label
        ell('Short sage leg',(side*.32,0,.19),(.108,.14,.16),greenDark)
        ell('Soft green foot',(side*.32,-.038,.095),(.119,.156,.092),green)
    joint='body'

models={};collections={}
for key,builder in [('ragged-dog',ragged_dog),('dog-tick',dog_tick)]:
    before=set(bpy.data.objects);builder();objects=list(set(bpy.data.objects)-before)
    col=bpy.data.collections.new(key);bpy.context.scene.collection.children.link(col);collections[key]=col
    for o in objects:
        for c in list(o.users_collection):c.objects.unlink(o)
        col.objects.link(o)
    bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();groups={}
    for obj in sorted(objects,key=lambda o:o.name):
        evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh();mesh.calc_loop_triangles();matrix=obj.matrix_world;nm=matrix.to_3x3().inverted().transposed();j=obj.get('joint','body');origin=Vector(origins[j])
        group=groups.setdefault(j,{'joint':j,'origin':[origin.x,origin.z,-origin.y],'positions':[],'normals':[],'colors':[]})
        for tri in mesh.loop_triangles:
            m=mesh.materials[tri.material_index];colour=m.diffuse_color[:3]
            for li in tri.loops:
                p=matrix@mesh.vertices[mesh.loops[li].vertex_index].co-origin;n=(nm@mesh.corner_normals[li].vector).normalized()
                group['positions'].extend(round(v,5) for v in (p.x,p.z,-p.y));group['normals'].extend(round(v,4) for v in (n.x,n.z,-n.y));group['colors'].extend(round(v,4) for v in colour)
        evaluated.to_mesh_clear()
    models[key]=list(groups.values())
payload=json.dumps(models,separators=(',',':')).encode()
open(os.path.join(OUT,'characters-meshes.json'),'wb').write(payload)
with gzip.open(os.path.join(OUT,'characters-meshes.json.gz'),'wb',compresslevel=9) as f:f.write(payload)

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=640;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX'
scene.world.color=(.28,.28,.28)
for name,loc,power,size in [('Warm softbox',(-3,-4,5),480,4),('Cool fill',(3,-1,3),210,3),('Rim light',(0,3,4),380,3)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Character portrait');camera=bpy.data.objects.new('Character portrait',data);scene.collection.objects.link(camera)
camera.location=(2.0,-6,2.8);camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=2.55;scene.camera=camera
for key in models:
    for name,col in collections.items():col.hide_render=name!=key
    scene.render.filepath=os.path.join(OUT,key+'.png');bpy.ops.render.render(write_still=True)
for name,col in collections.items():col.hide_render=name!='ragged-dog';col.hide_viewport=col.hide_render
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'characters.blend'))
print('CHARACTERS_READY', {k:sum(len(g['positions'])//9 for g in v) for k,v in models.items()})
