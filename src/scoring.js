// Five stars requires 20% more than the previous 550-point top rank.
export const STAR_THRESHOLDS=Object.freeze([100,240,380,520,660]);
export const RECIPE_PRICES=Object.freeze({classic:100,herb:110,spicy:110,loaded:120});
export function orderPrice(order){
  const total=Number.isFinite(order?.total)&&order.total>0?order.total:100;
  const remaining=Number.isFinite(order?.remaining)?order.remaining:0;
  const ratio=Math.max(0,Math.min(1,remaining/total));
  const band=ratio>=.5?'green':ratio>=.25?'yellow':'red';
  const multiplier=band==='green'?1:band==='yellow'?.9:.8;
  const base=RECIPE_PRICES[order?.recipeId]??100;
  return {band,multiplier,base,revenue:Math.round(base*multiplier)};
}
export const tipForCombo=combo=>combo>=4?40:combo===3?20:combo===2?10:0;
