import test from 'node:test';
import assert from 'node:assert/strict';
import {KitchenGame,RULES} from '../src/game.js';
import {GROUND_PROJECTION,DEPTH_SPEED,screenToWorldMotion} from '../src/movement.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const distance=(a,b)=>Math.hypot(b.x-a.x,(b.z-a.z)*GROUND_PROJECTION);
function move(input,seconds=.2){
  const game=new KitchenGame();game.reset('playing');
  const start={x:game.player.x,z:game.player.z};
  for(let remaining=seconds;remaining>1e-9;remaining-=.01)game.tick(Math.min(.01,remaining),input);
  return {game,start,distance:distance(start,game.player)};
}

test('up, down, left, right and diagonal walking cover the same visible distance',()=>{
  for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const {game,start,distance:travel}=move({x,z});near(travel,RULES.speed*.2);
    const dx=game.player.x-start.x,dz=game.player.z-start.z,length=Math.hypot(dx,dz);
    near(game.player.facingX,dx/length);near(game.player.facingZ,dz/length);
    if(x&&z)near(Math.abs(dx),Math.abs(dz)*GROUND_PROJECTION);
  }
});

test('joystick strength remains proportional while excessive and invalid input is bounded',()=>{
  for(const [x,z] of [[.3,0],[0,.3],[.18,.24]])near(move({x,z}).distance,RULES.speed*.2*.3);
  near(move({x:100,z:100}).distance,RULES.speed*.2);
  near(move({x:NaN,z:Infinity}).distance,0);
  near(screenToWorldMotion(0,1).z,DEPTH_SPEED);
});

test('continuous dash and dash from standing preserve cardinal and diagonal projected speed',()=>{
  for(const [x,z] of [[1,0],[0,1],[0,-1],[1,1],[-1,-1]]){
    near(move({x,z,dash:true},.2).distance,RULES.dashSpeed*.2);
    const game=new KitchenGame();game.reset('playing');
    const direction=screenToWorldMotion(x,z),length=Math.hypot(direction.x,direction.z);
    Object.assign(game.player,{facingX:direction.x/length,facingZ:direction.z/length});
    const start={...game.player};game.dash();game.tick(.05);
    near(distance(start,game.player),RULES.dashSpeed*.05);
  }
});

test('depth compensation cannot tunnel through counters or floor boundaries during repeated dash',()=>{
  for(const direction of [-1,1]){
    const game=new KitchenGame();game.reset('playing');
    Object.assign(game.player,{x:-5.6,z:3.2});
    let previousZ=game.player.z;
    for(let frame=0;frame<100;frame++){
      game.tick(.05,{z:direction,dash:true});
      assert.ok(game.canStand(game.player.x,game.player.z));
      assert.ok(Math.abs(game.player.z-previousZ)<=RULES.dashSpeed*DEPTH_SPEED*.05+1e-8);
      previousZ=game.player.z;
    }
    assert.ok(game.player.z>-.5&&game.player.z<6);
  }
});
