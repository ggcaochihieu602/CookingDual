// One playable level, with two connected platforms and a shared table grid.
export const TILE = 1.4;
export const SPAWN = Object.freeze({ x: 0, z: 3.2 });
export const FLOOR_AREAS = Object.freeze([
  { id: 'main', x: 0, z: 2.85, width: 21.4, depth: 10.3 },
  { id: 'upper', x: 0, z: -7.8, width: 15.5, depth: 7.4 },
  { id: 'bridge', x: 0, z: -3.25, width: 4.2, depth: 3.4 },
].map(Object.freeze));
export const SIDEWALK = Object.freeze({ x:0, z:9.05, width:24.4, depth:2.25 });
const kinds = {
  counter: { label: 'Bàn trống', icon: 'plus' },
  source: { label: 'Nguyên liệu', icon: 'bread' },
  board: { label: 'Thớt', icon: 'knife' },
  pan: { label: 'Bếp rán', icon: 'pan' },
  plates: { label: 'Đĩa sạch', icon: 'plate' },
  sink: { label: 'Bồn rửa', icon: 'water' },
  serve: { label: 'Giao món', icon: 'bell' },
  trash: { label: 'Dọn thức ăn', icon: 'trash' },
};
const back = {
  '-7': { id: 'extinguisher', initial:'extinguisher' },
  '-3': { id: 'pan-a', type: 'pan' }, 3: { id: 'pan-b', type: 'pan' },
  '-2': { id: 'counter-a' }, 2: { id: 'counter-b' },
  5: { id: 'sauce', type: 'source', ingredient: 'sauce', label: 'Tương ớt', icon: 'sauce' },
};
const front = {
  '-1': {id:'plate-four',initial:'plate'},
  1:{id:'plate-one',initial:'plate'}, 2:{id:'plate-two',initial:'plate'},
  3:{id:'plates',initial:'plate',returnTray:true},
  4: { id: 'serve-left', type: 'serve', label: 'Giao bánh mì', cartSide: -1 },
  5: { id: 'serve', type: 'serve', label: 'Xe bánh mì', cartSide: 0 },
  6: { id: 'serve-right', type: 'serve', label: 'Giao bánh mì', cartSide: 1 },
  7: { id: 'trash', type: 'trash' },
};
const stations = [];
function add(id, x, z, approach, definition = {}) {
  const type = definition.type || 'counter';
  stations.push(Object.freeze({ width: 1.38, depth: 1.38, id, type, x, z, approach: Object.freeze(approach), ...kinds[type], ...definition }));
}
for (let col = -7; col <= 7; col++) {
  // Three clear tiles connect the kitchens; the street-facing row is continuous.
  if (Math.abs(col) > 1) add(`main-back-${col}`, col * TILE, -1.4, { x: 0, z: 1.1 }, back[col]);
  if (![-6,-5,-3,-2].includes(col)) add(`main-front-${col}`, col * TILE, 7, { x: 0, z: -1.1 }, front[col]);
}
add('board-a',-7.7,7,{x:0,z:-1.1},{type:'board',width:2.78});
add('board-b',-3.5,7,{x:0,z:-1.1},{type:'board',width:2.78});
for (let col = -5; col <= 5; col++) {
  const cornerX = Math.abs(col) === 5 ? -Math.sign(col)*1.1 : 0;
  const ingredient={'-1':'bread',0:'meat',1:'vegetable'}[col];
  add(`upper-back-${col}`, col * TILE, -10.5, { x: cornerX, z: 1.1 },ingredient?{id:ingredient,type:'source',ingredient,label:{bread:'Bánh mì',meat:'Thịt heo',vegetable:'Rau củ'}[ingredient],icon:ingredient}:{});
  if (Math.abs(col) > 1 && ![-4,-3].includes(col)) add(`upper-front-${col}`, col * TILE, -4.9, { x: cornerX, z: -1.1 });
}
add('sink',-4.9,-4.9,{x:0,z:-1.1},{type:'sink',width:2.78,outputId:'upper-front--2'});
for (let row = 0; row < 3; row++) {
  add(`upper-left-${row}`, -7, -9.1 + row * TILE, { x: 1.1, z: 0 });
  add(`upper-right-${row}`, 7, -9.1 + row * TILE, { x: -1.1, z: 0 });
}
export const STATIONS = Object.freeze(stations);
