import {clamp} from './balance.js';

export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export const strokeLift=shape=>shape===4?-.9:shape===2?-.45:shape===3?.7:.4;
export const STROKE=Object.freeze({anticipation:.44,follow:.30,recover:.40,end:.70});
function strokePhase(age){
  const t=clamp(age/STROKE.follow,0,1);
  // Match the incoming angular speed at contact, then ease into the finish.
  return age<0?clamp(age/.20,-1,0):t*(1.5-.5*t);
}

// The stroke clock and target are immutable after onset. Resolved ball contact
// is recorded separately, so a hit cannot rewind or teleport the follow-through.
export function beginStroke(s,p,serve=false){
  s.strokeAt[p]=s.time+clamp(s.contactAt[p]-s.time,.06,.22);
  s.strokeX[p]=s.contactX[p];s.strokeY[p]=s.contactY[p];s.strokeZ[p]=s.contactZ[p];
  s.strokeFromX[p]=s.rackX[p]-s.x[p];s.strokeFromY[p]=s.rackY[p];s.strokeFromZ[p]=s.rackZ[p]-s.z[p];
  s.strokeLift[p]=strokeLift(serve?4:s.shape[p]);s.strokeServe[p]=serve?1:0;
}

export function strokeWeight(s,p,time){
  const age=time-s.swingAt[p],lead=s.strokeAt[p]-s.swingAt[p];
  return smooth(age/Math.min(.10,lead))*(1-smooth((time-s.strokeAt[p]-STROKE.follow)/STROKE.recover));
}

export function strokeTurn(s,p,time){
  const weight=strokeWeight(s,p,time);
  return Math.sin(strokePhase(time-s.strokeAt[p])*1.65)*.66*s.side[p]*weight
    -.60*(s.windup[p]*s.windupSide[p]+s.prepare[p]*.70)*(1-weight);
}

export function updateRacket(s,p,dt){
  s.oldRackX[p]=s.rackX[p];s.oldRackY[p]=s.rackY[p];s.oldRackZ[p]=s.rackZ[p];
  const direction=p===0?1:-1,hand=p===0?s.hand:-1;
  const prepare=s.phase==='toss'&&s.server===p?1:0;
  s.prepare[p]+=clamp(prepare-s.prepare[p],-dt*2.2,dt*2.2);
  const prepared=smooth(s.prepare[p]);
  // Anticipate the incoming ball before a gesture arrives. This is automatic
  // preparation only: it neither arms a shot nor moves its contact clock.
  const until=s.prediction[3]-s.time;
  const waiting=s.phase==='rally'&&s.receiver===p&&!s.armed[p]&&s.prediction[4]&&until>0&&s.time>s.strokeAt[p]+STROKE.end;
  const windup=waiting?smooth((STROKE.anticipation-until)/.32):0;
  if(waiting&&s.windup[p]<.05)s.windupSide[p]=(s.prediction[0]-s.x[p])*direction*hand>=0?1:-1;
  s.windup[p]+=(windup-s.windup[p])*(1-Math.exp(-dt*16));
  const coil=s.windup[p],side=s.windupSide[p],overhead=s.prediction[1]>1.9;
  let idleX=s.x[p]+direction*hand*(.72-prepared*.23),idleY=1.55+prepared*.52,idleZ=s.z[p]-direction*(.40-prepared*.55);
  idleX+=(s.x[p]+direction*hand*side*(overhead?.70:1.12)-idleX)*coil;
  idleY+=((overhead?2.15:1.78)-idleY)*coil;idleZ+=(s.z[p]+direction*(side===1?.12:-.20)-idleZ)*coil;
  const sx=s.x[p]+direction*hand*.26,sy=1.49,sz=s.z[p]-.06*direction,reach=1.32;
  const age=s.time-s.swingAt[p],lead=s.strokeAt[p]-s.swingAt[p];
  let x=idleX,y=idleY,z=idleZ;
  if(age>=0&&s.time<s.strokeAt[p]+STROKE.end){
    // Blend from the racket's actual onset pose, including interrupted recovery.
    const enter=smooth(age/Math.min(.10,lead)),recover=smooth((s.time-s.strokeAt[p]-STROKE.follow)/STROKE.recover);
    const after=clamp((s.time-s.strokeAt[p])/STROKE.follow,0,1);
    const phase=strokePhase(s.time-s.strokeAt[p]),angle=phase*1.65;
    if(s.armed[p])s.strokeLift[p]+=clamp(strokeLift(s.strokeServe[p]?4:s.shape[p])-s.strokeLift[p],-dt*3,dt*3);
    let arcX=s.strokeX[p]-direction*hand*s.side[p]*Math.sin(angle)*(.75+.40*smooth(after));
    let arcY=clamp(s.strokeY[p]+s.strokeLift[p]*phase+(s.strokeLift[p]>0?.52:0)*smooth(after),.35,3.05);
    // Carry the follow-through around the front of the body, clear of the chest.
    let arcZ=s.strokeZ[p]-direction*(Math.sin(phase*Math.PI*.5)*.20+(1-Math.cos(angle))*.42);
    // A ball already behind the runner is a miss, not a backwards arm twist.
    if((arcZ-s.z[p])*direction>-.08)arcZ=s.z[p]-direction*.08;
    const distance=Math.hypot(arcX-sx,arcY-sy,arcZ-sz);
    if(distance>reach){arcX=sx+(arcX-sx)*reach/distance;arcY=sy+(arcY-sy)*reach/distance;arcZ=sz+(arcZ-sz)*reach/distance;}
    x=(s.x[p]+s.strokeFromX[p])*(1-enter)+arcX*enter;
    y=s.strokeFromY[p]*(1-enter)+arcY*enter;
    z=(s.z[p]+s.strokeFromZ[p])*(1-enter)+arcZ*enter;
    x+=(idleX-x)*recover;y+=(idleY-y)*recover;z+=(idleZ-z)*recover;
  }
  // Route cross-body strokes and recovery around the front of the shirt/head.
  // Without this clearance the handle's IK cone can pass through a singularity
  // as the racket centre crosses its own shoulder, flipping the wrist.
  const lateral=Math.abs(x-s.x[p])/.72;
  if(lateral<1){
    const height=smooth((y-.60)/.25)*(1-smooth((y-1.80)/.45));
    const route=smooth((1-lateral)/.50)*height,localZ=(z-s.z[p])*direction;
    z+=direction*(Math.min(localZ,-.65)-localZ)*route;
  }
  // A missed ball must never drag the racket metres away from its owner.
  // This is the same reachable path used by collision and by the renderer.
  const dx=x-sx,dy=y-sy,dz=z-sz,d=Math.hypot(dx,dy,dz);
  if(d>reach){x=sx+dx*reach/d;y=sy+dy*reach/d;z=sz+dz*reach/d;}
  if(dt>0){
    const fromX=s.oldRackX[p]+s.x[p]-s.prevX[p],fromY=s.oldRackY[p],fromZ=s.oldRackZ[p]+s.z[p]-s.prevZ[p];
    const travel=Math.hypot(x-fromX,y-fromY,z-fromZ),limit=22*dt;
    if(travel>limit){x=fromX+(x-fromX)*limit/travel;y=fromY+(y-fromY)*limit/travel;z=fromZ+(z-fromZ)*limit/travel;}
  }
  s.rackX[p]=x;s.rackY[p]=y;s.rackZ[p]=z;
}
