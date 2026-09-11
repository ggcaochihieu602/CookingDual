// The frontal camera shortens ground depth on screen. Keep keyboard, joystick,
// and server movement in the same screen-space metric without changing X speed.
export const CAMERA=Object.freeze({x:0,y:22,z:28});
export const GROUND_PROJECTION=CAMERA.y/Math.hypot(CAMERA.y,CAMERA.z);
export const DEPTH_SPEED=1/GROUND_PROJECTION;

export function screenToWorldMotion(x=0,z=0){
  x=Number.isFinite(x)?x:0;z=Number.isFinite(z)?z:0;
  const magnitude=Math.hypot(x,z),normalizer=Math.max(1,magnitude);
  return {x:x/normalizer,z:z/normalizer*DEPTH_SPEED,magnitude:Math.min(1,magnitude)};
}

export function worldFacingToMotion(x,z){
  const magnitude=Math.hypot(x,z*GROUND_PROJECTION);
  return magnitude?{x:x/magnitude,z:z/magnitude}:{x:0,z:0};
}
