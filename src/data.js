export function createState(seed=43,difficulty=1) {
  return {
    seed:seed>>>0,difficulty,hitStop:0,time:0,phase:'ready',phaseTime:0,paused:false,demo:false,
    ball:new Float64Array(9), previous:new Float64Array(3), prediction:new Float64Array(5), scratch:new Float64Array(9), launch:new Float64Array(9),
    x:new Float64Array(2),z:new Float64Array([10.6,-10.6]),prevX:new Float64Array(2),prevZ:new Float64Array([10.6,-10.6]),
    vx:new Float64Array(2),vz:new Float64Array(2),targetX:new Float64Array(2),targetZ:new Float64Array([10.6,-10.6]),reactionAt:new Float64Array(2),
    swingAt:new Float64Array([-10,-10]),contactAt:new Float64Array([-10,-10]),contactX:new Float64Array(2),contactY:new Float64Array(2),contactZ:new Float64Array(2),
    strokeAt:new Float64Array([-10,-10]),strokeX:new Float64Array(2),strokeY:new Float64Array(2),strokeZ:new Float64Array(2),strokeFromX:new Float64Array(2),strokeFromY:new Float64Array(2),strokeFromZ:new Float64Array(2),strokeLift:new Float64Array(2),strokeServe:new Uint8Array(2),prepare:new Float64Array(2),
    rackX:new Float64Array(2),rackY:new Float64Array([1,1]),rackZ:new Float64Array(2),oldRackX:new Float64Array(2),oldRackY:new Float64Array(2),oldRackZ:new Float64Array(2),
    armed:new Uint8Array(2),power:new Float64Array(2),shape:new Int8Array(2),side:new Int8Array([1,1]),timing:new Float64Array(2),aim:new Float64Array(2),
    points:new Uint16Array(2),games:new Uint8Array(2),tiebreak:false,tieFirst:0,server:0,serveNumber:1,serveSide:1,serveNet:false,serving:false,
    lastHit:0,bounces:0,rally:0,bestRally:0,receiver:1,shotId:0,refShot:-1,botShot:-1,
    lastWinner:-1,winner:-1,call:'Your court. Your move.',lastShot:'',pointReason:'',eventId:0,eventType:0,eventX:0,eventY:0,eventZ:0,eventPower:0,
    contactError:0,contacts:0,misses:0,netHits:0,lets:0,faults:0,latency:0,lastGestureAt:0,hand:1,
    referenceSwing:{power:.67,shape:1,side:1,timing:0,aim:0,onset:0,source:'reference'},
    pendingShot:new Int32Array([-1,-1]),referenceAt:new Float64Array([1e9,1e9]),
    trailX:new Float32Array(20),trailY:new Float32Array(20),trailZ:new Float32Array(20),trailCount:0,trailHead:0,
    historyWinner:new Int8Array(512),historyReason:new Uint8Array(512),historyCount:0,
  };
}
