import { FLOOR_AREAS, SPAWN, STATIONS } from './level.js';
import { screenToWorldMotion, worldFacingToMotion } from './movement.js';
import { STAR_THRESHOLDS, orderPrice, tipForCombo } from './scoring.js';
import { carryOrigin, throwArc } from './throwing.js';
export { STATIONS, FLOOR_AREAS, SPAWN };
export const RULES=Object.freeze({duration:180,chop:2.2,cook:6,burn:21,burnWarning:14,wash:2,discard:.65,orderLife:100,cadence:26,speed:5.46,radius:.30,characterScale:1.3,dashSpeed:11.44,dashDuration:.19,throwRange:8,fireSpread:6,extinguish:1.2,stars:STAR_THRESHOLDS});
export const PLATE_PARTS=Object.freeze(['bread:ready','meat:cooked','vegetable:chopped','sauce:ready']);
export const RECIPES=Object.freeze([
  {id:'herb',name:'Bánh mì thịt rau',title:'Thịt & rau',note:'Có rau · Không cay',parts:PLATE_PARTS.slice(0,3)},
  {id:'classic',name:'Bánh mì thịt',title:'Thịt nguyên bản',note:'Không rau · Không cay',parts:PLATE_PARTS.slice(0,2)},
  {id:'spicy',name:'Bánh mì thịt cay',title:'Thịt & tương ớt',note:'Không rau · Có tương ớt',parts:[PLATE_PARTS[0],PLATE_PARTS[1],PLATE_PARTS[3]]},
  {id:'loaded',name:'Bánh mì đầy đủ',title:'Bánh mì đầy đủ',note:'Có rau · Có tương ớt',parts:[...PLATE_PARTS]},
].map(recipe=>Object.freeze({...recipe,parts:Object.freeze(recipe.parts)})));
export const getRecipe=id=>RECIPES.find(recipe=>recipe.id===id);
export const isChoppable=item=>item?.state==='raw'&&['meat','vegetable'].includes(item.kind);
export const isPanFood=item=>item?.kind==='meat'&&['chopped','cooked','burnt'].includes(item.state);
export const isAssembly=item=>['plate','meal'].includes(item?.kind);
export const plateCount=item=>item?.kind==='plate'?Math.max(1,Math.floor(Number.isFinite(item.count)?item.count:1)):0;
export const itemParts=item=>!item?[]:isAssembly(item)?item.parts:[item];
export const itemKey=item=>!item?'':item.kind==='pan'?`pan:${itemKey(item.food)}`:isAssembly(item)?`${item.kind}${item.dirty?`-dirty-${plateCount(item)}`:''}:${item.parts.map(itemKey).sort().join(',')}`:`${item.kind}:${item.state||''}`;
export function recipeForItem(item){
  if(!isAssembly(item)||item.dirty||plateCount(item)>1)return undefined;
  const parts=new Set(item.parts.map(itemKey));if(parts.size!==item.parts.length)return undefined;
  return RECIPES.find(recipe=>parts.size===recipe.parts.length&&recipe.parts.every(part=>parts.has(part)));
}
export const recipeForPlate=item=>item?.kind==='plate'?recipeForItem(item):undefined;
export const isReadyPlate=item=>Boolean(recipeForPlate(item));
export function itemName(item){
  if(!item)return 'Tay trống';
  if(item.kind==='extinguisher')return 'Bình chữa cháy';
  if(item.kind==='pan')return item.food?`Chảo · ${itemName(item.food)}`:'Chảo rỗng';
  if(item.kind==='plate'&&item.dirty)return plateCount(item)>1?`Chồng ${plateCount(item)} đĩa bẩn`:'Đĩa bẩn';
  if(item.kind==='meal')return recipeForItem(item)?`${recipeForItem(item).name} · chưa có đĩa`:`Phần nhân · ${item.parts.length} nguyên liệu`;
  if(item.kind==='plate')return recipeForPlate(item)?.name||(item.parts.length?`Đĩa · ${item.parts.length} nguyên liệu`:'Đĩa sạch');
  return `${({bread:'Bánh mì',meat:'Thịt',vegetable:'Rau củ',sauce:'Tương ớt'})[item.kind]||item.kind}${({raw:' sống',chopped:' đã cắt',cooked:' đã chín',burnt:' bị cháy'})[item.state]||''}`;
}
const freshPan=()=>({kind:'pan',food:null,progress:0,heat:0});
const snapshotKeys=['phase','resumePhase','time','countdown','score','revenue','tips','penalties','served','missed','combo','maxCombo','orders','players','groundItems','projectiles'];
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const isReadyPart=item=>PLATE_PARTS.includes(itemKey(item));
function assembled(a,b){
  if(!a||!b||a.dirty||b.dirty||plateCount(a)>1||plateCount(b)>1||(a.kind==='plate'&&b.kind==='plate'))return null;
  const parts=[...itemParts(a),...itemParts(b)];
  if(!parts.every(isReadyPart)||new Set(parts.map(p=>p.kind)).size!==parts.length)return null;
  return {kind:a.kind==='plate'||b.kind==='plate'?'plate':'meal',parts};
}
function stackedDirty(a,b){
  if(a?.kind!=='plate'||b?.kind!=='plate'||!a.dirty||!b.dirty)return null;
  a.count=plateCount(a)+plateCount(b);a.parts=[];return a;
}
function segmentHitsBox(a,b,box){
  let enter=0,exit=1;
  for(const [axis,size] of [['x','width'],['z','depth']]){
    const half=(box[size]||.3)/2-.025,delta=b[axis]-a[axis],low=box[axis]-half,high=box[axis]+half;
    if(Math.abs(delta)<1e-8){if(a[axis]<=low||a[axis]>=high)return false;continue;}
    let first=(low-a[axis])/delta,last=(high-a[axis])/delta;if(first>last)[first,last]=[last,first];
    enter=Math.max(enter,first);exit=Math.min(exit,last);if(enter>=exit)return false;
  }
  return enter<1&&exit>0;
}
export class KitchenGame {
  constructor(onEvent=()=>{}){this.onEvent=onEvent;this.best=0;this.reset('menu');}
  reset(phase='countdown'){
    this.phase=phase;this.resumePhase='playing';this.time=RULES.duration;this.countdown=3;
    this.player={id:'chef-1',character:'ragged-dog',name:'Bạn',color:'#dc785c',...SPAWN,facingX:0,facingZ:phase==='menu'?1:-1,hand:null,walking:false,dash:0,cooldown:0,targetId:null,work:null,spraying:false};
    this.players=[this.player];this.actorId=null;
    this.stations=STATIONS.map(s=>({...s,item:s.type==='pan'?freshPan():s.initial==='plate'?{kind:'plate',parts:[]}:s.initial==='extinguisher'?{kind:'extinguisher'}:null,progress:0,heat:0,fire:0,fireClock:0,wet:0}));
    this.groundItems=[];this.projectiles=[];this.entityId=0;
    this.orders=[];this.orderId=0;this.orderClock=0;this.score=0;this.revenue=0;this.tips=0;this.penalties=0;this.served=0;this.missed=0;
    this.combo=0;this.maxCombo=0;this.target=null;this.work=null;this.guide=new Set();this.lastMessage='';this.addOrder();this.emit('reset');
  }
  get allItems(){return [...this.stations.map(s=>s.item),...this.players.map(p=>p.hand),...this.groundItems.map(g=>g.item),...this.projectiles.map(p=>p.item)].filter(Boolean);}
  get cleanPlates(){return this.allItems.filter(i=>i.kind==='plate'&&!i.dirty&&!i.parts.length).length;}
  get dirtyPlates(){return this.allItems.filter(i=>i.kind==='plate'&&i.dirty).reduce((count,item)=>count+plateCount(item),0);}
  get returningPlates(){return [];}
  emit(type,data={}){this.onEvent({type,playerId:this.actorId,...data});}
  say(message){this.lastMessage=message;this.emit('message',{message});}
  mark(step){this.guide.add(step);}
  setupPlayers(names){
    const base=this.player;
    this.players=names.slice(0,2).map((name,index)=>({...base,id:`chef-${index+1}`,character:index?'dog-tick':'ragged-dog',name,color:index?'#6f916b':'#dc785c',x:names.length>1?(index?.8:-.8):0,hand:null,work:null,targetId:null,spraying:false}));this.player=this.players[0];
  }
  findTarget(id){return this.stations.find(s=>s.id===id)||this.groundItems.find(s=>s.id===id)||null;}
  withPlayer(id,action){
    const player=this.players.find(p=>p.id===id);if(!player)return;
    const previous={player:this.player,target:this.target,work:this.work,actorId:this.actorId};
    this.player=player;this.target=this.findTarget(player.targetId);this.work=player.work;this.actorId=id;
    try{return action();}finally{
      player.targetId=this.target?.id||null;player.work=this.work;Object.assign(this,previous);
      if(this.player===player){this.target=this.findTarget(player.targetId);this.work=player.work;}
    }
  }
  snapshot(){const data={};for(const key of snapshotKeys)data[key]=this[key];data.stations=this.stations.map(({id,item,progress,heat,fire,wet})=>({id,item,progress,heat,fire,wet}));data.guide=[...this.guide];return structuredClone(data);}
  applySnapshot(data,playerId){
    for(const key of snapshotKeys)this[key]=data[key];
    for(const state of data.stations){const s=this.stations.find(s=>s.id===state.id);if(s)Object.assign(s,state);}
    this.player=this.players.find(p=>p.id===playerId)||this.players[0];this.target=this.findTarget(this.player.targetId);this.work=this.player.work;this.guide=new Set(data.guide);
  }
  addOrder(){if(this.orders.length>=3)return;const recipe=RECIPES[this.orderId%RECIPES.length];this.orders.push({id:++this.orderId,recipeId:recipe.id,remaining:RULES.orderLife,total:RULES.orderLife});}
  start(){this.reset();}
  pause(){if(!['playing','countdown'].includes(this.phase))return;this.resumePhase=this.phase;this.phase='paused';for(const p of this.players){p.walking=false;p.work=null;p.spraying=false;}this.work=null;this.emit('pause');}
  resume(){if(this.phase==='paused'){this.phase=this.resumePhase;this.emit('resume');}}
  canStand(x,z,r=RULES.radius){
    if(!finitePoint({x,z})||!FLOOR_AREAS.some(a=>Math.abs(x-a.x)<=a.width/2-r&&Math.abs(z-a.z)<=a.depth/2-r))return false;
    return !this.stations.some(s=>{const dx=Math.max(0,Math.abs(x-s.x)-s.width/2),dz=Math.max(0,Math.abs(z-s.z)-s.depth/2);return dx*dx+dz*dz<r*r;});
  }
  selectTarget(preferredId=null){
    const p=this.player;let chosen=null,preferred=null,best=Infinity;
    for(const s of [...this.stations,...this.groundItems]){
      if(s.type==='ground'&&!s.item)continue;
      const dx=s.x-p.x,dz=s.z-p.z,d=Math.hypot(dx,dz),dot=(dx*p.facingX+dz*p.facingZ)/(d||1);
      const edge=Math.hypot(Math.max(0,Math.abs(dx)-(s.width||.25)/2),Math.max(0,Math.abs(dz)-(s.depth||.25)/2));
      if(s.type==='ground'?d>1.22:edge>.86)continue;
      const near=s.type==='ground'?s:{x:Math.max(s.x-s.width/2,Math.min(s.x+s.width/2,p.x)),z:Math.max(s.z-s.depth/2,Math.min(s.z+s.depth/2,p.z))};
      if(this.stations.some(other=>other!==s&&segmentHitsBox(p,near,other)))continue;
      // Reach must stay over walkable floor; proximity never reaches across a gap.
      const samples=Math.max(1,Math.ceil(distance(p,near)/.12));let reachable=true;
      for(let i=0;i<samples;i++){
        const x=p.x+(near.x-p.x)*i/samples,z=p.z+(near.z-p.z)*i/samples;
        if(!FLOOR_AREAS.some(a=>Math.abs(x-a.x)<=a.width/2&&Math.abs(z-a.z)<=a.depth/2)){reachable=false;break;}
      }
      if(!reachable)continue;
      // Keep nearby slots usable without facing them. A narrow, deliberate aim
      // at a slot's centre can still reach an inside corner of an L-shaped row.
      if(s.id===preferredId)preferred=s;
      const aimed=Math.max(0,(dot-.985)/.015)*.22;
      const rank=edge+(1-dot)*.045-aimed+(s.type==='ground'?-.06:0);if(rank<best){best=rank;chosen=s;}
    }
    this.target=preferred||chosen;this.player.targetId=this.target?.id||null;return this.target;
  }
  dash(){if(this.phase!=='playing'||this.work)return;this.player.dash=RULES.dashDuration;this.player.cooldown=0;this.emit('dash');}
  stepPlayer(dt,input={}){
    const p=this.player,motion=screenToWorldMotion(input.x,input.z);let dx=motion.x,dz=motion.z;
    p.walking=motion.magnitude>.05;
    if(p.walking){p.facingX=dx/Math.hypot(dx,dz);p.facingZ=dz/Math.hypot(dx,dz);}p.cooldown=0;
    if(input.dash&&p.dash<=0)this.dash();
    if(p.dash>0){const dashMotion=worldFacingToMotion(p.facingX,p.facingZ);dx=dashMotion.x;dz=dashMotion.z;p.walking=true;}
    const speed=p.dash>0?RULES.dashSpeed:RULES.speed;p.dash=Math.max(0,p.dash-dt);
    const slices=Math.max(1,Math.ceil(Math.hypot(dx,dz)*speed*dt/.08));
    for(let i=0;i<slices;i++){const mx=dx*speed*dt/slices,mz=dz*speed*dt/slices;if(this.canStand(p.x+mx,p.z))p.x+=mx;if(this.canStand(p.x,p.z+mz))p.z+=mz;}
    const continuingWork=input.work&&!p.walking&&p.work?.action!=='extinguish'?p.work?.station:null;
    this.selectTarget(continuingWork);this.work=null;p.spraying=false;
    if(input.work&&(p.hand?.kind==='extinguisher'||!p.walking))this.processWork(dt);
    p.work=this.work;p.targetId=this.target?.id||null;
  }
  tick(dt,input={}){
    if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);
    if(this.phase==='countdown'){const before=Math.ceil(this.countdown);this.countdown-=dt;if(before!==Math.ceil(this.countdown))this.emit('count',{value:Math.ceil(this.countdown)});if(this.countdown<=0){this.phase='playing';this.emit('begin');}return;}
    if(this.phase!=='playing')return;this.time=Math.max(0,this.time-dt);
    if(this.time<=0){this.phase='results';this.work=null;for(const p of this.players){p.walking=false;p.work=null;p.spraying=false;}this.best=Math.max(this.best,this.score);this.emit('finish');return;}
    if(input.players){for(const p of this.players)this.withPlayer(p.id,()=>this.stepPlayer(dt,input.players[p.id]||{}));}else this.stepPlayer(dt,input);
    this.tickCooking(dt);this.tickFire(dt);this.tickThrows(dt);
    for(const order of this.orders)order.remaining-=dt;
    const expired=this.orders.filter(o=>o.remaining<=0);
    if(expired.length){this.orders=this.orders.filter(o=>o.remaining>0);this.missed+=expired.length;this.combo=0;const penalty=Math.min(this.score,15*expired.length);this.score-=penalty;this.penalties+=penalty;this.emit('expired',{penalty,count:expired.length});}
    this.orderClock+=dt;if(this.orderClock>=RULES.cadence&&this.orders.length<3){this.addOrder();this.orderClock=0;this.emit('order');}if(!this.orders.length){this.addOrder();this.orderClock=0;}
  }
  tickCooking(dt){
    for(const s of this.stations){
      const pan=s.item;if(s.type!=='pan'||pan?.kind!=='pan'||!pan.food){s.heat=0;continue;}
      const food=pan.food;if(!isPanFood(food)||s.fire>0)continue;
      if(food.state==='chopped'){pan.progress+=dt;if(pan.progress>=RULES.cook){food.state='cooked';pan.heat=0;this.mark('cook');this.emit('cooked',{station:s.id});}}
      else if(food.state==='cooked'){
        const previous=pan.heat;pan.heat+=dt;
        if(pan.heat>=RULES.burnWarning&&Math.floor(previous)!==Math.floor(pan.heat))this.emit('burn-warning',{station:s.id});
        if(pan.heat>=RULES.burn){food.state='burnt';pan.progress=0;s.fire=1;s.fireClock=0;this.emit('burnt',{station:s.id});this.say('Cháy bếp! Cầm bình chữa cháy và giữ nút xịt.');}
      }s.heat=pan.heat;
    }
  }
  tickFire(dt){
    const spread=[];
    for(const s of this.stations){
      s.wet=Math.max(0,s.wet-dt);if(s.fire<=0)continue;s.fireClock+=dt;
      if(s.fireClock<RULES.fireSpread)continue;s.fireClock=0;
      for(const adjacent of this.stations){
        if(adjacent===s||adjacent.fire>0||adjacent.wet>0)continue;
        const gx=Math.max(0,Math.abs(s.x-adjacent.x)-(s.width+adjacent.width)/2),gz=Math.max(0,Math.abs(s.z-adjacent.z)-(s.depth+adjacent.depth)/2);
        if(Math.hypot(gx,gz)<.09)spread.push(adjacent);
      }
    }
    for(const s of spread){s.fire=1;s.fireClock=0;this.emit('fire-spread',{station:s.id});}
  }
  context(s=this.target){
    const hand=this.player.hand;
    if(hand?.kind==='extinguisher')return {label:'Giữ để xịt chữa cháy',key:'E',mode:'hold'};
    if(s?.fire>0)return {label:'Dập lửa trước khi lấy đồ',key:'',mode:'none'};
    if(!s)return {label:hand?'Thả xuống đất':'Đến gần vật phẩm hoặc quầy',key:hand?'Space':'',mode:hand?'tap':'none'};
    if(s.type==='board'&&isChoppable(s.item)&&!hand)return {label:'Giữ để cắt · Space để lấy',key:'E',mode:'hold'};
    if(s.type==='sink'&&s.item?.dirty&&!hand)return {label:plateCount(s.item)>1?`Giữ để rửa ${plateCount(s.item)} đĩa`:'Giữ để rửa đĩa',key:'E',mode:'hold'};
    if(s.type==='trash'&&s.item&&!hand)return {label:'Giữ để bỏ thức ăn',key:'E',mode:'hold'};
    if(s.type==='serve'&&isReadyPlate(hand)&&!s.item)return {label:'Giao món',key:'Space',mode:'tap'};
    return {label:hand?'Đặt / ghép':s.item?`Lấy ${itemName(s.item)}`:s.type==='source'?`Lấy ${s.label}`:'Bàn trống',key:'Space',mode:'tap'};
  }
  merge(a,b){
    const stack=stackedDirty(a,b);if(stack){this.emit('assemble');return stack;}
    const result=assembled(a,b);if(!result){this.say(a?.dirty||b?.dirty?'Cần rửa đĩa trước.':'Chỉ ghép nguyên liệu đã sẵn sàng và chưa có trong món.');return false;}
    const plate=a.kind==='plate'?a:b.kind==='plate'?b:null;
    if(plate){plate.parts=result.parts;this.mark('plate');}else this.mark('assemble');this.emit('assemble');return plate||result;
  }
  clearSlot(s){s.item=null;s.progress=0;s.heat=0;if(s.type==='ground')this.groundItems=this.groundItems.filter(g=>g.id!==s.id);}
  emptyPan(pan){pan.food=null;pan.progress=0;pan.heat=0;}
  putInPan(pan,item){if(pan.food||!isPanFood(item)||item.state==='burnt')return false;pan.food=item;pan.progress=0;pan.heat=0;return true;}
  discard(item){if(item.kind==='extinguisher')return item;if(item.kind==='pan'){this.emptyPan(item);return item;}if(item.kind==='plate'){item.parts=[];return item;}return null;}
  interact(){
    if(this.phase!=='playing')return;const s=this.selectTarget(),p=this.player,hand=p.hand;
    if(!s){if(hand)this.drop();return;}
    if(s.fire>0){this.say('Cần dập lửa trước khi thao tác ở ô này.');return;}
    if(s.item){
      if(!hand){p.hand=s.item;this.clearSlot(s);this.emit('pickup');return;}
      if(hand.kind==='pan'){
        if(!hand.food&&this.putInPan(hand,s.item)){this.clearSlot(s);this.emit('place');return;}
        if(hand.food?.state==='cooked'){const result=this.merge(hand.food,s.item);if(result){s.item=result;s.progress=0;this.emptyPan(hand);}}return;
      }
      if(s.item.kind==='pan'){
        const pan=s.item;if(this.putInPan(pan,hand)){p.hand=null;this.emit(s.type==='pan'?'sizzle':'place');return;}
        if(pan.food?.state==='cooked'){const result=this.merge(hand,pan.food);if(result){p.hand=result;this.emptyPan(pan);}}
        else this.say(pan.food?'Thịt chưa chín hoặc đã cháy.':'Cho thịt đã cắt vào chảo.');return;
      }
      const result=this.merge(s.item,hand);
      if(result){
        if(result.dirty){
          // Loading the sink keeps partially completed washing; elsewhere gather the stack.
          if(s.type==='sink'){s.item=result;p.hand=null;}else{p.hand=result;this.clearSlot(s);}return;
        }
        // A resting plate stays put. Unplated combinations stay in the chef's hand.
        if(s.item.kind==='plate'){s.item=result;p.hand=null;s.progress=0;}else{p.hand=result;this.clearSlot(s);}
      }return;
    }
    if(hand){
      if(s.type==='trash'){p.hand=this.discard(hand);this.emit('discard');return;}
      if(s.type==='serve'&&isReadyPlate(hand)){if(this.deliverItem(hand,s))p.hand=null;return;}
      s.item=hand;p.hand=null;s.progress=0;s.heat=0;this.emit('place');return;
    }
    if(s.type==='source'){p.hand=this.sourceItem(s);this.mark(`take-${s.ingredient}`);this.emit('pickup');}
  }
  sourceItem(s){return {kind:s.ingredient,state:['bread','sauce'].includes(s.ingredient)?'ready':'raw'};}
  deliverItem(item,s){
    const recipe=recipeForPlate(item),index=this.orders.findIndex(order=>order.recipeId===recipe?.id);
    if(!recipe||index<0){this.say('Chưa có đơn khớp món này. Kiểm tra rau và tương ớt trên phiếu.');return false;}
    const [order]=this.orders.splice(index,1),ordered=index===0,price=orderPrice(order);
    this.combo=ordered?Math.min(4,this.combo+1):0;this.maxCombo=Math.max(this.maxCombo,this.combo);
    const tip=tipForCombo(this.combo),points=price.revenue+tip;this.revenue+=price.revenue;this.tips+=tip;this.score+=points;this.served++;item.parts=[];item.dirty=true;item.count=1;
    const returnTray=this.stations.find(station=>station.returnTray);this.placeBeside(item,returnTray||s,{x:s.x,z:s.z-1.15});
    this.mark('serve');this.emit('serve',{points,revenue:price.revenue,tip,band:price.band,combo:this.combo,ordered,station:s.id,orderId:order.id});this.say(tip?`+${price.revenue} tiền món · +${tip} tip chuỗi ${this.combo}`:`Ngon quá! +${points} điểm`);return true;
  }
  deliver(s){if(this.deliverItem(this.player.hand,s))this.player.hand=null;}
  placeBeside(item,near,fallback){
    if(item.kind==='plate'&&item.dirty){
      const stack=[...this.stations.filter(s=>s.type==='counter'),...this.groundItems].filter(s=>s.item?.kind==='plate'&&s.item.dirty&&!s.fire&&distance(s,near)<3.05).sort((a,b)=>distance(a,near)-distance(b,near))[0];
      if(stack){stackedDirty(stack.item,item);return;}
    }
    const candidates=this.stations.filter(s=>s.type==='counter'&&!s.item&&!s.fire&&distance(s,near)<3.05).sort((a,b)=>distance(a,near)-distance(b,near));
    if(candidates.length){candidates[0].item=item;return;}this.placeGround(item,fallback.x,fallback.z);
  }
  processWork(dt){
    const s=this.target,p=this.player;
    if(p.hand?.kind==='extinguisher'){
      p.spraying=true;this.work={station:s?.id,action:'extinguish'};
      for(const station of this.stations){const dx=station.x-p.x,dz=station.z-p.z,d=Math.hypot(dx,dz),dot=(dx*p.facingX+dz*p.facingZ)/(d||1);
        if(d>3.5||dot<.58||station.fire<=0)continue;station.fire=Math.max(0,station.fire-dt/RULES.extinguish);station.wet=5;
        if(station.fire===0){station.fireClock=0;this.emit('extinguished',{station:station.id});}}
      return;
    }
    if(!s||p.hand||s.fire)return;let duration=0,action='';
    if(s.type==='board'&&isChoppable(s.item)){duration=RULES.chop;action='chop';}
    else if(s.type==='sink'&&s.item?.kind==='plate'&&s.item.dirty){duration=RULES.wash;action='wash';}
    else if(s.type==='trash'&&s.item){duration=RULES.discard;action='discard';}
    if(!duration)return;this.work={station:s.id,action};s.progress+=dt;if(s.progress+1e-8<duration)return;
    if(action==='chop'){s.item.state='chopped';this.mark(`chop-${s.item.kind}`);}
    if(action==='wash'){
      let plate;
      if(plateCount(s.item)>1){s.item.count=plateCount(s.item)-1;s.progress=Math.max(0,s.progress-duration);plate={kind:'plate',parts:[],dirty:false};}
      else{plate=s.item;plate.dirty=false;delete plate.count;this.clearSlot(s);this.work=null;}
      const output=this.stations.find(c=>c.id===s.outputId)||s;
      this.placeBeside(plate,output,{x:output.x,z:output.z+(output.approach?.z||-1.15)});this.emit(action);return;
    }
    if(action==='discard')s.item=this.discard(s.item);s.progress=0;this.work=null;this.emit(action);
  }
  groundPosition(x,z,avoidItems=true){
    const valid=(xx,zz)=>this.canStand(xx,zz,.16)&&(!avoidItems||!this.groundItems.some(g=>Math.hypot(xx-g.x,zz-g.z)<.42));
    if(valid(x,z))return {x,z};
    for(let r=.3;r<=30;r+=.3)for(let i=0;i<24;i++){const xx=x+Math.cos(i*Math.PI/12)*r,zz=z+Math.sin(i*Math.PI/12)*r;if(valid(xx,zz))return {x:xx,z:zz};}
    return {...SPAWN};
  }
  placeGround(item,x,z){
    const position=this.groundPosition(x,z),g={id:`ground-${++this.entityId}`,type:'ground',label:'Vật phẩm dưới đất',icon:item.kind,width:.3,depth:.3,...position,item,progress:0,heat:0};this.groundItems.push(g);return g;
  }
  drop(){if(this.phase!=='playing'||!this.player.hand)return;const p=this.player;this.placeGround(p.hand,p.x+p.facingX*.68,p.z+p.facingZ*.68);p.hand=null;this.emit('place');this.selectTarget();}
  throwTarget(target){
    if(!finitePoint(target))return null;
    const p=this.player,dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz),scale=d>RULES.throwRange?RULES.throwRange/d:1,point={x:p.x+dx*scale,z:p.z+dz*scale};
    const station=this.stations.find(s=>Math.abs(point.x-s.x)<=s.width/2&&Math.abs(point.z-s.z)<=s.depth/2);
    if(station)return {...point,y:1.14,stationId:station.id};
    const floor=this.canStand(point.x,point.z,.16)?point:this.groundPosition(point.x,point.z,false);
    if(distance(p,floor)>RULES.throwRange+.1)return {x:p.x+p.facingX*.6,z:p.z+p.facingZ*.6,y:.2};return {...floor,y:.2};
  }
  throwItem(target){
    if(this.phase!=='playing'||!this.player.hand)return false;const end=this.throwTarget(target);if(!end)return false;
    const p=this.player,start=carryOrigin(p),d=distance(start,end);this.projectiles.push({id:`throw-${++this.entityId}`,ownerId:p.id,item:p.hand,start,end,elapsed:0,duration:.24+d*.055,arc:throwArc(start,end)});
    p.hand=null;this.emit('throw');return true;
  }
  receiveItem(existing,incoming){
    const stack=stackedDirty(existing,incoming);if(stack)return stack;
    if(existing?.kind==='pan'){
      if(this.putInPan(existing,incoming))return existing;
      if(existing.food?.state==='cooked'&&incoming.kind==='plate'){const result=assembled(existing.food,incoming);if(result){this.emptyPan(existing);return {container:existing,result};}}
      return null;
    }return assembled(existing,incoming);
  }
  land(projectile){
    const {item,end,ownerId}=projectile,recipient=this.players.find(p=>p.id!==ownerId&&distance(p,end)<.8);
    if(recipient){
      if(!recipient.hand){recipient.hand=item;this.emit('catch',{playerId:recipient.id});return;}
      const merged=this.receiveItem(recipient.hand,item);
      if(merged){if(merged.container){recipient.hand=merged.container;this.placeGround(merged.result,recipient.x+recipient.facingX*.6,recipient.z+recipient.facingZ*.6);}else recipient.hand=merged;this.emit('catch',{playerId:recipient.id});return;}
    }
    const s=this.stations.find(s=>Math.abs(end.x-s.x)<=s.width/2&&Math.abs(end.z-s.z)<=s.depth/2);
    if(s&&!s.fire){
      if(!s.item){
        if(s.type==='serve'&&isReadyPlate(item)&&this.deliverItem(item,s))return;
        if(s.type==='trash'){s.item=this.discard(item);this.emit('discard');return;}s.item=item;s.progress=0;this.emit('place');return;
      }
      const merged=this.receiveItem(s.item,item);
      if(merged){if(merged.container){s.item=merged.container;this.placeGround(merged.result,s.x,s.z+s.approach.z);}else s.item=merged;this.emit('assemble');return;}
    }
    const ground=this.groundItems.find(g=>distance(g,end)<.5);
    if(ground){
      const merged=this.receiveItem(ground.item,item);
      if(merged){
        if(merged.container){ground.item=merged.container;this.placeGround(merged.result,ground.x,ground.z);}
        else ground.item=merged;
        this.emit('assemble');return;
      }
    }
    this.placeGround(item,end.x,end.z);this.emit('place');
  }
  tickThrows(dt){const flying=this.projectiles;this.projectiles=[];for(const p of flying){p.elapsed+=dt;if(p.elapsed>=p.duration)this.land(p);else this.projectiles.push(p);}}
  get stars(){return RULES.stars.filter(s=>this.score>=s).length;}
  get tutorial(){return {title:'Bếp bánh mì',text:'Cắt thịt, rán trong chảo, ghép đúng đơn và đặt lên đĩa. Mang đĩa bẩn về bồn rửa.',station:null};}
}
