import * as THREE from 'three';
import { FLOOR_AREAS } from './level.js';
import { createWater } from './materials.js';

const W = { gold: '#c48a3e', top: '#efbd70', rim: '#d79e46', wood: '#81562e', frame: '#515968', rail: '#a9b8b7', blue: '#329ee0' };
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;

function platform(v, area) {
  const world = v.scene, { x, z, width: w, depth: d } = area;
  v.contactShadow(world,x+.3,z+.3,w+3.0,d+3.0,-.975);
  v.box(world, w + .42, .9, d + .42, '#444e61', x, -.48, z, .22);
  v.box(world, w + .20, .19, d + .20, '#8f9aaf', x, -.02, z, .10);
  v.box(world, w, .12, d, '#8ccade', x, .08, z, .10);
  const nx = Math.round(w / 1.0), nz = Math.round(d / 1.0), sx = w / nx, sz = d / nz;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const color = ['#329cd8', '#43a9de', '#399fd6', '#50b2e1'][(i * 5 + j * 3) % 4];
    v.finish(v.box(world, sx - .035, .05, sz - .035, color, x - w / 2 + (i + .5) * sx, .149, z - d / 2 + (j + .5) * sz, .085),'tile');
  }
}

function rail(v, x1, z1, x2, z2, y = -.32, radius = .075, color = W.rail) {
  const a = new THREE.Vector3(x1, y, z1), b = new THREE.Vector3(x2, y, z2), delta = b.clone().sub(a);
  const mesh = v.cylinder(v.scene, radius, radius, delta.length(), color, 0, 0, 0, 10);
  v.finish(mesh,'metal');
  mesh.position.copy(a.add(b).multiplyScalar(.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}
function tracks(v, xmin, xmax, zmin, zmax) {
  for (let z = zmin; z <= zmax; z += .70) for (const x of [xmin, xmax]) {
    v.box(v.scene, 1.08, .10, .19, '#bb935d', x, -.54, z, .025);
  }
  for (let x = xmin; x <= xmax; x += .70) for (const z of [zmin, zmax]) {
    if (Math.abs(x) < 1.8) continue;
    v.box(v.scene, .19, .10, 1.08, '#bb935d', x, -.54, z, .025);
  }
  for (const offset of [-.34, .34]) {
    for (const x of [xmin + offset, xmax + offset]) rail(v, x, zmin, x, zmax, -.38, .055, '#625e5c');
    for (const z of [zmin + offset, zmax + offset]) {
      rail(v, xmin, z, -1.8, z, -.38, .055, '#625e5c'); rail(v, 1.8, z, xmax, z, -.38, .055, '#625e5c');
    }
  }
}
function cart(v, x, z, rotation = 0) {
  const g = v.group(v.scene, x, -.25, z); g.rotation.y = rotation;
  v.box(g, .90, .34, 1.18, '#696967', 0, .14, 0, .09); v.box(g, .74, .08, 1.02, '#ffc34c', 0, .34, 0, .08);
  for (let i = 0; i < 5; i++) v.sphere(g, .19, ['#f4b62e', '#ffcf48', '#ffe27d'][i % 3], Math.sin(i * 3) * .21, .39, (i - 2) * .18, 1.2, .6, .83);
  for (const side of [-1, 1]) for (const zz of [-.35, .35]) {
    const wheel = v.cylinder(g, .13, .13, .08, '#393f45', side * .44, -.03, zz, 12); wheel.rotation.z = Math.PI / 2;
  }
}
function rocks(v, x, z, size, color) {
  const g = v.group(v.scene, x, -.9, z);
  for (let i = 0; i < 3; i++) {
    const mesh = v.mesh(g, new THREE.DodecahedronGeometry(size * (1 - i * .19), 1), color, Math.sin(i * 3) * size * .43, size * (.38 + i * .14), Math.cos(i * 2) * size * .22,{flatShading:true,roughness:.94});
    mesh.scale.set(1, 1.1 + i * .15, .85); mesh.rotation.set(.12, i * .74, .08);
  }
  for(let i=0;i<4;i++) v.sphere(g,size*.22,['#567c66','#719779'][i%2],Math.sin(i*2.4)*size*.35,size*1.33,Math.cos(i*2.4)*size*.35,1.4,.15,1);
}
export function buildKitchen(v) {
  const world = v.scene;
  v.water=createWater();world.add(v.water.mesh);
  for (const area of FLOOR_AREAS.filter(a => ['bridge', 'entry'].includes(a.id))) platform(v, area);
  for (const area of FLOOR_AREAS.filter(a => ['main', 'upper'].includes(a.id))) platform(v, area);
  tracks(v, -12.15, 12.15, -3.2, 9.0); tracks(v, -8.95, 8.95, -12.75, -3.2);
  for (const [x, z, rot] of [[-12.15, 2.8, 0], [12.15, 5.9, 0], [-8.95, -8.6, 0], [8.95, -5.4, 0], [-7, 9, Math.PI/2], [10, -3.2, Math.PI/2]]) cart(v, x, z, rot);
  // Piping is interrupted at the real walkways, never a decorative invisible wall.
  for (const x of [-11.15, 11.15]) {
    rail(v, x, -2.1, x, 7.7, .55, .13);
    for (const z of [-1.8, 1.2, 4.2, 7.5]) v.cylinder(world, .16, .16, .25, '#918e85', x, .56, z, 10).rotation.x = Math.PI / 2;
  }
  for (const z of [-2.5, 8.28]) for (const side of [-1, 1]) {
    rail(v, side * 1.6, z, side * 11.15, z, .55, .13);
    for (const x of [3.5, 6.5, 9.4]) { const ring = v.cylinder(world, .165, .165, .24, '#a19483', side * x, .55, z, 10); ring.rotation.z = Math.PI / 2; }
  }
  for (const x of [-8.13, 8.13]) rail(v, x, -11.4, x, -4.4, .50, .13);
  for (const side of [-1, 1]) { rail(v, side * 1.6, -4.08, side * 8.13, -4.08, .5, .13); rail(v, 0, -11.8, side * 8.13, -11.8, .5, .13); }
  for (const x of [-1.58, 1.58]) { rail(v, x, -4.1, x, -2.4, .38, .10); rail(v, x, 8.25, x, 9.8, .38, .10); }
  for (const s of v.game.stations) v.buildStation(s);
  for (const side of [-1, 1]) {
    for (const z of [-.1, 1.35, 4.7, 6.1]) {
      const p = v.plant(world, side * 10.48, z, .88, '#65745b'); p.position.y = .16;
    }
    for (let i = 0; i < 6; i++) rocks(v, side * (14.4 + Math.sin(i * 2.4) * 1.3), -13 + i * 4.5, 1.6 + (i % 3) * .55, ['#656772', '#74727a', '#5d6570'][i % 3]);
    for (let i = 0; i < 4; i++) {
      const g = v.group(world, side * (13.1 + (i % 2) * .4), -.3, -9 + i * 5);
      for (let j = 0; j < 4; j++) {
        const crystal = v.mesh(g, new THREE.OctahedronGeometry(.33, 0), ['#2abddd', '#73e4eb', '#3597c9'][j % 3], Math.sin(j * 2.1) * .32, .28, Math.cos(j * 2.1) * .22,{roughness:.18,metalness:.3,emissive:'#1da1c7',emissiveIntensity:.22});
        crystal.scale.y = 1.9; crystal.rotation.z = Math.sin(j * 2.1) * .4;
      }
    }
  }
}

function breadStall(v, root) {
  // One shared cart over three independent, usable table slots.
  for (const x of [-1.75, 1.75]) {
    const wheel = v.cylinder(root, .25, .25, .12, '#3d4845', x, .04, .70, 16); wheel.rotation.x = Math.PI / 2;
    const hub = v.cylinder(root, .12, .12, .13, '#c7d1c8', x, .04, .71, 12); hub.rotation.x = Math.PI / 2;
  }
  v.box(root, 4.16, .57, .065, '#398a78', 0, .42, .706, .03);
  v.plaque(root, 'BÁNH MÌ NÓNG GIÒN', 3.5, .34, 0, .44, .747, '#398a78', '#fff3c6', 61);
  v.box(root, 4.08, .055, .44, '#d7e1d9', 0, .85, .59, .02);
  v.box(root, 4.08, .04, .44, '#f8e4ad', 0, 1.26, .59, .02);
  for (const x of [-1.98, 1.98]) {
    v.cylinder(root, .045, .045, 2.52, '#c3d5ca', x, 2.105, .62, 10);
    v.box(root, .045, .48, .44, '#c3d5ca', x, 1.04, .59, .01);
    v.cylinder(root,.015,.015,.22,'#665342',x,3.05,.62,8);
    v.cylinder(root,.105,.06,.06,'#bd8150',x,2.94,.62,12);
    const bulb=v.sphere(root,.082,'#ffcc72',x,2.86,.62,1,1.2,1);bulb.material=v.mat('#ffcc72',{emissive:'#ffb74b',emissiveIntensity:.65,roughness:.3});
  }
  for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
    const bread = v.food({ kind: 'bread', state: 'ready' }); bread.scale.setScalar(.82);
    bread.position.set((i - 2) * .72, .88 + row * .39, .59); root.add(bread);
  }
  const glass = v.mesh(root, v.geo('box', 3.93, .74, .018), '#c2f4ee', 0, 1.2, .828, { transparent: true, opacity: .18, roughness: .12, depthWrite: false });
  glass.castShadow = false;
  v.box(root, 4.12, .065, .48, '#d2dfd3', 0, 1.62, .59, .02);
  const canopy = v.group(root);
  const awning = v.group(canopy, 0, 3.37, .45); awning.rotation.x = -.08;
  for (let i = 0; i < 12; i++) {
    const x = (i - 5.5) * .36, color = i % 2 ? '#fff0cc' : '#cf6049';
    v.box(awning, .361, .09, .72, color, x, 0, 0, .018);
    v.box(awning, .361, .19, .055, color, x, -.1, .35, .026);
  }
  v.plaque(canopy, 'BÁNH MÌ', 2.1, .39, 0, 3.12, .826, '#fff0cc', '#a64733', 108);
  const materials = new Map();
  canopy.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (!materials.has(mesh.material)) { const material = mesh.material.clone(); material.transparent = true; material.depthWrite = false; materials.set(mesh.material, material); }
    mesh.material = materials.get(mesh.material); mesh.castShadow = false;
  });
  return { group: canopy, materials: [...materials.values()], opacity: 1 };
}

export function buildStation(v, s) {
  const root = v.group(v.scene, s.x, .165, s.z);
  v.contactShadow(v.scene,s.x,s.z,2.25,2.05);
  v.finish(v.box(root, s.width - .04, .66, s.depth - .04, W.gold, 0, .35, 0, .055),'wood');
  v.box(root, s.width - .10, .13, s.depth - .10, W.wood, 0, .065, 0, .025);
  v.box(root, s.width, .14, s.depth, W.rim, 0, .74, 0, .055);
  v.finish(v.box(root, s.width - .17, .05, s.depth - .17, W.top, 0, .836, 0, .04),'wood');
  for (const side of [-1, 1]) {
    v.finish(v.box(root, s.width - .20, .39, .025, '#b97e35', 0, .40, side * .671, .018),'wood');
    v.finish(v.box(root, .27, .055, .065, '#815d30', 0, .55, side * .693, .015),'metal');
    for(const x of [-.47,.47]) v.finish(v.sphere(root,.025,'#dab76e',x,.47,side*.697,1,1,.4),'metal');
  }
  const socket = v.group(root, 0, .90, .10);
  const view = { root, socket, key: '', slotHeight: .90, selection: null, label: null };
  if (s.type === 'source') {
    const crate={bread:'#aa7540',meat:'#be6662',vegetable:'#609b54',sauce:'#cc6846'}[s.ingredient];
    v.finish(v.box(root, 1.20, .07, .52, crate, 0, .91, -.38, .045),'wood');
    for(const x of [-.60,.60])v.box(root,.045,.21,.52,crate,x,1.00,-.38,.01);
    v.box(root,1.2,.25,.045,crate,0,1.025,-.62,.01);
    for(const [x,scale,z] of [[-.4,.44,-.40],[.4,.44,-.40],[0,s.ingredient==='sauce'?1.08:.90,-.30]]) {
      const token = v.food({ kind: s.ingredient, state: ['bread', 'sauce'].includes(s.ingredient) ? 'ready' : 'raw' });
      token.scale.setScalar(scale); token.position.set(x, .97, z); root.add(token);
    }
    socket.position.z=.30;
  } else if (s.type === 'board') {
    v.box(root, 1.31, .13, 1.26, '#aa7139', 0, .933, .025, .075);
    v.finish(v.box(root, 1.23, .024, 1.18, '#ddb67f', 0, 1.01, .025, .055),'wood');
    for (const x of [-.48, .48]) v.box(root, .014, .004, 1.00, '#d8ad70', x, 1.025, .025, .002);
    v.box(root, .014, .004, 1.10, '#d8ad70', .10, 1.025, .025, .002);
    const knife = v.group(root, .32, 1.14, -.31); knife.rotation.y = -.68;knife.rotation.z=-.3;
    v.box(knife, .13, .10, .29, '#774936', 0, .035, .24, .03);
    v.finish(v.box(knife, .42, .06, .49, '#e4eced', -.10, .015, -.12, .014),'metal');
    v.box(knife, .025, .058, .43, '#a1b5b8', -.225, .015, -.12, .005);
    for (const z of [.18, .29]) v.sphere(knife, .022, '#ebd8ad', 0, .09, z, 1, .3, 1);
    view.knife = knife; view.slotHeight = socket.position.y = 1.04;
  } else if (s.type === 'pan') {
    v.finish(v.box(root, 1.26, .075, 1.25, '#2e485d', 0, .89, 0, .04),'enamel');
    const controlSide=s.approach.z>0?1:-1;
    v.finish(v.box(root,1.22,.26,.045,'#365870',0,.56,controlSide*.705,.035),'enamel');
    for(const x of [-.34,0,.34]) {
      const knob=v.finish(v.cylinder(root,.075,.075,.075,'#b9c4c5',x,.55,controlSide*.75,16),'metal');knob.rotation.x=Math.PI/2;
      v.box(root,.017,.042,.01,'#354b55',x,.57,controlSide*.792,.003);
    }
    for (const x of [-.32, .32]) for (const z of [-.32, .32]) {
      v.cylinder(root, .22, .22, .025, '#464952', x, .947, z);
      const ring = v.finish(v.mesh(root, v.geo('torus', .166, .024, 6, 20), '#899593', x, .966, z),'metal'); ring.rotation.x = Math.PI / 2;
      for(const side of [-1,1]) v.box(root,.038,.033,.41,'#35434c',x+side*.12,.974,z,.006);
    }
    const burner = v.mesh(root, v.geo('torus', .32, .035, 6, 22), '#716966', 0, .974, .08); burner.rotation.x = Math.PI / 2; view.burner = burner;
    const pan = v.group(root, 0, 1.01, .08);
    v.finish(v.cylinder(pan, .42, .35, .10, '#3d4751'),'metal'); v.cylinder(pan, .37, .37, .012, '#394746', 0, .059);
    const lip=v.finish(v.mesh(pan,v.geo('torus',.4,.017,6,28),'#a2abaa',0,.058),'metal');lip.rotation.x=Math.PI/2;
    v.box(pan, .12, .08, .40, '#404852', 0, .01, .5, .03); view.pan = pan; pan.visible = false;
    view.slotHeight = socket.position.y = .985;
    for (let i = 0; i < 4; i++) {
      const steam = v.sphere(v.scene, .10, '#fff8e3'); steam.material = new THREE.MeshStandardMaterial({ color: '#fff9e7', transparent: true, opacity: .4, depthWrite: false });
      steam.castShadow = false; steam.visible = false; v.smoke.push({ mesh: steam, stationId: s.id, phase: i / 4 });
    }
  } else if (s.type === 'plates') {
    v.box(root, 1.08, .30, .025, '#7b735e', 0, .30, .695, .025);
    v.box(root, 1.09, .055, .25, '#d1b777', 0, .16, .63, .025);
    view.stack = v.group(root, 0, .90, -.36); view.stack.scale.setScalar(.72);
    for(const x of [-.42,.42])v.finish(v.cylinder(root,.022,.022,.36,'#bfd6d5',x,1.07,-.37,8),'metal');
    socket.position.z=.30;
  } else if (s.type === 'sink') {
    v.finish(v.box(root, 1.12, .07, .54, '#b6cece', 0, .89, -.32, .06),'metal');
    v.finish(v.box(root, .95, .02, .38, '#369cc5', 0, .927, -.33, .065),'ceramic');
    const faucet=new THREE.CatmullRomCurve3([new THREE.Vector3(.33,.91,-.50),new THREE.Vector3(.33,1.4,-.5),new THREE.Vector3(.33,1.46,-.30),new THREE.Vector3(.33,1.25,-.22)]);
    v.finish(v.mesh(root,new THREE.TubeGeometry(faucet,16,.047,8,false),'#d5dddd'),'metal');
    v.finish(v.cylinder(root,.062,.062,.1,'#d5dddd',-.35,.97,-.52,12),'metal');
    view.dirtyStack = v.group(root, -.22, .94, -.33); view.dirtyStack.scale.setScalar(.57);
    socket.position.z = .24;
  } else if (s.type === 'serve') {
    v.box(root, 1.33, .045, .83, '#fff1cc', 0, .895, -.23, .035);
    const ring=v.mesh(root,v.geo('torus',.33,.012,6,24),'#91b59c',0,.925,-.19);ring.rotation.x=-Math.PI/2;
    socket.position.z = -.19; view.slotHeight = socket.position.y = .93;
    if (s.cartSide === 0) view.canopy = breadStall(v, root);
  } else if (s.type === 'trash') {
    v.finish(v.box(root,.63,.37,.40,'#6e8878',0,1.05,-.40,.05),'enamel');
    v.box(root,.51,.025,.29,'#344640',0,1.245,-.40,.035);
    const lid=v.finish(v.box(root,.70,.055,.43,'#8da996',0,1.37,-.56,.04),'enamel');lid.rotation.x=-.78;
    v.box(root,.20,.06,.045,'#425e57',0,1.52,-.67,.015);
    for(const x of [-.19,0,.19])v.box(root,.02,.24,.012,'#a5bcaa',x,1.06,-.189,.005);
    socket.position.z=.30;
  }
  const selection = v.group(root, 0, .883, 0), hw = s.width / 2, hd = s.depth / 2;
  for (const x of [-hw, hw]) v.box(selection, .05, .03, s.depth, '#fff7b3', x, 0, 0, .008);
  for (const z of [-hd, hd]) v.box(selection, s.width, .03, .05, '#fff7b3', 0, 0, z, .008);
  selection.visible = false; view.selection = selection;
  const label = document.createElement('div'); label.className = 'station-label'; label.innerHTML = `${icon(s.icon)}<span>${s.label}</span>`;
  document.querySelector('#world-labels').append(label); view.label = label; v.stationViews.set(s.id, view);
}

