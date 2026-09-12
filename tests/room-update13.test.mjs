import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { WebSocket } from 'ws';
import { createGameServer } from '../server.mjs';
import { KitchenGame, RECIPES, plateCount } from '../src/game.js';

const slot=(state,id)=>state.stations.find(station=>station.id===id);
const plateTotal=state=>[...state.stations.map(s=>s.item),...state.players.map(p=>p.hand),...state.groundItems.map(g=>g.item),...state.projectiles.map(p=>p.item)].reduce((total,item)=>total+plateCount(item),0);
const recipeParts=id=>RECIPES.find(recipe=>recipe.id===id).parts.map(key=>{const [kind,state]=key.split(':');return {kind,state};});
function face(game,id,player){
  const station=slot(game,id),offset=station.approach,length=Math.hypot(offset.x,offset.z);
  Object.assign(player,{x:station.x+offset.x,z:station.z+offset.z,facingX:-offset.x/length,facingZ:-offset.z/length});
}
async function fixture(t){
  const server=createGameServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`ws://127.0.0.1:${server.address().port}/ws`,clients=[];
  t.after(async()=>{
    for(const client of clients)client.ws.terminate();
    server.roomService.close();await new Promise(resolve=>server.close(resolve));
  });
  async function connect(){
    const ws=new WebSocket(url),messages=[];
    ws.on('message',data=>messages.push(JSON.parse(data)));await once(ws,'open');
    const client={ws,clear(){messages.length=0;},send(type,data={}){ws.send(JSON.stringify({type,...data}));},async wait(predicate,timeout=4000){
      const started=Date.now();
      while(Date.now()-started<timeout){const index=messages.findIndex(predicate);if(index>=0)return messages.splice(index,1)[0];await delay(10);}
      throw new Error(`Timed out after ${timeout} ms waiting for shared game state`);
    }};
    clients.push(client);return client;
  }
  const host=await connect();host.send('create',{name:'Lan'});
  const welcome=await host.wait(packet=>packet.type==='welcome');
  const guest=await connect();guest.send('join',{code:welcome.code,name:'Minh'});
  await guest.wait(packet=>packet.type==='welcome');
  return {host,guest,room:server.roomService.rooms.get(welcome.code)};
}

test('two WebSocket clients share stacked washing, price bands, combo ledger, results and a clean host restart',async t=>{
  const {host,guest,room}=await fixture(t),game=room.game,[chefA,chefB]=game.players;
  game.phase='playing';
  game.orders=[
    {id:1,recipeId:'herb',remaining:80,total:100},
    {id:2,recipeId:'classic',remaining:35,total:100},
    {id:3,recipeId:'spicy',remaining:20,total:100},
  ];
  game.orderId=3;
  async function shared(predicate,timeout=4000){
    const packets=await Promise.all([host.wait(packet=>packet.type==='state'&&predicate(packet),timeout),guest.wait(packet=>packet.type==='state'&&predicate(packet),timeout)]);
    assert.deepEqual(packets[0].state,packets[1].state,'both clients receive the same authoritative snapshot');
    assert.equal(plateTotal(packets[0].state),4,'physical plate count includes every stack');
    return packets[0];
  }
  async function action(client,predicate){
    // Exercise the actual action limiter; each interaction is a separate press.
    await delay(80);host.clear();guest.clear();client.send('action',{action:'interact'});return shared(predicate);
  }
  async function serve(client,chef,plateId,recipeId,orderId){
    const source=slot(game,plateId);assert.equal(source.item.kind,'plate');assert.equal(chef.hand,null);
    chef.hand=source.item;source.item=null;chef.hand.parts=recipeParts(recipeId);face(game,'serve',chef);
    return action(client,packet=>packet.events.some(event=>event.type==='serve'&&event.orderId===orderId));
  }
  const first=await serve(host,chefA,'plates','herb',1);
  assert.deepEqual([first.state.revenue,first.state.tips,first.state.combo,first.state.score],[110,0,1,110]);
  game.orders.push({id:4,recipeId:'loaded',remaining:95,total:100});game.orderId=4;
  const second=await serve(guest,chefB,'plate-one','classic',2);
  assert.deepEqual([second.state.revenue,second.state.tips,second.state.combo,second.state.score],[200,10,2,210]);
  assert.equal(plateCount(slot(second.state,'plates').item),2);

  face(game,'plates',chefA);
  await action(host,packet=>plateCount(packet.state.players[0].hand)===2);
  face(game,'sink',chefA);
  await action(host,packet=>plateCount(slot(packet.state,'sink').item)===2&&packet.state.players[0].hand===null);
  const keepWashing=()=>host.send('input',{input:{x:0,z:0,work:true,dash:false}});
  keepWashing();const inputRefresh=setInterval(keepWashing,150);t.after(()=>clearInterval(inputRefresh));

  const third=await serve(guest,chefB,'plate-two','spicy',3);
  assert.deepEqual([third.state.revenue,third.state.tips,third.state.combo,third.state.score],[288,30,3,318]);
  const fourth=await serve(guest,chefB,'plate-four','loaded',4);
  assert.deepEqual([fourth.state.revenue,fourth.state.tips,fourth.state.combo,fourth.state.score],[408,70,4,478]);
  assert.equal(plateCount(slot(fourth.state,'plates').item),2);
  assert.equal(plateCount(slot(fourth.state,'sink').item),2);
  assert.ok(slot(fourth.state,'sink').progress>0);

  face(game,'plates',chefB);
  await action(guest,packet=>plateCount(packet.state.players[1].hand)===2);
  face(game,'sink',chefB);const washingBefore=slot(game,'sink').progress;
  const combined=await action(guest,packet=>plateCount(slot(packet.state,'sink').item)===4&&packet.state.players[1].hand===null);
  assert.ok(slot(combined.state,'sink').progress>=washingBefore,'loading another stack retains partial washing');

  host.clear();guest.clear();
  const washed=await shared(packet=>slot(packet.state,'sink').item===null&&packet.state.stations.concat(packet.state.groundItems).filter(s=>s.item?.kind==='plate'&&!s.item.dirty).length===4,18000);
  clearInterval(inputRefresh);host.send('input',{input:{x:0,z:0,work:false,dash:false}});
  assert.equal(washed.state.score,478);assert.equal(washed.state.maxCombo,4);

  host.clear();guest.clear();game.orders[0].remaining=.01;
  const expired=await shared(packet=>packet.state.missed===1);
  assert.deepEqual([expired.state.revenue,expired.state.tips,expired.state.penalties,expired.state.score,expired.state.combo],[408,70,15,463,0]);
  host.clear();guest.clear();game.time=.01;
  const finished=await shared(packet=>packet.state.phase==='results');
  assert.equal(finished.state.score,finished.state.revenue+finished.state.tips-finished.state.penalties);
  for(const playerId of ['chef-1','chef-2']){
    const localGame=new KitchenGame();localGame.applySnapshot(structuredClone(finished.state),playerId);
    assert.equal(localGame.stars,3);assert.equal(localGame.served,4);assert.equal(localGame.missed,1);
  }

  host.clear();guest.clear();host.send('start');
  const restarted=await shared(packet=>packet.state.phase==='countdown');
  assert.deepEqual(['score','revenue','tips','penalties','served','missed','combo','maxCombo'].map(key=>restarted.state[key]),[0,0,0,0,0,0,0,0]);
  assert.equal(restarted.state.time,180);assert.equal(slot(restarted.state,'sink').item,null);
  assert.equal(restarted.state.stations.filter(s=>s.item?.kind==='plate'&&!s.item.dirty).length,4);
  assert.deepEqual(restarted.state.players.map(player=>player.name),['Lan','Minh']);
});
