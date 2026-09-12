export const THROW_ANGLE=Math.PI/6;
export function carryOrigin(player){
  const length=Math.hypot(player.facingX,player.facingZ)||1;
  return {x:player.x+player.facingX/length*1.03,y:player.character==='dog-tick'?1.10:1.48,z:player.z+player.facingZ/length*1.03};
}
export function throwArc(start,end){
  const distance=Math.hypot(end.x-start.x,end.z-start.z);
  return Math.max(0,(distance*Math.tan(THROW_ANGLE)-(end.y-start.y))/4);
}
export function throwPoint(start,end,arc,t){
  return {x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t+4*arc*t*(1-t),z:start.z+(end.z-start.z)*t};
}
