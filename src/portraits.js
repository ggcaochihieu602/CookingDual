import * as THREE from 'three';
import { clone } from '../vendor/SkeletonUtils.js';

export function characterPortrait(view,character){
  view.portraitCache??=new Map();if(view.portraitCache.has(character))return view.portraitCache.get(character);
  const template=view.assets.get(character);if(!template)return '';
  const root=clone(template),scene=new THREE.Scene();scene.add(root);scene.environment=view.scene.environment;scene.environmentIntensity=.35;
  const mixer=new THREE.AnimationMixer(root),clip=template.animations?.find(a=>a.name==='Idle');if(clip)mixer.clipAction(clip).play();mixer.update(.1);root.updateMatrixWorld(true);
  root.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=false;mesh.receiveShadow=false;}});
  const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const width=420,height=480,aspect=width/height,span=Math.max(size.y*1.14,size.x/aspect*1.15);
  const camera=new THREE.OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,30);camera.position.copy(center).add(new THREE.Vector3(.15,.2,6));camera.lookAt(center);
  scene.add(new THREE.HemisphereLight('#f4faff','#7b9077',1.5));const key=new THREE.DirectionalLight('#fff3d3',2.5);key.position.set(-3,5,4);scene.add(key);const fill=new THREE.DirectionalLight('#d4ecff',.8);fill.position.set(3,2,4);scene.add(fill);
  const renderer=view.renderer,target=new THREE.WebGLRenderTarget(width,height),oldTarget=renderer.getRenderTarget(),color=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha(),shadow=renderer.shadowMap.enabled;
  // PNG pixels are displayed as sRGB by the browser, unlike a linear scene buffer.
  target.texture.colorSpace=THREE.SRGBColorSpace;
  try{
    renderer.shadowMap.enabled=false;renderer.setRenderTarget(target);renderer.setClearColor(0x000000,0);renderer.clear();renderer.render(scene,camera);
    const pixels=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),data=ctx.createImageData(width,height);
    for(let row=0;row<height;row++)data.data.set(pixels.subarray((height-1-row)*width*4,(height-row)*width*4),row*width*4);
    ctx.putImageData(data,0,0);const url=canvas.toDataURL('image/png');view.portraitCache.set(character,url);return url;
  }finally{renderer.setRenderTarget(oldTarget);renderer.setClearColor(color,alpha);renderer.shadowMap.enabled=shadow;target.dispose();mixer.stopAllAction();mixer.uncacheRoot(root);root.traverse(mesh=>{if(mesh.isSkinnedMesh)mesh.skeleton.dispose();});}
}
