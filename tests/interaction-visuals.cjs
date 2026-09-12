const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/OS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const evidence={checks:[],errors:[]};
const pass=text=>{evidence.checks.push(text);console.log('PASS',text);};
const near=(a,b,t=.0001)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Users/OS/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:960}});
    page.on('pageerror',error=>evidence.errors.push(error.message));
    await page.goto('http://localhost:5173/?test=1');await page.waitForFunction(()=>window.__cookingdual);
    await page.getByRole('button',{name:'Vào bếp thôi!'}).click();await page.waitForFunction(()=>window.__cookingdual.game.phase==='playing');
    evidence.assist=await page.evaluate(()=>{
      const {game:g,scene:v}=window.__cookingdual;g.reset('playing');const s=g.stations.find(s=>s.id==='counter-b');
      g.player.x=s.x;g.player.z=s.z+1.12;g.player.facingX=1;g.player.facingZ=0;g.selectTarget();v.update(.02);
      const selected=[...v.stationViews].filter(([,view])=>view.selection.visible).map(([id])=>id),edges=v.stationViews.get(s.id).selection.children;
      return{target:g.player.targetId,selected,colors:edges.map(e=>e.material.color.getHexString()),casts:edges.some(e=>e.castShadow)};
    });
    assert.deepEqual(evidence.assist.selected,['counter-b']);assert.ok(evidence.assist.colors.every(c=>c==='ffffff'));assert.equal(evidence.assist.casts,false);
    await page.screenshot({path:'artifacts/interaction-white-counter.png'});pass('walking parallel to a counter selects it and shows one white, non-shadow-casting border');
    evidence.ground=await page.evaluate(()=>{
      const {game:g,scene:v}=window.__cookingdual;g.player.x=0;g.player.z=3.2;g.player.facingX=0;g.player.facingZ=-1;
      g.groundItems=[{id:'visual-food',type:'ground',x:.4,z:3.4,item:{kind:'bread',state:'ready'}}];g.selectTarget();v.update(.02);
      return {id:g.target?.id,visible:v.dynamics.groundRing.visible,color:v.dynamics.groundRing.material.color.getHexString()};
    });
    assert.equal(evidence.ground.id,'visual-food');assert.equal(evidence.ground.visible,true);assert.equal(evidence.ground.color,'ffffff');pass('nearby ground food behind the chef is selected and highlighted');
    evidence.throws=[];
    for(const character of ['ragged-dog','dog-tick']){
      const result=await page.evaluate(character=>{
        const {game:g,scene:v}=window.__cookingdual;g.reset('playing');g.setupPlayers(['Vàng','Xanh']);const p=g.players.find(p=>p.character===character);g.player=p;
        p.x=0;p.z=1;p.facingX=0;p.facingZ=1;p.hand={kind:'bread',state:'ready'};v.update(.2);for(let i=0;i<20;i++)v.update(.05);
        v.dynamics.setAim({x:0,z:5});v.dynamics.updateAim();const d=v.dynamics,origin=v.chefs.get(p.id).heldSocket.position;
        const line={...d.aimStart},end={...d.aimEnd},slope=(end.y-line.y+4*d.aimArc)/Math.hypot(end.x-line.x,end.z-line.z);
        g.throwItem({x:0,z:5});const flight=g.projectiles[0];v.playThrow(p.id);v.update(.01);
        return {character,origin:origin.toArray(),line,end,slope,flightStart:flight.start,arc:flight.arc};
      },character);
      near(result.line.x,result.origin[0]);near(result.line.y,result.origin[1]);near(result.line.z,result.origin[2]);
      near(result.slope,Math.tan(Math.PI/6));near(result.flightStart.x,result.line.x);near(result.flightStart.y,result.line.y);near(result.flightStart.z,result.line.z);
      evidence.throws.push(result);
    }
    pass('both chefs aim from the held food with a 30-degree departure; server flight uses the same origin and parabola');
    evidence.shadows=await page.evaluate(()=>{
      const {game:g,scene:v}=window.__cookingdual;g.reset('playing');g.setupPlayers(['Vàng','Xanh']);g.players.forEach((p,i)=>{p.x=-1+i*3;p.z=2;p.facingX=0;p.facingZ=1;p.walking=false;});
      for(let i=0;i<140;i++)v.update(1/60);
      const idleBefore=v.shadowUpdates;for(let i=0;i<60;i++)v.update(1/60);const idleUpdates=v.shadowUpdates-idleBefore;
      const movedBefore=v.shadowUpdates,counts=[];
      for(let i=0;i<60;i++){g.player.walking=true;g.player.x=-1+i*.025;v.update(1/60);counts.push(v.renderer.info.render.calls);}
      const movingUpdates=v.shadowUpdates-movedBefore,model=v.chefs.get(g.player.id),meshes=[];
      model.chefBody.traverse(mesh=>{if(mesh.isSkinnedMesh)meshes.push({cast:mesh.castShadow,receive:mesh.receiveShadow});});
      return {idleUpdates,movingUpdates,meshes,averageDrawCalls:counts.reduce((a,b)=>a+b)/counts.length,arrow:{color:model.directionArrow.material.color.getHexString(),ringColor:model.playerRing.material.color.getHexString(),rotation:model.chef.rotation.y,visible:model.directionArrow.visible}};
    });
    assert.equal(evidence.shadows.idleUpdates,0);assert.equal(evidence.shadows.movingUpdates,60);assert.ok(evidence.shadows.meshes.length>0);assert.ok(evidence.shadows.meshes.every(m=>m.cast&&!m.receive));
    assert.equal(evidence.shadows.arrow.visible,true);assert.equal(evidence.shadows.arrow.color,evidence.shadows.arrow.ringColor);near(evidence.shadows.arrow.rotation,0);
    await page.screenshot({path:'artifacts/interaction-arrow-shadows.png'});pass('moving shadows update from every rendered pose; idle shadows are cached and detailed skins avoid self-shadow shimmer');pass('the chef has an attached direction arrow matching the foot-ring color');
    assert.deepEqual(evidence.errors,[]);pass('no browser runtime errors during interaction, aiming, or moving-shadow checks');
    fs.writeFileSync('artifacts/interaction-visuals-report.json',JSON.stringify(evidence,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
