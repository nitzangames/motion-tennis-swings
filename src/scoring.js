export function pointText(s,i) {
  if(s.tiebreak)return String(s.points[i]);
  const a=s.points[i],b=s.points[1-i];
  if(a>=3&&b>=3)return a===b?'40':a>b?'AD':'40';
  return ['0','15','30','40'][Math.min(a,3)];
}
export function isSetPoint(s,i) {
  if(s.tiebreak)return s.points[i]>=6&&s.points[i]>s.points[1-i];
  return s.games[i]>=3&&s.games[i]>s.games[1-i]&&s.points[i]>=3&&s.points[i]>s.points[1-i];
}
export function scorePoint(s,winner) {
  s.points[winner]++;
  const loser=1-winner,a=s.points[winner],b=s.points[loser];
  if(s.tiebreak){
    if(a>=7&&a-b>=2){s.games[winner]++;s.winner=winner;}
    else {const n=a+b;s.server=(n%4===1||n%4===2)?1-s.tieFirst:s.tieFirst;}
  } else if(a>=4&&a-b>=2){
    s.games[winner]++;s.points.fill(0);s.server=1-s.server;
    if(s.games[winner]>=4&&s.games[winner]-s.games[loser]>=2)s.winner=winner;
    else if(s.games[0]===4&&s.games[1]===4){s.tiebreak=true;s.tieFirst=s.server;}
  }
  s.serveSide=(s.points[0]+s.points[1])%2===0?1:-1;
}
