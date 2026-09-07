import {B,clamp,random} from './balance.js';
import {integrate,bounce,isIn,netSweep,netHeight,sweepSphere,solveLaunch,predict} from './physics.js';
import {scorePoint,isSetPoint,pointText} from './scoring.js';
import {beginStroke,updateRacket} from './swing.js';
export function emit(s,type,x=s.ball[0],y=s.ball[1],z=s.ball[2],power=1){s.eventId++;s.eventType=type;s.eventX=x;s.eventY=y;s.eventZ=z;s.eventPower=power;}
export function setupPoint(s){
  s.phase='ready';s.phaseTime=0;s.rally=0;s.bounces=0;s.serving=false;s.serveNet=false;s.armed.fill(0);s.pendingShot.fill(-1);s.referenceAt.fill(1e9);
  s.x[0]=s.server===0?s.serveSide*.85:0;s.x[1]=s.server===1?s.serveSide*.85:0;s.z[0]=12.25;s.z[1]=-12.25;
  s.targetX.set(s.x);s.targetZ.set(s.z);s.prevX.set(s.x);s.prevZ.set(s.z);s.vx.fill(0);s.vz.fill(0);
  s.swingAt.fill(-10);s.strokeAt.fill(-10);s.prepare.fill(0);s.windup.fill(0);s.windupSide.fill(1);
  for(let p=0;p<2;p++){updateRacket(s,p,0);s.oldRackX[p]=s.rackX[p];s.oldRackY[p]=s.rackY[p];s.oldRackZ[p]=s.rackZ[p];}
  s.ball.fill(0);s.ball[0]=s.x[s.server]+(s.server===0?s.hand:1)*.35;s.ball[1]=1.1;s.ball[2]=s.z[s.server];s.previous.set(s.ball.subarray(0,3));s.trailCount=0;
  s.call=isSetPoint(s,0)||isSetPoint(s,1)?'Set point':s.server===0?(s.serveNumber===2?'Second serve':'Your serve'):'Receiving';
  if(s.tiebreak)s.call='Tiebreak · '+s.call;
}
export function toss(s){if(s.phase==='ready'){s.phase='toss';s.phaseTime=0;s.ball[1]=1.35;s.ball[4]=5.5;emit(s,7);}}
export function award(s,winner,reason){
  if(s.phase!=='rally'&&s.phase!=='toss')return;
  s.hitStop=reason==='Winner'&&s.rally>=4?.065:0;s.bestRally=Math.max(s.bestRally,s.rally);s.lastWinner=winner;s.pointReason=reason;s.armed.fill(0);
  if(s.historyCount<512){s.historyWinner[s.historyCount]=winner;s.historyReason[s.historyCount++]=reason==='Out'?1:reason==='Net'?2:0;}
  scorePoint(s,winner);s.phase=s.winner<0?'point':'ended';s.phaseTime=0;s.serveNumber=1;
  s.call=s.winner>=0?(s.winner===0?'The court is yours.':'A match well played.'):reason==='Ace'?'Ace':reason==='Double fault'?'Double fault':reason==='Out'?'Out':reason==='Net'?'Into the net':s.rally>3?'What a point.':winner===0?'Beautifully played.':'Point to the opponent';
  emit(s,4,s.ball[0],s.ball[1],s.ball[2],Math.min(s.rally/10,1));
}
function fault(s){s.faults++;if(s.serveNumber===1){s.serveNumber=2;s.phase='fault';s.phaseTime=0;s.call='Fault · second serve';emit(s,5);}else award(s,1-s.server,'Double fault');}
export function submitSwing(s,shot,player=0){
  if(s.paused||s.phase==='ended'||s.phase==='point'||s.phase==='fault')return false;
  if(s.phase==='ready'){toss(s);return false;}
  if(s.phase==='toss'&&(player!==s.server||s.armed[player]))return false;
  if(s.phase==='rally'&&(s.receiver!==player||s.armed[player]))return false;
  const onset=Number.isFinite(shot.onset)?shot.onset:s.time;
  s.swingAt[player]=s.time;s.power[player]=clamp(shot.power??.65,0,1);s.shape[player]=clamp(shot.shape??1,0,4);s.side[player]=shot.side===-1?-1:1;s.aim[player]=clamp(shot.aim??0,-1,1);
  s.contactAt[player]=s.phase==='toss'?s.time+.06:s.prediction[3];
  s.timing[player]=Number.isFinite(shot.timing)?shot.timing:onset+.10-s.contactAt[player];
  s.contactX[player]=s.phase==='toss'?s.ball[0]:s.prediction[0];s.contactY[player]=s.phase==='toss'?s.ball[1]+s.ball[4]*.06:s.prediction[1];s.contactZ[player]=s.phase==='toss'?s.ball[2]:s.prediction[2];
  beginStroke(s,player,s.phase==='toss');
  s.armed[player]=1;s.lastGestureAt=onset;s.latency=Math.max(0,(s.time-onset)*1000);emit(s,6);return true;
}
export function refineSwing(s,shot,p=0){if(s.armed[p]){s.power[p]=clamp(shot.power,0,1);s.shape[p]=clamp(shot.shape,0,4);s.aim[p]=clamp(shot.aim??0,-1,1);}}
export function cancelSwing(s,p=0){s.armed[p]=0;}
function hit(s,p){
  const b=s.ball,serve=s.phase==='toss',opp=1-p,dir=p===0?-1:1,stretch=Math.max(0,Math.abs(s.x[p]-b[0])-.45);
  let power=s.power[p],shape=s.shape[p],tx,tz;
  if(serve){tx=-s.serveSide*(1.6+s.aim[p]*.9);tz=dir*(4.6+.7*power);shape=0;power=.55+power*.25;}
  else if(p===1){
    const d=s.difficulty,deep=s.z[p]*dir>8,shortBall=Math.abs(b[2])<6;
    if(d===0){tx=(random(s)-.5)*3.8;tz=dir*(6.8+random(s)*2);power=.40+random(s)*.18;shape=random(s)<.20?2:1;}
    else if(d===1){tx=(random(s)<.82?-Math.sign(s.x[0]||1):random(s)<.5?-1:1)*(2.6+random(s)*.85);tz=dir*(9.4+random(s)*1.3);power=.72+random(s)*.13;shape=random(s)<.22?2:1;}
    else {tx=-Math.sign(s.x[0]||s.ball[0]||1)*(2.5+random(s)*.95);tz=dir*(shortBall?6.5:9.9);power=shortBall?.94:.77;shape=shortBall?0:1;}
    if(b[1]>1.8){shape=4;power=Math.max(power,.84);}else if(stretch>.6&&random(s)<.18){shape=3;power=.4;}
    tx+=(random(s)-.5)*B.error[d]*(1+stretch*4);tz+=(random(s)-.5)*B.error[d]*(1+stretch*2);
    if(random(s)<[.105,.050,.022][d]+stretch*.035){if(random(s)<.45){tz=dir*13.1;}else{power=1;shape=0;tz=dir*2.8;}}
  }else{
    const t=clamp(s.timing[p]/.21,-1,1),pull=-s.side[p]*t;
    tx=clamp(s.aim[p]*2.5+pull*2.9,-4.75,4.75);tz=dir*(7.8+power*3.05-Math.abs(t)*1.8);
    if(Math.abs(s.timing[p])>.19)tx+=Math.sign(tx||1)*(Math.abs(s.timing[p])-.19)*7;
  }
  solveLaunch(s.launch,s.scratch,b[0],b[1],b[2],tx,tz,power,shape,serve);b.set(s.launch);
  s.contactX[p]=b[0];s.contactY[p]=b[1];s.contactZ[p]=b[2];s.contactAt[p]=s.time;
  s.lastHit=p;s.receiver=opp;s.bounces=0;s.serving=serve;s.serveNet=false;s.phase='rally';s.phaseTime=0;s.armed[p]=0;s.rally++;s.shotId++;s.contacts++;s.trailCount=0;
  s.lastShot=serve?'Serve':B.shapeNames[shape];s.call=s.lastShot;s.reactionAt[opp]=s.time+(opp===0?.08:B.reaction[s.difficulty]);
  predict(s);s.botShot=-1;s.refShot=-1;emit(s,1,b[0],b[1],b[2],power);
}
function movePlayers(s,dt){
  for(let i=0;i<2;i++){
    if(s.phase==='rally'&&s.time>=s.reactionAt[i]){
      if(s.receiver===i&&s.prediction[4]){
        let tx=s.prediction[0],tz=s.prediction[2];
        if(i===1&&s.difficulty===0&&s.time-s.reactionAt[i]<.12){tx=s.ball[0]+s.ball[3]*.2;tz=-10;}
        if(i===1&&s.difficulty===1&&s.time-s.reactionAt[i]<.10)tx=(tx+s.ball[0])*.5;
        s.targetX[i]=clamp(tx-(i===0?s.hand:1)*.68,-5.7,5.7);s.targetZ[i]=clamp(tz+(i===0?.35:-.35),i===0?2:-16,i===0?16:-2);
      }else{s.targetX[i]=i===1&&s.difficulty===2?clamp(s.x[0]*-.35,-1.6,1.6):0;s.targetZ[i]=i===0?11.3:s.difficulty===1?-11.85:-11.3;}
    }
    const dx=s.targetX[i]-s.x[i],dz=s.targetZ[i]-s.z[i],len=Math.sqrt(dx*dx+dz*dz),max=i===0?7:B.speed[s.difficulty],acc=i===0?23:B.acceleration[s.difficulty];
    const desired=Math.min(max,Math.sqrt(2*acc*len)),tx=len>.01?dx/len*desired:0,tz=len>.01?dz/len*desired:0;
    s.vx[i]+=clamp(tx-s.vx[i],-acc*dt,acc*dt);s.vz[i]+=clamp(tz-s.vz[i],-acc*dt,acc*dt);
    if(len<.025){s.x[i]=s.targetX[i];s.z[i]=s.targetZ[i];s.vx[i]=0;s.vz[i]=0;}else{s.x[i]+=s.vx[i]*dt;s.z[i]+=s.vz[i]*dt;}
  }
}
export function referenceStep(s,both=false){
  const auto0=both||s.demo;
  if(s.phase==='ready'&&(s.server===1||auto0)&&s.phaseTime>.65)toss(s);
  if(s.phase==='toss'&&s.phaseTime>.55&&(s.server===1||auto0)&&!s.armed[s.server]){
    const shot=s.referenceSwing;shot.power=.63;shot.shape=0;shot.timing=0;shot.onset=s.time;shot.aim=0;submitSwing(s,shot,s.server);
  }
  if(s.phase==='rally'&&s.prediction[4]){
    const p=s.receiver;
    if(p===1||auto0){
      if(s.pendingShot[p]!==s.shotId){s.pendingShot[p]=s.shotId;s.referenceAt[p]=s.prediction[3]-.10+(p===0?(random(s)-.5)*.25:0);}
      if(s.time>=s.referenceAt[p]&&!s.armed[p]&&s.time-s.swingAt[p]>.45){
        const shot=s.referenceSwing;shot.onset=s.time;shot.power=p===0?.58+random(s)*.24:.7;shot.shape=1;shot.side=(s.ball[0]-s.x[p])*(p===0?s.hand:1)>0?1:-1;shot.timing=p===0?s.time+.10-s.prediction[3]:0;shot.aim=p===0?(random(s)-.5)*1.6:0;
        submitSwing(s,shot,p);
      }
    }
  }
}
export function tick(s,dt=B.dt){
  if(s.paused||s.phase==='ended')return;
  if(s.hitStop>0){s.hitStop=Math.max(0,s.hitStop-dt);return;}
  s.time+=dt;s.phaseTime+=dt;s.previous[0]=s.ball[0];s.previous[1]=s.ball[1];s.previous[2]=s.ball[2];s.prevX.set(s.x);s.prevZ.set(s.z);
  if((s.phase==='point'&&s.phaseTime>2.4)||(s.phase==='fault'&&s.phaseTime>1.7))setupPoint(s);
  referenceStep(s);movePlayers(s,dt);for(let p=0;p<2;p++)updateRacket(s,p,dt);
  const b=s.ball;
  if(s.phase==='toss'){
    b[1]+=b[4]*dt-.5*B.gravity*dt*dt;b[4]-=B.gravity*dt;
    if(s.armed[s.server]&&s.time>=s.contactAt[s.server]&&b[1]>.95){hit(s,s.server);}
    else if(b[1]<1){s.phase='ready';s.phaseTime=0;b[1]=1.1;b[4]=0;s.armed.fill(0);s.call='Take your time. Toss again.';}
  }else if(s.phase==='rally'){
    integrate(b,dt);
    const p=s.receiver;
    if(s.armed[p]&&s.bounces<=1&&Math.abs(s.timing[p])<.29&&Math.abs(s.x[p]-b[0])<1.45&&Math.abs(s.z[p]-b[2])<1.1){
      const t=sweepSphere(s.previous[0],s.previous[1],s.previous[2],b[0],b[1],b[2],s.oldRackX[p],s.oldRackY[p],s.oldRackZ[p],s.rackX[p],s.rackY[p],s.rackZ[p],.28+B.radius);
      if(t>=0&&Math.abs(s.time-s.contactAt[p])<.19){
        b[0]=s.previous[0]+(b[0]-s.previous[0])*t;b[1]=s.previous[1]+(b[1]-s.previous[1])*t;b[2]=s.previous[2]+(b[2]-s.previous[2])*t;
        s.contactError=Math.sqrt((b[0]-(s.oldRackX[p]+(s.rackX[p]-s.oldRackX[p])*t))**2+(b[1]-(s.oldRackY[p]+(s.rackY[p]-s.oldRackY[p])*t))**2+(b[2]-(s.oldRackZ[p]+(s.rackZ[p]-s.oldRackZ[p])*t))**2);hit(s,p);
      }
    }
    const netT=netSweep(s.previous[0],s.previous[1],s.previous[2],b[0],b[1],b[2]);
    if(netT>=0&&s.time-s.contactAt[s.lastHit]>.02){
      const x=s.previous[0]+(b[0]-s.previous[0])*netT,y=s.previous[1]+(b[1]-s.previous[1])*netT;s.netHits++;emit(s,3,x,y,0);
      if(y>netHeight(x)-B.radius*.5){b[5]*=.62;b[4]=Math.abs(b[4])*.2+.5;b[2]=Math.sign(b[5])*(B.radius+.005);s.serveNet=s.serving;predict(s);}
      else {b[2]=Math.sign(s.previous[2])*B.radius;b[5]*=-.08;b[3]*=.2;if(s.serving)fault(s);else award(s,1-s.lastHit,'Net');}
    }
    if(s.phase==='rally'&&b[1]<=B.radius){
      const fraction=clamp((s.previous[1]-B.radius)/(s.previous[1]-b[1]),0,1),x=s.previous[0]+(b[0]-s.previous[0])*fraction,z=s.previous[2]+(b[2]-s.previous[2])*fraction;
      b[0]=x;b[1]=B.radius;b[2]=z;s.bounces++;
      if(s.bounces===1){
        const legal=isIn(x,z,s.serving?s.server:-1,s.serveSide)&&(s.lastHit===0?z<=B.radius:z>=-B.radius);
        if(!legal){if(s.serving)fault(s);else award(s,1-s.lastHit,'Out');}
        else if(s.serving&&s.serveNet){s.lets++;s.phase='fault';s.phaseTime=0;s.call='Let · play that serve again';emit(s,3);}
        else {s.serving=false;bounce(b);integrate(b,dt*(1-fraction));emit(s,2,x,0,z,Math.abs(b[4])/8);}
      }else {s.misses++;award(s,s.lastHit,s.rally===1?'Ace':'Winner');}
    }
    if(s.phase==='rally'&&(Math.abs(b[2])>22||Math.abs(b[0])>15||s.phaseTime>30))award(s,s.bounces?s.lastHit:1-s.lastHit,s.bounces?'Winner':'Out');
  }
  if(s.phase==='rally'){
    const i=s.trailHead;s.trailX[i]=b[0];s.trailY[i]=b[1];s.trailZ[i]=b[2];s.trailHead=(i+1)%20;s.trailCount=Math.min(20,s.trailCount+1);
  }
}
export function snapshot(s){return {time:s.time,phase:s.phase,receiver:s.receiver,lastHit:s.lastHit,shotId:s.shotId,serveNumber:s.serveNumber,difficulty:B.labels[s.difficulty],ball:Array.from(s.ball),players:{x:Array.from(s.x),z:Array.from(s.z)},score:{games:Array.from(s.games),points:Array.from(s.points),display:[pointText(s,0),pointText(s,1)],tiebreak:s.tiebreak,server:s.server},rally:s.rally,shot:s.lastShot,call:s.call,winner:s.winner,prediction:Array.from(s.prediction),metrics:{contacts:s.contacts,contactError:s.contactError,latencyMs:s.latency,netHits:s.netHits,faults:s.faults,lets:s.lets}};}
