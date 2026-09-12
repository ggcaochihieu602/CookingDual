import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { itemKey } from './game.js';
import { carryOrigin, throwArc, throwPoint } from './throwing.js';

const Y=new THREE.Vector3(0,1,0);
const pointAt=(start,end,arc,t)=>{const p=throwPoint(start,end,arc,t);return new THREE.Vector3(p.x,p.y,p.z);};

export class KitchenDynamics {
  constructor(view){
    this.v=view;this.ground=new Map();this.flying=new Map();this.fires=new Map();this.customers=new Map();this.customerAssets=new Map();this.aim=null;
    this.white=new THREE.MeshBasicMaterial({color:'#fffbe8',depthTest:false});
    this.aimLine=new THREE.InstancedMesh(new THREE.CylinderGeometry(.024,.024,1,5),this.white,28);this.aimLine.frustumCulled=false;this.aimLine.renderOrder=30;this.aimLine.visible=false;view.scene.add(this.aimLine);
    this.marker=new THREE.Mesh(new THREE.RingGeometry(.30,.38,32),new THREE.MeshBasicMaterial({color:'#fff3b1',side:THREE.DoubleSide,depthTest:false}));
    this.marker.rotation.x=-Math.PI/2;this.marker.renderOrder=31;this.marker.visible=false;view.scene.add(this.marker);
    this.groundRing=new THREE.Mesh(new THREE.RingGeometry(.43,.49,32),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,depthWrite:false}));this.groundRing.rotation.x=-Math.PI/2;this.groundRing.visible=false;view.scene.add(this.groundRing);
    const halo=new THREE.Mesh(new THREE.RingGeometry(.38,.57,32),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));halo.position.z=-.003;this.groundRing.add(halo);
    this.spray=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:'#eefaff',transparent:true,opacity:.68,depthWrite:false}),32);this.spray.frustumCulled=false;this.spray.visible=false;view.scene.add(this.spray);
    this.object=new THREE.Object3D();this.hadOrders=false;
  }
  setAim(point){this.aim=point;}
  updateAim(){
    const {game}=this.v,end=this.aim&&game.phase==='playing'&&game.player.hand?game.throwTarget(this.aim):null;
    this.aimLine.visible=this.marker.visible=Boolean(end);if(!end)return;
    const p=game.player,held=this.v.chefs.get(p.id)?.heldSocket,start=held?{x:held.position.x,y:held.position.y,z:held.position.z}:carryOrigin(p),arc=throwArc(start,end);
    this.aimStart=start;this.aimEnd=end;this.aimArc=arc;
    for(let i=0;i<28;i++){
      const a=pointAt(start,end,arc,i/28),b=pointAt(start,end,arc,(i+.82)/28),delta=b.clone().sub(a);
      this.object.position.copy(a.add(b).multiplyScalar(.5));this.object.quaternion.setFromUnitVectors(Y,delta.clone().normalize());this.object.scale.set(1,delta.length(),1);this.object.updateMatrix();this.aimLine.setMatrixAt(i,this.object.matrix);
    }
    this.aimLine.instanceMatrix.needsUpdate=true;this.marker.position.set(end.x,end.y+.025,end.z);
    const station=game.stations.find(s=>s.id===end.stationId);this.marker.material.color.set(station?.fire?'#ff8452':station?'#adff9e':'#fff3b1');
  }
  itemView(map,entity){
    const v=this.v,key=itemKey(entity.item);let view=map.get(entity.id);
    if(!view){view={root:v.group(v.scene),key:''};map.set(entity.id,view);}
    if(view.key!==key){view.root.clear();view.root.add(v.food(entity.item));view.key=key;v.shadowDirty=true;}
    return view;
  }
  syncGround(){
    const game=this.v.game,present=new Set();
    for(const entity of game.groundItems){present.add(entity.id);const view=this.itemView(this.ground,entity);view.root.position.set(entity.x,.21,entity.z);}
    for(const [id,view] of this.ground)if(!present.has(id)){view.root.removeFromParent();this.ground.delete(id);this.v.shadowDirty=true;}
    this.groundRing.visible=game.target?.type==='ground';if(this.groundRing.visible)this.groundRing.position.set(game.target.x,.193,game.target.z);
  }
  syncThrows(dt){
    const game=this.v.game,present=new Set();
    for(const entity of game.projectiles){
      present.add(entity.id);const view=this.itemView(this.flying,entity);
      // Smooth between authoritative 20 Hz snapshots without deciding the landing locally.
      if(view.snapshotElapsed!==entity.elapsed){view.snapshotElapsed=entity.elapsed;view.visualElapsed=entity.elapsed;}else if(game.phase==='playing')view.visualElapsed+=dt;
      const t=Math.min(1,view.visualElapsed/entity.duration);view.root.position.copy(pointAt(entity.start,entity.end,entity.arc,t));view.root.rotation.y=t*Math.PI*2;
    }
    for(const [id,view] of this.flying)if(!present.has(id)){view.root.removeFromParent();this.flying.delete(id);this.v.shadowDirty=true;}
  }
  updateFire(){
    const v=this.v,present=new Set();
    for(const s of v.game.stations){
      if(!s.fire)continue;present.add(s.id);let fire=this.fires.get(s.id);
      if(!fire){
        fire=v.group(v.scene,s.x,1.14,s.z);this.fires.set(s.id,fire);
        for(let i=0;i<5;i++){
          const flame=new THREE.Mesh(v.geo('sphere',1,7,5),new THREE.MeshBasicMaterial({color:i%2?'#ffdc62':'#ff7834'}));
          flame.position.set(Math.sin(i*2.4)*.36,0,Math.cos(i*2.4)*.30);fire.add(flame);
        }
      }
      fire.children.forEach((flame,i)=>{const flicker=.82+Math.sin(v.time*13+i*2)*.16;flame.scale.set(.17,s.fire*(.5+(i%3)*.13)*flicker,.17);flame.position.y=flame.scale.y*.67;});
    }
    for(const [id,fire] of this.fires)if(!present.has(id)){for(const mesh of fire.children)mesh.material.dispose();fire.removeFromParent();this.fires.delete(id);}
    let count=0;
    for(const p of v.game.players){
      if(!p.spraying||v.game.phase!=='playing')continue;
      for(let i=0;i<16;i++){
        const phase=(v.time*1.7+i/16)%1,d=.45+phase*2.8,spread=phase*.45;
        this.object.position.set(p.x+p.facingX*d+Math.sin(i*12)*spread,1.35+Math.cos(i*8)*spread*.6,p.z+p.facingZ*d+Math.cos(i*17)*spread);
        this.object.quaternion.identity();this.object.scale.setScalar(.045+phase*.11);this.object.updateMatrix();this.spray.setMatrixAt(count++,this.object.matrix);
      }
    }
    this.spray.count=count;this.spray.visible=count>0;if(count)this.spray.instanceMatrix.needsUpdate=true;
  }
  customerAsset(variant){
    if(this.customerAssets.has(variant))return this.customerAssets.get(variant);
    const v=this.v,g=new THREE.Group(),shirt=['#dd8957','#69a195','#cbb35b','#9492bc'][variant%4],skin=['#e8b17d','#b7815d','#d89765'][variant%3];
    v.sphere(g,.26,shirt,0,.79,0,1,1.4,.72);v.sphere(g,.20,skin,0,1.24,.015,1,1.2,.9);
    v.sphere(g,.21,'#57463c',0,1.36,-.025,1,.72,.87);
    for(const side of [-1,1]){
      v.box(g,.15,.42,.16,'#465b69',side*.13,.36,0,.025);v.box(g,.18,.11,.28,'#64534a',side*.13,.12,.06,.025);
      const arm=v.sphere(g,.09,shirt,side*.28,.83,0,1,2.2,1);arm.rotation.z=side*.15;v.sphere(g,.072,skin,side*.31,.64,.03);
      v.sphere(g,.018,'#343c36',side*.07,1.28,.176,1,1,.5);
    }
    v.sphere(g,.037,skin,0,1.21,.195,1,1,.75);
    const bag=v.box(g,.18,.24,.12,'#e9c795',.34,.47,.06,.025);bag.rotation.z=-.1;
    g.updateMatrixWorld(true);const parts=[];
    g.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const geo=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geo.applyMatrix4(mesh.matrixWorld);geo.deleteAttribute('uv');
      const colors=new Float32Array(geo.attributes.position.count*3),color=mesh.material.color;
      for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
      geo.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(geo);
    });
    const geometry=mergeGeometries(parts);for(const part of parts)part.dispose();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.83}));mesh.castShadow=true;mesh.receiveShadow=true;this.customerAssets.set(variant,mesh);return mesh;
  }
  updateCustomers(dt){
    const v=this.v,orders=v.game.orders,ids=new Set(orders.map(o=>o.id)),active=['playing','menu','countdown'].includes(v.game.phase);
    if(v.game.phase==='countdown'&&this.lastPhase!=='countdown'){
      for(const customer of this.customers.values()){customer.root.removeFromParent();customer.shadow.removeFromParent();}this.customers.clear();this.hadOrders=false;
    }
    orders.forEach((order,index)=>{
      let customer=this.customers.get(order.id);
      const target=new THREE.Vector3(7-index*1.35,.18,index===0?8.55:9.13);
      if(!customer){const root=v.group(v.scene);root.add(this.customerAsset(order.id%4).clone());root.position.copy(this.hadOrders?new THREE.Vector3(-12,.18,9.13):target);customer={root,shadow:v.contactShadow(v.scene,root.position.x,root.position.z,.95,.75),leaving:false};this.customers.set(order.id,customer);}
      customer.target=target;customer.index=index;customer.leaving=false;
    });
    for(const [id,customer] of this.customers){
      if(!ids.has(id)){customer.leaving=true;customer.target=new THREE.Vector3(13,.18,9.13);}
      const pos=customer.root.position,delta=customer.target.clone().sub(pos),moving=delta.length()>.05;
      if(active&&moving){const d=delta.length();pos.add(delta.normalize().multiplyScalar(Math.min(d,dt*3.1)));}
      let facing;
      if(moving)facing=Math.atan2(customer.target.x-pos.x,customer.target.z-pos.z);
      else if(customer.index===0)facing=Math.PI;
      else{const previous=this.customers.get(orders[customer.index-1]?.id);facing=previous?Math.atan2(previous.root.position.x-pos.x,previous.root.position.z-pos.z):Math.PI/2;}
      const rotation=customer.root.rotation;rotation.y+=Math.atan2(Math.sin(facing-rotation.y),Math.cos(facing-rotation.y))*Math.min(1,dt*12);
      customer.root.children[0].position.y=moving&&active&&!v.reduced?Math.abs(Math.sin(v.time*11+id))*.04:0;
      customer.shadow.position.set(pos.x,.183,pos.z);
      if(customer.leaving&&pos.x>12.8){customer.root.removeFromParent();customer.shadow.removeFromParent();this.customers.delete(id);}
    }
    this.hadOrders=true;this.lastPhase=v.game.phase;
  }
  update(dt){this.syncGround();this.syncThrows(dt);this.updateAim();this.updateFire();this.updateCustomers(dt);}
}
