import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {B,clamp} from './balance.js';
import {STROKE,smooth,strokeWeight,strokeTurn} from './swing.js';
import {GRIP,makeHand} from './grip.js';
import {createPost,resizePost,renderPost} from './post.js';
const UP=new THREE.Vector3(0,1,0),DOWN=new THREE.Vector3(0,-1,0),v1=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3(),q1=new THREE.Quaternion(),racketEuler=new THREE.Euler(0,0,0,'YXZ'),matrix=new THREE.Matrix4(),color=new THREE.Color();
let artSeed=827;function rand(){artSeed=(Math.imul(artSeed,1664525)+1013904223)>>>0;return artSeed/4294967296;}
function mat(c,extra={}){return new THREE.MeshStandardMaterial({color:c,roughness:.93,metalness:0,...extra});}
function mesh(geo,material,x=0,y=0,z=0,parent){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;if(parent)parent.add(m);return m;}
function box(w,h,d,m,x,y,z,parent){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);}
function cylinder(r1,r2,h,m,x,y,z,parent,n=10){return mesh(new THREE.CylinderGeometry(r1,r2,h,n),m,x,y,z,parent);}
function lineBetween(a,b,r,m,parent){const delta=new THREE.Vector3().subVectors(b,a),obj=cylinder(r,r,delta.length(),m,0,0,0,parent,6);obj.position.copy(a).add(b).multiplyScalar(.5);obj.quaternion.setFromUnitVectors(UP,delta.normalize());return obj;}
function labelTexture(text,bg='#24453b',fg='#e3e6cc',size=1024){const c=document.createElement('canvas');c.width=size;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,size,128);ctx.fillStyle=fg;ctx.font='500 38px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,size/2,66);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function banner(text,x,y,z,w,rotation=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,1),new THREE.MeshStandardMaterial({map:labelTexture(text),roughness:1,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;return m;}
function makeCourt(scene){
  const staticGroup=new THREE.Group();scene.add(staticGroup);
  const surround=mat('#78948a'),court=mat('#326763'),paint=mat('#efe9d4'),sand=mat('#c3ae88'),concrete=mat('#d3c5aa'),edge=mat('#a4ab90'),dark=mat('#264e43'),iron=mat('#294b3f'),wood=mat('#a97c4e');
  box(150,.35,150,mat('#acb392'),0,-.33,0,staticGroup);
  box(19.6,.12,35,surround,0,-.07,0,staticGroup);
  box(10.97,.03,23.77,court,0,.005,0,staticGroup);
  box(32,.10,47,sand,0,-.16,0,staticGroup);
  // Flush paint at one dedicated elevation. Court sizes include outside line edges.
  const ly=.024,lw=.05;
  for(const x of [-5.485,-4.115,4.115,5.485])box(lw,.006,23.77,paint,x-Math.sign(x)*lw*.5,ly,0,staticGroup);
  for(const z of [-11.885,11.885])box(10.97,.006,.1,paint,0,ly,z-Math.sign(z)*.05,staticGroup);
  for(const z of [-6.4,6.4])box(8.23,.006,lw,paint,0,ly,z-Math.sign(z)*lw*.5,staticGroup);
  box(lw,.006,12.8,paint,0,ly,0,staticGroup);
  for(const z of [-11.72,11.72])box(.05,.006,.23,paint,0,ly,z,staticGroup);
  const wear=mat('#84a099');for(let i=0;i<36;i++){const x=(rand()-.5)*7.7,z=(i%2?1:-1)*(10.8+rand()*.8);const scuff=box(.025+rand()*.012,.002,.10+rand()*.10,wear,x,.025,z,staticGroup);scuff.rotation.y=rand()*2;}
  // Terrace seating with shadowed risers and individually instanced spectators.
  for(const side of [-1,1]){
    for(let row=0;row<4;row++){
      const x=side*(11.0+row*.93),y=.30+row*.57;
      box(.92,y+.2,31,concrete,x,y*.5-.08,-1.2,staticGroup);
      box(.72,.12,30.6,edge,x,y+.08,-1.2,staticGroup);
      box(.45,.09,29,wood,x,y+.23,-1.2,staticGroup);
    }
    box(.18,1,34,dark,side*10.02,.48,-1,staticGroup);
    for(let j=0;j<6;j++)scene.add(banner(j%2?'THE GOLDEN HOUR CLUB':'MOTION  /  PLAY IN THE MOMENT',side*9.915,.56,-14+j*5.2,4.8,side===1?-Math.PI/2:Math.PI/2));
  }
  for(let row=0;row<4;row++){
    const y=.33+row*.6,z=-19-row*.95;
    box(29,y+.25,.95,concrete,0,y*.5-.07,z,staticGroup);
    box(28.7,.12,.68,edge,0,y+.09,z,staticGroup);box(27,.09,.42,wood,0,y+.24,z,staticGroup);
  }
  box(20,1.2,.20,dark,0,.53,-17.8,staticGroup);
  scene.add(banner('M O T I O N   T E N N I S',0,.65,-17.685,9));scene.add(banner('GOLDEN HOUR CLUB',-7,.65,-17.685,4));scene.add(banner('PLAY IN THE MOMENT',7,.65,-17.685,4));
  // Fence is airy; open foreground keeps the camera unobstructed.
  for(let side=-1;side<=1;side+=2){
    for(let j=0;j<9;j++)cylinder(.035,.035,3,iron,side*9.8,1.5,-16+j*3.8,staticGroup);
    for(const y of [1.6,3.0])lineBetween(new THREE.Vector3(side*9.8,y,-16),new THREE.Vector3(side*9.8,y,14.4),.019,iron,staticGroup);
  }
  for(let i=0;i<11;i++)cylinder(.035,.035,3.1,iron,-9.8+i*1.96,1.55,-17.85,staticGroup);
  lineBetween(new THREE.Vector3(-9.8,3.1,-17.85),new THREE.Vector3(9.8,3.1,-17.85),.025,iron,staticGroup);
  // Player benches and courtside equipment.
  for(const side of [-1,1]){
    const x=side*7.7;box(.8,.12,2.9,wood,x,.47,4,staticGroup);box(.11,.55,2.9,wood,x+side*.35,.79,4,staticGroup);
    for(const z of [3,5])box(.65,.47,.10,iron,x,.22,z,staticGroup);
    cylinder(.20,.18,.48,mat('#dfd6ba'),x,.24,6,staticGroup);cylinder(.055,.055,.27,mat('#bbc7b9'),x,.66,3.5,staticGroup);
    box(.53,.2,.8,mat('#c5774d'),x,.64,4.3,staticGroup);
  }
  // Umpire chair, with diagonal bracing and a small shade.
  for(const x of [6.7,7.3])for(const z of [-.35,.35])lineBetween(new THREE.Vector3(x,0,z),new THREE.Vector3(7+(x-7)*.6,1.85,z*.7),.035,iron,staticGroup);
  box(.75,.12,.72,wood,7,1.8,0,staticGroup);box(.1,.52,.7,wood,7.35,2.08,0,staticGroup);
  for(let j=0;j<5;j++)box(.6,.035,.07,iron,7,j*.33+.1,.44+j*.018,staticGroup);
  // Slender cypresses, broad pines and distant landscape; no texture noise.
  const trunk=mat('#796b49'),leaf=mat('#52694c'),leafLight=mat('#708259');
  for(let i=0;i<32;i++){
    const side=i%2?-1:1,x=side*(18+rand()*8),z=-33+rand()*63,h=4+rand()*4;
    cylinder(.14,.27,h*.62,trunk,x,h*.30,z,staticGroup);
    for(let j=0;j<3;j++){const crown=mesh(new THREE.IcosahedronGeometry(1,1),j%2?leaf:leafLight,x,h*.58+j*.7,z,staticGroup);crown.scale.set(1.0+rand()*.4,h*.30-j*.15,1.0+rand()*.4);}
  }
  for(let i=0;i<11;i++){const x=-25+i*5,y=4+rand()*2,z=-28-rand()*5;cylinder(.17,.3,y,trunk,x,y*.5,z,staticGroup);const tree=mesh(new THREE.IcosahedronGeometry(1,2),leaf,x,y,z,staticGroup);tree.scale.set(3.1,1.9,2.5);}
  const hills=mat('#a6af8e');for(let i=0;i<9;i++){const hill=mesh(new THREE.SphereGeometry(1,20,12),hills,-100+i*25,0,-100-rand()*40,staticGroup);hill.scale.set(22+rand()*20,10+rand()*12,20);hill.castShadow=false;}
  // Batch the static scene by material. Art stays detailed without draw-call sprawl.
  staticGroup.updateMatrixWorld(true);const batches=new Map();
  staticGroup.traverse(o=>{if(o.isMesh){const list=batches.get(o.material)||[];const g=o.geometry.clone().applyMatrix4(o.matrixWorld);list.push(g);batches.set(o.material,list);}});
  scene.remove(staticGroup);
  for(const [material,geos]of batches){const g=mergeGeometries(geos);if(g){const m=mesh(g,material,0,0,0,scene);m.castShadow=true;m.receiveShadow=true;}for(const geo of geos)geo.dispose();}
  return {paint,iron};
}
function makeNet(scene,iron){
  const group=new THREE.Group();scene.add(group);const white=mat('#e8dfc7'),black=new THREE.LineBasicMaterial({color:'#273e35',transparent:true,opacity:.63});
  for(const x of [-5.029,5.029]){cylinder(.062,.068,1.10,iron,x,.55,0,group,12);mesh(new THREE.SphereGeometry(.076,10,8),white,x,1.105,0,group);}
  const positions=[];for(let x=-5;x<=5.001;x+=.15){positions.push(x,.045,0,x,.914+.156*(x/5.029)**2,0);}
  for(let y=.08;y<.99;y+=.11){for(let x=-5;x<5;x+=.25){const h=.914+.156*(x/5.029)**2;if(y<h-.035)positions.push(x,y,0,x+.25,Math.min(y,.914+.156*((x+.25)/5.029)**2),0);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const lines=new THREE.LineSegments(g,black);group.add(lines);
  const top=[];for(let i=0;i<=50;i++){const x=-5.029+i*10.058/50;top.push(new THREE.Vector3(x,.914+.156*(x/5.029)**2,0));}
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(top),50,.025,5,false),white,0,0,0,group);
  box(.04,.90,.04,white,0,.45,0,group);
  // Thin net shadow strips, sharply cast like a real open mesh.
  const shadowGeo=new THREE.BufferGeometry();const shadowPos=[];
  for(let x=-5;x<=5;x+=.3)shadowPos.push(x-.005,0,0,x+.005,0,0,x+.005,.91,0,x-.005,0,0,x+.005,.91,0,x-.005,.91,0);
  shadowGeo.setAttribute('position',new THREE.Float32BufferAttribute(shadowPos,3));shadowGeo.computeVertexNormals();const shadowMesh=mesh(shadowGeo,new THREE.MeshBasicMaterial({color:'#283e35',side:THREE.DoubleSide}),0,0,0,group);shadowMesh.castShadow=true;
  return {group,lines,wobble:0};
}
function makeCrowd(scene){
  const seatedParts=[];
  function part(geo,x,y,z){geo.translate(x,y,z);seatedParts.push(geo);}
  part(new THREE.CylinderGeometry(.115,.095,.29,7),0,0,0);
  for(const side of [-1,1]){part(new THREE.CapsuleGeometry(.036,.15,2,5),side*.13,-.02,0);part(new THREE.BoxGeometry(.075,.075,.22),side*.06,-.17,-.07);part(new THREE.CapsuleGeometry(.033,.13,2,5),side*.06,-.25,-.16);}
  const n=420,body=new THREE.InstancedMesh(mergeGeometries(seatedParts),mat('#f4e2c7'),n),heads=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.09,1),mat('#d5a97c'),n);
  const positions=new Float32Array(n*4),palette=['#dad5b6','#8c9d83','#c98b69','#3c6155','#debc83','#668983','#aab396','#f0e2c3'];let i=0;
  for(;i<n;i++){
    let x,z,y;const side=i%2?1:-1;
    if(i<280){const row=Math.floor(i/70);x=side*(11+row*.93);z=-15+(Math.floor(i/2)%35)*.81;y=.30+row*.57+.48;}
    else {const row=Math.floor((i-280)/35);x=-13+((i-280)%35)*.77;z=-19-row*.95;y=.33+row*.6+.48;}
    x+=(rand()-.5)*.12;z+=(rand()-.5)*.12;positions[i*4]=x;positions[i*4+1]=y;positions[i*4+2]=z;positions[i*4+3]=rand()*6.28;
    matrix.makeRotationY(i<280?(side===1?-Math.PI/2:Math.PI/2):Math.PI);matrix.setPosition(x,y,z);const spectatorScale=.86+rand()*.23;matrix.scale(v1.set(spectatorScale,spectatorScale,spectatorScale));body.setMatrixAt(i,matrix);body.setColorAt(i,color.set(palette[Math.floor(rand()*palette.length)]));matrix.makeTranslation(x,y+.25,z);heads.setMatrixAt(i,matrix);heads.setColorAt(i,color.set(['#ba8e68','#dbb58b','#936e50','#e0c49e'][i%4]));
  }
  body.castShadow=false;heads.castShadow=false;scene.add(body,heads);return {body,heads,positions,lastUpdate:0};
}
function limb(material,length,radius=.075){const bone=new THREE.Bone();const part=mesh(new THREE.CapsuleGeometry(radius,Math.max(.01,length-radius*2),3,8),material,0,-length*.5,0,bone);return bone;}
function limbIK(upper,lower,origin,end,length1,length2,pole){
  v1.copy(end).sub(origin);const d=clamp(v1.length(),Math.abs(length1-length2)+.002,length1+length2-.002);
  if(v1.lengthSq()<1e-10)v1.copy(DOWN);else v1.normalize();
  // Solve the short leg to its planted or stepping ankle.
  end.copy(origin).addScaledVector(v1,d);
  v2.copy(pole).addScaledVector(v1,-pole.dot(v1));
  if(v2.lengthSq()<1e-8)v2.set(1,0,0).addScaledVector(v1,-v1.x);
  if(v2.lengthSq()<1e-8)v2.set(0,0,1).addScaledVector(v1,-v1.z);
  v2.normalize();
  const along=(length1*length1-length2*length2+d*d)/(2*d),off=Math.sqrt(Math.max(0,length1*length1-along*along));
  v3.copy(origin).addScaledVector(v1,along).addScaledVector(v2,off);
  upper.position.copy(origin);v2.copy(v3).sub(origin).normalize();upper.quaternion.setFromUnitVectors(DOWN,v2);
  lower.position.set(0,-length1,0);v2.copy(end).sub(v3).normalize();q1.copy(upper.quaternion).invert();v2.applyQuaternion(q1);lower.quaternion.setFromUnitVectors(DOWN,v2);
}
export function makePlayer(scene,shirtColor,skinColor,isBot){
  const root=new THREE.Group();scene.add(root);const hips=new THREE.Bone();root.add(hips);
  const shirt=mat(shirtColor),skin=mat(skinColor),shorts=mat(isBot?'#eee4cb':'#e9e5d0'),shoe=mat('#eee9d9'),sole=mat('#394f40'),hair=mat(isBot?'#493d2c':'#4a3d29');
  const torso=new THREE.Bone();hips.add(torso);torso.position.y=.90;
  // Compact avatar proportions: the hands deliberately float, with no arm rig.
  const body=mesh(new THREE.CylinderGeometry(.29,.23,.58,16),shirt,0,.13,0,torso);body.name='shirt';body.scale.z=.72;
  mesh(new THREE.SphereGeometry(.09,12,8),skin,0,.47,0,torso);
  const head=new THREE.Bone();head.name='head';head.position.y=.78;torso.add(head);
  const face=mesh(new THREE.SphereGeometry(.30,20,14),skin,0,0,0,head);face.scale.set(.94,1.07,.90);
  const cap=mesh(new THREE.SphereGeometry(.307,20,10,0,Math.PI*2,0,Math.PI*.49),isBot?hair:shorts,0,.055,0,head);cap.scale.set(.94,1,.91);
  if(!isBot){const brim=mesh(new THREE.SphereGeometry(1,16,8),shorts,0,.071,-.235,head);brim.scale.set(.23,.022,.19);}
  const collar=mesh(new THREE.TorusGeometry(.09,.018,6,16),shorts,0,.425,0,torso);collar.rotation.x=Math.PI/2;
  const pants=mesh(new THREE.CylinderGeometry(.231,.215,.18,16),shorts,0,-.24,0,torso);pants.scale.z=.72;
  const legs=[],hands=[],feet=[];
  for(const side of [-1,1]){
    const upper=limb(shorts,.33,.093),lower=limb(skin,.33,.075);hips.add(upper);upper.add(lower);legs.push({upper,lower});
    const foot=box(.18,.12,.32,shoe,side*.18,.10,-.03,root);box(.185,.024,.33,sole,0,-.05,0,foot);feet.push(foot);
    const handRig=makeHand(skin,side);root.add(handRig.hand);hands.push(handRig);
  }
  const racket=new THREE.Group();scene.add(racket);const frame=mat(isBot?'#edc27a':'#d9ed9e'),grip=mat('#253e36');
  const hoop=mesh(new THREE.TorusGeometry(.25,.018,6,30),frame,0,0,0,racket);hoop.scale.y=1.3;
  const strings=[];for(let i=-4;i<=4;i++){const x=i*.047,y=i*.057,ex=.25*Math.sqrt(1-(y/.325)**2),ey=.325*Math.sqrt(1-(x/.25)**2);strings.push(x,-ey,0,x,ey,0,-ex,y,0,ex,y,0);}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(strings,3));racket.add(new THREE.LineSegments(sg,new THREE.LineBasicMaterial({color:'#dee6c7',transparent:true,opacity:.72})));
  cylinder(.025,.026,.28,grip,0,-.65,0,racket,8);lineBetween(new THREE.Vector3(-.12,-.27,0),new THREE.Vector3(0,-.52,0),.014,frame,racket);lineBetween(new THREE.Vector3(.12,-.27,0),new THREE.Vector3(0,-.52,0),.014,frame,racket);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=64;shadowCanvas.height=64;const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,2,32,32,32);gradient.addColorStop(0,'rgba(24,45,32,.28)');gradient.addColorStop(1,'rgba(24,45,32,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const ao=mesh(new THREE.PlaneGeometry(1.5,1.0),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),0,.031,0,scene);ao.rotation.x=-Math.PI/2;ao.castShadow=false;
  return {style:'floating-hands',root,hips,torso,head,legs,hands,feet,racket,ao,gripHand:0,footX:new Float64Array(2),footZ:new Float64Array(2),footFromX:new Float64Array(2),footFromZ:new Float64Array(2),footToX:new Float64Array(2),footToZ:new Float64Array(2),stepStart:new Float64Array([-10,-10]),nextFoot:0,lastStep:-10,initialized:false,lastX:0,lastZ:0,origin:new THREE.Vector3(),end:new THREE.Vector3(),pole:new THREE.Vector3(0,0,-1),footError:0,weights:new Float32Array([1,0,0,0,0,0])};
}
export function animatePlayer(p,s,i,alpha,delta){
  const x=THREE.MathUtils.lerp(s.prevX[i],s.x[i],alpha),z=THREE.MathUtils.lerp(s.prevZ[i],s.z[i],alpha),direction=i===0?1:-1,speed=Math.hypot(s.vx[i],s.vz[i]);
  const fresh=!p.initialized;
  p.root.position.set(x,0,z);p.root.rotation.y=i===0?0:Math.PI;
  if(!p.initialized||Math.hypot(x-p.lastX,z-p.lastZ)>2){for(let j=0;j<2;j++){p.footX[j]=x+(j?1:-1)*.18;p.footZ[j]=z;p.footFromX[j]=p.footToX[j]=p.footX[j];p.footFromZ[j]=p.footToZ[j]=z;}p.stepStart.fill(-10);p.lastStep=-10;p.nextFoot=0;p.initialized=true;}
  p.lastX=x;p.lastZ=z;
  const renderTime=s.time-(1-alpha)*B.dt;
  const stride=.19,weight=strokeWeight(s,i,renderTime),active=weight>0,age=renderTime-s.strokeAt[i],swing=strokeTurn(s,i,renderTime)*(i===0?s.hand:-1);
  const animationDelta=Math.max(0,Math.min(.1,renderTime-(p.animationAt??renderTime)));p.animationAt=renderTime;
  const bob=(speed>.2?Math.sin(renderTime*speed*2)*.027:.007*Math.sin(renderTime*2.7))-.045*s.windup[i]-.025*weight;p.hips.position.y=bob;
  const blend=1-Math.exp(-animationDelta*18),running=clamp(speed/3,0,1),plant=active?Math.max(0,1-Math.abs(age)/.12):0,split=s.phase==='rally'&&s.receiver===i&&s.time-s.contactAt[1-i]<.2?1:0;
  p.weights[0]+=(1-Math.max(running,active?1:0,split)-p.weights[0])*blend;p.weights[1]+=(split-p.weights[1])*blend;p.weights[2]+=(running-p.weights[2])*blend;p.weights[3]+=(plant-p.weights[3])*blend;p.weights[4]+=((active&&age<.15?1:0)-p.weights[4])*blend;p.weights[5]+=((active&&age>=.15?1:0)-p.weights[5])*blend;
  p.head.rotation.set(-weight*.05,-swing*.25,0);
  p.torso.rotation.y=swing;p.torso.rotation.z+=(clamp(-s.vx[i]*.025,-.12,.12)-p.torso.rotation.z)*blend;p.torso.rotation.x=-p.weights[3]*.12-p.weights[2]*.10-s.windup[i]*.045;
  for(let j=0;j<2;j++){
    const neutralX=x+(j?1:-1)*.19,neutralZ=z-.03;
    const drift=Math.hypot(p.footX[j]-neutralX,p.footZ[j]-neutralZ);
    if(s.time-p.stepStart[j]>stride&&s.time-p.lastStep>stride*.52&&j===p.nextFoot&&(drift>.29||speed>.8)){
      p.stepStart[j]=s.time;p.lastStep=s.time;p.nextFoot=1-j;p.footFromX[j]=p.footX[j];p.footFromZ[j]=p.footZ[j];p.footToX[j]=neutralX+s.vx[i]*.10;p.footToZ[j]=neutralZ+s.vz[i]*.10;
    }
    const t=clamp((s.time-p.stepStart[j])/stride,0,1),smooth=t*t*(3-2*t),height=Math.sin(t*Math.PI)*.13;
    if(t<1){p.footX[j]=THREE.MathUtils.lerp(p.footFromX[j],p.footToX[j],smooth);p.footZ[j]=THREE.MathUtils.lerp(p.footFromZ[j],p.footToZ[j],smooth);}else if(s.time-p.stepStart[j]<stride+.05){p.footX[j]=p.footToX[j];p.footZ[j]=p.footToZ[j];}
    p.feet[j].position.set((p.footX[j]-x)*direction,.10+height,(p.footZ[j]-z)*direction-.03);p.feet[j].rotation.x=-Math.sin(t*Math.PI)*.12;
    p.origin.set((j?1:-1)*.16,.73,0);p.end.set((p.footX[j]-x)*direction,.16+height-bob,(p.footZ[j]-z)*direction);p.pole.set(0,0,-1);
    // Short legs extend slightly during a long running stride; planted feet stay
    // in world space, and the ankle still reaches the actual shoe.
    const length=Math.max(.33,p.origin.distanceTo(p.end)*.505),leg=p.legs[j];
    limbIK(leg.upper,leg.lower,p.origin,p.end,length,length,p.pole);
    leg.upper.children[0].scale.y=leg.lower.children[0].scale.y=length/.33;
    leg.upper.children[0].position.y=leg.lower.children[0].position.y=-length*.5;
  }
  const hand=i===0?s.hand:-1;
  const rx=THREE.MathUtils.lerp(s.oldRackX[i],s.rackX[i],alpha),ry=THREE.MathUtils.lerp(s.oldRackY[i],s.rackY[i],alpha),rz=THREE.MathUtils.lerp(s.oldRackZ[i],s.rackZ[i],alpha);
  p.racket.position.set(rx,ry,rz);
  // Pose the racket directly. Its head remains at the interpolated physics
  // position; the grip is a rigid child instead of the endpoint of an arm solve.
  const finish=smooth(age/STROKE.follow),overhead=s.strokeServe[i]||s.shape[i]===4;
  const contactTilt=overhead?-.16:-1.10,finishTilt=s.shape[i]===2?2.15:overhead?.50:.40;
  const tilt=-hand*.28*(1-weight)+hand*s.side[i]*(contactTilt+(finishTilt-contactTilt)*finish)*weight;
  racketEuler.set(.16+weight*.10,(i===0?0:Math.PI)+weight*hand*s.side[i]*.12,tilt,'YXZ');
  q1.setFromEuler(racketEuler);
  if(fresh)p.racket.quaternion.copy(q1);else p.racket.quaternion.rotateTowards(q1,animationDelta*18);
  if(p.gripHand!==hand){
    p.gripHand=hand;
    for(let j=0;j<2;j++){
      const h=p.hands[j],dominant=j===(hand===1?1:0);
      (dominant?p.racket:p.root).add(h.hand);
      h.mesh.geometry=dominant?h.grippingGeometry:h.restingGeometry;
    }
  }
  const holding=p.hands[hand===1?1:0],free=p.hands[hand===1?0:1];
  holding.hand.position.set(hand*GRIP.wristSide,-GRIP.headToGrip-GRIP.wristDrop,0);holding.hand.quaternion.identity();
  // The free hand balances the body turn, then rises independently for a toss.
  const prep=s.prepare[i],run=Math.sin(renderTime*speed*2)*running;
  free.hand.position.set(-hand*(.53+.09*s.windup[i]),1.10+prep*1.04+weight*.10+run*.05,-.25-weight*.15+run*.09);
  free.hand.rotation.set(.18-prep*.8,-swing*.3,hand*(.20+prep*.24));
  p.ao.position.set(x,.031,z);
}
export function createBoard(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e4dfc9');scene.fog=new THREE.Fog('#dddcc5',47,155);
  const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.1,220);camera.position.set(20,18,29);
  scene.add(new THREE.HemisphereLight('#f3ead5','#65765e',1.65));
  const sun=new THREE.DirectionalLight('#ffe2b5',2.8);sun.position.set(-21,15,-16);sun.target.position.set(0,0,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-21;sun.shadow.camera.right=21;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-22;sun.shadow.camera.near=.5;sun.shadow.camera.far=80;sun.shadow.bias=-.00022;sun.shadow.normalBias=.035;sun.shadow.radius=1.2;scene.add(sun,sun.target);
  const {iron}=makeCourt(scene),net=makeNet(scene,iron),crowd=makeCrowd(scene),players=[makePlayer(scene,'#438b87','#b88a5a',false),makePlayer(scene,'#bd704d','#c5986a',true)];
  const ball=mesh(new THREE.SphereGeometry(.073,14,10),new THREE.MeshStandardMaterial({color:'#dfef69',emissive:'#d7e84e',emissiveIntensity:.6,roughness:.6}),0,1,10,scene);
  const seam=mesh(new THREE.TorusGeometry(.073,.003,3,24),mat('#f5f3c7'),0,0,0,ball);seam.rotation.x=.7;
  const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64;const gc=glowCanvas.getContext('2d'),g=gc.createRadialGradient(32,32,1,32,32,32);g.addColorStop(0,'rgba(238,255,167,.40)');g.addColorStop(.25,'rgba(238,255,167,.12)');g.addColorStop(1,'rgba(238,255,167,0)');gc.fillStyle=g;gc.fillRect(0,0,64,64);const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false}));glow.scale.set(.7,.7,1);ball.add(glow);
  const ballShadow=mesh(new THREE.CircleGeometry(.14,16),new THREE.MeshBasicMaterial({color:'#243e30',transparent:true,opacity:.28,depthWrite:false}),0,.033,0,scene);ballShadow.rotation.x=-Math.PI/2;ballShadow.castShadow=false;
  const trailGeo=new THREE.BufferGeometry(),trailPositions=new Float32Array(20*3),trailColors=new Float32Array(20*3);trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));trailGeo.setAttribute('color',new THREE.BufferAttribute(trailColors,3));const trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.65,depthWrite:false}));trail.frustumCulled=false;scene.add(trail);
  const landing=mesh(new THREE.RingGeometry(.21,.23,40),new THREE.MeshBasicMaterial({color:'#e6ebba',transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false}),0,.034,0,scene);landing.rotation.x=-Math.PI/2;landing.castShadow=false;
  const particles=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.035,0),new THREE.MeshBasicMaterial({color:'#e8e4c9',transparent:true,opacity:.5}),32);particles.count=0;scene.add(particles);
  renderer.info.autoReset=false;const post=createPost(Math.floor(innerWidth*renderer.getPixelRatio()),Math.floor(innerHeight*renderer.getPixelRatio()));
  return {renderer,post,scene,camera,sun,net,crowd,players,ball,ballShadow,trail,trailPositions,trailColors,landing,particles,particlePositions:new Float32Array(96),particleV:new Float32Array(96),particleAge:10,mode:'welcome',cameraTarget:new THREE.Vector3(),lookTarget:new THREE.Vector3(),eventId:-1,kick:0,orbit:null,quality:1,lastCrowd:0,frameMs:0,dpr:Math.min(devicePixelRatio,1.6),height:innerHeight,width:innerWidth};
}
export function resizeBoard(b){b.width=innerWidth;b.height=innerHeight;b.camera.aspect=innerWidth/innerHeight;b.camera.updateProjectionMatrix();b.renderer.setSize(innerWidth,innerHeight);resizePost(b.post,Math.floor(innerWidth*b.dpr),Math.floor(innerHeight*b.dpr));}
export function lowerQuality(b){if(b.dpr>.85){b.dpr=Math.max(.85,b.dpr-.2);b.renderer.setPixelRatio(b.dpr);resizePost(b.post,Math.floor(b.width*b.dpr),Math.floor(b.height*b.dpr));b.renderer.shadowMap.autoUpdate=false;b.renderer.shadowMap.needsUpdate=true;b.quality=0;}}
export function renderBoard(b,s,alpha,delta,now){
  const camera=b.camera,portrait=b.width/b.height<.8,welcome=b.mode==='welcome';
  if(b.orbit){const {angle,radius,height,target=[0,0,0]}=b.orbit;camera.position.set(target[0]+Math.sin(angle)*radius,height,target[2]+Math.cos(angle)*radius);camera.lookAt(...target);}
  else{
    if(welcome){b.cameraTarget.set(portrait?18:19,portrait?24:18,portrait?38:28);b.lookTarget.set(portrait?0:-3.8,0,portrait?-1:1);}
    else {const push=Math.min(s.rally*.07,.7);const retreat=Math.max(0,s.z[0]-10.6)*.45;b.cameraTarget.set(s.x[0]*.035,portrait?24:17.4,portrait?40-push+retreat:33.0-push+retreat);b.lookTarget.set(0,0,portrait?2.2:1.6);}
    camera.position.lerp(b.cameraTarget,1-Math.exp(-delta*2.8));camera.lookAt(b.lookTarget);camera.fov=portrait?44:40;camera.updateProjectionMatrix();
  }
  if(s.eventId!==b.eventId){b.eventId=s.eventId;
    if(s.eventType===1){b.kick=.035;}
    if(s.eventType===3)b.net.wobble=.09;
    if(s.eventType===2&&(Math.abs(Math.abs(s.eventX)-B.halfWidth)<.12||Math.abs(Math.abs(s.eventZ)-B.halfLength)<.12||Math.abs(Math.abs(s.eventZ)-B.service)<.1)){
      b.particles.count=24;b.particleAge=0;
      for(let i=0;i<24;i++){const j=i*3;b.particlePositions[j]=s.eventX;b.particlePositions[j+1]=.04;b.particlePositions[j+2]=s.eventZ;b.particleV[j]=Math.sin(i*12.1)*.5;b.particleV[j+1]=.15+(i%5)*.05;b.particleV[j+2]=Math.cos(i*7.9)*.5;}
    }
  }
  b.kick*=Math.exp(-delta*18);camera.position.y+=b.kick;
  b.net.wobble*=Math.exp(-delta*5);b.net.lines.position.z=Math.sin(now*.035)*b.net.wobble;
  for(let i=0;i<2;i++)animatePlayer(b.players[i],s,i,alpha,delta);
  b.ball.position.set(THREE.MathUtils.lerp(s.previous[0],s.ball[0],alpha),THREE.MathUtils.lerp(s.previous[1],s.ball[1],alpha),THREE.MathUtils.lerp(s.previous[2],s.ball[2],alpha));b.ball.rotation.x=s.time*7;b.ball.rotation.z=s.time*4;
  b.ballShadow.position.set(b.ball.position.x,.034,b.ball.position.z);const scale=1+b.ball.position.y*.12;b.ballShadow.scale.setScalar(scale);b.ballShadow.material.opacity=.32/(1+b.ball.position.y*.25);
  b.landing.visible=s.phase==='rally'&&s.receiver===0&&s.prediction[4]===1;b.landing.position.set(s.prediction[0],.035,s.prediction[2]);b.landing.material.opacity=.16+Math.max(0,1-(s.prediction[3]-s.time)*2)*.2;
  const count=s.trailCount;b.trail.visible=s.phase==='rally'&&Math.hypot(s.ball[3],s.ball[5])>15;
  for(let i=0;i<count;i++){const index=(s.trailHead-1-i+20)%20,j=i*3;b.trailPositions[j]=s.trailX[index];b.trailPositions[j+1]=s.trailY[index];b.trailPositions[j+2]=s.trailZ[index];const t=(1-i/count)*.7;b.trailColors[j]=.55+t*.45;b.trailColors[j+1]=.67+t*.33;b.trailColors[j+2]=.33+t*.34;}
  b.trail.geometry.setDrawRange(0,Math.min(count,10));b.trail.geometry.attributes.position.needsUpdate=true;b.trail.geometry.attributes.color.needsUpdate=true;
  if(b.particleAge<.7){b.particleAge+=delta;for(let i=0;i<b.particles.count;i++){const j=i*3;for(let k=0;k<3;k++)b.particlePositions[j+k]+=b.particleV[j+k]*delta;b.particleV[j+1]-=delta*.4;matrix.makeTranslation(b.particlePositions[j],Math.max(.04,b.particlePositions[j+1]),b.particlePositions[j+2]);b.particles.setMatrixAt(i,matrix);}b.particles.instanceMatrix.needsUpdate=true;b.particles.material.opacity=.5*(1-b.particleAge/.7);}else b.particles.count=0;
  if(now-b.lastCrowd>100&&b.quality){b.lastCrowd=now;const c=b.crowd;for(let i=0;i<420;i++){const k=i*4,dy=Math.sin(s.time*1.3+c.positions[k+3])*.014*(s.rally>8?3:1);matrix.makeTranslation(c.positions[k],c.positions[k+1]+.25+dy,c.positions[k+2]);c.heads.setMatrixAt(i,matrix);}c.heads.instanceMatrix.needsUpdate=true;}
  // Freeze static shadow maps under sustained load, refresh player shadows at 30Hz.
  if(!b.quality&&Math.floor(now/33)%2===0)b.renderer.shadowMap.needsUpdate=true;
  renderPost(b.renderer,b.post,b.scene,camera,b.quality);
}
export function artAudit(b){const findings=[];let meshes=0,triangles=0;b.scene.traverse(o=>{if(o.isMesh){meshes++;const g=o.geometry;triangles+=(g.index?g.index.count:g.attributes.position.count)/3;if(!Number.isFinite(o.position.lengthSq()))findings.push('Non-finite transform');if(g.attributes.normal){const a=g.attributes.normal.array;for(let i=0;i<a.length;i++)if(!Number.isFinite(a[i])){findings.push('Non-finite normal');break;}}}});return {meshes,triangles,drawCalls:b.renderer.info.render.calls,renderTriangles:b.renderer.info.render.triangles,findings};}
