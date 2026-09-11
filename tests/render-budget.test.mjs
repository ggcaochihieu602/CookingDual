import test from 'node:test';
import assert from 'node:assert/strict';
import {RenderBudget} from '../src/render-budget.js';

function sampleFor(budget,seconds,frameMs=16.67,renderMs=5){
  let changes=0;for(let t=0;t<seconds;t+=.02)if(budget.sample(frameMs,renderMs,.02))changes++;
  return changes;
}
test('automatic graphics absorbs startup and isolated stalls without downgrading',()=>{
  const b=new RenderBudget(3);assert.equal(b.ratio,1.5);assert.equal(b.fps,60);
  sampleFor(b,4,70,40);sampleFor(b,10);sampleFor(b,.7,80,35);sampleFor(b,5);
  assert.equal(b.ratio,1.5);assert.equal(b.fps,60);
});
test('sustained overload reduces only pixel budget first, then frame rate with a quality floor',()=>{
  const b=new RenderBudget(3);sampleFor(b,10,35,25);
  assert.ok(b.ratio<1.5&&b.ratio>=1.15);assert.equal(b.fps,60);
  sampleFor(b,45,60,40);assert.equal(b.ratio,1.15);assert.equal(b.fps,30);
  sampleFor(b,95);assert.equal(b.ratio,1.5);assert.equal(b.fps,60);
});
test('manual graphics modes remain stable and do not exceed the actual display density',()=>{
  const b=new RenderBudget(3);b.setMode('high');sampleFor(b,90,80,70);assert.equal(b.ratio,2);assert.equal(b.fps,60);
  b.setMode('eco');sampleFor(b,90);assert.equal(b.ratio,1.25);assert.equal(b.fps,30);
  const desktop=new RenderBudget(1);sampleFor(desktop,50,60,40);assert.equal(desktop.ratio,1);
});
