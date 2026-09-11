import bpy, os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out={}
for name in ['ragged-dog','dog-tick']:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'assets',name+'.glb'))
 obj=next(o for o in bpy.context.scene.objects if o.type=='MESH');m=obj.data
 parent=list(range(len(m.vertices)))
 def find(a):
  while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
  return a
 for e in m.edges:
  a,b=map(find,e.vertices);parent[b]=a
 comps={}
 for i in range(len(parent)):comps.setdefault(find(i),[]).append(i)
 items=[]
 for ids in sorted(comps.values(),key=len,reverse=True)[:80]:
  pts=[obj.matrix_world@m.vertices[i].co for i in ids]
  items.append({'count':len(ids),'min':[round(min(v[j] for v in pts),4) for j in range(3)],'max':[round(max(v[j] for v in pts),4) for j in range(3)]})
 out[name]={'components':len(comps),'islands':items}
with open(os.path.join(ROOT,'artifacts','rig-inspection','topology.json'),'w') as f:json.dump(out,f,indent=2)
