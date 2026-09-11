import test from 'node:test';
import assert from 'node:assert/strict';
import {KitchenGame,RECIPES,RULES,itemKey,recipeForItem,isReadyPlate} from '../src/game.js';
const ready=kind=>({kind,state:{bread:'ready',meat:'cooked',vegetable:'chopped',sauce:'ready'}[kind]});
const setup=()=>{const g=new KitchenGame();g.reset('playing');return g;};
function face(g,id,p=g.player){const s=g.stations.find(s=>s.id===id),a=s.approach,n=Math.hypot(a.x,a.z);Object.assign(p,{x:s.x+a.x,z:s.z+a.z,facingX:-a.x/n,facingZ:-a.z/n});return s;}
function tick(g,seconds,input={}){for(let r=seconds;r>1e-9;r-=.02)g.tick(Math.min(.02,r),input);}

test('all unplated recipes stay in hand after merging ready ingredients at any clear station',()=>{
  for(const recipe of RECIPES)for(const def of setup().stations){
    const g=setup(),s=face(g,def.id),parts=recipe.parts.map(key=>{const [kind,state]=key.split(':');return {kind,state};});
    if(s.item?.kind==='plate')g.placeGround(s.item,5,3);
    g.player.hand=parts[0];
    for(const part of parts.slice(1)){s.item=part;g.interact();assert.equal(s.item,null);assert.ok(g.player.hand);}
    assert.equal(recipeForItem(g.player.hand).id,recipe.id);assert.equal(isReadyPlate(g.player.hand),false);assert.equal(g.cleanPlates,4);
  }
});

test('plate assembly works in both directions and rejects dirt, raw food and duplicates losslessly',()=>{
  const g=setup(),s=face(g,'counter-a');s.item={kind:'plate',parts:[]};g.player.hand=ready('bread');g.interact();assert.equal(g.player.hand,null);assert.equal(s.item.parts.length,1);
  const plate=s.item;s.item=ready('meat');g.player.hand=plate;g.interact();assert.equal(g.player.hand,plate);assert.equal(s.item,null);assert.equal(isReadyPlate(plate),true);
  for(const item of [ready('bread'),{kind:'meat',state:'raw'},{kind:'meat',state:'burnt'},{kind:'plate',dirty:true,parts:[]}]){
    s.item=item;const before=JSON.stringify([s.item,g.player.hand]);g.interact();assert.equal(JSON.stringify([s.item,g.player.hand]),before);
  }
});

test('floor drop, pickup and in-hand floor assembly conserve objects and pan progress',()=>{
  const g=setup();g.player.hand=ready('bread');g.drop();assert.equal(g.player.hand,null);assert.equal(g.groundItems.length,1);g.interact();assert.equal(itemKey(g.player.hand),'bread:ready');assert.equal(g.groundItems.length,0);
  const floor=g.placeGround(ready('meat'),g.player.x,g.player.z-.7);g.interact();assert.equal(itemKey(g.player.hand),'meal:bread:ready,meat:cooked');assert.ok(!g.groundItems.includes(floor));
  g.player.hand={kind:'pan',food:{kind:'meat',state:'chopped'},progress:3,heat:0};g.drop();tick(g,8);g.interact();assert.equal(g.player.hand.progress,3);assert.equal(g.player.hand.food.state,'chopped');
});

test('throw lands on floor, a counter, an empty pan, or in a teammate hand',()=>{
  for(const destination of ['floor','counter','pan','player']){
    const g=setup();g.setupPlayers(['Lan','Minh']);const [p,q]=g.players;Object.assign(p,{x:-3,z:3});Object.assign(q,{x:0,z:3});p.hand={kind:'meat',state:'chopped'};
    const target=destination==='floor'?{x:-2,z:4}:destination==='counter'?g.stations.find(s=>s.id==='counter-a'):destination==='pan'?g.stations.find(s=>s.id==='pan-a'):q;
    const hand=p.hand;assert.equal(g.throwItem(target),true);assert.equal(p.hand,null);assert.equal(g.projectiles[0].item,hand);tick(g,1);
    assert.equal(g.projectiles.length,0);
    if(destination==='floor')assert.ok(g.groundItems.some(e=>e.item===hand));
    if(destination==='counter')assert.equal(target.item,hand);
    if(destination==='pan')assert.equal(target.item.food,hand);
    if(destination==='player')assert.equal(q.hand,hand);
  }
});

test('throwing into a held meal merges; incompatible catches and occupied targets fall to safe floor',()=>{
  const g=setup();g.setupPlayers(['A','B']);const [p,q]=g.players;Object.assign(p,{x:-2,z:3});Object.assign(q,{x:1,z:3});p.hand=ready('meat');q.hand=ready('bread');g.throwItem(q);tick(g,1);assert.equal(recipeForItem(q.hand).id,'classic');
  p.hand=ready('bread');g.throwItem(q);tick(g,1);assert.equal(g.groundItems.length,1);assert.equal(recipeForItem(q.hand).id,'classic');
  const s=g.stations.find(s=>s.id==='counter-a');s.item={kind:'vegetable',state:'raw'};p.hand={kind:'pan',food:null,progress:0,heat:0};g.throwItem(s);tick(g,1);assert.equal(s.item.kind,'vegetable');assert.ok(g.groundItems.some(e=>e.item.kind==='pan'));for(const e of g.groundItems)assert.ok(g.canStand(e.x,e.z,.16));
});

test('throwing a complete plated order serves and returns the same physical plate',()=>{
  const g=setup(),s=g.stations.find(s=>s.id==='serve');Object.assign(g.player,{x:7,z:4});
  const plate=g.stations.find(s=>s.id==='plates').item;g.stations.find(s=>s.id==='plates').item=null;plate.parts=RECIPES[0].parts.map(key=>{const [kind,state]=key.split(':');return {kind,state};});g.player.hand=plate;
  g.throwItem(s);tick(g,1);assert.equal(g.served,1);assert.equal(plate.dirty,true);assert.equal(g.allItems.filter(i=>i.kind==='plate').length,4);assert.equal(g.player.hand,null);
});

test('throwing a plate onto a cooked floor pan preserves the pan, plated food and all four plates',()=>{
  for(const contents of [[],[ready('bread')]]){
    const g=setup(),panStation=g.stations.find(s=>s.id==='pan-a'),pan=panStation.item,meat=ready('meat');
    panStation.item=null;Object.assign(pan,{food:meat,progress:RULES.cook,heat:5});const floor=g.placeGround(pan,2,3);
    const plateStation=g.stations.find(s=>s.id==='plates'),plate=plateStation.item;plateStation.item=null;plate.parts=contents;g.player.hand=plate;
    g.throwItem(floor);tick(g,1);
    assert.equal(floor.item,pan);assert.equal(pan.food,null);assert.equal(pan.progress,0);assert.equal(pan.heat,0);
    const plated=g.groundItems.find(e=>e.item.kind==='plate');assert.ok(plated);assert.ok(plated.item.parts.includes(meat));
    assert.deepEqual(plated.item.parts.map(itemKey).sort(),[...contents,meat].map(itemKey).sort());
    assert.equal(g.allItems.filter(i=>i.kind==='plate').length,4);assert.equal(g.allItems.filter(i=>i.kind==='pan').length,2);
    assert.ok(g.canStand(plated.x,plated.z,.16));assert.equal(g.projectiles.length,0);assert.equal(g.player.hand,null);
  }
});

test('a dirty or duplicate plate thrown onto a floor pan leaves its cooked food intact',()=>{
  for(const invalid of [{kind:'plate',parts:[],dirty:true},{kind:'plate',parts:[ready('meat')]}]){
    const g=setup(),pan=g.stations.find(s=>s.id==='pan-a').item,meat=ready('meat');g.stations.find(s=>s.id==='pan-a').item=null;
    Object.assign(pan,{food:meat,progress:RULES.cook,heat:5});const floor=g.placeGround(pan,2,3);g.player.hand=invalid;
    g.throwItem(floor);tick(g,1);assert.equal(pan.food,meat);assert.equal(pan.heat,5);assert.ok(g.groundItems.some(e=>e.item===invalid));
  }
});

test('throws reject non-finite payloads, clamp distance, and never lose an out-of-map object',()=>{
  const g=setup();g.player.hand=ready('bread');for(const p of [null,{}, {x:Infinity,z:0},{x:0,z:NaN}])assert.equal(g.throwItem(p),false);
  const end=g.throwTarget({x:1e10,z:1e10});assert.ok(Math.hypot(end.x-g.player.x,end.z-g.player.z)<=RULES.throwRange+.1);
  const bread=g.player.hand;g.throwItem({x:1e10,z:-1e10});tick(g,1.2);assert.ok(g.allItems.includes(bread));
});

test('two players own independent characters and controls, shared physics ticks only once',()=>{
  const g=setup();g.setupPlayers(['Lan','Minh']);const [a,b]=g.players,ax=a.x,bx=b.x,pan=g.stations.find(s=>s.id==='pan-a').item;pan.food={kind:'meat',state:'chopped'};
  tick(g,.2,{players:{'chef-1':{x:-1},'chef-2':{x:1}}});assert.ok(a.x<ax-.9);assert.ok(b.x>bx+.9);assert.ok(Math.abs(g.time-179.8)<1e-7);assert.ok(Math.abs(pan.progress-.2)<1e-7);
  assert.equal(a.character,'ragged-dog');assert.equal(b.character,'dog-tick');face(g,'bread',a);face(g,'sauce',b);
  g.withPlayer(a.id,()=>g.interact());g.withPlayer(b.id,()=>g.interact());assert.equal(a.hand.kind,'bread');assert.equal(b.hand.kind,'sauce');
  g.withPlayer(b.id,()=>g.drop());const snapshot=g.snapshot(),client=setup();client.applySnapshot(snapshot,b.id);assert.equal(client.player.character,'dog-tick');assert.equal(client.groundItems.length,1);assert.equal(client.target.type,'ground');client.groundItems[0].item=null;assert.ok(g.groundItems[0].item);
});

test('concurrent floor pickup and pan loading have a single owner and no duplication',()=>{
  const g=setup();g.setupPlayers(['A','B']);g.placeGround(ready('meat'),0,2.5);
  for(const p of g.players){Object.assign(p,{x:0,z:3.2,facingX:0,facingZ:-1});g.withPlayer(p.id,()=>g.interact());}
  assert.equal(g.groundItems.length,0);assert.equal(g.players.filter(p=>p.hand).length,1);
  const s=g.stations.find(s=>s.id==='pan-a');
  for(const p of g.players){face(g,s.id,p);p.hand={kind:'meat',state:'chopped'};g.withPlayer(p.id,()=>g.interact());}
  assert.equal(s.item.food.state,'chopped');assert.equal(g.players.filter(p=>p.hand).length,1);
});
