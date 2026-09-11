"""Paint, skin and animate the user's original character GLBs in Blender.

Original assets are read only. Output is a real glTF skin with six animation clips,
plus editable Blender armature files. All coordinates below describe the imported
source meshes (Blender Z up / -Y forward) before normalization to 1.9 metres.
"""
import bpy, math, os, json
from mathutils import Vector, Quaternion

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS=os.path.join(ROOT,'assets')
OUT=os.path.join(ROOT,'artifacts','rig-inspection')
os.makedirs(OUT,exist_ok=True)
FPS=24

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def rgb(code):
    v=[int(code[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in v)
COLORS={k:rgb(v) for k,v in dict(gold='E4B554',ear='CFA048',muzzle='A89A73',cloth='858578',patch='A99B77',thread='C5B48B',black='171B17',lip='D2CAA5',green='879A72',greenShade='758967',crease='454C3C').items()}

def paint_point(name,p):
    x,y,z=p;ax=abs(x);gloss=False
    if name=='ragged-dog':
        c=COLORS['gold']
        # Garment boundary follows the source sculpt's torn hem and neckline.
        angle=math.atan2(x,-y)
        upper=.17+.062*abs(math.sin(angle*7.0+.15))
        lower=-.365+.046*math.cos(angle*10+.8)
        if ax<.455 and lower<z<upper:c=COLORS['cloth']
        if .41<ax<.638 and -.01<z<.25 and abs(y)<.25:c=COLORS['cloth']
        # Side floppy ears, muzzle, button eyes and triangular nose.
        if ax>.298 and .365<z<.671 and y<.09:c=COLORS['ear']
        if (x/.122)**2+((z-.315)/.088)**2<1 and y<-.18:c=COLORS['muzzle']
        if ((ax-.132)/.042)**2+((z-.481)/.056)**2<1 and y<-.17:c=COLORS['black'];gloss=True
        if (x/.056)**2+((z-.388)/.034)**2<1 and y<-.22:c=COLORS['black'];gloss=True
        # Canvas patch faces on the front chest and lower left side.
        if y<-.24 and -.116<z<.071 and .092<x<.264:
            edge=min(x-.092,.264-x,z+.116,.071-z)
            c=COLORS['thread'] if edge<.012 else COLORS['patch']
        if y<-.17 and -.350<z<-.187 and -.417<x<-.276:c=COLORS['patch']
        if y>.3 and z<-.2:c=COLORS['ear']
    else:
        c=COLORS['green']
        if z>.533 and ax>.287:c=COLORS['black'];gloss=True
        # Preserve the sculpted sleepy lids; only the recessed eye opening is black.
        if ((ax-.104)/.060)**2+((z-.277)/.019)**2<1 and y<-.26:c=COLORS['black'];gloss=True
        if (x/.042)**2+((z-.211)/.073)**2<1 and y<-.27:c=COLORS['black'];gloss=True
        if ((ax-.038)/.039)**2+((z-.168)/.031)**2<1 and y<-.29:c=COLORS['black'];gloss=True
        if (x/.119)**2+((z-.048)/.045)**2<1 and y<-.31:c=COLORS['lip']
        if abs(z-(.047-.02*(x/.11)**2))<.007 and ax<.10 and y<-.35:c=COLORS['crease']
    # Restrained cloth/plush tonal variation retains the original sculpt detail.
    grain=1+.015*math.sin(x*151+z*97)*math.sin(y*123-z*59)
    return tuple(min(1,v*grain) for v in c)+(1,),gloss

def create_material(name,rough):
    m=bpy.data.materials.new(name);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough
    attr=m.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='CharacterColor'
    m.node_tree.links.new(attr.outputs['Color'],bs.inputs['Base Color'])
    return m

def reset():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for a in list(bpy.data.actions):bpy.data.actions.remove(a)

def import_and_paint(name,target):
    bpy.ops.import_scene.gltf(filepath=os.path.join(ASSETS,name+'.glb'))
    obj=next(o for o in bpy.context.scene.objects if o.type=='MESH')
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.name=name+' skinned sculpt'
    mesh=obj.data;source_faces=len(mesh.polygons)
    colors=mesh.color_attributes.new(name='CharacterColor',type='FLOAT_COLOR',domain='POINT')
    glossy=[]
    for v in mesh.vertices:
        c,g=paint_point(name,v.co);colors.data[v.index].color=c;glossy.append(g)
    obj.data.materials.append(create_material('Painted plush and canvas',.78))
    obj.data.materials.append(create_material('Eyes and nose',.43))
    for p in mesh.polygons:
        p.use_smooth=True;p.material_index=1 if sum(glossy[i] for i in p.vertices)>1 else 0
    mod=obj.modifiers.new('Silhouette preserving mobile mesh','DECIMATE');mod.ratio=target/source_faces
    mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
    lo=min(v.co.z for v in obj.data.vertices);hi=max(v.co.z for v in obj.data.vertices);scale=1.9/(hi-lo)
    source_positions=[v.co.copy() for v in obj.data.vertices]
    for v in obj.data.vertices:v.co=Vector((v.co.x*scale,v.co.y*scale,(v.co.z-lo)*scale))
    for p in obj.data.polygons:p.use_smooth=True
    return obj,source_positions,lo,scale,source_faces

def make_rig(name,obj,lo,scale):
    def norm(p):return Vector((p[0]*scale,p[1]*scale,(p[2]-lo)*scale))
    dog=name=='ragged-dog'
    shoulder=.405 if dog else .58;armz=.105 if dog else -.012
    elbow=.675 if dog else .745;wrist=.842 if dog else .86
    hipx=.205 if dog else .239;hipz=-.552 if dog else -.476;anklez=-.717 if dog else -.596
    specs=[('Root',(0,0,lo),(0,0,lo+.1),None),('Hips',(0,0,-.39),(0,0,-.19),'Root'),('Spine',(0,0,-.19),(0,0,.17),'Hips'),('Head',(0,0,.17),(0,0,.53),'Spine')]
    for sign,side in [(1,'L'),(-1,'R')]:
        specs.extend([
            ('UpperArm.'+side,(sign*shoulder,0,armz),(sign*elbow,0,armz),'Spine'),
            ('Forearm.'+side,(sign*elbow,0,armz),(sign*wrist,0,armz),'UpperArm.'+side),
            ('Hand.'+side,(sign*wrist,0,armz),(sign*.933,0,armz),'Forearm.'+side),
            ('Thigh.'+side,(sign*hipx,0,hipz),(sign*hipx,0,(hipz+anklez)/2),'Hips'),
            ('Shin.'+side,(sign*hipx,0,(hipz+anklez)/2),(sign*hipx,0,anklez),'Thigh.'+side),
            ('Foot.'+side,(sign*hipx,0,anklez),(sign*hipx,-.11,anklez),'Shin.'+side),
        ])
    if dog:specs.append(('Tail',(0,.265,-.378),(0,.485,-.40),'Hips'))
    data=bpy.data.armatures.new('Character skeleton');rig=bpy.data.objects.new('CharacterRig',data);bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
    for bn,head,tail,parent in specs:
        bone=data.edit_bones.new(bn);bone.head=norm(head);bone.tail=norm(tail)
        if parent:bone.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True;data.display_type='OCTAHEDRAL'
    obj.parent=rig
    mod=obj.modifiers.new('Character skin','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=False
    obj['source_file']=name+'.glb';obj['preserved_original']=True
    rig['forward']='glTF +Z / Blender -Y';rig['height']=1.9
    rig['animation_notes']='Idle, Walk, Carry, CarryWalk, Work loop. Throw is a single one-shot release.'
    return rig

def skin(name,obj,rig,positions):
    groups={b.name:obj.vertex_groups.new(name=b.name) for b in rig.data.bones}
    dog=name=='ragged-dog';shoulder=.405 if dog else .58;armz=.105 if dog else -.012;hipz=-.552 if dog else -.476;anklez=-.717 if dog else -.596;hipx=.205 if dog else .239
    for v,p in zip(obj.data.vertices,positions):
        x,y,z=p;ax=abs(x);side='L' if x>0 else 'R'
        weights={}
        head=smooth(.19,.39,z);spine=smooth(-.40,-.12,z)*(1-head)
        weights['Head']=head;weights['Spine']=spine;weights['Hips']=1-head-spine
        arm=smooth(shoulder-(.05 if dog else .015),shoulder+.07,ax)*(1-smooth(.10,.23,abs(z-armz)))
        if arm>0:
            for k in weights:weights[k]*=1-arm
            fore=smooth(.624,.715,ax) if dog else smooth(.71,.78,ax)
            hand=smooth(.803,.869,ax) if dog else smooth(.835,.89,ax)
            weights['UpperArm.'+side]=arm*(1-fore)
            weights['Forearm.'+side]=arm*fore*(1-hand)
            weights['Hand.'+side]=arm*hand
        # The underside of these round sculpts lies below the hip joints too.
        # Limit leg weights to the foot attachment columns, never the whole belly.
        foot_column=(1-smooth(.075,.155,abs(ax-hipx)))*(1-smooth(.085,.20,abs(y+.015)))
        leg=(1-smooth(hipz-.04,hipz+.055,z))*foot_column
        if leg>0:
            for k in weights:weights[k]*=1-leg
            shin=1-smooth(anklez+.015,hipz-.015,z);foot=1-smooth(anklez-.015,anklez+.025,z)
            weights['Thigh.'+side]=leg*(1-shin)
            weights['Shin.'+side]=leg*shin*(1-foot)
            weights['Foot.'+side]=leg*shin*foot
        if dog:
            tail=smooth(.29,.40,y)*(1-smooth(-.25,-.12,z))
            if tail:
                for k in weights:weights[k]*=1-tail
                weights['Tail']=tail
        top=sorted([(k,w) for k,w in weights.items() if w>.0001],key=lambda kv:kv[1],reverse=True)[:4]
        total=sum(w for k,w in top)
        for k,w in top:groups[k].add([v.index],w/total,'REPLACE')

def animate(name,rig,obj):
    rig.animation_data_create();scene=bpy.context.scene;scene.render.fps=FPS
    actions={};dog=name=='ragged-dog'
    base={b.name:b.matrix_local.to_quaternion() for b in rig.data.bones}
    def direction_pose(bn,vec,world_rotations):
        pb=rig.pose.bones[bn];rest_dir=pb.bone.tail_local-pb.bone.head_local
        desired=rest_dir.rotation_difference(Vector(vec).normalized())@base[bn]
        parent=pb.parent
        reference=(world_rotations[parent.name]@base[parent.name].inverted()@base[bn]) if parent else base[bn]
        pb.rotation_quaternion=reference.inverted()@desired;world_rotations[bn]=desired
    def local_pose(bn,rot,world_rotations):
        pb=rig.pose.bones[bn];pb.rotation_quaternion=rot
        parent=pb.parent;world_rotations[bn]=(world_rotations[parent.name]@base[parent.name].inverted()@base[bn]@rot) if parent else base[bn]@rot
    for clip,frames in [('Idle',48),('Walk',24),('Carry',48),('CarryWalk',24),('Work',24),('Throw',18)]:
        action=bpy.data.actions.new(clip);rig.animation_data.action=action
        for frame in range(frames+1):
            scene.frame_set(frame+1);phase=frame/frames*math.tau;walking=clip in ['Walk','CarryWalk'];carrying=clip in ['Carry','CarryWalk','Work','Throw']
            stride=math.sin(phase);world={}
            for pb in rig.pose.bones:pb.rotation_mode='QUATERNION';pb.location=(0,0,0);pb.rotation_quaternion=(1,0,0,0);pb.scale=(1,1,1)
            local_pose('Root',Quaternion((0,0,1),0),world)
            bob=(.025*(1-math.cos(phase*2)) if walking else .008*(1-math.cos(phase)))
            rig.pose.bones['Hips'].location=base['Hips'].inverted()@Vector((0,0,bob))
            local_pose('Hips',Quaternion((0,0,1),.035*stride if walking else .01*stride),world)
            local_pose('Spine',Quaternion((1,0,0),.018*math.sin(phase*2) if walking else .01*stride),world)
            local_pose('Head',Quaternion((0,1,0),.025*stride),world)
            for sign,side in [(1,'L'),(-1,'R')]:
                if carrying:
                    # Forearms approach the item from either side, palms in front.
                    arm=(sign*-.25,-.94,-.22) if dog else (sign*-.78,-.60,-.22)
                    fore=(sign*-.48,-.86,.16) if dog else (sign*-.82,-.56,.16)
                    hand=(sign*-.12,-.99,.07) if dog else (sign*-.50,-.85,.07)
                    # A short forward shoulder slide lets paws clear the large
                    # belly while preserving the source arm and hand shapes.
                    slide=.14 if dog else .34
                    rig.pose.bones['UpperArm.'+side].location=base['UpperArm.'+side].inverted()@Vector((0,-slide,0))
                    if clip=='Work':fore=(sign*-.40,-.90,.16+.20*math.sin(phase*2));hand=(sign*-.12,-.96,.20*math.sin(phase*2))
                    if clip=='Throw':
                        t=frame/frames;wind=math.sin(min(1,t/.52)*math.pi*.5);release=smooth(.38,.67,t)
                        arm=(sign*-.13,-.40-.45*release,-.85+.84*release)
                        fore=(sign*-.27,-.72,-.10+.7*wind-.45*release);hand=(sign*-.04,-.99,.1)
                else:
                    swing=(.30*stride*sign if walking else .025*stride)
                    arm=(sign*.19,swing-.04,-.98);fore=(sign*.10,swing-.10,-.985);hand=(sign*.05,swing-.12,-.99)
                direction_pose('UpperArm.'+side,arm,world);direction_pose('Forearm.'+side,fore,world);direction_pose('Hand.'+side,hand,world)
                step=stride*sign if walking else 0
                direction_pose('Thigh.'+side,(0,-step*.63,-1),world)
                direction_pose('Shin.'+side,(0,-step*.35,-1),world)
                direction_pose('Foot.'+side,(0,-1,max(0,step)*.18),world)
            if dog:local_pose('Tail',Quaternion((0,1,0),.18*math.sin(phase*2)),world)
            # Keep the supporting foot on the floor throughout the stride. The
            # squat sculpts need less pelvis bob than a human skeleton would.
            bpy.context.view_layer.update()
            evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
            posed=evaluated.to_mesh()
            floor=min(v.co.z for v in posed.vertices)
            evaluated.to_mesh_clear()
            rig.pose.bones['Root'].location=base['Root'].inverted()@Vector((0,0,-floor))
            for pb in rig.pose.bones:
                pb.keyframe_insert(data_path='rotation_quaternion',frame=frame+1,group=pb.name)
                if pb.name in ['Root','Hips'] or pb.name.startswith('UpperArm.'):pb.keyframe_insert(data_path='location',frame=frame+1,group=pb.name)
        actions[clip]=action
        rig.animation_data.action=None
        track=rig.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,1,action);strip.action_frame_start=1;strip.action_frame_end=frames+1
        track.mute=True
    scene.frame_start=1;scene.frame_end=49
    return actions

def setup_studio():
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
    scene.cycles.use_denoising=True;scene.render.resolution_x=800;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.world.color=(.45,.45,.45);scene.view_settings.view_transform='AgX'
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.018));floor=bpy.context.object;floor.name='Preview studio floor'
    m=bpy.data.materials.new('Warm studio floor');m.diffuse_color=(.61,.66,.62,1);floor.data.materials.append(m)
    for label,loc,power,size in [('Key',(-3,-4,6),450,4),('Fill',(4,-2,3),250,3),('Rim',(1,3,5),500,3)]:
        bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=label;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(2.6,-5.4,2.9));camera=bpy.context.object;camera.name='Character preview';camera.rotation_euler=(Vector((0,-.02,.92))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=2.45;scene.camera=camera
    return camera

def export_and_validate(name,obj,rig,actions,source_faces):
    scene=bpy.context.scene
    rig.animation_data.action=None
    for track in rig.animation_data.nla_tracks:track.mute=False
    for pb in rig.pose.bones:pb.rotation_quaternion=(1,0,0,0);pb.location=(0,0,0)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    filepath=os.path.join(ASSETS,name+'-rigged.glb')
    bpy.ops.export_scene.gltf(filepath=filepath,export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_skins=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_anim_slide_to_zero=True,export_force_sampling=True,export_frame_step=1,export_vertex_color='ACTIVE',export_all_vertex_colors=False,export_extras=True,export_optimize_animation_size=True)
    for track in rig.animation_data.nla_tracks:track.mute=True
    rig.animation_data.action=actions['Idle'];scene.frame_set(1)
    camera=setup_studio()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ASSETS,name+'-rigged.blend'),compress=True)
    poses=[('idle','Idle',1),('walk','Walk',7),('carry','Carry',1),('carry-walk','CarryWalk',7),('throw','Throw',12)]
    measurements={}
    for label,clip,frame in poses:
        rig.animation_data.action=actions[clip];scene.frame_set(frame);bpy.context.view_layer.update()
        evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
        pts=[evaluated.matrix_world@v.co for v in mesh.vertices]
        measurements[label]={'min':[round(min(p[i] for p in pts),4) for i in range(3)],'max':[round(max(p[i] for p in pts),4) for i in range(3)]}
        evaluated.to_mesh_clear()
        scene.render.filepath=os.path.join(OUT,name+'-'+label+'.png');bpy.ops.render.render(write_still=True)
    rig.animation_data.action=actions['Idle'];scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ASSETS,name+'-rigged.blend'),compress=True)
    return {'original_triangles':source_faces,'rigged_triangles':len(obj.data.polygons),'vertices':len(obj.data.vertices),'bones':len(rig.data.bones),'clips':list(actions),'file_bytes':os.path.getsize(filepath),'source_textures':0,'color':'painted COLOR_0, matte plush/canvas and glossy eyes/nose','height':1.9,'forward':'+Z','poses':measurements}

reports={}
for name,target in [('ragged-dog',54000),('dog-tick',32000)]:
    reset();obj,positions,lo,scale,source_faces=import_and_paint(name,target)
    rig=make_rig(name,obj,lo,scale);skin(name,obj,rig,positions)
    actions=animate(name,rig,obj);reports[name]=export_and_validate(name,obj,rig,actions,source_faces)
with open(os.path.join(OUT,'rig-report.json'),'w') as f:json.dump(reports,f,indent=2)
print('RIG_REPORT',json.dumps(reports))
