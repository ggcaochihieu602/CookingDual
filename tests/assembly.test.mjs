import test from 'node:test';
import assert from 'node:assert/strict';
import { KitchenGame, RECIPES, itemKey, recipeForItem, isReadyPlate } from '../src/game.js';

const ready=kind=>({kind,state:{bread:'ready',meat:'cooked',vegetable:'chopped',sauce:'ready'}[kind]});
function setup(){const game=new KitchenGame();game.reset('playing');return game;}
function face(game,id,player=game.player){const s=game.stations.find(s=>s.id===id),a=s.approach,length=Math.hypot(a.x,a.z);Object.assign(player,{x:s.x+a.x,z:s.z+a.z,facingX:-a.x/length,facingZ:-a.z/length});return s;}
function tick(game,seconds,input={}){for(let i=0;i<Math.round(seconds/.02);i++)game.tick(.02,input);}

test('all four meals can be assembled on every type of station before adding a plate',()=>{
  for(const recipe of RECIPES)for(const definition of setup().stations){
    const game=setup(),s=face(game,definition.id);
    const parts=recipe.parts.map(key=>{const [kind,state]=key.split(':');return {kind,state};});
    s.item=parts[0];
    for(const part of parts.slice(1)){game.player.hand=part;game.interact();assert.equal(game.player.hand,null);}
    assert.equal(s.item.kind,'meal');assert.equal(recipeForItem(s.item)?.id,recipe.id);assert.equal(isReadyPlate(s.item),false);assert.equal(game.cleanPlates,3);
    game.player.hand={kind:'plate',parts:[]};game.cleanPlates--;game.interact();
    assert.equal(s.item,null);assert.equal(isReadyPlate(game.player.hand),true);assert.equal(game.player.hand.parts.length,parts.length);
  }
});

test('a carried meal can join a resting plate, and two separate ingredient groups combine',()=>{
  const game=setup(),s=face(game,'counter-a');
  s.item=game.merge(ready('meat'),ready('vegetable'));
  game.player.hand=game.merge(ready('bread'),ready('sauce'));game.interact();
  assert.equal(recipeForItem(s.item)?.id,'loaded');game.interact();
  const plate={kind:'plate',parts:[]};s.item=plate;game.cleanPlates--;game.interact();
  assert.equal(game.player.hand,null);assert.equal(s.item,plate);assert.equal(isReadyPlate(plate),true);
});

test('raw, burnt, duplicate ingredients and conflicting groups never destroy held or resting food',()=>{
  for(const invalid of [{kind:'meat',state:'raw'},{kind:'meat',state:'chopped'},{kind:'meat',state:'burnt'},ready('bread'),{kind:'meal',parts:[ready('sauce'),ready('bread')]}]){
    const game=setup(),s=face(game,'board-a');s.item=game.merge(ready('bread'),ready('vegetable'));game.player.hand=invalid;
    const before=JSON.stringify([s.item,game.player.hand]);game.interact();assert.equal(JSON.stringify([s.item,game.player.hand]),before);
  }
});

test('an unplated meal can be carried and stored but must get a plate before delivery',()=>{
  const game=setup();game.player.hand={kind:'meal',parts:RECIPES[0].parts.map(key=>{const [kind,state]=key.split(':');return {kind,state};})};
  const meal=game.player.hand,pan=face(game,'pan-a');game.interact();tick(game,25);assert.equal(itemKey(pan.item),itemKey(meal));game.interact();
  const s=face(game,'serve');game.interact();assert.equal(game.served,0);assert.equal(game.score,0);assert.equal(s.item,meal);
  game.player.hand={kind:'plate',parts:[]};game.cleanPlates--;game.interact();assert.equal(s.item,null);assert.equal(game.player.hand.kind,'plate');game.interact();
  assert.equal(game.served,1);assert.equal(game.cleanPlates+game.returningPlates.length,3);
});

test('two chefs have independent inputs and targets while the clock and pans tick only once',()=>{
  const game=setup();game.setupPlayers(['Lan','Minh']);const [a,b]=game.players;const ax=a.x,bx=b.x;
  game.stations.find(s=>s.id==='pan-a').item={kind:'meat',state:'chopped'};
  tick(game,.2,{players:{'chef-1':{x:-1},'chef-2':{x:1}}});
  assert.ok(a.x<ax-.7);assert.ok(b.x>bx+.7);assert.ok(Math.abs(game.time-179.8)<.0001);
  assert.ok(Math.abs(game.stations.find(s=>s.id==='pan-a').progress-.2)<.0001);
  face(game,'bread',a);face(game,'sauce',b);
  game.withPlayer(a.id,()=>game.interact());game.withPlayer(b.id,()=>game.interact());
  assert.equal(a.hand.kind,'bread');assert.equal(b.hand.kind,'sauce');assert.equal(a.targetId,'bread');assert.equal(b.targetId,'sauce');
  const client=setup();client.applySnapshot(game.snapshot(),b.id);assert.equal(client.player.id,b.id);assert.equal(client.target.id,'sauce');assert.equal(client.players.length,2);
  client.player.hand=null;assert.equal(b.hand.kind,'sauce');
});

test('simultaneous pickup has one winner and server events identify the acting chef',()=>{
  const events=[],game=setup();game.onEvent=e=>events.push(e);game.setupPlayers(['A','B']);
  const s=face(game,'counter-a',game.players[0]);face(game,'counter-a',game.players[1]);s.item=ready('meat');
  for(const p of game.players)game.withPlayer(p.id,()=>game.interact());
  assert.equal(game.players.filter(p=>p.hand).length,1);assert.equal(s.item,null);
  assert.equal(events.find(e=>e.type==='pickup').playerId,'chef-1');
  game.pause();const snapshot=game.snapshot();tick(game,2,{players:{'chef-1':{x:1},'chef-2':{x:-1}}});assert.deepEqual(game.snapshot(),snapshot);
});
