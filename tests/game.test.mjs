import test from 'node:test';
import assert from 'node:assert/strict';
import {KitchenGame,RULES,STATIONS,RECIPES,itemKey,isReadyPlate,recipeForPlate,plateCount} from '../src/game.js';
import {GROUND_PROJECTION} from '../src/movement.js';
const ready=kind=>({kind,state:{bread:'ready',meat:'cooked',vegetable:'chopped',sauce:'ready'}[kind]});
const dish=(id='herb')=>({kind:'plate',parts:RECIPES.find(r=>r.id===id).parts.map(key=>{const [kind,state]=key.split(':');return {kind,state};})});
const setup=()=>{const g=new KitchenGame();g.reset('playing');return g;};
const station=(g,id)=>g.stations.find(s=>s.id===id);
function face(g,id,p=g.player){const s=station(g,id),a=s.approach,n=Math.hypot(a.x,a.z);Object.assign(p,{x:s.x+a.x,z:s.z+a.z,facingX:-a.x/n,facingZ:-a.z/n});g.selectTarget();assert.equal(g.target.id,id);return s;}
function take(g,id){face(g,id);g.interact();}
function advance(g,time,input={}){for(let remaining=time;remaining>1e-9;remaining-=.02)g.tick(Math.min(.02,remaining),input);}
const countPlates=g=>g.allItems.reduce((count,item)=>count+plateCount(item),0);

test('new map has top-row food, two double boards, one double sink and four physical plates',()=>{
  const g=setup();assert.ok(Math.abs(RULES.speed-4.2*1.3)<1e-10);assert.equal(RULES.characterScale,1.3);assert.equal(g.cleanPlates,4);assert.equal(countPlates(g),4);
  assert.equal(g.stations.filter(s=>s.type==='plates').length,0);
  for(const id of ['bread','meat','vegetable'])assert.equal(station(g,id).z,-10.5);
  for(const id of ['board-a','board-b','sink'])assert.equal(station(g,id).width,2.78);
  assert.equal(g.stations.filter(s=>s.type==='pan').length,2);
  assert.equal(g.stations.filter(s=>s.item?.kind==='pan').length,2);
  assert.equal(station(g,'extinguisher').item.kind,'extinguisher');
});

test('speed is increased by 30%, projected diagonal normalized, wall collision prevents dashing through boxes',()=>{
  const a=setup(),b=setup();advance(a,.4,{x:1});advance(b,.4,{x:1,z:1});
  assert.ok(Math.abs(a.player.x-RULES.speed*.4)<1e-7);assert.ok(Math.abs(Math.hypot(b.player.x,(b.player.z-3.2)*GROUND_PROJECTION)-RULES.speed*.4)<1e-7);
  face(a,'counter-a');a.dash();advance(a,1,{x:0,z:-1,dash:true});assert.ok(a.player.z>-.5);assert.ok(a.canStand(a.player.x,a.player.z));
  assert.equal(a.player.cooldown,0);a.work=null;a.dash();assert.equal(a.player.dash,RULES.dashDuration);
});

test('a held dash input chains boosts without a cooldown',()=>{
  const g=setup();Object.assign(g.player,{x:-8,z:3,facingX:1,facingZ:0});advance(g,1,{x:1,dash:true});
  assert.ok(g.player.x>3);assert.equal(g.player.cooldown,0);
});

test('every equipment approach is reachable from spawn through actual collision geometry',()=>{
  const g=setup(),step=.1,key=(x,z)=>`${x},${z}`,start={x:0,z:32},queue=[start],seen=new Set([key(0,32)]);
  for(let i=0;i<queue.length;i++)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const x=queue[i].x+dx,z=queue[i].z+dz,k=key(x,z);if(seen.has(k)||!g.canStand(x*step,z*step))continue;seen.add(k);queue.push({x,z});
  }
  for(const s of STATIONS)assert.ok(seen.has(key(Math.round((s.x+s.approach.x)/step),Math.round((s.z+s.approach.z)/step))),s.id);
  assert.equal(seen.has(key(0,94)),false,'the customer sidewalk is separated from the kitchen');assert.equal(g.canStand(0,7),false,'counter closes the old bottom doorway');assert.equal(g.canStand(8.5,-5),false);
});

test('chopping pauses when released or moving and resumes on the same board',()=>{
  const g=setup();take(g,'vegetable');take(g,'board-a');advance(g,1,{work:true});const s=station(g,'board-a'),progress=s.progress;
  advance(g,.4);assert.equal(s.progress,progress);advance(g,.1,{x:.1,work:true});assert.equal(s.progress,progress);
  face(g,'board-a');advance(g,1.3,{work:true});assert.equal(s.item.state,'chopped');g.interact();assert.equal(itemKey(g.player.hand),'vegetable:chopped');
});

test('portable pans cook only on burners and keep progress while carried, dropped or on a counter',()=>{
  const g=setup(),s=face(g,'pan-a');g.player.hand={kind:'meat',state:'chopped'};g.interact();advance(g,3);
  const pan=s.item;assert.ok(Math.abs(pan.progress-3)<1e-7);g.interact();assert.equal(g.player.hand,pan);advance(g,2);assert.equal(pan.food.state,'chopped');
  take(g,'counter-a');advance(g,4);assert.ok(Math.abs(pan.progress-3)<1e-7);g.interact();g.drop();advance(g,2);assert.equal(pan.food.state,'chopped');
  g.interact();take(g,'pan-b');assert.equal(g.player.hand,pan);assert.equal(station(g,'pan-b').item.food,null);
  take(g,'pan-a');advance(g,3.1);assert.equal(pan.food.state,'cooked');
});

test('only chopped meat cooks; loose food on an empty burner stays unchanged',()=>{
  const g=setup(),s=face(g,'pan-a');g.player.hand={kind:'meat',state:'raw'};const raw=g.player.hand;g.interact();assert.equal(g.player.hand,raw);assert.equal(s.item.food,null);
  g.player.hand=null;g.interact();take(g,'counter-a');g.player.hand=raw;take(g,'pan-a');advance(g,30);assert.equal(s.item,raw);assert.equal(raw.state,'raw');
});

test('cooked pan pours onto a plate or ingredients, leaving an empty pan in hand',()=>{
  for(const target of [{kind:'plate',parts:[]},ready('bread'),{kind:'meal',parts:[ready('bread'),ready('vegetable')]}]){
    const g=setup(),s=face(g,'counter-a');s.item=target;const pan={kind:'pan',food:ready('meat'),progress:6,heat:5};g.player.hand=pan;g.interact();
    assert.equal(g.player.hand,pan);assert.equal(pan.food,null);assert.ok(s.item.parts.some(p=>p.kind==='meat'));
  }
  const g=setup(),s=face(g,'pan-a');s.item.food=ready('meat');g.player.hand={kind:'plate',parts:[ready('bread')]};g.interact();assert.equal(recipeForPlate(g.player.hand).id,'classic');assert.equal(s.item.kind,'pan');assert.equal(s.item.food,null);
});

test('burn warning begins before a 21-second grace period; fire spreads only to adjacent boxes',()=>{
  const g=setup(),events=[];g.onEvent=e=>events.push(e);const s=station(g,'pan-a');s.item.food=ready('meat');
  advance(g,20.9);assert.equal(s.item.food.state,'cooked');assert.ok(events.some(e=>e.type==='burn-warning'));advance(g,.2);assert.equal(s.item.food.state,'burnt');assert.ok(s.fire>0);
  advance(g,6.1);assert.ok(station(g,'main-back--4').fire);assert.ok(station(g,'counter-a').fire);assert.equal(station(g,'main-back--5').fire,0);assert.equal(station(g,'pan-b').fire,0);
  face(g,'pan-a');g.interact();assert.equal(g.player.hand,null);
});

test('extinguisher puts out fire; burnt contents go in trash and the same pan is reusable',()=>{
  const g=setup(),s=face(g,'pan-a');s.item.food={kind:'meat',state:'burnt'};s.fire=1;
  const tool=station(g,'extinguisher').item;station(g,'extinguisher').item=null;g.player.hand=tool;
  advance(g,1.3,{work:true});assert.equal(s.fire,0);assert.ok(s.wet>0);assert.equal(g.player.hand,tool);
  take(g,'extinguisher');face(g,'pan-a');g.interact();const pan=g.player.hand;assert.equal(pan.food.state,'burnt');
  take(g,'trash');assert.equal(g.player.hand,pan);assert.equal(pan.food,null);take(g,'pan-a');g.player.hand={kind:'meat',state:'chopped'};g.interact();advance(g,6.1);assert.equal(s.item.food.state,'cooked');
});

test('fire, cooking, flights and orders all freeze during pause and results',()=>{
  const g=setup();station(g,'pan-a').item.food=ready('meat');g.player.hand=ready('bread');g.throwItem({x:3,z:3});g.pause();const before=g.snapshot();advance(g,20,{x:1});assert.deepEqual(g.snapshot(),before);
  g.resume();g.time=.01;advance(g,.02);assert.equal(g.phase,'results');const after=g.snapshot();g.drop();g.dash();g.interact();advance(g,10);assert.deepEqual(g.snapshot(),after);
});

test('four physical plates return as one dirty stack, wash continuously and collect beside the sink',()=>{
  const g=setup();
  for(const id of ['plates','plate-one','plate-two','plate-four']){
    take(g,id);g.player.hand.parts=dish(g.orders[0].recipeId).parts;take(g,'serve');advance(g,.05);assert.equal(countPlates(g),4);
  }
  assert.equal(g.cleanPlates,0);assert.equal(g.dirtyPlates,4);
  const returns=[...g.stations,...g.groundItems].filter(s=>s.item?.dirty);assert.equal(returns.length,1);assert.equal(plateCount(returns[0].item),4);
  take(g,returns[0].id);assert.equal(g.player.hand.dirty,true);assert.equal(plateCount(g.player.hand),4);
  take(g,'sink');assert.equal(g.player.hand,null);assert.equal(plateCount(station(g,'sink').item),4);
  advance(g,RULES.wash*4+.1,{work:true});assert.equal(station(g,'sink').item,null);
  assert.equal(station(g,'upper-front--2').item.dirty,false);
  const cleanLocations=[...g.stations,...g.groundItems].filter(s=>s.item?.kind==='plate');assert.equal(cleanLocations.length,4);
  for(const location of cleanLocations){assert.equal(plateCount(location.item),1);assert.equal(location.item.dirty,false);if(location.type==='ground')assert.ok(g.canStand(location.x,location.z,.16));}
  const output=station(g,'upper-front--2');Object.assign(g.player,{x:output.x+output.approach.x,z:output.z+output.approach.z,facingX:0,facingZ:1});
  assert.equal(g.selectTarget().item.kind,'plate');g.interact();assert.equal(g.player.hand.kind,'plate');assert.equal(g.player.hand.dirty,false);assert.equal(countPlates(g),4);
  assert.equal(g.cleanPlates,4);assert.equal(g.dirtyPlates,0);
});

test('full return trays and wash counters put plates on reachable floor instead of losing them',()=>{
  const g=setup();take(g,'plates');const plate=g.player.hand;plate.parts=dish().parts;
  for(const s of g.stations)if(s.type==='counter'&&!s.item)s.item=ready('bread');take(g,'serve');assert.equal(countPlates(g),4);
  const returned=g.groundItems.find(g=>g.item===plate);assert.ok(returned);assert.equal(plate.dirty,true);assert.ok(g.canStand(returned.x,returned.z,.16));
  g.clearSlot(returned);const sink=face(g,'sink');sink.item=plate;advance(g,2.1,{work:true});assert.equal(sink.item,null);assert.equal(plate.dirty,false);assert.ok(g.groundItems.some(g=>g.item===plate));assert.equal(countPlates(g),4);
});

test('empty counter slots accept any portable item and occupied slots never destroy incompatible items',()=>{
  const kinds=[ready('bread'),{kind:'meat',state:'raw'},{kind:'plate',parts:[],dirty:true},{kind:'pan',food:null,progress:0,heat:0},{kind:'extinguisher'}];
  for(const def of STATIONS)for(const sample of kinds){
    const g=setup(),s=face(g,def.id);s.item=null;g.player.hand=structuredClone(sample);const hand=g.player.hand;
    if(s.type==='trash')continue;g.interact();assert.equal(s.item,hand,`${s.id}/${sample.kind}`);assert.equal(g.player.hand,null);g.interact();assert.equal(g.player.hand,hand);assert.equal(s.item,null);
    s.item={kind:'vegetable',state:'raw'};const before=JSON.stringify([s.item,g.player.hand]);g.interact();assert.equal(JSON.stringify([s.item,g.player.hand]),before);
  }
});

test('all four exact recipes serve; raw, duplicate, dirty and unmatched plates are refused',()=>{
  for(const recipe of RECIPES){const g=setup();g.orders=[{id:1,recipeId:recipe.id,remaining:90,total:100}];take(g,'plates');g.player.hand.parts=dish(recipe.id).parts;take(g,'serve-left');assert.equal(g.served,1);assert.equal(countPlates(g),4);}
  for(const bad of [{...dish(),dirty:true},{kind:'plate',parts:[ready('bread'),{kind:'meat',state:'raw'}]},dish('loaded'),{kind:'plate',parts:[ready('bread'),ready('meat'),ready('meat')]}]){
    const g=setup(),s=face(g,'serve');g.player.hand=bad;g.interact();assert.equal(g.served,0);assert.ok(g.player.hand===bad||s.item===bad);
  }
});

test('orders cap at three, expire, refill and replay resets physical objects',()=>{
  const g=setup();advance(g,90);assert.equal(g.orders.length,3);advance(g,15);assert.ok(g.missed>0);assert.ok(g.orders.length>0);g.score=650;g.time=.01;advance(g,.02);assert.equal(g.stars,4);assert.equal(g.best,650);
  g.start();assert.equal(g.cleanPlates,4);assert.equal(g.groundItems.length,0);assert.equal(g.projectiles.length,0);assert.equal(g.time,180);assert.equal(g.best,650);
});
