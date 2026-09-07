import {B,clamp} from './balance.js';
// State layout: x,y,z,vx,vy,vz,topspin,sidespin,reserved. SI units.
export function integrate(b,dt) {
  const speed=Math.sqrt(b[3]*b[3]+b[4]*b[4]+b[5]*b[5]);
  const horizontal=Math.sqrt(b[3]*b[3]+b[5]*b[5])||1;
  const lift=B.magnus*b[6], side=B.magnus*b[7];
  const ax=-B.drag*speed*b[3]+lift*b[4]*b[3]/horizontal-side*b[5];
  const ay=-B.gravity-B.drag*speed*b[4]-lift*horizontal;
  const az=-B.drag*speed*b[5]+lift*b[4]*b[5]/horizontal+side*b[3];
  b[0]+=b[3]*dt+ax*dt*dt*.5;b[1]+=b[4]*dt+ay*dt*dt*.5;b[2]+=b[5]*dt+az*dt*dt*.5;
  b[3]+=ax*dt;b[4]+=ay*dt;b[5]+=az*dt;
}
export function bounce(b) {
  b[1]=B.radius;b[4]=Math.abs(b[4])*clamp(B.restitution+b[6]*.001,.61,.83);
  const grip=clamp(.78+b[6]*.003,.61,.94);b[3]*=grip;b[5]*=grip;b[6]*=.62;
}
// Lines belong to the court. Bounds are the outside of the painted line.
export function isIn(x,z,server=-1,serveSide=1) {
  const r=B.radius+1e-10;
  if (server<0) return Math.abs(x)<=B.halfWidth+r&&Math.abs(z)<=B.halfLength+r;
  const dir=server===0?-1:1;
  return z*dir>=-r&&z*dir<=B.service+r&&x*serveSide<=r&&x*serveSide>=-B.halfWidth-r;
}
export function netHeight(x) { return .914+.156*Math.pow(clamp(Math.abs(x)/5.029,0,1),2); }
// Relative swept sphere: earliest time of impact in [0,1], or -1.
export function sweepSphere(ax,ay,az,bx,by,bz,cx,cy,cz,dx,dy,dz,r) {
  const x=ax-cx,y=ay-cy,z=az-cz,vx=bx-ax-dx+cx,vy=by-ay-dy+cy,vz=bz-az-dz+cz;
  const c=x*x+y*y+z*z-r*r;if(c<=0)return 0;
  const a=vx*vx+vy*vy+vz*vz,b=2*(x*vx+y*vy+z*vz),disc=b*b-4*a*c;
  if(a<1e-12||disc<0)return -1;const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:-1;
}
export function netSweep(ax,ay,az,bx,by,bz) {
  if(Math.abs(az)>B.radius&&Math.sign(az)===Math.sign(bz)&&Math.abs(bz)>B.radius)return -1;
  const dz=bz-az;if(Math.abs(dz)<1e-9)return -1;
  const t=clamp((Math.sign(az)*B.radius-az)/dz,0,1),x=ax+(bx-ax)*t,y=ay+(by-ay)*t;
  return Math.abs(x)<=5.029+B.radius&&y<=netHeight(x)+B.radius&&y>=-B.radius?t:-1;
}
// Solve the same drag/Magnus integration used by live play, not a display parabola.
export function solveLaunch(out,scratch,x,y,z,tx,tz,power,shape,serve=false) {
  const distance=Math.sqrt((tx-x)**2+(tz-z)**2);
  const duration=serve?.90:shape===3?2.15:clamp(distance/(18+power*10),.74,1.52)+(shape===2?.10:0);
  out[0]=x;out[1]=y;out[2]=z;out[3]=(tx-x)/duration*1.14;out[4]=(B.radius-y)/duration+B.gravity*duration*.55;out[5]=(tz-z)/duration*1.14;
  out[6]=shape===1?38:shape===2?-28:shape===3?5:shape===4?16:0;out[7]=0;out[8]=0;
  const steps=Math.ceil(duration/B.dt),dt=duration/steps;
  for(let k=0;k<6;k++){
    scratch.set(out);for(let j=0;j<steps;j++)integrate(scratch,dt);
    out[3]+=(tx-scratch[0])/duration*1.16;out[4]+=(B.radius-scratch[1])/duration*1.13;out[5]+=(tz-scratch[2])/duration*1.16;
  }
}
export function predict(s) {
  const b=s.scratch;b.set(s.ball);let bounced=s.bounces>0,elapsed=0;
  s.prediction[4]=0;
  for(let i=0;i<420;i++){
    const y=b[1];integrate(b,B.dt);elapsed+=B.dt;
    if(b[1]<B.radius){if(bounced)break;bounce(b);bounced=true;}
    if(!bounced&&s.lastShot==='Lob'&&b[4]<0&&b[1]<=2.65&&b[1]>2.3){s.prediction[0]=b[0];s.prediction[1]=b[1];s.prediction[2]=b[2];s.prediction[3]=s.time+elapsed;s.prediction[4]=1;break;}
    if(bounced&&(b[1]>=1.03||(b[4]<0&&b[1]>.4))){s.prediction[0]=b[0];s.prediction[1]=b[1];s.prediction[2]=b[2];s.prediction[3]=s.time+elapsed;s.prediction[4]=1;break;}
    if(Math.abs(b[2])>19)break;
  }
}
