import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { WebSocket } from 'ws';
import { createGameServer } from '../server.mjs';

async function fixture(t,options={}){
  const server=createGameServer(options);server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${server.address().port}`,clients=[];
  t.after(async()=>{for(const c of clients)c.ws.terminate();server.roomService.close();await new Promise(resolve=>server.close(resolve));});
  async function client(){
    const ws=new WebSocket(url.replace('http:','ws:')+'/ws'),messages=[];ws.on('message',data=>messages.push(JSON.parse(data)));await once(ws,'open');
    const c={ws,messages,send(type,data={}){ws.send(JSON.stringify({type,...data}));},async wait(predicate,timeout=3000){const start=Date.now();while(Date.now()-start<timeout){const at=messages.findIndex(predicate);if(at>=0)return messages.splice(at,1)[0];await delay(10);}throw new Error('Timed out waiting for a room packet');},clear(){messages.length=0;}};clients.push(c);return c;
  }
  return {server,url,client,rooms:server.roomService.rooms};
}
async function pair(f){const a=await f.client();a.send('create',{name:'Lan'});const host=await a.wait(m=>m.type==='welcome');const b=await f.client();b.send('join',{code:host.code,name:'Minh'});const guest=await b.wait(m=>m.type==='welcome');return {a,b,host,guest,room:f.rooms.get(host.code)};}
function face(game,id,player){const s=game.stations.find(s=>s.id===id),a=s.approach,n=Math.hypot(a.x,a.z);Object.assign(player,{x:s.x+a.x,z:s.z+a.z,facingX:-a.x/n,facingZ:-a.z/n});return s;}

test('HTTP serves the complete app while keeping server files and dependencies private',async t=>{
  const f=await fixture(t);
  for(const pathname of ['/','/publish.html','/src/main.js','/src/music.js','/src/online.js','/src/dynamics.js','/src/controls.css','/assets/characters-meshes.json','/manifest.webmanifest','/health'])assert.equal((await fetch(f.url+pathname)).status,200,pathname);
  for(const pathname of ['/server.mjs','/src/rooms.mjs','/node_modules/ws/package.json','/.env','/package.json','/README.md','/src/../server.mjs'])assert.equal((await fetch(f.url+pathname)).status,404,pathname);
  assert.deepEqual(await (await fetch(f.url+'/health')).json(),{ok:true});
  for(const name of ['ragged-dog','dog-tick']){
    const response=await fetch(`${f.url}/assets/${name}-rigged.glb`);
    assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'model/gltf-binary');
    const buffer=Buffer.from(await response.arrayBuffer());assert.equal(buffer.toString('ascii',0,4),'glTF');
    const gltf=JSON.parse(buffer.toString('utf8',20,20+buffer.readUInt32LE(12)));
    assert.equal(gltf.skins.length,1);assert.deepEqual(gltf.animations.map(a=>a.name).sort(),['Carry','CarryWalk','Idle','Throw','Walk','Work']);
  }
});

test('room creation, join, capacity, host-only start and shared pause/resume',async t=>{
  const f=await fixture(t),{a,b,host,guest,room}=await pair(f);
  assert.match(host.code,/^[A-Z2-9]{6}$/);assert.equal(host.playerId,'chef-1');assert.equal(guest.playerId,'chef-2');assert.notEqual(host.token,guest.token);
  const third=await f.client();third.send('join',{code:host.code,name:'Third'});assert.match((await third.wait(m=>m.type==='error')).message,/đủ hai/);
  b.send('start');assert.match((await b.wait(m=>m.type==='error')).message,/Chủ phòng/);assert.equal(room.game.phase,'lobby');
  a.send('start');const started=await b.wait(m=>m.type==='state'&&m.state.phase==='countdown');assert.equal(started.state.players.length,2);assert.equal(started.state.time,180);
  b.clear();a.send('pause');await b.wait(m=>m.type==='state'&&m.state.phase==='paused');const time=room.game.countdown;await delay(120);assert.equal(room.game.countdown,time);
  b.send('resume');await b.wait(m=>m.type==='state'&&m.state.phase==='countdown');assert.equal(room.game.phase,'countdown');
});

test('movement is bounded, stale input stops, and concurrent station actions cannot duplicate food',async t=>{
  const f=await fixture(t),{a,b,room}=await pair(f);room.game.phase='playing';
  const [p,q]=room.game.players,before=p.x;a.send('input',{input:{x:1,z:0,work:false}});await delay(220);assert.ok(p.x>before+.3);assert.equal(q.x,.8);
  await delay(600);const stopped=p.x;await delay(130);assert.equal(p.x,stopped);
  a.send('input',{input:{x:100000,z:0}});await delay(110);assert.equal(p.x,stopped);
  const s=face(room.game,'counter-a',p);face(room.game,'counter-a',q);s.item={kind:'meat',state:'cooked'};
  a.send('action',{action:'interact'});b.send('action',{action:'interact'});await delay(90);
  assert.equal(s.item,null);assert.equal(room.game.players.filter(p=>p.hand?.kind==='meat').length,1);
  const packet=await b.wait(m=>m.type==='state'&&m.events.some(e=>e.type==='pickup'));assert.equal(packet.state.players.filter(p=>p.hand).length,1);
});

test('disconnect pauses the shared game and reconnect token restores the same chef and held meal',async t=>{
  const f=await fixture(t),{a,b,host,guest,room}=await pair(f);room.game.phase='playing';
  room.game.players[1].hand={kind:'meal',parts:[{kind:'bread',state:'ready'},{kind:'meat',state:'cooked'}]};
  b.ws.terminate();await a.wait(m=>m.type==='state'&&m.state.phase==='paused');const remaining=room.game.time;await delay(100);assert.equal(room.game.time,remaining);
  a.send('resume');assert.match((await a.wait(m=>m.type==='error')).message,/kết nối lại/);
  const c=await f.client();c.send('join',{code:host.code,name:'Changed',token:guest.token});const restored=await c.wait(m=>m.type==='welcome');assert.equal(restored.playerId,'chef-2');
  const state=await c.wait(m=>m.type==='state');assert.equal(state.state.players.length,2);assert.equal(state.state.players[1].name,'Minh');assert.equal(state.state.players[1].hand.kind,'meal');assert.equal(state.state.phase,'paused');
  c.send('resume');await a.wait(m=>m.type==='state'&&m.state.phase==='playing');
  c.send('leave');await a.wait(m=>m.type==='closed');assert.equal(f.rooms.size,0);
});

test('rooms are isolated and expired disconnected rooms are removed',async t=>{
  const f=await fixture(t,{reconnectMs:150}),{a,b,host,room}=await pair(f);const other=await f.client();other.send('create',{name:'Other'});const second=await other.wait(m=>m.type==='welcome');assert.notEqual(second.code,host.code);
  room.game.score=555;assert.equal(f.rooms.get(second.code).game.score,0);
  b.ws.terminate();await a.wait(m=>m.type==='closed');assert.equal(f.rooms.has(host.code),false);assert.equal(f.rooms.has(second.code),true);
});
