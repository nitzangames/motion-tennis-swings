// Debug fixtures use the production path and rig, sampled at the game's 120 Hz.
// Only the fixed strike target and timeline are supplied by this viewer.
import * as THREE from 'three';
import {B} from './balance.js';
import {createState} from './data.js';
import {submitSwing} from './logic.js';
import {STROKE,updateRacket} from './swing.js';
import {makePlayer,animatePlayer} from './board.js';
import {GRIP} from './grip.js';

export const PREVIEW=Object.freeze({fps:120,frames:192,start:36,onset:72,toss:12,followFrames:Math.round(STROKE.follow*120),recoveryFrames:Math.ceil(STROKE.end*120)});
export const previewStart=preview=>preview.variant.serve?PREVIEW.toss:PREVIEW.start;
export const previewEnd=preview=>Math.min(PREVIEW.frames,preview.strike+PREVIEW.recoveryFrames);
const notes=[
  'Shares its arm path with topspin. The ball physics differ.',
  'The same arm path as flat; topspin is applied to the ball.',
  'A descending wrist path, using the shared swing arc.',
  'A rising scoop, using the shared swing arc.',
  'An elevated strike target with a descending overhead path.'
];
export const VARIANTS=Object.freeze([
  ...['Forehand','Backhand'].flatMap((side,index)=>B.shapeNames.map((name,shape)=>Object.freeze({id:side.toLowerCase()+'-'+name.toLowerCase(),name:side+' '+name.toLowerCase(),family:side,shape,side:index===0?1:-1,serve:false,note:notes[shape]}))),
  Object.freeze({id:'serve',name:'Serve',family:'Overhead',shape:4,side:1,serve:true,note:'Toss preparation, overhead strike, follow-through, and recovery.'})
]);
const scratch=new THREE.Vector3(),grip=new THREE.Vector3();
export function createPreview(variant){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e6e9df');
  scene.add(new THREE.HemisphereLight('#fff8e8','#829382',2.3));
  const sun=new THREE.DirectionalLight('#fff0d1',2.5);sun.position.set(-3,6,-4);scene.add(sun);
  const fill=new THREE.DirectionalLight('#dae8e1',.6);fill.position.set(4,2,3);scene.add(fill);
  const rig=makePlayer(scene,'#efe7ce','#b98a5b',false);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(2.6,64),new THREE.MeshStandardMaterial({color:'#d5dccd',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.018;scene.add(ground);
  const grid=new THREE.GridHelper(4,16,'#bec9b4','#c9d2c1');grid.position.y=-.01;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
  const target=new THREE.Mesh(new THREE.SphereGeometry(B.radius*1.6,16,10),new THREE.MeshStandardMaterial({color:'#d7e763',emissive:'#b5c654',emissiveIntensity:.25}));scene.add(target);
  const skeleton=new THREE.SkeletonHelper(rig.root);skeleton.material.depthTest=false;skeleton.material.color.set('#3482ac');skeleton.renderOrder=5;skeleton.visible=false;scene.add(skeleton);
  const axes=new THREE.AxesHelper(.3);axes.visible=false;scene.add(axes);
  const trailGeometry=new THREE.BufferGeometry(),trailPositions=new Float32Array((PREVIEW.frames+1)*3);trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));
  const trail=new THREE.Line(trailGeometry,new THREE.LineBasicMaterial({color:'#3b947f',transparent:true,opacity:.8}));trail.frustumCulled=false;trail.visible=false;scene.add(trail);
  const nodes=[rig.root,rig.hips,rig.torso,...rig.legs.flatMap(a=>[a.upper,a.lower]),...rig.arms.flatMap(a=>[a.upper,a.lower,a.hand]),...rig.feet,rig.racket];
  return {variant,scene,rig,grid,target,skeleton,axes,trail,trailPositions,nodes,positions:new Float64Array((PREVIEW.frames+1)*nodes.length*3),rotations:new Float64Array((PREVIEW.frames+1)*nodes.length*4),gaps:new Float64Array(PREVIEW.frames+1),targetPosition:new Float64Array(3),hand:1,strike:86};
}
function capture(preview,frame){
  const count=preview.nodes.length;
  for(let i=0;i<count;i++){
    preview.nodes[i].position.toArray(preview.positions,(frame*count+i)*3);
    preview.nodes[i].quaternion.toArray(preview.rotations,(frame*count+i)*4);
  }
  preview.rig.root.updateMatrixWorld(true);preview.rig.racket.updateMatrixWorld(true);
  const arm=preview.rig.arms[preview.hand===1?1:0];arm.socket.getWorldPosition(scratch);preview.rig.racket.localToWorld(grip.set(0,-GRIP.headToGrip,0));preview.gaps[frame]=scratch.distanceTo(grip);
  preview.rig.racket.position.toArray(preview.trailPositions,frame*3);
}
export function bakePreview(preview,hand=1){
  preview.hand=hand;const s=createState(27,0),p=preview.rig,v=preview.variant;
  s.hand=hand;s.x.fill(0);s.z.fill(0);s.prevX.fill(0);s.prevZ.fill(0);s.targetX.fill(0);s.targetZ.fill(0);s.phase=v.serve?'ready':'rally';s.receiver=0;
  p.initialized=false;p.animationAt=undefined;p.racket.quaternion.identity();p.torso.rotation.set(0,0,0);p.weights.fill(0);
  updateRacket(s,0,0);s.oldRackX[0]=s.rackX[0];s.oldRackY[0]=s.rackY[0];s.oldRackZ[0]=s.rackZ[0];
  animatePlayer(p,s,0,1,0);capture(preview,0);
  const onset=PREVIEW.onset/PREVIEW.fps;
  s.prediction.set([hand*v.side*.68,v.shape===4?2.65:.95,-.35,onset+.12,1]);
  for(let frame=1;frame<=PREVIEW.frames;frame++){
    s.time=frame/PREVIEW.fps;
    if(v.serve&&frame>=PREVIEW.toss&&frame<=PREVIEW.onset){
      s.phase='toss';const t=(frame-PREVIEW.toss)/PREVIEW.fps;
      s.ball[0]=hand*.35;s.ball[1]=1.35+5.5*t-.5*B.gravity*t*t;s.ball[2]=0;s.ball[4]=5.5-B.gravity*t;
    }
    if(frame===PREVIEW.onset){
      submitSwing(s,{power:.7,shape:v.shape,side:v.side,onset:s.time,timing:0},0);
      preview.strike=Math.round(s.strokeAt[0]*PREVIEW.fps);
      preview.targetPosition.set([s.contactX[0],s.contactY[0],s.contactZ[0]]);
    }
    if(frame>PREVIEW.onset&&s.time>=s.strokeAt[0]){s.phase='rally';s.armed[0]=0;}
    updateRacket(s,0,B.dt);animatePlayer(p,s,0,1,B.dt);capture(preview,frame);
  }
  preview.target.position.fromArray(preview.targetPosition);
  preview.trail.geometry.setDrawRange(previewStart(preview),previewEnd(preview)-previewStart(preview)+1);
  preview.trail.geometry.attributes.position.needsUpdate=true;
}
export function samplePreview(preview,frame){
  const count=preview.nodes.length;
  for(let i=0;i<count;i++){
    preview.nodes[i].position.fromArray(preview.positions,(frame*count+i)*3);
    preview.nodes[i].quaternion.fromArray(preview.rotations,(frame*count+i)*4);
  }
  preview.axes.position.copy(preview.rig.racket.position);
}
export function previewPhase(preview,frame){
  if(frame<PREVIEW.onset)return preview.variant.serve&&frame>=PREVIEW.toss?'Toss preparation':frame>=PREVIEW.start?'Anticipation':'Ready';
  if(frame<preview.strike-1)return 'Swing';
  if(frame<=preview.strike+1)return 'Planned strike';
  if(frame<=preview.strike+PREVIEW.followFrames)return 'Follow-through';
  if(frame<previewEnd(preview))return 'Recovery';
  return 'Ready';
}
export function inspectPreview(preview,frame){
  const p=preview.rig,arm=p.arms[preview.hand===1?1:0];p.root.updateMatrixWorld(true);p.racket.updateMatrixWorld(true);
  return {variant:preview.variant.id,hand:preview.hand,frame,time:frame/PREVIEW.fps,phase:previewPhase(preview,frame),onsetFrame:PREVIEW.onset,strikeFrame:preview.strike,fixture:'Fixed player and planned target; no live ball collision or scoring.',target:Array.from(preview.targetPosition),racket:p.racket.position.toArray(),racketQuaternion:p.racket.quaternion.toArray(),wrist:arm.hand.getWorldPosition(scratch).toArray(),palmGrip:arm.socket.getWorldPosition(scratch).toArray(),grip:p.racket.localToWorld(scratch.set(0,-GRIP.headToGrip,0)).toArray(),shoulder:arm.upper.getWorldPosition(scratch).toArray(),elbow:arm.lower.getWorldPosition(scratch).toArray(),gripGapMeters:preview.gaps[frame]};
}
