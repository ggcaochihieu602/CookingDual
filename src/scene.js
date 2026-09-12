import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { RULES, itemKey, itemName, plateCount, isAssembly, recipeForItem, recipeForPlate, isPanFood, isChoppable } from './game.js';
import { buildKitchen, buildStation } from './environment.js';
import { createSurfaceLibrary, studioEnvironment } from './materials.js';
import { KitchenDynamics } from './dynamics.js';
import { CAMERA } from './movement.js';
import { RenderBudget } from './render-budget.js';
import { clone as cloneSkeleton } from '../vendor/SkeletonUtils.js';
import { CharacterAnimation } from './character-animation.js';
import { characterPortrait } from './portraits.js';

const C = { teal: '#699b87', tealDark: '#436f61', cream: '#fff3d7', tile: '#f0e5c8', tileAlt: '#dce2c8', wood: '#c49765', woodDark: '#906b47', coral: '#dc785c', metal: '#a5b7ab', dark: '#405958', yellow: '#e7b75f', green: '#80a56b' };
const iconSvg = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;

export class KitchenScene {
  constructor(container, game, assets=new Map()) {
    this.assets=assets;this.cameraOffset=new THREE.Vector3(CAMERA.x,CAMERA.y,CAMERA.z);
    this.mobile=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>1;
    this.budget=new RenderBudget(devicePixelRatio);this.targetFPS=this.budget.fps;this.pixelRatio=this.budget.ratio;
    this.shadowDirty=true;this.shadowAge=1;this.shadowUpdates=0;
    this.container = container; this.game = game; this.time = 0; this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.materials = new Map(); this.geometries = new Map(); this.stationViews = new Map(); this.smoke = []; this.lastHand = '';
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#46cbbc');
    this.camera = new THREE.OrthographicCamera(-9, 9, 7, -7, .1, 120);
    this.camera.position.copy(this.cameraOffset); this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.autoUpdate=false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.02;
    this.surfaces = createSurfaceLibrary();this.environmentTarget=studioEnvironment(this.renderer);
    this.scene.environment=this.environmentTarget.texture;this.scene.environmentIntensity=.42;
    this.renderer.domElement.setAttribute('aria-label', 'Bếp bánh mì 3D. Dùng WASD hoặc cần cảm ứng để di chuyển.');
    this.container.prepend(this.renderer.domElement);
    const ambient = new THREE.HemisphereLight('#edf8ff', '#497797', .95); this.scene.add(ambient);
    const sun = new THREE.DirectionalLight('#fff0d1', 2.65); sun.position.set(-10, 19, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 18, bottom: -16, near: .5, far: 65 });
    sun.shadow.bias = -.00025; sun.shadow.normalBias = .015; sun.shadow.radius = 3; this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#b6eaff', .65); fill.position.set(7, 8, -9); this.scene.add(fill);
    this.buildKitchen(); this.batchStaticMeshes(); this.chefs=new Map();
    this.dynamics=new KitchenDynamics(this);
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container); this.resize();
  }
  mat(color, props = {}) {
    const key = color + JSON.stringify(props);
    if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .78, ...props }));
    return this.materials.get(key);
  }
  geo(type, ...args) {
    const key = `${type}:${args.join(',')}`;
    if (!this.geometries.has(key)) {
      const constructors = { box: THREE.BoxGeometry, round: RoundedBoxGeometry, sphere: THREE.SphereGeometry, cylinder: THREE.CylinderGeometry, torus: THREE.TorusGeometry, shadowPlane: THREE.PlaneGeometry };
      this.geometries.set(key, new constructors[type](...args));
    }
    return this.geometries.get(key);
  }
  mesh(parent, geometry, color, x = 0, y = 0, z = 0, props = {}) {
    const m = new THREE.Mesh(geometry, this.mat(color, props)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  box(parent, w, h, d, color, x = 0, y = 0, z = 0, radius = .04) {
    const bevel=radius>.025;
    return this.mesh(parent, bevel ? this.geo('round', w, h, d, 1, Math.min(radius, w / 3, h / 3, d / 3)) : this.geo('box', w, h, d), color, x, y, z);
  }
  sphere(parent, r, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
    const m = this.mesh(parent, this.geo('sphere', r, 12, 8), color, x, y, z); m.scale.set(sx, sy, sz); return m;
  }
  cylinder(parent, rt, rb, h, color, x = 0, y = 0, z = 0, segments = 20) { return this.mesh(parent, this.geo('cylinder', rt, rb, h, segments), color, x, y, z); }
  group(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
  finish(mesh,kind,color) { return this.surfaces.finish(mesh,kind,color); }
  contactShadow(parent,x,z,width,depth,y=.182) {
    // A single horizontal plane avoids casting a second shadow of its own.
    const mesh=new THREE.Mesh(this.geo('shadowPlane',width,depth),this.surfaces.shadowMaterial);mesh.rotation.x=-Math.PI/2;
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  plaque(parent, text, w, h, x, y, z, background = C.tealDark, color = '#fff6db', fontSize = 90) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = Math.round(768 * h / w);
    const ctx = canvas.getContext('2d'); ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${fontSize}px "Trebuchet MS", "Segoe UI", sans-serif`; ctx.fillStyle = color;
    ctx.fillText(text, 384, canvas.height * .5, 715);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: .95 }));
    m.position.set(x, y, z); parent.add(m); return m;
  }
  plant(parent, x, z, size = 1, potColor = C.coral) {
    const g = this.group(parent, x, 0, z); g.scale.setScalar(size);
    this.finish(this.cylinder(g, .37, .25, .51, potColor, 0, .255, 0, 20),'ceramic');
    this.finish(this.cylinder(g, .39, .38, .085, potColor, 0, .50),'ceramic');
    this.cylinder(g, .335, .335, .025, '#4e4930', 0, .54);
    for (let i = 0; i < 11; i++) {
      const a=i*2.4, leaf=this.group(g,0,.54,0);leaf.rotation.y=a;leaf.rotation.z=i<7?.75: .25;
      const length=i<7?.76:.9;
      this.finish(this.sphere(leaf,.5,['#528c37','#82b94e','#a1c96a'][i%3],0,length*.43,0,.29,length,.10),'leaf');
      this.cylinder(leaf,.007,.013,length*.68,'#c4d780',0,length*.40,.049,5);
    }
    for(const a of [0,2,4])this.sphere(g,.035,'#a89b6c',Math.sin(a)*.23,.56,Math.cos(a)*.23,1.3,.4,1);
    return g;
  }
  buildKitchen() { buildKitchen(this); }
  buildStation(s) { buildStation(this, s); }
  food(item){
    this.foodTemplates??=new Map();const key=itemKey(item);
    if(!this.foodTemplates.has(key))this.foodTemplates.set(key,this.compactFood(this.buildFood(item)));
    return this.foodTemplates.get(key).clone();
  }
  compactFood(root){
    root.updateMatrixWorld(true);const parts=[];
    root.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);
      geometry.deleteAttribute('uv');
      if(!geometry.getAttribute('color')){
        const colors=new Float32Array(geometry.attributes.position.count*3),color=mesh.material.color;
        for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
        geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
      }
      parts.push(geometry);
    });
    if(!parts.length)return root;
    const geometry=mergeGeometries(parts,false);for(const part of parts)part.dispose();
    this.foodMaterial??=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.57});
    const mesh=new THREE.Mesh(geometry,this.foodMaterial);mesh.castShadow=true;mesh.receiveShadow=true;
    const group=new THREE.Group();group.add(mesh);return group;
  }
  buildFood(item) {
    const g = new THREE.Group();
    if(item.kind==='pan'){
      this.finish(this.cylinder(g,.47,.40,.12,'#425565',0,.08),'metal');
      this.cylinder(g,.423,.423,.018,'#263a45',0,.147);
      const rim=this.finish(this.mesh(g,this.geo('torus',.45,.018,6,24),'#afbfc2',0,.149),'metal');rim.rotation.x=Math.PI/2;
      this.box(g,.12,.075,.52,'#33434b',0,.11,.61,.027);
      this.finish(this.box(g,.11,.06,.17,'#c8b284',0,.11,.39,.02),'metal');
      if(item.food){const food=this.food(item.food);food.scale.setScalar(.89);food.position.y=.154;g.add(food);}return g;
    }
    if(item.kind==='extinguisher'){
      this.cylinder(g,.18,.18,.62,'#d74031',0,.39);
      this.sphere(g,.18,'#e34c34',0,.70,0,1,.60,1);
      this.cylinder(g,.105,.14,.08,'#33414b',0,.81);
      this.box(g,.28,.05,.095,'#374952',0,.88,0,.017);
      this.cylinder(g,.183,.183,.23,'#fff1ce',0,.4);
      this.box(g,.034,.13,.015,'#d74031',0,.42,.187,.005);this.box(g,.13,.035,.015,'#d74031',0,.42,.187,.005);
      const hose=new THREE.CatmullRomCurve3([new THREE.Vector3(.11,.80,0),new THREE.Vector3(.28,.75,0),new THREE.Vector3(.27,.27,.08)]);
      this.mesh(g,new THREE.TubeGeometry(hose,10,.03,5,false),'#273e45');
      this.box(g,.11,.18,.12,'#344b51',.27,.24,.08,.02);return g;
    }
    if(item.kind==='plate'&&item.dirty){
      if(plateCount(item)>1){for(let i=0;i<plateCount(item);i++){const plate=this.food({kind:'plate',dirty:true,parts:[]});plate.position.y=i*.085;g.add(plate);}return g;}
      g.add(this.food({kind:'plate',parts:[]}));
      for(let i=0;i<4;i++)this.sphere(g,.12,'#9b6439',Math.sin(i*2.7)*.22,.095,Math.cos(i*2.7)*.17,1.1,.07,.7);
      return g;
    }
    if(this.assets.size){
      if(isAssembly(item)){
        if(item.kind==='plate')g.add(this.assets.get('plate').clone());
        const recipe=recipeForItem(item);
        if(recipe){const meal=this.assets.get(`dish-${recipe.id}`).clone();meal.position.y=item.kind==='plate'?.075:0;g.add(meal);}
        else if(item.parts.some(part=>part.kind==='bread')){
          // A partly assembled sandwich keeps its bread at the same scale as a loose loaf.
          g.add(this.food({kind:'bread',state:'ready'}));
          item.parts.filter(part=>part.kind!=='bread').forEach((part,index)=>{const food=this.food(part);food.scale.setScalar(.74);food.position.set(index*.12,.18,.04);g.add(food);});
        }else item.parts.forEach((part,index)=>{const food=this.food(part);food.scale.setScalar(.72);food.position.set((index%2-.5)*.30,.08,Math.floor(index/2)*.28-.10);g.add(food);});
        return g;
      }
      const key=['bread','sauce'].includes(item.kind)?item.kind:`${item.kind}-${item.state}`;
      if(this.assets.has(key))return this.assets.get(key).clone();
    }
    if (isAssembly(item)) {
      if (item.kind === 'plate') {
      this.finish(this.cylinder(g, .45, .36, .055, '#edf0e5', 0, .035),'ceramic');
      this.finish(this.cylinder(g, .39, .39, .02, '#fff7e3', 0, .073),'ceramic');
      const rim = this.finish(this.mesh(g, this.geo('torus', .397, .017, 6, 32), '#5c9fb3', 0, .085),'ceramic'); rim.rotation.x = Math.PI / 2;
      }
      if (recipeForItem(item)) {
        const sub = this.group(g, 0, .1, 0); sub.rotation.y = -.5;
        this.finish(this.sphere(sub, .29, '#cf8b35', 0, .06, 0, 1.42, .26, .67),'bread');
        for(let i=0;i<4;i++) {
          const slice=this.box(sub,.18,.08,.29,i%2?'#965c2d':'#ae7339',(i-1.5)*.155,.13,.025,.035);slice.rotation.y=.12;
          for(const x of [-.045,.045])this.box(slice,.013,.005,.23,'#693e20',x,.043,0,.003);
        }
        if (item.parts.some(p => p.kind === 'vegetable')) for (let i = 0; i < 5; i++) {
          const leaf=this.finish(this.sphere(sub,.09,i%2?'#97c54b':'#478936',(i-2)*.12,.19,.06,1.2,.34,2.2),'leaf');leaf.rotation.z=(i%2-.5)*.25;
          const cucumber=this.cylinder(sub,.065,.065,.02,'#a8d266',(i-2)*.115,.21,-.03,14);cucumber.rotation.x=.14;
        }
        this.finish(this.sphere(sub, .29, '#df9d3f', 0, .27, -.04, 1.42, .40, .66),'bread');
        for (let i = 0; i < 3; i++) { const slash = this.box(sub, .035, .012, .16, '#ffdf97', (i - 1) * .17, .388, -.035, .01); slash.rotation.y = -.4; }
        for(let i=0;i<9;i++)this.sphere(sub,.012,'#ffe0a1',Math.sin(i*8)*.27,.365,Math.cos(i*4)*.08,1,.3,1.8);
        if (item.parts.some(p => p.kind === 'sauce')) {
          for (let i = 0; i < 7; i++) {
            const sauce = this.box(sub, .11, .026, .027, '#d64222', (i - 3) * .085, .25, .19 + (i % 2) * .025, .012); sauce.rotation.y = i % 2 ? -.55 : .55;
          }
          for (let i = 0; i < 3; i++) this.sphere(sub, .032, '#e84721', (i - 1) * .20, .24, .21, 1, .8, 1);
        }
      } else for (let i = 0; i < item.parts.length; i++) {
        const sub = this.food(item.parts[i]); sub.scale.setScalar(.56); sub.position.set((i % 2 - .5) * .30, .09, Math.floor(i / 2) * .22 - .08); g.add(sub);
      }
    } else if (item.kind === 'bread') {
      const bread = this.finish(this.sphere(g, .32, '#dfa147', 0, .12, 0, 1.28, .52, .64),'bread');
      bread.rotation.y = -.2;
      for (let i = 0; i < 3; i++) { const slash = this.box(g, .035, .02, .18, '#ffe3a1', (i - 1) * .17, .285, (i - 1) * .027, .01); slash.rotation.y = -.5; }
      for(let i=0;i<7;i++) this.sphere(g,.009,'#ffe1a3',Math.sin(i*9)*.25,.265,Math.cos(i*5)*.07,1,.5,1.6);
    } else if (item.kind === 'sauce') {
      this.finish(this.cylinder(g, .13, .145, .39, '#d4472b', 0, .21, 0, 16),'enamel');
      this.sphere(g, .13, '#d4472b', 0, .40, 0, 1, .55, 1);
      this.cylinder(g, .075, .075, .08, '#f8d386', 0, .465, 0, 12);
      this.cylinder(g, .018, .052, .16, '#eac67e', 0, .565, 0, 12);
      this.cylinder(g, .136, .14, .15, '#fff0bc', 0, .23, 0, 16);
      const chili = this.sphere(g, .052, '#db3821', 0, .23, .14, .55, 1.45, .28); chili.rotation.z = -.35;
      this.box(g, .018, .039, .012, '#4c8150', .015, .307, .145, .006);
    } else if (item.kind === 'meat') {
      const colors = { raw: '#dc8f85', chopped: '#db9983', cooked: '#956242', burnt: '#3c3934' };
      if (item.state === 'raw') {
        this.sphere(g, .28, colors.raw, 0, .10, 0, 1.18, .46, .84);
        const fat = this.mesh(g, this.geo('torus', .125, .023, 6, 16), '#f8d5b4', .02, .222, -.015); fat.rotation.x = -Math.PI / 2;
      } else for (let i = 0; i < 5; i++) {
        const chunk = this.box(g, .145, .095, .20, colors[item.state], ((i % 3) - 1) * .155, .056, (Math.floor(i / 3) - .4) * .21, .025); chunk.rotation.y = (i % 2 - .5) * .3;
        if (item.state === 'cooked') this.box(chunk, .10, .004, .022, '#744d35', 0, .048, 0, .003);
      }
    } else if (item.kind === 'vegetable') {
      if (item.state === 'raw') {
        for (let i = 0; i < 5; i++) this.sphere(g, .19, ['#87b571', '#6c9b59', '#a5c780'][i % 3], Math.cos(i * 2) * .12, .14 + (i % 2) * .055, Math.sin(i * 2) * .1, .9, .8, 1);
        this.sphere(g, .105, '#dc7854', .23, .1, .09);
      } else for (let i = 0; i < 7; i++) {
        const leaf = this.box(g, .15, .027, .12, ['#7ea95e', '#a6c473', '#de8c63'][i % 3], Math.sin(i * 2.3) * .2, .05 + (i % 2) * .03, Math.cos(i * 2.3) * .19, .025); leaf.rotation.y = i * .7;
      }
    }
    return g;
  }
  batchStaticMeshes() {
    // Bake immovable cabinetry and decor into one draw per material.
    // Items, burners, knives, selection borders and steam stay independent.
    const dynamic = new Set(this.smoke.map(s => s.mesh));
    for (const view of this.stationViews.values()) {
      for (const object of [view.socket, view.supply, view.selection, view.knife, view.burner, view.pan, view.stack, view.dirtyStack, view.canopy?.group]) if (object) dynamic.add(object);
    }
    this.scene.updateMatrixWorld(true);
    const batches = new Map();
    const visit = object => {
      if (dynamic.has(object)) return;
      if (object.isMesh && !Array.isArray(object.material)) {
        const m=object.material,vertexColors=m.isMeshStandardMaterial&&!m.transparent;
        const materialKey=vertexColors?JSON.stringify([m.type,m.map?.uuid,m.roughness,m.metalness,m.emissive.getHex(),m.emissiveIntensity,m.envMapIntensity,m.side]):m.uuid;
        const key = `${materialKey}:${object.castShadow}:${object.receiveShadow}`;
        if (!batches.has(key)) batches.set(key, { material: object.material, meshes: [],vertexColors });
        batches.get(key).meshes.push(object);
      }
      for (const child of object.children) visit(child);
    };
    visit(this.scene);
    for (const { material, meshes,vertexColors } of batches.values()) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map(mesh => {
        const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        if(vertexColors){
          const count=geometry.attributes.position.count,colors=new Float32Array(count*3),existing=geometry.getAttribute('color'),color=mesh.material.color;
          for(let i=0;i<count;i++){colors[i*3]=color.r*(existing?.getX(i)??1);colors[i*3+1]=color.g*(existing?.getY(i)??1);colors[i*3+2]=color.b*(existing?.getZ(i)??1);}
          geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
          if(!material.map)geometry.deleteAttribute('uv');
        }
        return geometry.applyMatrix4(mesh.matrixWorld);
      });
      const geometry = mergeGeometries(geometries, false);
      for (const temporary of geometries) temporary.dispose();
      if (!geometry) continue;
      const mergedMaterial=vertexColors?material.clone():material;
      if(vertexColors){mergedMaterial.color.set('#ffffff');mergedMaterial.vertexColors=true;}
      const merged = new THREE.Mesh(geometry, mergedMaterial); merged.castShadow = meshes[0].castShadow; merged.receiveShadow = meshes[0].receiveShadow;
      this.scene.add(merged); for (const mesh of meshes) mesh.removeFromParent();
    }
  }
  buildChef(character='ragged-dog') {
    const model={lastHand:'',apron:[],carryHeight:character==='dog-tick'?1.10:1.48};
    model.heldBadge=document.createElement('div');model.heldBadge.className='held-badge';model.heldBadge.hidden=true;document.querySelector('#world-labels').append(model.heldBadge);
    model.chef = this.group(this.scene, 0, .15, 2.3); model.chefBody = this.group(model.chef);
    model.chefShadow=this.contactShadow(this.scene,0,2.3,1.25,1.0);
    const body = model.chefBody;
    if(this.assets.has(character)){
      const template=this.assets.get(character),asset=template.userData.rigged?cloneSkeleton(template):template.clone();body.add(asset);
      body.scale.setScalar(RULES.characterScale*(character==='dog-tick'?.82:1));
      if(template.userData.rigged)model.animation=new CharacterAnimation(asset,template.animations);
      // Detailed skinned surfaces must not sample an older pose's shadow map.
      asset.traverse(mesh=>{if(mesh.isMesh)mesh.receiveShadow=false;});
      model.legs=[asset.getObjectByName('leg-left'),asset.getObjectByName('leg-right')];
      model.arms=[asset.getObjectByName('arm-left'),asset.getObjectByName('arm-right')];
      model.heldSocket=this.group(this.scene);
      model.playerRing=this.mesh(this.scene,this.geo('torus',.66,.042,5,40),'#fff4c7',0,.185,2.3);model.playerRing.rotation.x=-Math.PI/2;model.playerRing.castShadow=false;
      model.playerLabel=document.createElement('div');model.playerLabel.className='station-label player-label';document.querySelector('#world-labels').append(model.playerLabel);
      model.chefShadow.scale.set(1.3,1.3,1.3);return model;
    }
    body.scale.set(1.1*RULES.characterScale,1.06*RULES.characterScale,1.1*RULES.characterScale);
    model.legs = [];
    for (const x of [-.14, .14]) {
      const leg = this.group(body, x, .18, 0); this.box(leg, .17, .23, .18, '#405d59', 0, 0, 0, .045);
      this.box(leg, .20, .12, .29, '#3c5350', 0, -.12, .045, .055); model.legs.push(leg);
    }
    this.sphere(body, .31, '#faf1d9', 0, .60, 0, 1, 1.17, .83);
    this.box(body, .46, .40, .085, C.coral, 0, .47, .24, .09);
    this.box(body, .23, .15, .10, '#c1664f', 0, .44, .285, .035);
    for(const x of [-.08,0,.08])this.box(body,.011,.11,.01,'#f2b693',x,.44,.339,.003);
    this.box(body, .11, .25, .06, C.coral, -.13, .74, .217, .03); this.box(body, .11, .25, .06, C.coral, .13, .74, .217, .03);
    for (const x of [-.16, .16]) this.sphere(body, .025, '#f7d78a', x, .66, .277);
    this.cylinder(body, .12, .12, .10, '#eebd91', 0, .91);
    const scarf=this.mesh(body,this.geo('torus',.15,.042,7,20),'#df603b',0,.88);scarf.rotation.x=Math.PI/2;
    for(const side of [-1,1]){const tie=this.sphere(body,.065,'#e87c43',side*.085,.83,-.22,1.7,.65,.5);tie.rotation.z=side*.4;}
    this.sphere(body,.044,'#f09957',0,.83,-.26);
    this.sphere(body, .295, '#f0c49a', 0, 1.12, .005, 1, .95, .9);
    for (const x of [-.28, .28]) this.sphere(body, .07, '#eeb98d', x, 1.12, 0);
    this.sphere(body, .25, '#685442', 0, 1.245, -.07, 1.1, .73, 1);
    for(let i=0;i<7;i++)this.sphere(body,.075,i%2?'#744526':'#925735',Math.sin(i*.8)*.245,1.24+Math.sin(i*2)*.028,Math.cos(i*.8)*.23,1,.75,1);
    this.sphere(body, .048, '#e6ad81', 0, 1.11, .267, 1, .85, .7);
    for (const x of [-.103, .103]) {
      this.sphere(body, .029, '#293a3a', x, 1.17, .248, .75, 1.22, .5);
      this.sphere(body,.008,'#ffffff',x-.005,1.182,.263,1,1,.3);
      this.box(body,.056,.014,.019,'#735035',x,1.24,.235,.006);
      this.sphere(body, .036, '#e7a78e', x * 1.6, 1.08, .229, 1.15, .48, .3);
    }
    this.box(body, .065, .015, .011, '#aa795e', 0, 1.026, .249, .005);
    this.cylinder(body, .28, .28, .13, '#fff9e8', 0, 1.37, 0, 20);
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2;this.cylinder(body,.006,.008,.10,'#e1dfd3',Math.sin(a)*.282,1.37,Math.cos(a)*.282,5);}
    this.sphere(body, .24, '#fff9e8', -.16, 1.55, .01, .95, .9, 1);
    this.sphere(body, .265, '#fffbee', .085, 1.59, -.04, 1, 1, 1);
    this.sphere(body, .19, '#fff9e8', .23, 1.51, .04, .8, 1, 1);
    model.arms = [];
    for (const side of [-1, 1]) {
      const arm = this.group(body, side * .3, .72, 0);
      this.sphere(arm, .105, '#faf1d9', side * .02, -.09, .015, 1, 1.4, 1);
      this.sphere(arm, .085, '#efc098', side * .04, -.23, .055);
      model.arms.push(arm);
    }
    model.heldSocket = this.group(this.scene);
    model.playerRing = this.mesh(this.scene, this.geo('torus', .36, .032, 5, 32), '#fff4c7', 0, .166, 2.3); model.playerRing.rotation.x = -Math.PI / 2; model.playerRing.castShadow = false;
    model.playerLabel = document.createElement('div'); model.playerLabel.className = 'station-label player-label'; model.playerLabel.textContent = 'BẠN'; model.playerLabel.style.cssText = 'background:#3e7862;color:#fff9e3;font-size:8px;letter-spacing:1px;border:0;padding:4px 7px;'; document.querySelector('#world-labels').append(model.playerLabel);
    model.chef.traverse(mesh=>{if(mesh.isMesh && mesh.material===this.mat(C.coral))model.apron.push(mesh);});
    return model;
  }
  resize() {
    this.width = this.container.clientWidth; this.height = this.container.clientHeight;
    if (!this.width || !this.height) return;
    this.renderer.setSize(this.width, this.height);
    const aspect = this.width / this.height;
    const menu = this.game.phase === 'menu';
    this.followCamera = !menu && aspect < .85;
    this.followDepth = !menu && this.height < 540 && aspect > 1.6;
    const span = this.followCamera ? 14 : Math.max(this.followDepth ? 12.8 : 17.4, (menu ? 28 : 26.4) / aspect);
    this.cameraCenter = new THREE.Vector3(0, 0, -1.2);
    if (this.followCamera) this.cameraCenter.set(this.game.player.x, 0, this.game.player.z - 1.5);
    else if (this.followDepth) this.cameraCenter.z = Math.max(-6.5, Math.min(1.8, this.game.player.z - 2));
    this.camera.position.copy(this.cameraCenter).add(this.cameraOffset); this.camera.lookAt(this.cameraCenter);
    this.camera.left = -span * aspect / 2; this.camera.right = span * aspect / 2;
    this.camera.top = span / 2; this.camera.bottom = -span / 2;
    this.camera.updateProjectionMatrix();
  }
  setQuality(mode){
    this.budget.setMode(mode==='smooth'?'high':mode);this.applyBudget();
  }
  applyBudget(){
    this.targetFPS=this.budget.fps;
    if(Math.abs(this.pixelRatio-this.budget.ratio)>.001){this.pixelRatio=this.budget.ratio;this.renderer.setPixelRatio(this.pixelRatio);}
  }
  samplePerformance(frameMs,renderMs,seconds){
    if(this.budget.sample(frameMs,renderMs,seconds))this.applyBudget();
  }
  worldAtScreen(x,y){
    const rect=this.renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),this.camera);
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.2),new THREE.Vector3())||new THREE.Vector3(this.game.player.x,0,this.game.player.z);
  }
  screen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x * .5 + .5) * this.width, y: (-v.y * .5 + .5) * this.height };
  }
  inputToWorld(x, y) {
    const forward = new THREE.Vector3(); this.camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
    return { x: -forward.z * x + forward.x * -y, z: forward.x * x + forward.z * -y };
  }
  updateLabel(s, view) {
    const isTarget = this.game.target?.id === s.id;
    const label = view.label;let progress = null, status = '', extra = '',symbol=s.icon;
    if(s.fire){progress=s.fire;status='Cháy';extra=' burnt';symbol='fire';}
    else if (s.item?.kind==='pan' && isPanFood(s.item.food)) {
      const pan=s.item;
      if (pan.food.state === 'chopped') { progress = pan.progress / RULES.cook; status = s.type==='pan'?'Đang rán':'Chờ đặt lên bếp'; }
      else if (pan.food.state === 'cooked') { progress = 1-pan.heat/RULES.burn;const warning=pan.heat>=RULES.burnWarning;status=warning?'Sắp cháy':'Đã chín';extra=warning?' warn':' ready';symbol=warning?'clock':'check'; }
      else { status='Đã cháy';progress=1;extra=' burnt';symbol='trash'; }
    } else if (s.type === 'board' && isChoppable(s.item) && s.progress>0) {
      progress = s.progress / RULES.chop; status = 'Đang cắt';
    } else if (s.type === 'sink' && s.progress > 0) { progress = s.progress / RULES.wash; status = 'Đang rửa'; }
    const content=progress===null?'':`${iconSvg(symbol)}<span class="bar" role="progressbar" aria-label="${status}" aria-valuenow="${Math.round(progress*100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.min(100,progress*100)}%"></i></span>`;
    label.className = `station-label progress-label icon-only${extra}`;label.title=status;
    if (content !== view.labelContent) { label.innerHTML = content; view.labelContent = content; }
    label.hidden=progress===null;
    if(progress!==null){const at=this.screen(s.x,1.9,s.z);label.style.transform=`translate(${at.x}px,${at.y}px) translate(-50%,-100%)`;label.style.left='0';label.style.top='0';}
    view.selection.visible = isTarget;
  }
  updateChef(model,p,dt,local) {
    const t=this.time,moving=p.walking && this.game.phase==='playing',position=new THREE.Vector3(p.x,.18,p.z);
    if(this.game.online && model.initialized)model.chef.position.lerp(position,Math.min(1,dt*22));else model.chef.position.copy(position);model.initialized=true;
    model.chefShadow.position.set(model.chef.position.x,.182,model.chef.position.z);
    const angle=Math.atan2(p.facingX,p.facingZ),delta=Math.atan2(Math.sin(angle-model.chef.rotation.y),Math.cos(angle-model.chef.rotation.y));model.chef.rotation.y+=delta*Math.min(1,dt*20);
    if(model.animation)model.animation.update(p,dt,['menu','playing','countdown'].includes(this.game.phase),this.reduced);
    else{
      model.chefBody.position.y=this.reduced?0:moving?Math.abs(Math.sin(t*14))*.05:Math.sin(t*2.5)*.012;
      model.legs.forEach((leg,i)=>{if(leg)leg.rotation.x=moving&&!this.reduced?Math.sin(t*14+i*Math.PI)*.45:0;});
      model.arms.forEach((arm,i)=>{if(arm)arm.rotation.x=p.hand?-.8:moving&&!this.reduced?Math.sin(t*14+i*Math.PI)*.4:0;});
      if(p.work?.action==='chop'&&!this.reduced&&model.arms[1])model.arms[1].rotation.x=-.7+Math.sin(t*23)*.65;
    }
    model.movingShadow=moving||Boolean(p.work)||Math.abs(delta)>.01||model.animation?.throwTime>0||model.animation?.transition>0;
    model.playerRing.position.set(model.chef.position.x,.185,model.chef.position.z);
    if(!model.directionArrow){
      const shape=new THREE.Shape();shape.moveTo(-.13,.60);shape.lineTo(.13,.60);shape.lineTo(.13,.79);shape.lineTo(.29,.79);shape.lineTo(0,1.08);shape.lineTo(-.29,.79);shape.lineTo(-.13,.79);shape.closePath();
      model.directionArrow=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:p.color,side:THREE.DoubleSide,depthWrite:false}));model.directionArrow.rotation.x=Math.PI/2;model.chef.add(model.directionArrow);model.directionArrow.position.y=.025;
      model.playerRing.material=new THREE.MeshBasicMaterial({color:p.color,depthWrite:false});
    }
    model.playerRing.material.color.set(p.color);model.directionArrow.material.color.set(p.color);
    if(model.color!==p.color){for(const mesh of model.apron)mesh.material=this.mat(p.color);model.color=p.color;}
    // The held prop is outside the scaled character: identical size and orientation on hands, floor and counter.
    const reach=1.03;
    model.heldSocket.position.set(model.chef.position.x+Math.sin(model.chef.rotation.y)*reach,model.carryHeight,model.chef.position.z+Math.cos(model.chef.rotation.y)*reach);
    const handKey=itemKey(p.hand);if(handKey!==model.lastHand){
      model.heldSocket.clear();if(p.hand)model.heldSocket.add(this.food(p.hand));model.lastHand=handKey;this.shadowDirty=true;
      model.heldBadge.innerHTML=p.hand?iconSvg(p.hand.kind):'';model.heldBadge.setAttribute('aria-label',itemName(p.hand));
    }
    const at=this.screen(model.chef.position.x,2.95,model.chef.position.z);
    // The physical prop stays on the paws. A small inventory glyph remains readable when the body occludes it.
    model.heldBadge.hidden=!p.hand||Math.cos(model.chef.rotation.y)>-.4;
    model.heldBadge.style.transform=`translate(${at.x}px,${at.y+(this.game.online?-30:0)}px) translate(-50%,-100%)`;
    model.playerLabel.hidden=!this.game.online;
    const playerLabel=this.game.online?`${p.name}${local?' · BẠN':''}`:'';
    if(model.playerLabel.textContent!==playerLabel)model.playerLabel.textContent=playerLabel;
    model.playerLabel.style.left=`${at.x}px`;model.playerLabel.style.top=`${at.y}px`;model.playerLabel.style.background=this.game.online?p.color:'#3e7862';
  }
  playThrow(playerId){this.chefs.get(playerId)?.animation?.throw();this.shadowDirty=true;}
  captureCharacterPortraits(){return this.game.players.map(player=>characterPortrait(this,player.character));}
  update(dt) {
    const game = this.game, p = game.player, active = ['menu', 'playing', 'countdown'].includes(game.phase);
    if (active) this.time += dt;
    const t = this.time;
    if(this.water?.material.uniforms) this.water.material.uniforms.time.value=this.reduced ? 0 : t;

    if (this.followCamera || this.followDepth) {
      const desired=this.cameraCenter.clone();
      if(this.followCamera)desired.x+=Math.max(0,p.x-this.cameraCenter.x-2.4)+Math.min(0,p.x-this.cameraCenter.x+2.4);
      desired.z+=Math.max(0,p.z-this.cameraCenter.z-3.2)+Math.min(0,p.z-this.cameraCenter.z+3.2);
      if(this.followDepth)desired.z=Math.max(-6.5,Math.min(1.8,desired.z));
      this.cameraCenter.lerp(desired, this.reduced ? 1 : Math.min(1, dt * 6));
      this.camera.position.copy(this.cameraCenter).add(this.cameraOffset); this.camera.lookAt(this.cameraCenter);
    }
    const present=new Set();
    for(const player of game.players){
      present.add(player.id);let model=this.chefs.get(player.id);
      if(!model){model=this.buildChef(player.character);this.chefs.set(player.id,model);}
      this.updateChef(model,player,dt,player.id===p.id);
    }
    for(const [id,model] of this.chefs)if(!present.has(id)){
      model.animation?.dispose();model.directionArrow?.geometry.dispose();model.directionArrow?.material.dispose();
      if(model.directionArrow)model.playerRing.material.dispose();
      model.chef.removeFromParent();model.heldSocket.removeFromParent();model.chefShadow.removeFromParent();model.playerRing.removeFromParent();model.playerLabel.remove();model.heldBadge.remove();this.chefs.delete(id);this.shadowDirty=true;
    }
    for (const s of game.stations) {
      const view = this.stationViews.get(s.id); const key = itemKey(s.item);
      if (view.canopy) {
        // Cut away the canopy near the chef so it cannot hide the interaction.
        const canopy = view.canopy, near = game.phase !== 'menu' && game.players.some(player=>Math.abs(player.x-s.x)<2.8 && Math.abs(player.z-s.z)<3.4);
        const opacity = near ? .13 : 1;
        canopy.opacity += (opacity-canopy.opacity) * (this.reduced ? 1 : Math.min(1,dt*12));
        for (const material of canopy.materials) material.opacity = canopy.opacity;
      }
      if(view.supply)view.supply.visible=!s.item;
      if (key !== view.key) { view.socket.clear(); if (s.item) view.socket.add(this.food(s.item)); view.key = key;this.shadowDirty=true; }
      if (view.stack && view.plateCount !== game.cleanPlates) {
        view.stack.clear();
        for (let i = 0; i < game.cleanPlates; i++) { const plate = this.food({ kind: 'plate', parts: [] }); plate.position.y = i * .085; view.stack.add(plate); }
        view.plateCount = game.cleanPlates;
      }
      if (view.dirtyStack && view.dirtyCount !== game.dirtyPlates) {
        view.dirtyStack.clear();
        for (let i = 0; i < game.dirtyPlates; i++) {
          const plate = this.food({ kind: 'plate', parts: [] }); plate.scale.setScalar(.68); plate.position.y = i * .06; view.dirtyStack.add(plate);
          this.sphere(plate, .15, '#9c825e', .05, .08, .01, 1, .025, .7);
        }
        view.dirtyCount = game.dirtyPlates;
      }
      if (view.knife) view.knife.rotation.x = game.players.some(player=>player.work?.station===s.id) && !this.reduced ? Math.abs(Math.sin(t * 20)) * .9 : 0;
      if (view.burner) {const cooking=isPanFood(s.item?.food);view.burner.material=this.mat(cooking?'#ebad58':'#716966',cooking?{emissive:'#ed7530',emissiveIntensity:.45}:{});}
      this.updateLabel(s, view);
    }
    for (const steam of this.smoke) {
      const s = game.stations.find(s => s.id === steam.stationId), item = s.item?.food;
      steam.mesh.visible = isPanFood(item) && !this.reduced;
      if (!isPanFood(item)) continue;
      const progress = (t * .55 + steam.phase) % 1;
      steam.mesh.position.set(s.x + Math.sin(progress * 5 + steam.phase * 7) * .14, 1.5 + progress * 1.0, s.z + Math.cos(steam.phase * 8) * .15);
      steam.mesh.scale.setScalar(.4 + progress * 1.4); steam.mesh.material.opacity = Math.sin(progress * Math.PI) * .4;
      steam.mesh.material.color.set(item.state === 'burnt' ? '#687167' : '#fff8df');
    }
    this.dynamics.update(dt);
    this.shadowAge+=dt;
    const moving=active&&([...this.chefs.values()].some(model=>model.movingShadow)||game.projectiles.length||[...this.dynamics.customers.values()].some(c=>c.root.position.distanceTo(c.target)>.05));
    // A moving silhouette and its shadow are rendered from the very same pose.
    if(this.shadowDirty||this.shadowsMoving&&!moving||moving){
      this.renderer.shadowMap.needsUpdate=true;this.shadowDirty=false;this.shadowAge=0;this.shadowUpdates++;
    }
    this.shadowsMoving=Boolean(moving);
    this.renderer.render(this.scene, this.camera);
  }
  celebrate(points, stationId = 'serve') {
    const station = this.game.stations.find(s => s.id === stationId);
    const pos = this.screen(station.x, 2, station.z), parent = document.querySelector('#particles');
    const label = document.createElement('div'); label.className = 'floating-points'; label.textContent = `+${points}`; label.style.left = `${pos.x}px`; label.style.top = `${pos.y}px`; parent.append(label); setTimeout(() => label.remove(), 1600);
    if (this.reduced) return;
    for (let i = 0; i < 22; i++) {
      const el = document.createElement('i'); el.className = 'confetti';
      el.style.cssText = `left:${pos.x}px;top:${pos.y}px;background:${['#e6bc5d', '#7ba680', '#e18c68', '#fff3ca'][i % 4]};--dx:${Math.sin(i * 2.4) * 130}px;--dy:${-40 - Math.cos(i * 1.5) * 90}px;animation-delay:${i % 4 * .03}s`;
      parent.append(el); setTimeout(() => el.remove(), 1700);
    }
  }
}
