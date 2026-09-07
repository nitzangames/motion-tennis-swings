import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Racket-local metres. The handle sits inside the curled fingers, beyond the
// wrist, with its long axis crossing the palm toward the index finger.
export const GRIP=Object.freeze({headToGrip:.68,wristSide:.075,wristDrop:.03,forearm:.38});
export const HEAD_TO_WRIST=Math.hypot(GRIP.wristSide,GRIP.headToGrip+GRIP.wristDrop);

export function makeHand(material,side){
  const hand=new THREE.Bone();hand.name=side===1?'right-hand':'left-hand';hand.position.y=-GRIP.forearm;
  const parts=[];
  function oval(x,y,z,sx,sy,sz){
    const geometry=new THREE.SphereGeometry(1,10,8);geometry.scale(sx,sy,sz);geometry.translate(x,y,z);parts.push(geometry);
  }
  oval(0,0,0,.031,.033,.030); // wrist
  oval(-.026,.014,0,.045,.050,.032); // palm
  // Four curled fingers, with a small opening on the palm side of the handle.
  // Merge their geometry once: each hand costs one draw call.
  for(let finger=0;finger<4;finger++){
    const geometry=new THREE.TorusGeometry(.034,.0115,6,16,Math.PI*1.4);
    geometry.rotateZ(Math.PI*.3);geometry.rotateX(Math.PI/2);
    geometry.translate(-GRIP.wristSide,GRIP.wristDrop+(finger-1.5)*.024,0);parts.push(geometry);
  }
  const thumb=new THREE.CapsuleGeometry(.017,.039,4,8);
  thumb.rotateZ(-.7);thumb.translate(-.058,.058,-.035);parts.push(thumb);
  const geometry=mergeGeometries(parts);for(const part of parts)part.dispose();
  if(side===-1){
    // Reflect geometry and winding together; negative scale would invert faces.
    geometry.scale(-1,1,1);const index=geometry.index.array;
    for(let i=0;i<index.length;i+=3){const swap=index[i];index[i]=index[i+2];index[i+2]=swap;}
  }
  // A closed resting fist for the free hand, without an empty handle-shaped hole.
  const fill=new THREE.SphereGeometry(1,10,8);fill.scale(.027,.045,.027);fill.translate(-side*GRIP.wristSide,GRIP.wristDrop,0);
  const restingGeometry=mergeGeometries([geometry,fill]);fill.dispose();
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;hand.add(mesh);
  const socket=new THREE.Object3D();socket.name='palm-grip';socket.position.set(-side*GRIP.wristSide,GRIP.wristDrop,0);hand.add(socket);
  return {hand,socket,mesh,grippingGeometry:geometry,restingGeometry};
}
