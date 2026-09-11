import bpy, os, json, math
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'artifacts','rig-inspection');os.makedirs(OUT,exist_ok=True)
report={}
for name in ['ragged-dog','dog-tick']:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'assets',name+'.glb'))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    co=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
    lo=Vector(tuple(min(v[i] for v in co) for i in range(3)));hi=Vector(tuple(max(v[i] for v in co) for i in range(3)));center=(lo+hi)*.5
    report[name]={'min':list(lo),'max':list(hi),'vertices':len(co),'faces':sum(len(o.data.polygons) for o in meshes)}
    for o in meshes:
        o.color=(.67,.71,.64,1)
        for p in o.data.polygons:p.use_smooth=True
    scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.studio_light='paint.sl';scene.display.shading.color_type='OBJECT';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
    scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100
    for label,axis in [('xp',(1,0,0)),('xn',(-1,0,0)),('yp',(0,1,0)),('yn',(0,-1,0)),('zp',(0,0,1)),('zn',(0,0,-1))]:
        bpy.ops.object.camera_add(location=center+Vector(axis)*5)
        camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=2.25;scene.camera=camera
        scene.render.filepath=os.path.join(OUT,name+'-'+label+'.png');bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(camera,do_unlink=True)
with open(os.path.join(OUT,'source-report.json'),'w') as f:json.dump(report,f,indent=2)
