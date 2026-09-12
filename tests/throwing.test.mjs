import test from 'node:test';
import assert from 'node:assert/strict';
import {KitchenGame} from '../src/game.js';
import {carryOrigin,throwArc,throwPoint,THROW_ANGLE} from '../src/throwing.js';

const near=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);

test('throw origin matches the carried object reach and each character height',()=>{
  for(const [character,height] of [['ragged-dog',1.48],['dog-tick',1.10]]){
    for(const [facingX,facingZ] of [[1,0],[0,1],[-1,0],[0,-1],[3,4]]){
      const player={x:-2,z:3,character,facingX,facingZ},origin=carryOrigin(player),length=Math.hypot(facingX,facingZ);
      near(origin.y,height);near(Math.hypot(origin.x-player.x,origin.z-player.z),1.03);
      near(origin.x-player.x,1.03*facingX/length);near(origin.z-player.z,1.03*facingZ/length);
    }
  }
});

test('floor and counter throws launch at 30 degrees and reach their exact landing points',()=>{
  near(THROW_ANGLE,Math.PI/6);
  for(const height of [1.10,1.48])for(const landingHeight of [.2,1.14])for(const distance of [1,3,7]){
    const start={x:2,y:height,z:-1},end={x:2+distance*.6,y:landingHeight,z:-1+distance*.8},arc=throwArc(start,end);
    assert.deepEqual(throwPoint(start,end,arc,0),start);
    const landing=throwPoint(start,end,arc,1);for(const key of ['x','y','z'])near(landing[key],end[key]);
    const first=throwPoint(start,end,arc,1e-6),slope=(first.y-start.y)/Math.hypot(first.x-start.x,first.z-start.z);
    near(Math.atan(slope),Math.PI/6,2e-6);
    assert.ok(Number.isFinite(arc)&&arc>=0);
    for(let t=0;t<=1;t+=.05)assert.ok(throwPoint(start,end,arc,t).y>=Math.min(start.y,end.y)-1e-8);
  }
});

test('same-height throws rise much less than the former steep arc without changing their range',()=>{
  const start={x:0,y:1.2,z:0},end={x:6,y:1.2,z:0},arc=throwArc(start,end);
  near(throwPoint(start,end,arc,.5).y-start.y,6*Math.tan(Math.PI/6)/4);
  assert.ok(arc<1,'a six-unit horizontal throw rises under one world unit');
  near(throwPoint(start,end,arc,1).x,6);
});

test('game projectile uses the same carried origin and curve as the visible aim preview',()=>{
  for(const character of ['ragged-dog','dog-tick']){
    const game=new KitchenGame();game.reset('playing');Object.assign(game.player,{character,x:0,z:2,facingX:1,facingZ:0,hand:{kind:'bread',state:'ready'}});
    const origin=carryOrigin(game.player),target={x:4,z:3},end=game.throwTarget(target);
    assert.equal(game.throwItem(target),true);assert.equal(game.projectiles.length,1);
    const projectile=game.projectiles[0];assert.deepEqual(projectile.start,origin);assert.deepEqual(projectile.end,end);near(projectile.arc,throwArc(origin,end));
    assert.equal(game.player.hand,null);assert.ok(projectile.start.x>game.player.x+1);
  }
});
