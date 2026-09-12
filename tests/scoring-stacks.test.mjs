import test from 'node:test';
import assert from 'node:assert/strict';
import { KitchenGame, RECIPES, RULES, plateCount, itemKey, isReadyPlate } from '../src/game.js';
import { orderPrice, RECIPE_PRICES, tipForCombo } from '../src/scoring.js';

const setup=()=>{const game=new KitchenGame();game.reset('playing');return game;};
const station=(game,id)=>game.stations.find(slot=>slot.id===id);
const countPlates=game=>game.allItems.reduce((sum,item)=>sum+plateCount(item),0);
const partsFor=id=>RECIPES.find(recipe=>recipe.id===id).parts.map(key=>{const [kind,state]=key.split(':');return {kind,state};});
const dish=id=>({kind:'plate',parts:partsFor(id)});
const dirty=plate=>Object.assign(plate,{parts:[],dirty:true});
function approach(game,id,player=game.player){
  const slot=station(game,id),offset=slot.approach,length=Math.hypot(offset.x,offset.z);
  Object.assign(player,{x:slot.x+offset.x,z:slot.z+offset.z,facingX:-offset.x/length,facingZ:-offset.z/length});
  return slot;
}
function advance(game,seconds,input={}){
  for(let remaining=seconds;remaining>1e-9;remaining-=.02)game.tick(Math.min(.02,remaining),input);
}
function removeInitialPlates(game){
  return game.stations.filter(slot=>slot.item?.kind==='plate').map(slot=>{const plate=slot.item;game.clearSlot(slot);return plate;});
}

test('four served physical plates automatically form one return stack, then wash continuously into four clean plates',()=>{
  const game=setup();
  for(const [index,id] of ['plates','plate-one','plate-two','plate-four'].entries()){
    const recipe=RECIPES[index];
    game.orders=[{id:index+1,recipeId:recipe.id,remaining:100,total:100}];
    approach(game,id);game.interact();game.player.hand.parts=partsFor(recipe.id);
    approach(game,'serve');game.interact();
    assert.equal(game.player.hand,null);
    assert.equal(countPlates(game),4,'a plate may join a stack but must never vanish');
  }
  const returned=game.stations.find(slot=>plateCount(slot.item)===4);
  assert.ok(returned);assert.equal(returned.id,'plates');
  assert.equal(game.dirtyPlates,4);assert.equal(game.cleanPlates,0);
  approach(game,returned.id);game.interact();
  assert.equal(plateCount(game.player.hand),4);assert.equal(returned.item,null);
  const sink=approach(game,'sink');game.interact();
  assert.equal(plateCount(sink.item),4);assert.equal(game.player.hand,null);
  advance(game,7.98,{work:true});
  assert.equal(game.cleanPlates,3);assert.equal(game.dirtyPlates,1);assert.equal(countPlates(game),4);
  advance(game,.04,{work:true});
  assert.equal(sink.item,null);assert.equal(sink.progress,0);
  assert.equal(game.cleanPlates,4);assert.equal(game.dirtyPlates,0);assert.equal(countPlates(game),4);
  assert.equal(station(game,sink.outputId).item.dirty,false);
});

test('adding a dirty stack to an occupied sink preserves washing progress and every plate',()=>{
  const game=setup(),plates=removeInitialPlates(game).map(dirty),sink=approach(game,'sink');
  sink.item=plates[0];sink.progress=.8;
  game.player.hand=game.merge(plates[1],plates[2]);
  const last=game.placeGround(plates[3],0,3);
  game.interact();
  assert.equal(sink.progress,.8);assert.equal(plateCount(sink.item),3);assert.equal(game.player.hand,null);
  assert.equal(countPlates(game),4);
  advance(game,1.5,{work:true});
  assert.equal(game.cleanPlates,1);assert.equal(plateCount(sink.item),2);assert.ok(Math.abs(sink.progress-.3)<1e-7);
  game.player.hand=last.item;game.clearSlot(last);game.interact();
  assert.equal(plateCount(sink.item),3);assert.ok(Math.abs(sink.progress-.3)<1e-7);
  advance(game,5.72,{work:true});
  assert.equal(sink.item,null);assert.equal(game.cleanPlates,4);assert.equal(countPlates(game),4);
});

test('dirty stacks combine in hand, on the ground and when thrown into a partially washed sink',()=>{
  const game=setup(),plates=removeInitialPlates(game).map(dirty),sink=station(game,'sink');
  Object.assign(game.player,{x:0,z:3,facingX:0,facingZ:1});
  game.player.hand=plates[0];
  const ground=game.placeGround(plates[1],0,3.6);game.interact();
  assert.equal(plateCount(game.player.hand),2);assert.ok(!game.groundItems.includes(ground));
  sink.item=plates[2];sink.progress=.75;
  game.placeGround(plates[3],2,3);
  approach(game,'sink');game.throwItem(sink);advance(game,1);
  assert.equal(game.projectiles.length,0);assert.equal(game.player.hand,null);
  assert.equal(plateCount(sink.item),3);assert.equal(sink.progress,.75);assert.equal(countPlates(game),4);
});

test('two chefs can load the same sink without losing plates or creating a second washing timer',()=>{
  const game=setup();game.setupPlayers(['Lan','Minh']);
  const plates=removeInitialPlates(game).map(dirty),sink=station(game,'sink');
  for(const [index,player] of game.players.entries()){
    player.hand=game.merge(plates[index*2],plates[index*2+1]);approach(game,'sink',player);
    game.withPlayer(player.id,()=>game.interact());
  }
  assert.equal(plateCount(sink.item),4);assert.ok(game.players.every(player=>player.hand===null));
  advance(game,1,{players:{'chef-1':{work:true},'chef-2':{}}});
  assert.ok(Math.abs(sink.progress-1)<1e-7);assert.equal(countPlates(game),4);
  advance(game,7.02,{players:{'chef-1':{work:true},'chef-2':{}}});
  assert.equal(game.cleanPlates,4);assert.equal(game.dirtyPlates,0);
});

test('held washing keeps its reachable sink target when an item appears nearby, and release restores proximity assist',()=>{
  const game=setup(),plates=removeInitialPlates(game).map(dirty),sink=approach(game,'sink');
  sink.item=plates.reduce((stack,plate)=>stack?game.merge(stack,plate):plate,null);
  advance(game,.2,{work:true});
  const nearby=game.placeGround({kind:'bread',state:'ready'},game.player.x,game.player.z+.1);
  advance(game,1.82,{work:true});
  assert.equal(game.player.targetId,'sink');assert.equal(game.cleanPlates,1);assert.equal(plateCount(sink.item),3);
  const progress=sink.progress;advance(game,.02);
  assert.equal(game.player.targetId,nearby.id);assert.equal(game.player.work,null);assert.equal(sink.progress,progress);
  game.interact();assert.equal(game.player.hand.kind,'bread');
});

test('work target retention cannot wash a sink remotely after leaving its interaction range',()=>{
  const game=setup(),sink=approach(game,'sink');sink.item={kind:'plate',parts:[],dirty:true};
  advance(game,.2,{work:true});const progress=sink.progress;
  Object.assign(game.player,{x:0,z:3});advance(game,1,{work:true});
  assert.equal(sink.progress,progress);assert.equal(game.player.work,null);assert.notEqual(game.player.targetId,'sink');
});

test('dirty stacks cannot receive food, serve, merge with clean plates, or disappear in the bin',()=>{
  const game=setup(),stack={kind:'plate',parts:[],dirty:true,count:3};
  for(const item of [{kind:'bread',state:'ready'},{kind:'plate',parts:[]}]){
    const before=JSON.stringify([stack,item]);assert.equal(game.merge(stack,item),false);
    assert.equal(JSON.stringify([stack,item]),before);
  }
  assert.equal(game.receiveItem(stack,{kind:'meat',state:'cooked'}),null);
  assert.equal(isReadyPlate({...stack,parts:partsFor('herb')}),false);
  assert.equal(game.discard(stack),stack);assert.equal(plateCount(stack),3);
  assert.equal(game.deliverItem(stack,station(game,'serve')),false);assert.equal(game.served,0);
});

test('stack counts, wash progress and revenue ledger survive an online snapshot without aliasing',()=>{
  const game=setup();game.setupPlayers(['A','B']);
  const plates=removeInitialPlates(game).map(dirty),sink=station(game,'sink');
  sink.item=plates.reduce((stack,plate)=>stack?game.merge(stack,plate):plate,null);sink.progress=1.25;
  Object.assign(game,{revenue:440,tips:70,penalties:15,score:495,combo:3,maxCombo:4});
  const client=setup();client.applySnapshot(game.snapshot(),'chef-2');
  assert.equal(plateCount(station(client,'sink').item),4);assert.equal(station(client,'sink').progress,1.25);
  assert.equal(itemKey(station(client,'sink').item),'plate-dirty-4:');assert.equal(countPlates(client),4);
  assert.deepEqual([client.revenue,client.tips,client.penalties,client.score,client.combo,client.maxCombo],[440,70,15,495,3,4]);
  station(client,'sink').item.count=1;assert.equal(plateCount(sink.item),4);
});

test('each recipe has three exact timer bands: 100%, 90%, and 80%, including the boundaries',()=>{
  for(const [recipeId,base] of Object.entries(RECIPE_PRICES)){
    for(const [remaining,band,multiplier] of [[100,'green',1],[50,'green',1],[49.99,'yellow',.9],[25,'yellow',.9],[24.99,'red',.8],[0,'red',.8]]){
      assert.deepEqual(orderPrice({recipeId,remaining,total:100}),{band,multiplier,base,revenue:Math.round(base*multiplier)});
    }
  }
  assert.equal(orderPrice({recipeId:'herb',remaining:100,total:200}).band,'green');
  assert.equal(orderPrice({recipeId:'herb',remaining:49,total:200}).band,'red');
});

test('five oldest orders served green reach exactly 660 points with capped combo tips',()=>{
  const game=setup(),events=[];game.onEvent=event=>events.push(event);
  for(const [index,recipeId] of ['herb','classic','spicy','loaded','herb'].entries()){
    game.orders=[{id:index+1,recipeId,remaining:80,total:100}];
    assert.equal(game.deliverItem(dish(recipeId),station(game,'serve')),true);
  }
  assert.equal(game.revenue,550);assert.equal(game.tips,110);assert.equal(game.score,660);assert.equal(game.stars,5);
  assert.equal(game.combo,4);assert.equal(game.maxCombo,4);
  assert.deepEqual(events.filter(event=>event.type==='serve').map(event=>event.tip),[0,10,20,40,40]);
  assert.equal(RULES.stars.at(-1),550*1.2);assert.equal(tipForCombo(99),40);
});

test('serving a later order breaks the chain; expired orders reset it and subtract only available points',()=>{
  const game=setup();
  game.orders=['herb','classic','spicy'].map((recipeId,index)=>({id:index+1,recipeId,remaining:80,total:100}));
  game.combo=3;game.maxCombo=3;
  game.deliverItem(dish('classic'),station(game,'serve'));
  assert.equal(game.combo,0);assert.equal(game.tips,0);assert.equal(game.score,100);
  game.deliverItem(dish('herb'),station(game,'serve'));assert.equal(game.combo,1);assert.equal(game.tips,0);
  game.deliverItem(dish('spicy'),station(game,'serve'));assert.equal(game.combo,2);assert.equal(game.tips,10);
  game.orders=[{id:4,recipeId:'herb',remaining:.01,total:100}];game.score=5;advance(game,.02);
  assert.equal(game.combo,0);assert.equal(game.score,0);assert.equal(game.penalties,5);assert.equal(game.missed,1);
  game.orders[0].remaining=.01;advance(game,.02);assert.equal(game.penalties,5);assert.equal(game.missed,2);
});

test('late-order revenue, tips and penalties reconcile to score and reset for a new round',()=>{
  const game=setup();
  for(const [recipeId,remaining] of [['herb',30],['loaded',20],['spicy',75]]){
    game.orders=[{id:1,recipeId,remaining,total:100}];game.deliverItem(dish(recipeId),station(game,'serve'));
  }
  assert.equal(game.revenue,99+96+110);assert.equal(game.tips,30);
  game.orders=[{id:4,recipeId:'herb',remaining:.01,total:100}];advance(game,.02);
  assert.equal(game.penalties,15);assert.equal(game.score,game.revenue+game.tips-game.penalties);
  game.start();assert.deepEqual([game.score,game.revenue,game.tips,game.penalties,game.combo,game.maxCombo],[0,0,0,0,0,0]);
});

test('five star boundaries are inclusive and never award a higher tier early',()=>{
  const game=setup();assert.equal(game.stars,0);
  RULES.stars.forEach((threshold,index)=>{game.score=threshold-1;assert.equal(game.stars,index);game.score=threshold;assert.equal(game.stars,index+1);});
});

test('walking parallel to a row or facing away still selects the nearest nth counter or object',()=>{
  const game=setup();
  for(const id of ['bread','meat','vegetable','main-back--5','pan-a','counter-a','main-front-0','plate-one']){
    const slot=approach(game,id);
    for(const [facingX,facingZ] of [[1,0],[-1,0],[0,1],[0,-1]]){
      Object.assign(game.player,{facingX,facingZ});assert.equal(game.selectTarget()?.id,slot.id,`${id} facing ${facingX},${facingZ}`);
    }
  }
  Object.assign(game.player,{x:0,z:3,facingX:0,facingZ:-1});
  const ground=game.placeGround({kind:'bread',state:'ready'},0,3.7);
  assert.equal(game.selectTarget()?.id,ground.id);game.interact();assert.equal(game.player.hand.kind,'bread');
});

test('deliberate centre-facing preserves interaction with inside corner boxes',()=>{
  const game=setup();
  for(const id of ['upper-back--5','upper-back-5','upper-front--5','upper-front-5']){
    const slot=approach(game,id);assert.equal(game.selectTarget()?.id,id);
    game.player.hand={kind:'bread',state:'ready'};game.interact();assert.equal(slot.item.kind,'bread');
    game.interact();assert.equal(game.player.hand.kind,'bread');assert.equal(slot.item,null);game.player.hand=null;
  }
});

test('assist cannot reach a distant item or one hidden behind a counter',()=>{
  const game=setup();Object.assign(game.player,{x:0,z:3,facingX:1,facingZ:0});
  game.placeGround({kind:'bread',state:'ready'},1.3,3);assert.equal(game.selectTarget(),null);
  game.groundItems=[];
  const blocker={id:'blocker',type:'counter',x:.45,z:3,width:.3,depth:1,item:null};
  game.stations=[blocker];
  game.groundItems=[{id:'blocked-food',type:'ground',x:.9,z:3,width:.3,depth:.3,item:{kind:'bread',state:'ready'}}];
  assert.equal(game.selectTarget()?.id,'blocker');game.interact();assert.equal(game.player.hand,null);
  assert.equal(game.groundItems[0].item.kind,'bread');
});
