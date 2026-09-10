import * as THREE from 'three';

// Blender is an authoring tool only. The web game uses these small static meshes.
export async function loadKitchenAssets(){
  try{
    const response=await fetch('/assets/kitchen-meshes.json');if(!response.ok)throw new Error(`Asset request ${response.status}`);
    const data=await response.json(),models=new Map(),materials=new Map();
    for(const [name,groups] of Object.entries(data)){
      const model=new THREE.Group();
      for(const part of groups){
        const key=JSON.stringify([part.color,part.roughness,part.metalness]);
        if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:new THREE.Color(...part.color),roughness:part.roughness,metalness:part.metalness}));
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(part.normals,3));geometry.computeBoundingSphere();
        const mesh=new THREE.Mesh(geometry,materials.get(key));mesh.castShadow=true;mesh.receiveShadow=true;model.add(mesh);
      }
      models.set(name,model);
    }
    try {
      const response=await fetch('/assets/characters-meshes.json');if(!response.ok)throw new Error(`Character request ${response.status}`);
      const characters=await response.json();
      const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.76});
      for(const [name,parts] of Object.entries(characters)){
        const model=new THREE.Group();model.name=name;
        for(const part of parts){
          const pivot=new THREE.Group();pivot.name=part.joint;pivot.position.fromArray(part.origin);
          const geometry=new THREE.BufferGeometry();
          for(const [attribute,values] of [['position',part.positions],['normal',part.normals],['color',part.colors]])geometry.setAttribute(attribute,new THREE.Float32BufferAttribute(values,3));
          geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;pivot.add(mesh);model.add(pivot);
        }
        models.set(name,model);
      }
    }catch(error){console.warn('Character assets unavailable:',error.message);}
    return models;
  }catch(error){console.warn('Using the built-in kitchen props:',error.message);return new Map();}
}
