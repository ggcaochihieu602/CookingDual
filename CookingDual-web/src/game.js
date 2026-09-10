import { FLOOR_AREAS, SPAWN, STATIONS } from './level.js';
export { STATIONS, FLOOR_AREAS, SPAWN };
export const RULES = Object.freeze({ duration: 180, chop: 2.2, cook: 6, burn: 14, wash: 2, clean: 1.2, discard: .65, orderLife: 100, cadence: 26, speed: 4.2, radius: 0.28, stars: [100, 300, 550] });
export const PLATE_PARTS = Object.freeze(['bread:ready', 'meat:cooked', 'vegetable:chopped', 'sauce:ready']);
export const RECIPES = Object.freeze([
  { id: 'herb', name: 'Bánh mì thịt rau', title: 'Thịt & rau', note: 'Có rau · Không cay', parts: PLATE_PARTS.slice(0, 3) },
  { id: 'classic', name: 'Bánh mì thịt', title: 'Thịt nguyên bản', note: 'Không rau · Không cay', parts: PLATE_PARTS.slice(0, 2) },
  { id: 'spicy', name: 'Bánh mì thịt cay', title: 'Thịt & tương ớt', note: 'Không rau · Có tương ớt', parts: [PLATE_PARTS[0], PLATE_PARTS[1], PLATE_PARTS[3]] },
  { id: 'loaded', name: 'Bánh mì đầy đủ', title: 'Bánh mì đầy đủ', note: 'Có rau · Có tương ớt', parts: [...PLATE_PARTS] },
].map(recipe => Object.freeze({ ...recipe, parts: Object.freeze(recipe.parts) })));
export const getRecipe = id => RECIPES.find(recipe => recipe.id === id);
export const isChoppable = item => item?.state === 'raw' && ['meat', 'vegetable'].includes(item.kind);
export const isPanFood = item => item?.kind === 'meat' && ['chopped', 'cooked', 'burnt'].includes(item.state);

export const isAssembly = item => ['plate','meal'].includes(item?.kind);
export const itemParts = item => !item ? [] : isAssembly(item) ? item.parts : [item];
export const itemKey = item => item ? isAssembly(item) ? `${item.kind}:${item.parts.map(itemKey).sort().join(',')}` : `${item.kind}:${item.state}` : '';
export function recipeForItem(item) {
  if (!isAssembly(item)) return undefined;
  const parts = new Set(item.parts.map(itemKey));
  if (parts.size !== item.parts.length) return undefined;
  return RECIPES.find(recipe => parts.size === recipe.parts.length && recipe.parts.every(part => parts.has(part)));
}
export const recipeForPlate = item => item?.kind === 'plate' ? recipeForItem(item) : undefined;
export const isReadyPlate = item => Boolean(recipeForPlate(item));
export function itemName(item) {
  if (!item) return 'Tay trống';
  if (item.kind === 'meal') return recipeForItem(item) ? `${recipeForItem(item).name} · chưa có đĩa` : `Phần nhân · ${item.parts.length} nguyên liệu`;
  if (item.kind === 'plate') return recipeForPlate(item)?.name || (item.parts.length ? `Đĩa · thiếu ${['bread', 'meat'].filter(kind => !item.parts.some(p => p.kind === kind)).map(kind => kind === 'bread' ? 'bánh mì' : 'thịt chín').join(' + ')}` : 'Đĩa sạch');
  const names = { bread: 'Bánh mì', meat: 'Thịt', vegetable: 'Rau củ', sauce: 'Tương ớt' };
  return `${names[item.kind]}${({ raw: ' sống', chopped: ' đã cắt', cooked: ' đã chín', burnt: ' bị cháy' })[item.state] || ''}`;
}

export class KitchenGame {
  constructor(onEvent = () => {}) { this.onEvent = onEvent; this.best = 0; this.reset('menu'); }
  reset(phase = 'countdown') {
    this.phase = phase; this.resumePhase = 'playing'; this.time = RULES.duration; this.countdown = 3;
    this.player = { id:'chef-1', name:'Bạn', color:'#dc785c', ...SPAWN, facingX: 0, facingZ: phase === 'menu' ? 1 : -1, hand: null, walking: false, dash: 0, cooldown: 0, targetId:null, work:null };
    this.players = [this.player]; this.actorId = null;
    this.stations = STATIONS.map(s => ({ ...s, item: null, progress: 0, heat: 0 }));
    this.orders = []; this.orderId = 0; this.orderClock = 0; this.score = 0; this.served = 0; this.missed = 0;
    this.combo = 0; this.maxCombo = 0; this.cleanPlates = 3; this.dirtyPlates = 0; this.returningPlates = [];
    this.target = null; this.work = null; this.guide = new Set(); this.lastMessage = ''; this.addOrder();
    this.emit('reset');
  }
  emit(type, data = {}) { this.onEvent({ type, playerId:this.actorId, ...data }); }
  setupPlayers(names) {
    const base=this.player;
    this.players=names.slice(0,2).map((name,index)=>({...base,id:`chef-${index+1}`,name,color:index?'#4c9fbc':'#dc785c',x:names.length>1?(index? .8:-.8):0,hand:null,work:null,targetId:null}));
    this.player=this.players[0];
  }
  withPlayer(id, action) {
    const player=this.players.find(p=>p.id===id);if(!player)return;
    const previous={player:this.player,target:this.target,work:this.work,actorId:this.actorId};
    this.player=player;this.target=this.stations.find(s=>s.id===player.targetId)||null;this.work=player.work;this.actorId=id;
    try { return action(); } finally {
      player.targetId=this.target?.id||null;player.work=this.work;
      Object.assign(this,previous);
      if(this.player===player){this.target=this.stations.find(s=>s.id===player.targetId)||null;this.work=player.work;}
    }
  }
  snapshot() {
    const data={};
    for(const key of ['phase','resumePhase','time','countdown','score','served','missed','combo','maxCombo','cleanPlates','dirtyPlates','returningPlates','orders','players'])data[key]=this[key];
    data.stations=this.stations.map(({id,item,progress,heat})=>({id,item,progress,heat}));data.guide=[...this.guide];return structuredClone(data);
  }
  applySnapshot(data,playerId) {
    for(const key of ['phase','resumePhase','time','countdown','score','served','missed','combo','maxCombo','cleanPlates','dirtyPlates','returningPlates','orders','players'])this[key]=data[key];
    for(const state of data.stations){const station=this.stations.find(s=>s.id===state.id);if(station)Object.assign(station,state);}
    this.player=this.players.find(p=>p.id===playerId)||this.players[0];
    this.target=this.stations.find(s=>s.id===this.player.targetId)||null;this.work=this.player.work;this.guide=new Set(data.guide);
  }
  say(message) { this.lastMessage = message; this.emit('message', { message }); }
  addOrder() {
    if (this.orders.length >= 3) return;
    const recipe = RECIPES[this.orderId % RECIPES.length];
    this.orders.push({ id: ++this.orderId, recipeId: recipe.id, remaining: RULES.orderLife, total: RULES.orderLife });
  }
  start() { this.reset(); }
  pause() { if (['playing', 'countdown'].includes(this.phase)) { this.resumePhase = this.phase; this.phase = 'paused'; for(const p of this.players){p.walking=false;p.work=null;} this.work = null; this.emit('pause'); } }
  resume() { if (this.phase === 'paused') { this.phase = this.resumePhase; this.emit('resume'); } }
  mark(step) { this.guide.add(step); }
  canStand(x, z) {
    const r = RULES.radius;
    if (!FLOOR_AREAS.some(a => Math.abs(x - a.x) <= a.width / 2 - r && Math.abs(z - a.z) <= a.depth / 2 - r)) return false;
    return !this.stations.some(s => {
      const nx = Math.max(s.x - s.width / 2, Math.min(x, s.x + s.width / 2));
      const nz = Math.max(s.z - s.depth / 2, Math.min(z, s.z + s.depth / 2));
      return (x - nx) ** 2 + (z - nz) ** 2 < r * r;
    });
  }
  selectTarget() {
    const p = this.player;
    let chosen = null, best = Infinity;
    for (const s of this.stations) {
      const dx = s.x - p.x, dz = s.z - p.z, distance = Math.hypot(dx, dz);
      const dot = (dx * p.facingX + dz * p.facingZ) / (distance || 1);
      const edgeDistance = Math.hypot(Math.max(0, Math.abs(dx) - s.width / 2), Math.max(0, Math.abs(dz) - s.depth / 2));
      if (edgeDistance > 0.68 || dot < 0.32) continue;
      const rank = distance + (1 - dot) * 0.75;
      if (rank < best) { best = rank; chosen = s; }
    }
    this.target = chosen;
    return chosen;
  }
  dash() {
    if (this.phase !== 'playing' || this.player.cooldown > 0 || this.work) return;
    this.player.dash = 0.19; this.player.cooldown = 1.1; this.emit('dash');
  }
  stepPlayer(dt, input = {}) {
    const p = this.player;
    let dx = input.x || 0, dz = input.z || 0;
    const magnitude = Math.hypot(dx, dz);
    if (magnitude > 1) { dx /= magnitude; dz /= magnitude; }
    p.walking = magnitude > 0.05;
    if (p.walking) { p.facingX = dx / Math.hypot(dx, dz); p.facingZ = dz / Math.hypot(dx, dz); }
    p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.dash > 0) { dx = p.facingX; dz = p.facingZ; p.walking = true; }
    const speed = p.dash > 0 ? 8.8 : RULES.speed;
    p.dash = Math.max(0, p.dash - dt);
    // Small collision steps keep a dash from passing through a counter.
    const slices = Math.max(1, Math.ceil(speed * dt / 0.08));
    for (let i = 0; i < slices; i++) {
      const mx = dx * speed * dt / slices, mz = dz * speed * dt / slices;
      if (this.canStand(p.x + mx, p.z)) p.x += mx;
      if (this.canStand(p.x, p.z + mz)) p.z += mz;
    }
    this.selectTarget(); this.work = null;
    if (input.work && !p.walking) this.processWork(dt);
    p.targetId = this.target?.id || null; p.work = this.work;
  }
  tick(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    if (this.phase === 'countdown') {
      const before = Math.ceil(this.countdown); this.countdown -= dt;
      if (before !== Math.ceil(this.countdown)) this.emit('count', { value: Math.ceil(this.countdown) });
      if (this.countdown <= 0) { this.phase = 'playing'; this.emit('begin'); }
      return;
    }
    if (this.phase !== 'playing') return;
    this.time = Math.max(0, this.time - dt);
    if (this.time <= 0) { this.phase = 'results'; this.work = null; for(const p of this.players){p.walking=false;p.work=null;} this.best = Math.max(this.best, this.score); this.emit('finish'); return; }
    if (input.players) {
      for (const player of this.players) this.withPlayer(player.id, () => this.stepPlayer(dt, input.players[player.id] || {}));
    } else this.stepPlayer(dt, input);
    for (const s of this.stations) {
      if (s.type !== 'pan' || !isPanFood(s.item)) continue;
      if (s.item.state === 'chopped') {
        s.progress += dt;
        if (s.progress >= RULES.cook) { s.item.state = 'cooked'; s.heat = 0; this.mark('cook'); this.emit('cooked', { station: s.id }); }
      } else if (s.item.state === 'cooked') {
        s.heat += dt;
        if (s.heat >= RULES.burn) { s.item.state = 'burnt'; s.progress = 0; this.emit('burnt', { station: s.id }); this.say('Thịt cháy rồi! Giữ E ở bếp để dọn chảo.'); }
      }
    }
    for (const order of this.orders) order.remaining -= dt;
    const expired = this.orders.filter(o => o.remaining <= 0);
    if (expired.length) {
      this.orders = this.orders.filter(o => o.remaining > 0); this.missed += expired.length; this.combo = 0;
      this.score = Math.max(0, this.score - 15 * expired.length); this.emit('expired'); this.say('Một đơn đã hết giờ. Tiếp tục với đơn tiếp theo nhé!');
    }
    this.orderClock += dt;
    if (this.orderClock >= RULES.cadence && this.orders.length < 3) { this.addOrder(); this.orderClock = 0; this.emit('order'); }
    if (!this.orders.length) { this.addOrder(); this.orderClock = 0; }
    this.returningPlates = this.returningPlates.map(t => t - dt);
    const returned = this.returningPlates.filter(t => t <= 0).length;
    if (returned) { this.dirtyPlates += returned; this.returningPlates = this.returningPlates.filter(t => t > 0); this.emit('dirty'); }
  }
  context(s = this.target) {
    if (!s) return { label: 'Đến gần và hướng về một quầy', key: '', mode: 'none' };
    const hand = this.player.hand;
    if (s.item && hand) return { label: s.item.kind === 'plate' || hand.kind === 'plate' ? 'Ghép thức ăn vào đĩa' : 'Ghép các nguyên liệu đã sẵn sàng', key: 'Space', mode: 'tap' };
    if (s.item) {
      if (s.type === 'board' && isChoppable(s.item)) return { label: 'Giữ để cắt · Space để lấy', key: 'E', mode: 'hold' };
      if (s.type === 'pan' && s.item.state === 'burnt') return { label: 'Giữ để dọn chảo cháy', key: 'E', mode: 'hold' };
      if (s.type === 'trash' && (s.item.kind !== 'plate' || s.item.parts.length)) return { label: 'Giữ để bỏ thức ăn · giữ lại đĩa', key: 'E', mode: 'hold' };
      return { label: `Lấy ${itemName(s.item).toLowerCase()}`, key: 'Space', mode: 'tap' };
    }
    if (hand) {
      if (s.type === 'serve' && isReadyPlate(hand)) return { label: 'Giao bánh mì', key: 'Space', mode: 'tap' };
      return { label: `Đặt ${itemName(hand).toLowerCase()} vào ô trống`, key: 'Space', mode: 'tap' };
    }
    if (s.type === 'source') return { label: `Lấy ${s.label.toLowerCase()}`, key: 'Space', mode: 'tap' };
    if (s.type === 'plates') return { label: this.cleanPlates ? `Lấy đĩa sạch · còn ${this.cleanPlates}` : 'Hết đĩa — hãy rửa tại bồn', key: 'Space', mode: 'tap' };
    if (s.type === 'sink') return { label: this.dirtyPlates ? `Rửa đĩa · ${this.dirtyPlates} đĩa bẩn` : 'Chưa có đĩa bẩn', key: 'E', mode: this.dirtyPlates ? 'hold' : 'none' };
    return { label: 'Ô trống · có thể đặt đồ hoặc đĩa', key: 'Space', mode: 'tap' };
  }
  merge(a, b) {
    const plate = a?.kind === 'plate' ? a : b?.kind === 'plate' ? b : null;
    if (!a || !b || (a.kind === 'plate' && b.kind === 'plate')) { this.say('Không thể ghép hai đĩa.'); return false; }
    const parts = plate ? [...plate.parts,...itemParts(plate===a?b:a)] : [...itemParts(a), ...itemParts(b)];
    if (!parts.every(part => PLATE_PARTS.includes(itemKey(part)))) { this.say('Cần cắt rau và nấu chín thịt trước khi ghép món.'); return false; }
    if (new Set(parts.map(part => part.kind)).size !== parts.length) { this.say('Món đã có nguyên liệu này rồi.'); return false; }
    const result = plate || {kind:'meal',parts:[]}; result.parts = parts;
    this.mark(plate ? 'plate' : 'assemble'); this.emit('assemble'); return result;
  }
  interact() {
    if (this.phase !== 'playing') return;
    const s = this.selectTarget(), p = this.player;
    if (!s) { this.say('Đứng gần và hướng về quầy để tương tác.'); return; }
    const hand = p.hand;
    // The visible work slot always wins over the equipment's supply/action.
    // Never replace an occupied slot or draw hidden inventory through it.
    if (s.item) {
      if (!hand) { p.hand = s.item; s.item = null; s.progress = 0; s.heat = 0; this.emit('pickup'); return; }
      const result = this.merge(s.item, hand);
      if (result) {
        if (hand.kind === 'plate') { p.hand = result; s.item = null; }
        else { s.item = result; p.hand = null; }
        s.progress = 0; s.heat = 0;
      }
      return;
    }
    if (hand) {
      if (s.type === 'serve' && isReadyPlate(hand) && this.orders.length) { this.deliver(s); return; }
      // All empty tiles accept a held object, regardless of their station type.
      s.item = hand; p.hand = null; s.progress = 0; s.heat = 0;
      if (s.type === 'serve' && hand.kind === 'meal') this.say('Đã đặt món lên quầy. Thêm đĩa sạch trước khi giao nhé!');
      this.emit(s.type === 'pan' && isPanFood(hand) ? 'sizzle' : 'place');
      if (s.type === 'pan' && hand.kind === 'meat' && hand.state === 'raw') this.say('Đã đặt thịt lên bếp. Cần mang sang thớt cắt trước khi rán.');
      return;
    }
    if (s.type === 'source') {
      const item = { kind: s.ingredient, state: ['bread', 'sauce'].includes(s.ingredient) ? 'ready' : 'raw' };
      p.hand = item; this.mark(`take-${s.ingredient}`); this.emit('pickup');
      return;
    }
    if (s.type === 'plates') {
      if (!this.cleanPlates) { this.say('Đĩa sạch đã hết. Giữ E ở bồn rửa để rửa đĩa.'); return; }
      this.cleanPlates--; p.hand = { kind: 'plate', parts: [] }; this.emit('pickup'); return;
    }
    if (s.type === 'sink') { this.say(this.dirtyPlates ? 'Giữ E để rửa. Cần tay trống.' : 'Đĩa bẩn sẽ được trả về sau khi giao món.'); return; }
  }
  deliver(s) {
    const recipe = recipeForPlate(this.player.hand);
    const index = this.orders.findIndex(order => order.recipeId === recipe?.id);
    if (!recipe || index < 0) { this.say('Chưa có đơn khớp món này. Kiểm tra rau và tương ớt trên phiếu nhé!'); return; }
    const [order] = this.orders.splice(index, 1);
    this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
    const points = 100 + Math.ceil(order.remaining * 0.3) + Math.min(40, (this.combo - 1) * 10);
    this.score += points; this.served++; this.player.hand = null; this.returningPlates.push(3); this.mark('serve');
    this.emit('serve', { points, station: s.id }); this.say(`Ngon quá! +${points} điểm`);
  }
  processWork(dt) {
    const s = this.target;
    if (!s || this.player.hand) return;
    let duration = 0, action = '';
    if (s.type === 'board' && isChoppable(s.item)) { duration = RULES.chop; action = 'chop'; }
    else if (s.type === 'sink' && !s.item && this.dirtyPlates > 0) { duration = RULES.wash; action = 'wash'; }
    else if (s.type === 'pan' && s.item?.state === 'burnt') { duration = RULES.clean; action = 'clean'; }
    else if (s.type === 'trash' && s.item && (s.item.kind !== 'plate' || s.item.parts.length)) { duration = RULES.discard; action = 'discard'; }
    if (!duration) return;
    this.work = { station: s.id, action }; s.progress += dt;
    if (s.progress >= duration) {
      if (action === 'chop') { s.item.state = 'chopped'; this.mark(`chop-${s.item.kind}`); }
      if (action === 'wash') { this.dirtyPlates--; this.cleanPlates++; }
      if (action === 'clean') { s.item = null; s.heat = 0; }
      if (action === 'discard') { if (s.item.kind === 'plate') s.item.parts = []; else s.item = null; this.say('Đã bỏ thức ăn. Đĩa được giữ lại trên quầy.'); }
      s.progress = 0; this.work = null; this.emit(action);
    }
  }
  get stars() { return RULES.stars.filter(s => this.score >= s).length; }
  get tutorial() {
    if (this.served > 0) return { title: 'Mỗi khách một khẩu vị', text: 'Bánh mì luôn có thịt. Thêm rau, tương ớt hoặc cả hai đúng theo phiếu. Tương ớt lấy ra dùng ngay!', station: null };
    const recipe = getRecipe(this.orders[0]?.recipeId) || RECIPES[0];
    if (!this.guide.has('take-meat')) return { title: 'Bắt đầu với phần thịt', text: 'Đi tới quầy thịt heo ở phía sau. Nhấn Space để lấy.', station: 'meat' };
    if (!this.guide.has('chop-meat')) return { title: 'Cắt thịt', text: 'Đặt thịt lên thớt bằng Space, thả phím rồi giữ E để cắt.', station: 'board-a' };
    const cooking = this.stations.some(s => s.type === 'pan' && s.item);
    if (!this.guide.has('cook') && !cooking) return { title: 'Bật bếp nào!', text: 'Lấy thịt đã cắt rồi đặt lên bếp rán ở dãy quầy phía trước, bên trái.', station: 'pan-a' };
    if (recipe.parts.includes('vegetable:chopped') && !this.guide.has('chop-vegetable')) return { title: 'Chuẩn bị rau trong lúc chờ', text: 'Đơn này có rau. Lấy rau, đặt lên thớt rồi giữ E để cắt.', station: this.player.hand?.kind === 'vegetable' ? 'board-a' : 'vegetable' };
    if (!this.guide.has('plate')) return { title: 'Ghép trước, thêm đĩa sau', text: 'Space để ghép các nguyên liệu đã sẵn sàng trên bàn. Có thể ghép cả món trước rồi dùng đĩa sạch lấy món.', station: 'plates' };
    if (![this.player.hand, ...this.stations.map(s => s.item)].some(item => recipeForPlate(item)?.id === recipe.id)) return { title: `Soạn ${recipe.name.toLowerCase()}`, text: `Bánh mì + thịt chín. ${recipe.note}. Ghép đúng thành phần bằng Space tại bàn.`, station: recipe.parts.includes('sauce:ready') ? 'sauce' : null };
    return { title: 'Giao chiếc bánh đầu tiên!', text: 'Cầm đĩa tới một trong ba ô của xe bánh mì bên phải, phía trước rồi nhấn Space.', station: 'serve' };
  }
}

