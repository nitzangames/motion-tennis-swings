import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {PREVIEW,VARIANTS,createPreview,bakePreview,samplePreview,previewPhase,previewEnd,inspectPreview} from './swing-preview.js';
const $=id=>document.getElementById(id);
const settings={selected:1,mode:'all',hand:1,frame:PREVIEW.onset,timeline:'swing',playing:true,speed:.5,loop:true,trail:false,bones:false,target:true};
let startFrame=PREVIEW.onset,endFrame=PREVIEW.frames;
if(innerWidth<761)document.querySelector('.truth-note').open=false;
const params=new URLSearchParams(location.search),requested=VARIANTS.findIndex(v=>v.id===params.get('swing'));
if(requested>=0){settings.selected=requested;settings.mode='single';}if(params.get('view')==='single')settings.mode='single';if(params.get('view')==='all')settings.mode='all';if(params.get('hand')==='left')settings.hand=-1;if(params.get('paused')==='1')settings.playing=false;
if(params.get('timeline')==='full'){settings.timeline='full';settings.frame=0;}
const requestedFrame=params.has('frame')?Number(params.get('frame')):NaN;
if(Number.isFinite(requestedFrame))settings.frame=Math.max(0,Math.min(PREVIEW.frames,Math.round(requestedFrame)));
const renderer=new THREE.WebGLRenderer({canvas:$('preview-canvas'),antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor('#eff0e9',0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.outputColorSpace=THREE.SRGBColorSpace;
const camera=new THREE.PerspectiveCamera(37,1,.05,50),controls=new OrbitControls(camera,$('focus-stage'));
controls.target.set(0,1.6,0);controls.enableDamping=false;controls.minDistance=3.4;controls.maxDistance=11;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.49;controls.enablePan=true;controls.screenSpacePanning=true;
const previews=VARIANTS.map(createPreview),viewports=[],phaseLabels=[];
for(let i=0;i<VARIANTS.length;i++){
  const variant=VARIANTS[i],option=document.createElement('option');option.value=variant.id;option.textContent=variant.name;$('variant').append(option);
  const card=document.createElement('button');card.className='swing-card';card.dataset.variant=variant.id;card.setAttribute('aria-label','Inspect '+variant.name);
  card.innerHTML=`<span class="card-heading"><span><strong>${variant.name}</strong><small>${variant.serve?'Toss + overhead':variant.family+' · shape '+variant.shape}</small></span><span class="card-arrow">↗</span></span><span class="preview-viewport"></span><span class="card-tag"><span class="card-phase">Ready</span>${variant.shape<2?'<span class="same-tag">FLAT / TOPSPIN SHARE A PATH</span>':''}</span>`;
  card.onclick=()=>select(i,true);$('gallery').append(card);viewports.push(card.querySelector('.preview-viewport'));phaseLabels.push(card.querySelector('.card-phase'));
}
function bake(){for(const preview of previews)bakePreview(preview,settings.hand);}
function updateRange(){
  startFrame=settings.timeline==='full'?0:PREVIEW.onset;
  endFrame=settings.timeline==='full'?PREVIEW.frames:settings.mode==='single'?previewEnd(previews[settings.selected]):Math.max(...previews.map(previewEnd));
  if(settings.frame<startFrame||settings.frame>endFrame)settings.frame=startFrame;
  $('timeline').min=String(startFrame);$('timeline').max=String(endFrame);$('full-timeline').checked=settings.timeline==='full';
  $('range-label').textContent=(settings.timeline==='full'?'FULL TIMELINE':'SWING ONLY')+' · '+startFrame+'–'+endFrame;
}
function setTimeline(value){settings.timeline=value==='full'?'full':'swing';updateRange();updateURL();draw();}
function setCamera(view){
  const positions={'three-quarter':[-2.6,2.65,-4.6],front:[0,1.6,-5.6],side:[5.6,1.6,0],back:[0,1.6,5.6]};
  camera.position.fromArray(positions[view]??positions['three-quarter']);controls.target.set(0,1.6,0);controls.update();
  for(const button of document.querySelectorAll('[data-view]'))button.setAttribute('aria-pressed',String(button.dataset.view===view));
}
function updateURL(){
  const url=new URL(location.href);url.searchParams.set('swing',VARIANTS[settings.selected].id);url.searchParams.set('view',settings.mode);url.searchParams.set('hand',settings.hand===1?'right':'left');
  if(settings.timeline==='full')url.searchParams.set('timeline','full');else url.searchParams.delete('timeline');
  if(settings.playing){url.searchParams.delete('frame');url.searchParams.delete('paused');}else{url.searchParams.set('frame',Math.floor(settings.frame));url.searchParams.set('paused','1');}
  history.replaceState(null,'',url);
}
function setMode(mode,scroll=false){
  settings.mode=mode;document.body.dataset.mode=mode;$('gallery').hidden=mode!=='all';$('single').hidden=mode!=='single';controls.enabled=mode==='single';$('all-mode').setAttribute('aria-pressed',String(mode==='all'));$('single-mode').setAttribute('aria-pressed',String(mode==='single'));updateRange();updateURL();if(scroll){window.scrollTo({top:0,behavior:'instant'});if(mode==='single'&&innerWidth<761)requestAnimationFrame(()=>$('focus-stage').scrollIntoView({block:'start',behavior:'instant'}));}
}
function select(index,focus=false){
  if(index<0||index>=VARIANTS.length)throw new RangeError('Unknown swing');settings.selected=index;const v=VARIANTS[index];$('variant').value=v.id;$('focus-title').textContent=v.name;$('focus-kicker').textContent=(settings.hand===1?'RIGHT':'LEFT')+' HAND · '+v.family.toUpperCase();$('focus-note').textContent=v.note;
  if(focus)setMode('single',true);else{updateRange();updateURL();}updateReadout();
}
function play(value){
  if(value&&settings.frame>=endFrame)settings.frame=startFrame;
  settings.playing=!!value;$('play').textContent=value?'Ⅱ':'▶';$('play').setAttribute('aria-label',value?'Pause animation':'Play animation');updateURL();
  if(value&&settings.mode==='single'&&innerWidth<761)$('focus-stage').scrollIntoView({block:'start',behavior:'instant'});
}
function seek(frame,expand=false){if(expand&&(frame<startFrame||frame>endFrame)){settings.timeline='full';updateRange();}settings.frame=Math.max(startFrame,Math.min(endFrame,Math.round(frame)));play(false);draw();}
function setHand(hand){settings.hand=hand===-1?-1:1;$('hand').value=String(settings.hand);bake();select(settings.selected);draw();}
function updateReadout(){
  const frame=Math.floor(settings.frame),selected=previews[settings.selected];
  $('timeline').value=String(frame);$('time-label').textContent=(frame/PREVIEW.fps).toFixed(3)+' s';$('frame-label').textContent='FRAME '+String(frame).padStart(3,'0')+' / '+endFrame;
  $('phase-chip').textContent=previewPhase(selected,frame).toUpperCase();$('inspect-frame').textContent=String(frame).padStart(3,'0')+' / '+PREVIEW.frames+' · 120 Hz';
  const node=selected.nodes.length-1,base=(frame*selected.nodes.length+node)*3;
  $('inspect-position').textContent=selected.positions[base].toFixed(3)+' / '+selected.positions[base+1].toFixed(3)+' / '+selected.positions[base+2].toFixed(3);
  $('inspect-gap').textContent=(selected.gaps[frame]*1000).toFixed(6)+' mm';$('strike-explanation').textContent='*'+selected.variant.name+' · frame '+selected.strike;
  for(let i=0;i<phaseLabels.length;i++)phaseLabels[i].textContent=previewPhase(previews[i],frame);
}
function renderPreview(preview,element){
  const rect=element.getBoundingClientRect();if(rect.bottom<=0||rect.top>=innerHeight||rect.right<=0||rect.left>=innerWidth||rect.height<=0)return;
  samplePreview(preview,Math.floor(settings.frame));preview.trail.visible=settings.trail;preview.skeleton.visible=settings.bones;preview.axes.visible=settings.bones;preview.target.visible=settings.target;
  camera.aspect=rect.width/rect.height;camera.zoom=Math.min(1,camera.aspect/.8);camera.updateProjectionMatrix();
  renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);
  const left=Math.max(0,rect.left),bottom=Math.max(0,innerHeight-rect.bottom),right=Math.min(innerWidth,rect.right),top=Math.min(innerHeight,innerHeight-rect.top);
  renderer.setScissor(left,bottom,right-left,top-bottom);renderer.render(preview.scene,camera);
}
function draw(){
  renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.setClearColor('#eff0e9',0);renderer.clear(true,true,true);renderer.setScissorTest(true);
  if(settings.mode==='single')renderPreview(previews[settings.selected],$('focus-stage'));else for(let i=0;i<previews.length;i++)renderPreview(previews[i],viewports[i]);
  renderer.setScissorTest(false);updateReadout();
}
$('variant').onchange=()=>select(VARIANTS.findIndex(v=>v.id===$('variant').value),true);
$('focus-all').onclick=()=>setMode('all',true);$('all-mode').onclick=()=>setMode('all',true);$('single-mode').onclick=()=>setMode('single',true);$('hand').onchange=()=>setHand(Number($('hand').value));
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>setCamera(button.dataset.view);
for(const key of ['trail','bones','target'])$(key).onchange=()=>{settings[key]=$(key).checked;draw();};
$('play').onclick=()=>play(!settings.playing);$('restart').onclick=()=>seek(startFrame);$('previous').onclick=()=>seek(Math.floor(settings.frame)-1);$('next').onclick=()=>seek(Math.floor(settings.frame)+1);$('timeline').oninput=()=>seek(Number($('timeline').value));
$('full-timeline').onchange=()=>setTimeline($('full-timeline').checked?'full':'swing');
$('onset').onclick=()=>seek(PREVIEW.onset);$('strike').onclick=()=>seek(previews[settings.selected].strike);$('speed').onchange=()=>{settings.speed=Number($('speed').value);};$('loop').onchange=()=>{settings.loop=$('loop').checked;};
$('save-pose').onclick=()=>{
  const preview=previews[settings.selected],frame=Math.floor(settings.frame);samplePreview(preview,frame);const snapshot=inspectPreview(preview,frame),url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=preview.variant.id+'-'+(settings.hand===1?'right':'left')+'-frame-'+frame+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
window.addEventListener('keydown',event=>{
  if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement?.tagName))return;
  if(event.code==='Space'){event.preventDefault();$('play').click();}else if(event.code==='ArrowLeft'){event.preventDefault();seek(Math.floor(settings.frame)-1);}else if(event.code==='ArrowRight'){event.preventDefault();seek(Math.floor(settings.frame)+1);}
});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);draw();});
// RAF timestamps mark the beginning of a browser frame and can precede setup's
// performance.now(). Seed this clock from RAF itself, including after tab resume.
let last=null;document.addEventListener('visibilitychange',()=>{last=null;});
function frame(now){
  const delta=last===null?0:Math.max(0,Math.min((now-last)/1000,.05));last=now;
  if(settings.playing&&!document.hidden){settings.frame+=delta*PREVIEW.fps*settings.speed;if(settings.frame>=endFrame+1){if(settings.loop)settings.frame=startFrame+(settings.frame-startFrame)%(endFrame-startFrame+1);else{settings.frame=endFrame;play(false);}}}
  draw();requestAnimationFrame(frame);
}
window.addEventListener('error',event=>{$('load-status').hidden=false;$('load-status').textContent='Viewer error: '+event.message;});
bake();
// Older links and explicit frame requests retain their original absolute frame.
if(Number.isFinite(requestedFrame)&&(settings.frame<PREVIEW.onset||settings.frame>(settings.mode==='single'?previewEnd(previews[settings.selected]):Math.max(...previews.map(previewEnd)))))settings.timeline='full';
setCamera('three-quarter');$('hand').value=String(settings.hand);select(settings.selected);setMode(settings.mode);play(settings.playing);$('load-status').hidden=true;
window.SwingViewer=Object.freeze({
  ready:true,variants:()=>VARIANTS.map(v=>({...v})),
  select(id){select(VARIANTS.findIndex(v=>v.id===id),true);draw();return this.inspect();},
  mode(value){setMode(value==='single'?'single':'all');draw();},
  seek(frame){seek(frame,true);return this.inspect();},play(value=true){play(value);},hand(value){setHand(value);},timeline(value='swing'){setTimeline(value);},
  inspect(id=VARIANTS[settings.selected].id){const index=VARIANTS.findIndex(v=>v.id===id);if(index<0)throw new RangeError('Unknown swing');const frame=Math.floor(settings.frame);samplePreview(previews[index],frame);return inspectPreview(previews[index],frame);},
  state(){return {...settings,selected:VARIANTS[settings.selected].id,sampleFrame:Math.floor(settings.frame),fps:PREVIEW.fps,totalFrames:PREVIEW.frames,startFrame,endFrame,playbackFrames:endFrame-startFrame+1,camera:camera.position.toArray()};}
});
draw();if(settings.mode==='single'&&innerWidth<761)$('focus-stage').scrollIntoView({block:'start',behavior:'instant'});requestAnimationFrame(frame);
