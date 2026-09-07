export const B = Object.freeze({
  dt: 1/120, radius: .0335, halfWidth: 4.115, halfLength: 11.885, service: 6.4,
  gravity: 9.81, drag: .0105, magnus: .003, restitution: .76,
  reaction: new Float32Array([.27,.21,.105]),
  speed: new Float32Array([5.2,5.6,6.9]),
  acceleration: new Float32Array([14,15,21]),
  error: new Float32Array([.70,.40,.20]),
  labels: ['Easy','Club','Pro'], shapeNames: ['Flat','Topspin','Slice','Lob','Smash']
});
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function random(s) { let t=s.seed+=0x6d2b79f5; t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296; }
