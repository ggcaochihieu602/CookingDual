// One playable level, with two connected platforms and a shared table grid.
export const TILE = 1.4;
export const SPAWN = Object.freeze({ x: 0, z: 3.2 });
export const FLOOR_AREAS = Object.freeze([
  { id: 'main', x: 0, z: 2.85, width: 21.4, depth: 10.3 },
  { id: 'upper', x: 0, z: -7.8, width: 15.5, depth: 7.4 },
  { id: 'bridge', x: 0, z: -3.25, width: 2.8, depth: 3.4 },
  { id: 'entry', x: 0, z: 8.65, width: 2.8, depth: 2.7 },
].map(Object.freeze));
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
  '-6': { id: 'bread', type: 'source', ingredient: 'bread', label: 'Bánh mì', icon: 'bread' },
  '-5': { id: 'meat', type: 'source', ingredient: 'meat', label: 'Thịt heo', icon: 'meat' },
  '-4': { id: 'vegetable', type: 'source', ingredient: 'vegetable', label: 'Rau củ', icon: 'vegetable' },
  '-3': { id: 'counter-a' }, '-2': { id: 'plates', type: 'plates' }, '-1': { id: 'counter-c' },
  1: { id: 'board-a', type: 'board' }, 2: { id: 'board-b', type: 'board' },
  3: { id: 'counter-b' }, 4: { id: 'sink', type: 'sink' },
  5: { id: 'sauce', type: 'source', ingredient: 'sauce', label: 'Tương ớt', icon: 'sauce' },
};
const front = {
  '-4': { id: 'pan-a', type: 'pan' }, '-2': { id: 'pan-b', type: 'pan' },
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
  if (col === 0) continue; // A physical opening leads to the other platform.
  add(`main-back-${col}`, col * TILE, -1.4, { x: 0, z: 1 }, back[col]);
  add(`main-front-${col}`, col * TILE, 7, { x: 0, z: -1 }, front[col]);
}
for (let col = -5; col <= 5; col++) {
  const cornerX = Math.abs(col) === 5 ? -Math.sign(col) : 0;
  add(`upper-back-${col}`, col * TILE, -10.5, { x: cornerX, z: 1 });
  if (col !== 0) add(`upper-front-${col}`, col * TILE, -4.9, { x: cornerX, z: -1 });
}
for (let row = 0; row < 3; row++) {
  const ingredient = ['bread', 'meat', 'vegetable'][row];
  add(`upper-${ingredient}`, -7, -9.1 + row * TILE, { x: 1, z: 0 }, { type: 'source', ingredient, label: ['Bánh mì', 'Thịt heo', 'Rau củ'][row], icon: ingredient });
  add(`upper-work-${row}`, 7, -9.1 + row * TILE, { x: -1, z: 0 }, { type: ['board', 'pan', 'counter'][row] });
}
export const STATIONS = Object.freeze(stations);
