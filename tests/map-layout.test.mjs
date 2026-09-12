import test from 'node:test';
import assert from 'node:assert/strict';
import { KitchenGame } from '../src/game.js';
import { FLOOR_AREAS, SIDEWALK, STATIONS } from '../src/level.js';

const station = id => STATIONS.find(s => s.id === id);

test('both kitchen rows and the connecting floor admit a three-tile corridor', () => {
  const game = new KitchenGame();
  assert.equal(FLOOR_AREAS.find(a => a.id === 'bridge').width, 4.2);
  for (const x of [-1.7, 0, 1.7]) for (let z = -6; z <= .01; z += .1) {
    assert.ok(game.canStand(x, z), `corridor blocked at ${x}, ${z}`);
  }
  for (const id of ['pan-a', 'pan-b']) {
    const s = station(id);
    assert.equal(s.z, -1.4);
    assert.ok(Math.abs(s.x) - s.width / 2 > 3.4, `${id} too close to corridor`);
  }
});

test('double cutting boards replace the bottom cooking area and four plates stay near serving', () => {
  assert.deepEqual(['board-a', 'board-b'].map(id => {
    const s = station(id); return [s.x, s.z, s.width, s.approach.z];
  }), [[-7.7, 7, 2.78, -1.1], [-3.5, 7, 2.78, -1.1]]);
  assert.deepEqual(['counter-a', 'counter-b'].map(id => station(id).x), [-2.8, 2.8]);
  assert.equal(STATIONS.filter(s => s.initial === 'plate').length, 4);
  for (const s of STATIONS.filter(s => s.initial === 'plate')) assert.equal(s.z, 7);
  assert.equal(station('sink').outputId, 'upper-front--2');
  assert.ok(station(station('sink').outputId));
});

test('counter collisions close the former street exit and keep every station reachable', () => {
  const game = new KitchenGame(), step = .1, key = (x,z) => `${x},${z}`;
  const queue = [{ x: 0, z: 32 }], seen = new Set([key(0,32)]);
  for (let i=0; i<queue.length; i++) for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const x = queue[i].x + dx, z = queue[i].z + dz, k = key(x,z);
    if (seen.has(k) || !game.canStand(x*step,z*step)) continue;
    seen.add(k); queue.push({x,z});
  }
  for (const s of STATIONS) {
    assert.ok(seen.has(key(Math.round((s.x+s.approach.x)/step),Math.round((s.z+s.approach.z)/step))), s.id);
    assert.equal(game.canStand(s.x,s.z), false, `${s.id} has no collider`);
  }
  assert.equal(FLOOR_AREAS.some(a => a.id === 'entry'), false);
  assert.equal(game.canStand(0,7), false);
  assert.equal(game.canStand(0,SIDEWALK.z), false);
  assert.equal(queue.some(p => p.z*step > 7), false, 'chef can get behind the cart');
  assert.equal(station('main-front-0').type, 'counter');
});
