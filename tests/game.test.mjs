import test from 'node:test';
import assert from 'node:assert/strict';
import { KitchenGame, RULES, STATIONS, SPAWN, RECIPES, getRecipe, recipeForPlate, itemKey, isReadyPlate } from '../src/game.js';

function setup() { const game = new KitchenGame(); game.reset('playing'); return game; }
function advance(game, seconds, input = {}) { for (let i = 0; i < Math.ceil(seconds / .02); i++) game.tick(.02, input); }
function station(game, id) { return game.stations.find(s => s.id === id); }
function face(game, id) {
  const s = station(game, id);
  const a = s.approach, length = Math.hypot(a.x, a.z);
  Object.assign(game.player, { x: s.x + a.x, z: s.z + a.z, facingX: -a.x / length, facingZ: -a.z / length });
  assert.equal(game.canStand(game.player.x, game.player.z), true, `${id} must be reachable`);
  assert.equal(game.selectTarget()?.id, id);
  return s;
}
function take(game, id) { face(game, id); game.interact(); }
function prepared(kind) { return { kind, state: ['bread', 'sauce'].includes(kind) ? 'ready' : kind === 'meat' ? 'cooked' : 'chopped' }; }
function plate(recipe = RECIPES[0]) { return { kind: 'plate', parts: recipe.parts.map(key => { const [kind, state] = key.split(':'); return {kind, state}; }) }; }
function countPlates(game) { return game.cleanPlates + game.dirtyPlates + game.returningPlates.length + Number(game.player.hand?.kind === 'plate') + game.stations.filter(s => s.item?.kind === 'plate').length; }

test('the menu, countdown and pause do not spend the 180-second shift', () => {
  const game = new KitchenGame(); advance(game, 8); assert.equal(game.time, 180);
  game.start(); advance(game, 1); assert.equal(game.phase, 'countdown'); assert.equal(game.time, 180);
  game.pause(); const countdown = game.countdown; advance(game, 5); assert.equal(game.countdown, countdown);
  game.resume(); advance(game, 2.1); assert.equal(game.phase, 'playing'); assert.ok(game.time > 179.8);
});

test('every station can be selected at its visible approach and facing away selects none', () => {
  const game = setup();
  for (const s of STATIONS) { face(game, s.id); game.player.facingX *= -1; game.player.facingZ *= -1; assert.notEqual(game.selectTarget()?.id, s.id); }
});

test('diagonal speed is normalized and movement slides safely along counters', () => {
  const a = setup(), b = setup();
  advance(a, .2, { x: 1 }); advance(b, .2, { x: 1, z: 1 });
  assert.ok(Math.abs(Math.hypot(a.player.x, a.player.z - SPAWN.z) - Math.hypot(b.player.x, b.player.z - SPAWN.z)) < .0001);
  const target = face(a, 'counter-b'); advance(a, 3, { x: 0, z: -1 }); assert.ok(a.player.z >= target.z + target.depth/2 + RULES.radius - .01);
  a.dash(); advance(a, .4, { z: -1 }); assert.equal(a.canStand(a.player.x, a.player.z), true); assert.ok(a.player.z > target.z);
  advance(a, .5, { x: 1, z: -1 }); assert.ok(a.player.x > 0); assert.equal(a.canStand(a.player.x, a.player.z), true);
});

test('a fresh ingredient cannot skip chopping or be plated raw', () => {
  const game = setup(); take(game, 'meat'); const hand = game.player.hand; take(game, 'pan-a');
  assert.equal(game.player.hand, null); assert.equal(station(game, 'pan-a').item, hand);
  advance(game, 7); assert.equal(hand.state, 'raw'); game.interact(); assert.equal(game.player.hand, hand);
  const empty = { kind: 'plate', parts: [] }; assert.equal(game.merge(empty, hand), false); assert.equal(empty.parts.length, 0);
});

test('chopping pauses when released or walking and resumes without losing progress', () => {
  const game = setup(); take(game, 'vegetable'); take(game, 'board-a');
  advance(game, 1, { work: true }); const board = station(game, 'board-a'), progress = board.progress;
  advance(game, .4); assert.equal(board.progress, progress);
  advance(game, .1, { x: .1, work: true }); assert.equal(board.progress, progress);
  face(game, 'board-a'); advance(game, 1.3, { work: true }); assert.equal(board.item.state, 'chopped');
  game.interact(); assert.equal(itemKey(game.player.hand), 'vegetable:chopped'); assert.equal(board.item, null);
});

test('cooking continues while away, pauses with the game, burns, and can be cleaned', () => {
  const game = setup(); game.player.hand = { kind: 'meat', state: 'chopped' }; take(game, 'pan-a');
  const pan = station(game, 'pan-a'); advance(game, 3); game.pause(); advance(game, 10); assert.ok(pan.progress < 3.01);
  game.resume(); advance(game, 3.1); assert.equal(pan.item.state, 'cooked'); advance(game, 14.1); assert.equal(pan.item.state, 'burnt');
  face(game, 'pan-a'); advance(game, 1.3, { work: true }); assert.equal(pan.item, null);
  game.player.hand = { kind: 'meat', state: 'chopped' }; game.interact(); assert.equal(pan.item.state, 'chopped');
});

test('full first dish from sources to chopping, cooking, assembling, serving and washing', () => {
  const game = setup();
  take(game, 'meat'); take(game, 'board-a'); advance(game, 2.3, { work: true }); game.interact();
  take(game, 'pan-a'); advance(game, 6.1); game.interact();
  take(game, 'counter-a'); take(game, 'plates'); take(game, 'counter-a');
  assert.equal(game.player.hand.kind, 'plate'); assert.equal(game.player.hand.parts[0].state, 'cooked');
  take(game, 'counter-b'); take(game, 'bread'); take(game, 'counter-b');
  take(game, 'vegetable'); take(game, 'board-a'); advance(game, 2.3, { work: true }); game.interact(); take(game, 'counter-b');
  assert.equal(game.player.hand, null); assert.equal(isReadyPlate(station(game, 'counter-b').item), true);
  game.interact(); take(game, 'serve'); assert.equal(game.served, 1); assert.ok(game.score >= 100); assert.equal(game.stars, 1);
  assert.equal(game.player.hand, null); assert.equal(countPlates(game), 3);
  advance(game, 3.1); assert.equal(game.dirtyPlates, 1); face(game, 'sink'); advance(game, 2.1, { work: true });
  assert.equal(game.cleanPlates, 3); assert.equal(game.dirtyPlates, 0); assert.equal(countPlates(game), 3);
});

test('plate assembly works from either hand and rejects duplicates without consuming food', () => {
  const game = setup(); take(game, 'plates'); take(game, 'counter-a'); game.player.hand = prepared('bread'); game.interact();
  const counter = station(game, 'counter-a'); assert.equal(counter.item.parts.length, 1); assert.equal(game.player.hand, null);
  const duplicate = prepared('bread'); game.player.hand = duplicate; game.interact(); assert.equal(game.player.hand, duplicate); assert.equal(counter.item.parts.length, 1);
  game.player.hand = null; game.interact(); counter.item = prepared('meat'); game.interact();
  assert.equal(game.player.hand.parts.length, 2); assert.equal(counter.item, null);
  assert.equal(isReadyPlate({ kind: 'plate', parts: [prepared('bread'), prepared('meat'), prepared('meat')] }), false);
});

test('trash preserves a held plate and invalid serving preserves the dish', () => {
  const game = setup(); take(game, 'plates'); game.player.hand.parts.push(prepared('bread')); const hand = game.player.hand;
  take(game, 'serve'); assert.equal(station(game, 'serve').item, hand); assert.equal(game.score, 0); game.interact();
  take(game, 'trash'); advance(game, .7, { work: true }); assert.equal(station(game, 'trash').item.kind, 'plate');
  assert.equal(station(game, 'trash').item.parts.length, 0); assert.equal(countPlates(game), 3);
});

test('all three plates circulate through a busy kitchen with no resource dead end', () => {
  const game = setup();
  for (let i = 0; i < 3; i++) {
    take(game, 'plates'); game.player.hand.parts = plate(getRecipe(game.orders[0].recipeId)).parts; take(game, 'serve'); advance(game, .1);
    assert.equal(countPlates(game), 3);
  }
  take(game, 'plates'); assert.equal(game.player.hand, null); advance(game, 3.1);
  assert.equal(game.dirtyPlates, 3); face(game, 'sink'); advance(game, 6.1, { work: true });
  assert.equal(game.cleanPlates, 3); assert.equal(countPlates(game), 3);
});

test('orders cap at three, expire fairly, and a new order is always available', () => {
  const game = setup(); advance(game, 90); assert.equal(game.orders.length, 3);
  advance(game, 15); assert.ok(game.missed >= 1); assert.equal(game.score, 0); assert.equal(game.combo, 0); assert.ok(game.orders.length > 0);
});

test('the shift ends once, results freeze all gameplay, and replay resets all state', () => {
  const game = setup(); let endings = 0; game.onEvent = e => { if (e.type === 'finish') endings++; };
  game.score = 650; game.time = .1; advance(game, 1); assert.equal(game.phase, 'results'); assert.equal(game.stars, 3); assert.equal(game.best, 650); assert.equal(endings, 1);
  const before = JSON.stringify(game.player); game.interact(); game.dash(); advance(game, 10, { x: 1, work: true }); assert.equal(JSON.stringify(game.player), before); assert.equal(endings, 1);
  game.start(); assert.equal(game.time, 180); assert.equal(game.score, 0); assert.equal(game.cleanPlates, 3); assert.equal(game.best, 650); assert.equal(game.orders.length, 1);
});

test('every empty tile accepts and returns every portable item without changing stock', () => {
  const items = [
    { kind: 'bread', state: 'ready' },
    { kind: 'sauce', state: 'ready' },
    ...['raw', 'chopped', 'cooked', 'burnt'].map(state => ({kind:'meat',state})),
    ...['raw', 'chopped'].map(state => ({kind:'vegetable',state})),
    { kind: 'plate', parts: [] }, { kind: 'plate', parts: [prepared('bread')] },
  ];
  for (const definition of STATIONS) for (const example of items) {
    const game = setup(), s = face(game, definition.id), item = structuredClone(example);
    game.player.hand = item; game.interact();
    assert.equal(s.item, item, `${s.id} must accept ${itemKey(item)}`);
    assert.equal(game.player.hand, null); assert.equal(game.cleanPlates, 3);
    game.interact(); assert.equal(game.player.hand, item); assert.equal(s.item, null);
  }
});

test('plate and food merge in both directions on all 55 tile positions', () => {
  for (const definition of STATIONS) {
    const game = setup(), s = face(game, definition.id), dish = {kind:'plate',parts:[]};
    game.player.hand = dish; game.interact(); game.player.hand = prepared('meat'); game.interact();
    assert.equal(s.item, dish); assert.equal(dish.parts.length, 1); assert.equal(game.player.hand, null);
    game.interact(); const vegetable = prepared('vegetable'); s.item = vegetable; game.interact();
    assert.equal(game.player.hand, dish); assert.equal(dish.parts.length, 2); assert.equal(s.item, null);
    assert.deepEqual(dish.parts.map(itemKey), ['meat:cooked', 'vegetable:chopped']);
  }
});

test('occupied sources and workstations never overwrite or pull hidden stock through an object', () => {
  for (const definition of STATIONS) {
    const game = setup(), s = face(game, definition.id), stored = {kind:'meat',state:'raw'};
    s.item = stored; const carried = {kind:'vegetable',state:'raw'}; game.player.hand = carried;
    game.interact(); assert.equal(s.item,stored); assert.equal(game.player.hand,carried); assert.equal(game.cleanPlates,3);
  }
});

test('temporary storage on appliances never cooks vegetables or modifies plates', () => {
  const game = setup(), pan = face(game, 'pan-b');
  game.player.hand = prepared('vegetable'); game.interact(); advance(game, 23);
  assert.equal(itemKey(pan.item),'vegetable:chopped'); assert.equal(pan.progress,0); assert.equal(pan.heat,0);
  const dish = {kind:'plate',parts:[prepared('meat')]}; pan.item=dish; advance(game,23);
  assert.equal(itemKey(pan.item),'plate:meat:cooked'); assert.equal(pan.heat,0);
  const board = face(game,'board-b'); board.item=dish; game.player.hand=null; advance(game,3,{work:true});
  assert.equal(itemKey(board.item),'plate:meat:cooked'); assert.equal(board.progress,0);
});

test('all counter approaches and both platforms are connected through walkable floor', () => {
  const game=setup(), step=.1, key=(x,z)=>`${x},${z}`;
  const origin={x:Math.round(SPAWN.x/step),z:Math.round(SPAWN.z/step)};
  const queue=[origin], seen=new Set([key(origin.x,origin.z)]);
  for(let i=0;i<queue.length;i++) {
    const node=queue[i];
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x=node.x+dx,z=node.z+dz,k=key(x,z);
      if(seen.has(k)||!game.canStand(x*step,z*step)) continue;
      seen.add(k);queue.push({x,z});
    }
  }
  for(const s of STATIONS) assert.ok(seen.has(key(Math.round((s.x+s.approach.x)/step),Math.round((s.z+s.approach.z)/step))),`${s.id} must be reachable from spawn`);
  assert.ok(seen.has(key(0,94))); assert.equal(game.canStand(8.5,-5),false);
});

test('bread and cooked meat accept all four independent vegetable and chili choices', () => {
  const cases = [
    { id: 'classic', ingredients: ['bread', 'meat'] },
    { id: 'herb', ingredients: ['bread', 'meat', 'vegetable'] },
    { id: 'spicy', ingredients: ['bread', 'meat', 'sauce'] },
    { id: 'loaded', ingredients: ['bread', 'meat', 'vegetable', 'sauce'] },
  ];
  for (const {id, ingredients} of cases) {
    const dish = {kind:'plate', parts:ingredients.map(prepared)};
    assert.equal(recipeForPlate(dish)?.id, id);
    assert.equal(isReadyPlate(dish), true);
    const game = setup(); game.orders = [{id:1, recipeId:id, remaining:90,total:100}];
    take(game, 'plates'); game.player.hand.parts = dish.parts; take(game, 'serve-left');
    assert.equal(game.served, 1); assert.equal(game.player.hand, null); assert.equal(countPlates(game), 3);
  }
  for (const ingredients of [[], ['bread'], ['meat'], ['vegetable','sauce'], ['bread','sauce'], ['meat','vegetable','sauce'], ['bread','meat','sauce','sauce']]) {
    assert.equal(isReadyPlate({kind:'plate',parts:ingredients.map(prepared)}),false);
  }
  for (const state of ['raw','chopped','burnt']) {
    assert.equal(isReadyPlate({kind:'plate',parts:[prepared('bread'),{kind:'meat',state},prepared('sauce')]}),false);
  }
});

test('only exact orders are served, including a matching order later in the queue', () => {
  const game = setup(); game.addOrder(); game.addOrder();
  const initialIds = game.orders.map(o=>o.id);
  take(game,'plates'); const hand=game.player.hand;
  hand.parts=plate(getRecipe('loaded')).parts;
  take(game,'serve-right');
  assert.equal(game.player.hand,hand); assert.equal(game.served,0); assert.equal(game.score,0);
  assert.equal(game.combo,0); assert.equal(game.returningPlates.length,0);
  assert.deepEqual(game.orders.map(o=>o.id),initialIds);
  assert.match(game.lastMessage,/Chưa có đơn khớp/);
  hand.parts=plate(getRecipe('spicy')).parts; game.interact();
  assert.deepEqual(game.orders.map(o=>o.id),initialIds.slice(0,2));
  assert.equal(game.served,1); assert.equal(game.player.hand,null);
  game.addOrder(); assert.equal(game.orders.at(-1).recipeId,'loaded');
});

test('chili comes ready from its source and merges both ways without duplicate portions', () => {
  const game=setup(); take(game,'sauce'); assert.equal(itemKey(game.player.hand),'sauce:ready');
  take(game,'pan-a'); advance(game,23); assert.equal(itemKey(station(game,'pan-a').item),'sauce:ready');
  game.interact(); take(game,'board-a'); advance(game,3,{work:true});
  assert.equal(itemKey(station(game,'board-a').item),'sauce:ready');
  take(game,'plates'); take(game,'board-a'); assert.equal(itemKey(game.player.hand),'plate:sauce:ready');
  take(game,'counter-a'); take(game,'sauce'); take(game,'counter-a');
  assert.equal(itemKey(game.player.hand),'sauce:ready'); assert.equal(station(game,'counter-a').item.parts.length,1);
  game.player.hand=null; take(game,'counter-b');
  station(game,'counter-b').item=plate(getRecipe('classic'));
  take(game,'sauce'); take(game,'counter-b');
  assert.equal(game.player.hand,null); assert.equal(recipeForPlate(station(game,'counter-b').item)?.id,'spicy');
  game.player.hand=prepared('vegetable'); game.interact();
  assert.equal(recipeForPlate(station(game,'counter-b').item)?.id,'loaded');
});

test('all three serving slots accept exact dishes and preserve occupied-slot priority', () => {
  for (const id of ['serve-left','serve','serve-right']) {
    const game=setup(), s=face(game,id), held=plate(), stored=prepared('bread');
    s.item=stored; game.player.hand=held; game.interact();
    assert.equal(game.served,0); assert.equal(s.item,stored); assert.equal(game.player.hand,held);
    s.item=null; game.interact(); assert.equal(game.served,1); assert.equal(s.item,null);
  }
});
