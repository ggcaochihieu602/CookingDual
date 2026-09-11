const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/OS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.TEST_URL || 'http://localhost:5173';
const checks = [], errors = [], evidence = {};
const pass = name => { checks.push(name); console.log(`PASS ${name}`); };
const near = (a,b,epsilon=.0001) => assert.ok(Math.abs(a-b)<epsilon,`${a} differs from ${b}`);
async function frames(page,count=2) { await page.evaluate(n=>new Promise(resolve=>{const next=()=>--n?requestAnimationFrame(next):resolve();requestAnimationFrame(next);}),count); }
async function begin(page) {
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  await page.goto(`${base}/?test=1`); await page.waitForFunction(()=>window.__cookingdual);
  await page.getByRole('button',{name:'Vào bếp thôi!'}).click();
  await page.waitForFunction(()=>window.__cookingdual.game.phase==='playing');
}
async function handDimensions(page) {
  return page.evaluate(async()=>{const THREE=await import('three'),{game,scene}=window.__cookingdual,root=scene.chefs.get(game.player.id).heldSocket;root.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray();});
}
async function animationState(page) { return page.evaluate(()=>{const {game,scene}=window.__cookingdual;return scene.chefs.get(game.player.id).animation.state;}); }

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Users/OS/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe'});
  try {
    const desktop=await browser.newContext({viewport:{width:1440,height:960}}),page=await desktop.newPage();
    await begin(page);
    const rigs=await page.evaluate(()=>{
      const {game,scene}=window.__cookingdual;
      game.setupPlayers(['Rig 1','Rig 2']);scene.update(.02);
      return game.players.map(player=>{
        const model=scene.chefs.get(player.id),skins=[];
        model.chefBody.traverse(mesh=>{if(mesh.isSkinnedMesh)skins.push({bones:mesh.skeleton.bones.length,uuid:mesh.skeleton.uuid,boneIds:mesh.skeleton.bones.map(b=>b.uuid),vertices:mesh.geometry.attributes.position.count});});
        return {character:player.character,animated:Boolean(model.animation),clips:[...model.animation.actions.keys()],skins};
      });
    });
    for(const rig of rigs){assert.ok(rig.animated);assert.ok(rig.skins.length>0);assert.ok(rig.skins.every(s=>s.bones>=16));assert.deepEqual(rig.clips.slice().sort(),['Idle','Walk','Carry','CarryWalk','Work','Throw'].sort());}
    const firstBones=new Set(rigs[0].skins.flatMap(s=>s.boneIds));assert.equal(rigs[1].skins.some(s=>s.boneIds.some(id=>firstBones.has(id))),false);
    evidence.rigs=rigs;pass('both supplied GLB characters load with independent skinned skeletons and all six animation clips');
    await page.evaluate(()=>{const {game}=window.__cookingdual;game.players=game.players.slice(0,1);game.player.x=0;game.player.z=3.2;});
    await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>{const {game,scene}=window.__cookingdual;return scene.chefs.get(game.player.id).animation.state==='Walk';});
    const walkingPose=await page.evaluate(async()=>{
      const {game,scene}=window.__cookingdual,model=scene.chefs.get(game.player.id);
      let bone;model.chefBody.traverse(node=>{if(node.isBone&&node.name.replace(/[^a-z]/gi,'').toLowerCase()==='thighl')bone=node;});if(!bone)throw new Error('Missing animated thigh bone');
      const first=bone.quaternion.toArray();await new Promise(r=>setTimeout(r,160));return {first,second:bone.quaternion.toArray()};
    });
    await page.keyboard.up('ArrowRight');assert.ok(walkingPose.first.some((x,i)=>Math.abs(x-walkingPose.second[i])>.005));
    await page.evaluate(()=>window.__cookingdual.game.player.hand={kind:'bread',state:'ready'});
    await page.waitForFunction(()=>{const {game,scene}=window.__cookingdual;return scene.chefs.get(game.player.id).animation.state==='Carry';});
    await page.keyboard.down('ArrowLeft');await page.waitForFunction(()=>{const {game,scene}=window.__cookingdual;return scene.chefs.get(game.player.id).animation.state==='CarryWalk';});await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('KeyR');await frames(page);await page.keyboard.up('KeyR');
    await page.waitForFunction(()=>{const {game,scene}=window.__cookingdual;return scene.chefs.get(game.player.id).animation.state==='Throw';});
    await page.waitForFunction(()=>{const {game,scene}=window.__cookingdual;return scene.chefs.get(game.player.id).animation.state==='Idle';});
    await page.evaluate(()=>{
      const {game}=window.__cookingdual,s=game.stations.find(s=>s.id==='board-a');s.item={kind:'meat',state:'raw'};
      game.player.x=s.x+s.approach.x;game.player.z=s.z+s.approach.z;game.player.facingX=-s.approach.x;game.player.facingZ=-s.approach.z;game.selectTarget();
    });
    await page.keyboard.down('KeyE');await page.waitForFunction(()=>{const {game,scene}=window.__cookingdual;return scene.chefs.get(game.player.id).animation.state==='Work';});await page.keyboard.up('KeyE');
    pass('keyboard walking visibly deforms the rig and carry, carry-walk, throw, and cutting choose the matching animation');

    // Place one exact loaf on a real counter, pick it up, turn, drop, and retrieve it.
    await page.evaluate(()=>{
      const {game}=window.__cookingdual;game.reset('playing');const s=game.stations.find(s=>s.id==='counter-b');s.item={kind:'bread',state:'ready'};
      game.player.x=s.x+s.approach.x;game.player.z=s.z+s.approach.z;game.player.facingX=-s.approach.x;game.player.facingZ=-s.approach.z;game.selectTarget();
    });await frames(page);
    const counter=await page.evaluate(async()=>{const THREE=await import('three'),{scene}=window.__cookingdual,root=scene.stationViews.get('counter-b').socket;root.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray();});
    await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>window.__cookingdual.game.player.hand?.kind),'bread');
    await page.evaluate(()=>{const g=window.__cookingdual.game;g.player.x=0;g.player.z=3.2;});
    const facing=[];
    for(const [x,z] of [[0,1],[1,0],[0,-1],[-1,0]]){
      await page.evaluate(([x,z])=>{const p=window.__cookingdual.game.player;p.facingX=x;p.facingZ=z;},[x,z]);await page.waitForTimeout(300);
      const dimensions=await handDimensions(page);dimensions.forEach((v,i)=>near(v,counter[i]));facing.push({x,z,dimensions});
    }
    await page.keyboard.press('KeyQ');await page.waitForFunction(()=>window.__cookingdual.scene.dynamics.ground.size===1);
    const floor=await page.evaluate(async()=>{const THREE=await import('three'),root=[...window.__cookingdual.scene.dynamics.ground.values()][0].root;root.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray();});
    floor.forEach((v,i)=>near(v,counter[i]));await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>window.__cookingdual.game.player.hand?.kind),'bread');
    evidence.bread={counter,facing,floor};pass('the same loaf keeps identical dimensions on the counter, in four facing directions, and after dropping and picking it up');
    await frames(page,6);
    const mutations=await page.evaluate(async()=>{
      const roots=['#star-track','#hand-icon','#hand-parts','#action-touch svg','#orders'].map(s=>document.querySelector(s));let count=0;
      const observer=new MutationObserver(records=>{count+=records.filter(r=>r.type==='childList').length;});for(const node of roots)observer.observe(node,{childList:true,subtree:true});
      const progress=document.querySelector('.order-progress i'),before=progress.style.transform;
      await new Promise(r=>setTimeout(r,650));observer.disconnect();return {count,before,after:progress.style.transform};
    });assert.equal(mutations.count,0);assert.notEqual(mutations.before,mutations.after);
    pass('order countdown still advances while unchanged item and action graphics are reused without DOM rebuilding');
    await desktop.close();

    for(const [name,width,height,dpr] of [['iphone12pm-landscape',926,428,3],['iphone12pm-portrait',428,926,3],['ipad',1180,820,2]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,hasTouch:true,isMobile:true}),p=await context.newPage();await begin(p);
      const initial=await p.evaluate(()=>{const s=window.__cookingdual.scene;return {fps:s.targetFPS,dpr:s.renderer.getPixelRatio(),antialias:s.renderer.getContext().getContextAttributes().antialias,shadows:s.renderer.shadowMap.enabled,environment:Boolean(s.scene.environment)};});
      assert.equal(initial.fps,60);assert.equal(initial.dpr,1.5);assert.equal(initial.antialias,true);assert.equal(initial.shadows,true);assert.equal(initial.environment,true);
      await p.evaluate(()=>{const {game}=window.__cookingdual;game.addOrder();game.addOrder();game.orders.shift();game.addOrder();game.player.hand={kind:'bread',state:'ready'};game.player.facingX=0;game.player.facingZ=1;});await frames(p,15);
      const ui=await p.evaluate(()=>{
        const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
        const buttons=Object.fromEntries(['joystick','joystick-knob','action-touch','throw-touch','dash-touch','drop-touch'].map(id=>{const el=document.getElementById(id);return [id,{...rect(el),blur:getComputedStyle(el).backdropFilter}];}));
        return {buttons,orders:[...document.querySelectorAll('.order')].map(rect),timer:rect(document.querySelector('.timer-box')),overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.equal(ui.overflow,false);assert.equal(ui.orders.length,3);
      const overlaps=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
      for(const [id,r] of Object.entries(ui.buttons)){assert.ok(r.x>=0&&r.right<=width&&r.y>=0&&r.bottom<=height,`${name}: ${id} clipped`);assert.equal(r.blur,'none');if(id!=='joystick-knob')assert.ok(r.w>=44);}
      const buttons=Object.entries(ui.buttons).filter(([id])=>id!=='joystick-knob');for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){
        const a=buttons[i][1],b=buttons[j][1],distance=Math.hypot(a.x+a.w/2-b.x-b.w/2,a.y+a.h/2-b.y-b.h/2);
        assert.ok(distance>=(a.w+b.w)/2+4,`${name}: circular ${buttons[i][0]} overlaps ${buttons[j][0]}`);
      }
      for(const order of ui.orders){assert.ok(order.x>=0&&order.right<=width);assert.equal(overlaps(order,ui.timer),false,`${name}: order overlaps timer`);}
      for(let i=0;i<ui.orders.length;i++)for(let j=i+1;j<ui.orders.length;j++)assert.equal(overlaps(ui.orders[i],ui.orders[j]),false,`${name}: orders overlap`);
      near(ui.buttons.joystick.x+ui.buttons.joystick.w/2,ui.buttons['joystick-knob'].x+ui.buttons['joystick-knob'].w/2,1);
      near(ui.buttons.joystick.y+ui.buttons.joystick.h/2,ui.buttons['joystick-knob'].y+ui.buttons['joystick-knob'].h/2,1);
      assert.ok(ui.buttons.joystick.x>=25);assert.ok(width-ui.buttons['action-touch'].right>=24);
      const camera=await p.evaluate(()=>{
        const {scene:s}=window.__cookingdual;s.cameraCenter.z-=.75;s.camera.position.copy(s.cameraCenter).add(s.cameraOffset);s.camera.lookAt(s.cameraCenter);
        const before={center:s.cameraCenter.toArray(),position:s.camera.position.toArray(),projection:s.camera.projectionMatrix.toArray()};s.setQuality('eco');
        return {before,after:{center:s.cameraCenter.toArray(),position:s.camera.position.toArray(),projection:s.camera.projectionMatrix.toArray()},eco:{fps:s.targetFPS,dpr:s.renderer.getPixelRatio(),shadows:s.renderer.shadowMap.enabled,environment:Boolean(s.scene.environment)}};
      });assert.deepEqual(camera.before,camera.after);assert.equal(camera.eco.fps,30);assert.equal(camera.eco.shadows,true);assert.equal(camera.eco.environment,true);
      await p.evaluate(()=>window.__cookingdual.scene.setQuality('auto'));
      evidence[name]={initial,ui,camera};
      await p.screenshot({path:`artifacts/reference-polish-${name}.png`});
      pass(`${name}: sharp full-lighting defaults, three readable orders, separated thumb targets, and no camera jump on quality changes`);
      await context.close();
    }
    assert.deepEqual(errors,[]);pass('no browser exceptions or failed asset requests');
    fs.writeFileSync('artifacts/reference-polish-report.json',JSON.stringify({date:new Date().toISOString(),engine:'Chromium emulation; actual iOS Safari is not available on this Windows host',checks,errors,evidence},null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
