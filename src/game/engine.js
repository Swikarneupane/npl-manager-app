import {dlsG,dlsRes,winProbability,projectedTotal,venuePar} from './winprob.js';
import {czInit,batComp,fieldComp,falseShot,wideFactor,dropFactor,czBall,czOver} from './composure.js';
import {FC,weatherLoss} from '../world/fastfc.js';
// ===== Utilities =====
const R=()=>Math.random(); // read at call time, so a test can seed Math.random
const ri=(a,b)=>a+Math.floor(R()*(b-a+1));
const rf=(a,b)=>a+R()*(b-a);
const pick=a=>a[Math.floor(R()*a.length)];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const SPIN=['OB','LB','SLA','LWS'];
const isSpin=t=>SPIN.includes(t);
const isPace=t=>!!t&&!isSpin(t);
const bowlGrp=t=>isPace(t)?'pace':t==='OB'?'OB':t==='SLA'?'SLA':isSpin(t)?'wrist':'pace';
const TYPE_LABEL={RF:'Right-arm fast',RFM:'Right-arm fast-medium',RM:'Right-arm medium',LF:'Left-arm fast',LFM:'Left-arm fast-medium',LM:'Left-arm medium',OB:'Off-spin',LB:'Leg-spin',SLA:'Left-arm orthodox',LWS:'Left-arm wrist-spin','':'—'};
const fmtL=v=>{v=Math.round(v*10)/10; return v>=100?('Rs '+(v/100).toFixed(2)+' cr'):('Rs '+v+' L');};
function ovr(p){ if(p.role==='BAT') return p.bat; if(p.role==='BOWL') return p.bowl; if(p.role==='WK') return p.bat+2; return Math.round(Math.max(p.bat,p.bowl,(p.bat+p.bowl)/2+7)); }
function calcValue(p){
  const o=ovr(p);
  let v;
  if(p.nat==='NEP') v=2+Math.pow(Math.max(0,o-48)/34,2)*18;
  else v=5+Math.pow(Math.max(0,o-55)/37,2)*70;
  if(p.age>=36) v*=0.8; if(p.age>=39) v*=0.8;
  if(p.age<=22 && p.pot>o+8) v*=1.15;
  return Math.max(p.nat==='NEP'?2:5, Math.round(v*2)/2);
}
let PID=1;
function setPID(v){PID=v;} function getPID(){return PID;}
function mkPlayer(a, team, year){
  const [name,nat,age,role,bat,bowl,type,hand,extra]=a;
  const p={id:'p'+(PID++),name,nat,age,role,bat,bowl:bowl||0,type:type||'',hand:hand||'R',marquee:extra==='m',
    prov:null,pot:0,form:0,fit:100,morale:70,inj:0,team:team||null,prevTeam:null,salary:0,value:0,focus:'Balanced',scouted:false,
    vsSpin:ri(-6,6),temper:ri(40,90),stats:{},hist:[],retired:false,joined:year||2026,real:true};
  p.field=clamp(Math.round(50+(p.age<28?8:0)+rf(-10,15)),35,90);
  const o=ovr(p);
  p.pot = age<=21? clamp(o+ri(6,20),o,95): age<=24? clamp(o+ri(2,12),o,94): age<=27? o+ri(0,5): o;
  p.value=calcValue(p);
  return p;
}
// ===== Commentary =====
const CM={
 en:{
  dot:['No run. {bat} defends solidly.','Beaten! {bowler} gets one past the outside edge.','Dot ball. Good length, straight at the stumps.','Pushed to cover, no run.','{bat} swings and misses.','Slower ball, {bat} is early on the shot. No run.','Tight line from {bowler}. Dot.'],
  one:['Worked into the leg side for a single.','Dabbed to third man, they take one.','Driven down to long-on for one.','Quick single, good running.','Nudged off the hips for a run.'],
  two:['Placed into the gap, they come back for two.','Hard running! Two taken.','Clipped wide of deep square, two more.'],
  three:['Chased down inside the rope, they run three!'],
  four:['FOUR! Crunched through the covers by {bat}.','FOUR! Short and punished, pulled to the fence.','FOUR! Lovely timing, races away down the ground.','FOUR! Edged, but it flies past slip to the boundary.','FOUR! Swept fine, no chance for the fielder.','FOUR! {bat} opens the face and guides it past point.'],
  six:['SIX! {bat} clears long-on with ease!','SIX! Massive! That one is landing on the Kirtipur hillside!','SIX! Charged down the pitch and lofted straight back over {bowler}\'s head.','SIX! Pulled flat over deep midwicket!','SIX! Slog-swept into the stands!','SIX! Pure power from {bat}.'],
  wide:['Wide. Drifting down leg from {bowler}.','Wide called. Too far outside off.'],
  nb:['No-ball! Overstepped. FREE HIT coming up.'],
  bowled:['BOWLED! {bowler} knocks over the stumps! {bat} has to go.','BOWLED HIM! Through the gate, timber everywhere!'],
  lbw:['LBW! Trapped in front by {bowler}. {bat} is gone.','Huge appeal... and the finger goes up! LBW.'],
  caught:['CAUGHT! {bat} picks out {fielder} in the deep.','OUT! Top edge, and {fielder} settles under it.','Caught! {fielder} takes a sharp catch. {bowler} is pumped.','Holed out! {fielder} makes no mistake.'],
  behind:['Caught behind! Thin edge and {fielder} gloves it.'],
  stumped:['STUMPED! {bat} danced down, missed, and {fielder} whips the bails off.'],
  runout:['RUN OUT! Terrible mix-up, {bat} is short of the crease.','Direct hit! {bat} is run out.'],
  freehit:['Free hit... '],
  crowd:['The crowd on the hill is on its feet!','You can hear the drums all the way from Kirtipur bazaar.','The Kirtipur crowd is roaring.'],
  over:'End of over {o}: {score}. {bowler} {fig}.',
  milestone50:'FIFTY for {bat}! Raises the bat to the stands. ({r} off {b})',
  milestone100:'HUNDRED! {bat} brings up a century! ({r} off {b}) The whole ground stands.',
  fivefor:'FIVE WICKETS for {bowler}! What a spell.',
  hattrick:'HAT-TRICK! {bowler} has three in three!',
  pp:'End of the powerplay: {score}.',
  newbat:'{bat} walks out to the middle.',
  drop:['DROPPED! {fielder} puts down a chance. {bat} survives.'],
  review:'{side} review the decision...',
  overturned:'DECISION OVERTURNED! {txt}',
  upheld:'Umpire\'s call stands. {side} lose a review.',
 },
 np:{
  dot:['कुनै रन छैन। {bat} ले राम्रोसँग रोके।','बिट! {bowler} को बल ब्याटको किनारा छोएर गएन।','डट बल। सटीक लाइन र लेन्थ।','{bat} ले हिर्काउन खोजे तर बल छोएनन्।','{bowler} को कसिलो बलिङ, रन छैन।'],
  one:['एक रन।','लेग साइडमा धकेलेर एक रन लिए।','छिटो एक रन, राम्रो दौड।'],
  two:['खाली ठाउँमा पठाएर दुई रन।','दौडेर दुई रन!'],
  three:['तीन रन! सीमारेखा नजिकै बल रोकियो।'],
  four:['चौका! {bat} ले कभरबाट सिमापारि पुर्‍याए।','चौका! छोटो बल, पुल गरेर चार रन।','चौका! गजबको टाइमिङ!','चौका! {bat} को सुन्दर प्रहार।'],
  six:['छक्का! {bat} ले बल सिधै दर्शकमाझ पुर्‍याए!','छक्का! कीर्तिपुरको डाँडासम्म पुग्यो बल!','छक्का! {bowler} को टाउकोमाथिबाट सिधै बाहिर!','छक्का! विशाल प्रहार!'],
  wide:['वाइड।','वाइड बल, लेग साइडतिर।'],
  nb:['नो बल! अर्को बल फ्री हिट।'],
  bowled:['बोल्ड! {bowler} ले {bat} को स्टम्प उखेले!','क्लिन बोल्ड! {bat} आउट।'],
  lbw:['एलबीडब्ल्यू! {bat} लाई {bowler} ले अगाडि नै फसाए।'],
  caught:['क्याच! {fielder} ले समाते, {bat} आउट।','आउट! {fielder} को सुरक्षित क्याच।'],
  behind:['विकेट पछाडि क्याच! {fielder} ले समाते।'],
  stumped:['स्टम्प! {fielder} को फुर्तिलो स्टम्पिङ, {bat} आउट।'],
  runout:['रन आउट! {bat} क्रिजसम्म पुग्न सकेनन्।'],
  freehit:['फ्री हिट... '],
  crowd:['नेपाल! नेपाल! दर्शकको जयघोष गुन्जियो!','कीर्तिपुरको डाँडामा दर्शक उर्लिए!','मैदान तालीले गुन्जियो!'],
  over:'{o} ओभर समाप्त: {score}। {bowler} {fig}।',
  milestone50:'{bat} को अर्धशतक! ({r} रन, {b} बल)',
  milestone100:'शतक! {bat} ले शतक पूरा गरे! ({r} रन, {b} बल)',
  fivefor:'{bowler} को पाँच विकेट! अद्भुत स्पेल!',
  hattrick:'ह्याट्रिक! {bowler} ले लगातार तीन विकेट लिए!',
  pp:'पावरप्ले समाप्त: {score}।',
  newbat:'{bat} मैदानमा आए।',
  drop:['क्याच छुट्यो! {fielder} ले मौका गुमाए। {bat} बाँचे।'],
  review:'{side} ले रिभ्यु लिए...',
  overturned:'निर्णय उल्टियो! {txt}',
  upheld:'अम्पायरको निर्णय कायम। {side} को एक रिभ्यु गयो।',
 }
};
function cm(lang,key,vars){
  const L=lang==='np'?'np':'en';
  let t=CM[L][key]; if(Array.isArray(t)) t=pick(t);
  return t.replace(/\{(\w+)\}/g,(_,k)=>vars&&vars[k]!=null?vars[k]:'');
}
// DLS resources (dlsG, dlsRes) live in winprob.js, shared with the win-probability model.
// ===== Match engine =====
// Powerplay, middle and death by match length: T20 is overs 1-6, 7-15, 16-20; a 50-over match is 1-10, 11-40, 41-50.
function phaseOf(ballIdx,maxBalls=120){ const o=Math.floor(ballIdx/6), ov=maxBalls/6;
  if(ov>25) return o<ov*0.2?'pp':o>=ov*0.8?'death':'mid';
  return o<6?'pp':o>=15?'death':'mid'; }
function autoAggr(inn,maxBalls){
  const bl=maxBalls-inn.balls, o=Math.floor(inn.balls/6)*(120/maxBalls), wk=inn.wkts; // o: the over as a 20-over equivalent
  if(inn.target){
    const need=inn.target-inn.runs; if(need<=0) return 0;
    const rrr=need/(Math.max(1,bl)/6), inHand=10-wk;
    let a = rrr>13?2: rrr>10.5?1.4: rrr>8.5?0.8: rrr>7?0.3: rrr<5?-0.6:0;
    if(inHand<=3 && rrr<11) a-=0.6; if(bl<=12 && rrr>9) a=2;
    return clamp(a,-1,2);
  }
  let a = o<6?0.5: o>=17?1.6: o>=15?1.1: 0.1;
  if(wk>=6 && o<15) a-=0.7; else if(wk>=4 && o<10) a-=0.4;
  if(wk<=2 && o>=12) a+=0.4;
  return clamp(a,-1,2);
}
function ballProbs(b,w,aggr,ctx){
  const d=(b-w)/100;
  let P={dot:.335,one:.375,two:.078,three:.006,four:.112,six:.045,wkt:.041};
  P.four*=1+1.5*d; P.six*=1+2.2*d; P.wkt*=Math.max(.25,1-2*d); P.dot*=Math.max(.4,1-0.9*d); P.one*=1+0.2*d;
  if(aggr>=0){P.four*=1+0.2*aggr; P.six*=1+0.55*aggr; P.wkt*=1+0.3*aggr+(aggr>1.2?0.1:0); P.dot*=1-0.1*aggr; P.one*=1+0.03*aggr;}
  else {const a=-aggr; P.four*=1-0.3*a; P.six*=1-0.55*a; P.wkt*=1-0.35*a; P.dot*=1+0.15*a; P.one*=1+0.06*a;}
  if(ctx.phase==='pp'){P.four*=1.2; P.six*=1.05; P.wkt*=0.95;}
  else if(ctx.phase==='death'){P.six*=1.3; P.four*=1.08; P.wkt*=1.2; P.dot*=0.9; P.two*=1.25;}
  else {P.one*=1.08; P.four*=0.92;}
  if(ctx.set<6){P.wkt*=1.25; P.four*=0.85; P.six*=0.7;} else if(ctx.set>22){P.wkt*=0.85; P.four*=1.12; P.six*=1.15;}
  const f=ctx.field;
  if(f==='attack'){P.wkt*=1.15; P.four*=1.12; P.one*=0.95;}
  else if(f==='defend'){P.four*=0.84; P.six*=0.9; P.wkt*=0.9; P.one*=1.12; P.two*=1.1;}
  else if(f==='death'){P.six*=0.88; P.four*=0.92; P.one*=1.08; P.two*=1.12;}
  P.four*=ctx.pitch; P.six*=ctx.pitch; P.wkt/=Math.sqrt(ctx.pitch);
  // composure: a rattled batter plays more false shots
  if(ctx.comp!=null){ const k=falseShot(ctx.comp); P.wkt*=k; if(k>1) P.dot*=1+(k-1)/4; else if(ctx.comp>75) P.four*=1.05; }
  // 50-over cricket: boundaries are rarer, wickets fall more slowly, singles and dots dominate; a Test is the red-ball engine
  if(ctx.odi){ P.dot*=1.3; P.one*=1.05; P.two*=0.95; P.four*=0.5; P.six*=0.3; P.wkt*=0.56; }
  if(ctx.freeHit){P.wkt=0; P.six*=1.4;}
  const s=Object.values(P).reduce((x,y)=>x+y,0); for(const k in P)P[k]/=s;
  return P;
}
// ----- The bowling plan: line, length and each bowler's aggression (the user's bowling only) -----
// A batter's lean is a game estimate (a stable hash of the player, not real data): side > 0 is strong on the off side,
// foot > 0 is a front-foot player. A line and length aimed at the weaker side and foot makes wickets likelier and
// boundaries rarer; aimed at the strength it gives runs away. Auto (no line or length) changes nothing.
function hashN(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0)/4294967296; }
function batProfile(p){ const id=String(p.wid||p.id); return {side:hashN(id+'s')*2-1, foot:hashN(id+'f')*2-1}; }
function applyBowlPlan(P,inn,bat,field){
  const ag=inn.bagg&&inn.bagg[inn.cur], bp=inn.bplan;
  if(ag==='attack'){ P.wkt*=1.12; P.four*=1.1; P.six*=1.1; P.dot*=0.97; }
  else if(ag==='defend'){ P.wkt*=0.88; P.four*=0.85; P.six*=0.8; P.dot*=1.06; P.one*=1.04; }
  if(bp&&(bp.line||bp.len)){
    const pr=batProfile(bat), lv={off:1,stumps:0,leg:-1}[bp.line]||0, ln={short:1,good:0,full:-1}[bp.len]||0;
    const E=(-pr.side*lv+pr.foot*ln)/2;
    P.wkt*=1+0.2*E; P.four*=1-0.15*E; P.six*=1-0.12*E; P.dot*=1+0.08*E;
    if(bp.len==='short') P.six*=1.1; if(bp.len==='full') P.four*=1.05;
    // the field does not follow the length by itself: slips for a short ball and deep men for a full one waste the plan
    if(bp.len==='short'&&field==='attack') P.wkt*=0.92; if(bp.len==='full'&&field==='defend') P.four*=1.1;
  }
  const s=Object.values(P).reduce((x,y)=>x+y,0); for(const k in P)P[k]/=s;
}
function choose(P){ let r=R(),acc=0; for(const k in P){acc+=P[k]; if(r<acc) return k;} return 'dot'; }

class Match{
  static FIELDS=['home','away','opt','overs','maxBalls','night','pitch','dew','lang','log','result','inns','weather','lineups','toss','bowlRev','catches','hattricks','cz','edge','km','dug','md'];
  constructor(G,home,away,opt){
    // Tests and first-class formats (opt.fmt in FC) play the multi-day engine below
    if(new.target===Match && opt && FC[opt.fmt]) return new MultiDay(G,home,away,opt);
    this.G=G; this.home=home; this.away=away; this.opt=opt||{};
    this.overs=opt.overs||20; this.maxBalls=this.overs*6;
    this.night = opt.night!=null? opt.night : R()<0.5;
    this.pitch = opt.pitch!=null ? opt.pitch : rf(0.9,1.1); this.dew = opt.dew!=null ? !!opt.dew : (this.night && R()<0.6);
    this.lang=opt.lang||'en'; this.log=[]; this.result=null; this.inns=[];
    this.weather=null;
    const rainRoll=R();
    const rainP=opt.rain!=null?opt.rain:0.055;
    if(!opt.noRain){ if(rainRoll<rainP*0.36) this.weather={type:'pre',overs:ri(8,17)}; else if(rainRoll<rainP) this.weather={type:'mid'}; }
    if(this.weather&&this.weather.type==='pre'){this.overs=this.weather.overs; this.maxBalls=this.overs*6;}
    this.lineups={}; this.lineups[home]=G.lineup(home); this.lineups[away]=G.lineup(away);
    this.night=!!this.night;
  }
  P(id){return this.G.players[id];}
  say(txt,cls,extra){ const e={t:txt,c:cls||'',...extra}; if(this._ne){e.ne=this._ne; this._ne=null;} if(e.ball&&this._cur){e.bw=this._cur.bw; e.bt=this._cur.bt;} this.log.push(e); if(this.hooks&&this.hooks.onLine) this.hooks.onLine(e,this); return e; }
  tr(key,vars){ const L=this.lang; if(L==='both'){ this._ne=cm('np',key,vars); return cm('en',key,vars);} return cm(L,key,vars); }
  crowd(){ const L=this.lang; if(L==='en') return; if(R()<0.6) this.say(cm('np','crowd'),'crowd'); }
  newInnings(bat,bowl,target){
    const lu=this.lineups[bat];
    const inn={bat,bowl,runs:0,wkts:0,balls:0,extras:0,order:lu.order.slice(),next:2,striker:lu.order[0],non:lu.order[1],
      bs:{},bw:{},cur:null,last:null,overRuns:0,fow:[],reviews:2,freeHit:false,target:target||null,aggr:'auto',field:'auto',
      partnership:0,lastWktBowler:[],fours:0,sixes:0,overSeq:[]};
    for(const id of lu.order) inn.bs[id]={r:0,b:0,f:0,s:0,out:null,how:''};
    inn.bs[inn.striker].in=true; inn.bs[inn.non].in=true;
    return inn;
  }
  score(inn){ const o=Math.floor(inn.balls/6)+'.'+(inn.balls%6); return `${this.G.teams[inn.bat].id} ${inn.runs}/${inn.wkts} (${o})`; }
  // need: legal balls the bowler must still be able to bowl inside the 4-over limit
  // (a full over, or the rest of an over when a bowler is injured mid-over).
  bowlerOptions(inn,need=6){
    const lu=this.lineups[inn.bowl];
    // a fifth of the innings per bowler: 4 overs in T20, 10 in an ODI
    const cap=this.overs>20?Math.ceil(this.overs/5)*6:24;
    return lu.xi.filter(id=>{const s=inn.bw[id]; return (!s||s.balls+need<=cap) && id!==inn.last && !(s&&s.injured);});
  }
  aiBowler(inn,need=6){
    const opts=this.bowlerOptions(inn,need); const o=Math.floor(inn.balls/6); const ph=phaseOf(inn.balls,this.maxBalls);
    const oversLeft=this.overs-o;
    const team=this.G.teams[inn.bowl]; const plan=inn.bowl===this.G.user&&team&&team.bowlPlan&&Object.keys(team.bowlPlan).length?team.bowlPlan:null;
    let best=null,bs=-1e9;
    const capable=opts.filter(id=>this.P(id).bowl>=45);
    const pool=capable.length?capable:opts;
    for(const id of pool){
      const p=this.P(id), s=inn.bw[id]||{balls:0,r:0,w:0};
      let sc=p.bowl+p.form*0.8;
      if(isPace(p.type)&&(ph==='pp'||ph==='death')) sc+=6; if(isSpin(p.type)&&ph==='mid') sc+=6;
      if(isSpin(p.type)&&this.dew&&inn===this.inns[1]) sc-=4;
      const ov=s.balls/6; sc-=ov*1.5; if(s.balls>=6){const eco=s.r/(s.balls/6); sc-=(eco-8)*1.2; sc+=s.w*2;}
      // save death overs for best pacers
      if(ph!=='death' && isPace(p.type) && p.bowl>=68 && ov>=2) sc-=6;
      // the user's captain follows the bowling plan: prefer bowlers with plan overs left in this phase
      if(plan){ const want=(plan[id]&&plan[id][ph])||0, done=(s.ph&&s.ph[ph])||0; if(want>done) sc+=30; else if(want>0||plan[id]) sc-=8; }
      sc+=rf(-3,3);
      if(sc>bs){bs=sc;best=id;}
    }
    if(!best){ const lu=this.lineups[inn.bowl]; best=lu.xi.find(id=>id!==inn.last)||lu.xi[0]; }
    return best;
  }
  // ---- ball settings, shared by ball() and the read-outs ----
  // t.aggrBias: a manager's batting style (an AI manager who likes to attack bats a little harder)
  aggrFor(inn){ if(inn.bat===this.G.user && inn.aggr!=='auto') return +inn.aggr; const t=this.G.teams&&this.G.teams[inn.bat]; return clamp(autoAggr(inn,this.maxBalls)+((t&&t.aggrBias)||0),-1,2); }
  fieldFor(inn,ph){ return (inn.bowl===this.G.user && inn.field!=='auto')? inn.field : (ph==='death'?'death': (inn.target && (inn.target-inn.runs)/(Math.max(1,this.maxBalls-inn.balls)/6)>10)?'defend':'balanced'); }
  strengths(inn,bat,bowl,ph){
    let b=bat.bat+bat.form*1.2-(100-bat.fit)*0.08+(isSpin(bowl.type)?bat.vsSpin:-bat.vsSpin)*0.5;
    let w=bowl.bowl+bowl.form*1.0-(100-bowl.fit)*0.06;
    if(isPace(bowl.type)&&ph!=='mid') w+=3; if(isSpin(bowl.type)&&ph==='mid') w+=3;
    if(isSpin(bowl.type)&&this.dew&&inn===this.inns[1]) w-=4;
    // bowling coach: +0.4 x level at the death
    if(ph==='death'&&this.G.staffLevel) w+=0.4*this.G.staffLevel(inn.bowl,'bowl');
    if(bat.bat<30) b-=8;
    // difficulty: AI sides play a little above or below their ratings against you
    const adj=this.G.diff?this.G.diff().rate:0; if(adj&&this.G.user){ if(inn.bat!==this.G.user) b+=adj; if(inn.bowl!==this.G.user) w+=adj; }
    // matchups ticked in the build-up: a small edge for the user's side (opt.mu, from matchday.js)
    let mu=-1; const M=this.opt&&this.opt.mu; const u=this.G.user;
    if(M&&u) M.forEach((e,k)=>{
      if(e.t==='bat'&&inn.bat===u&&bat.id===e.bat&&bowl.id===e.bowl){ b+=e.v; mu=k; }
      else if(e.t==='bowl'&&inn.bowl===u&&bat.id===e.bat&&bowlGrp(bowl.type)===e.grp){ w+=e.v; mu=k; }
      else if(e.t==='phase'&&inn.bat===u&&ph===e.ph){ b+=e.v; mu=k; }
      else if(e.t==='see'&&inn.bat===u&&bowl.id===e.bowl){ w-=e.v; mu=k; }
    });
    return {b,w,mu};
  }
  // Outcome probabilities of the next ball for the current striker, without bowling it.
  // o.aggr / o.field / o.bowler override what the innings would use. Uses no randomness.
  preview(inn,o={}){
    const bat=this.P(inn.striker), bowl=this.P(o.bowler||inn.cur); if(!bat||!bowl||!inn.bs[inn.striker]) return null;
    const ph=this.phaseAt(inn); const {b,w}=this.strengths(inn,bat,bowl,ph);
    return this.probs(b,w,o.aggr!=null?o.aggr:this.aggrFor(inn),{phase:ph,odi:this.maxBalls>150,set:inn.bs[inn.striker].b,field:o.field||this.fieldFor(inn,ph),pitch:this.pitch,freeHit:inn.freeHit,comp:o.comp!=null?o.comp:batComp(this,inn,inn.striker)});
  }
  // ---- save / resume ----
  serialize(){ const o={}; for(const k of Match.FIELDS) if(this[k]!==undefined) o[k]=this[k]; return JSON.parse(JSON.stringify(o)); }
  // the ball's phase and outcome model: limited-overs phases here, the red ball in MultiDay
  phaseAt(inn){ return phaseOf(inn.balls,this.maxBalls); }
  probs(b,w,aggr,ctx){ return ballProbs(b,w,aggr,ctx); }
  overNeed(inn){ return inn.target?`Need ${inn.target-inn.runs} from ${this.maxBalls-inn.balls}`:`Run rate ${(inn.runs/(inn.balls/6)).toFixed(2)}`; }
  static restore(G,data){ const m=Object.create((data.md?MultiDay:Match).prototype); Object.assign(m,JSON.parse(JSON.stringify(data))); m.G=G; m.hooks={}; m._ne=null; m._cur=null; return m; }
  // run() is resumable: it skips the toss and any innings already completed, and continues a part-played innings.
  async run(hooks){
    this.hooks=hooks||{};
    const G=this.G, h=this.home, a=this.away;
    const T=G.teams;
    if(!this.toss){
      const tossWin=R()<0.5?h:a; let batFirst;
      if(this.hooks.toss && tossWin===G.user) batFirst = (await this.hooks.toss(this))==='bat'? tossWin : (tossWin===h?a:h);
      else batFirst = (R()<(this.night?0.3:0.5))? tossWin : (tossWin===h?a:h);
      this.toss={win:tossWin,dec:batFirst===tossWin?'bat':'field'};
      this.say(`${T[tossWin].name} won the toss and chose to ${this.toss.dec==='bat'?'bat':'field'} first.`,'info');
      if(this.weather&&this.weather.type==='pre') this.say(`Rain delayed the start. The match is reduced to ${this.overs} overs a side.`,'info rain');
      if(this.dew) this.say('Evening match. Dew is expected later, which may make gripping the ball harder for spinners.','info');
    }
    const batFirst=this.toss.dec==='bat'?this.toss.win:(this.toss.win===h?a:h);
    const bat2 = batFirst===h?a:h;
    if(!this.inns.length){ this.inns.push(this.newInnings(batFirst,bat2,null)); this.say(`${T[batFirst].name} innings`,'head'); this.walkOut(this.inns[0]); }
    const i1=this.inns[0];
    await this.playInnings(i1);
    if(this.inns.length<2){
      const target=i1.runs+1;
      this.inns.push(this.newInnings(bat2,batFirst,target));
      if(this.weather&&this.weather.type==='mid') this.weather.at=ri(30,this.maxBalls-6);
      this.say(`${T[bat2].name} need ${target} to win from ${this.overs} overs.`,'head'); this.walkOut(this.inns[1]);
    }
    await this.playInnings(this.inns[1]);
    this.result=null;
    this.finish();
    return this.result;
  }
  async playInnings(inn){
    const isSecond=!!inn.target;
    // a resumed innings may stop exactly at the end of an over: finish that bookkeeping first
    await this.endOverIfNeeded(inn);
    while(inn.balls<this.maxBalls && inn.wkts<10 && !(isSecond&&inn.runs>=inn.target)){
      if(isSecond && this.weather && this.weather.type==='mid' && inn.balls>=this.weather.at){ inn.rainStop=true; this.say(`Heavy rain at Kirtipur! Play is stopped at ${this.score(inn)}.`,'info rain'); break; }
      if(inn.balls%6===0 && inn.overStart!==inn.balls){
        inn.overStart=inn.balls; inn.overRuns=0; inn.overW=0; inn.overSeq=[];
        let bid=null;
        if(this.hooks.chooseBowler && inn.bowl===this.G.user) bid=await this.hooks.chooseBowler(inn,this);
        if(!bid || !this.bowlerOptions(inn).includes(bid)) bid=this.aiBowler(inn);
        inn.cur=bid; if(!inn.bw[bid]) inn.bw[bid]={balls:0,r:0,w:0,dots:0,wd:0,nb:0};
        { const b=inn.bw[bid]; (b.ph||(b.ph={pp:0,mid:0,death:0}))[phaseOf(inn.balls,this.maxBalls)]++; }
        if(this.hooks.beforeOver) await this.hooks.beforeOver(inn,this);
      }
      { const r0=inn.runs,w0=inn.wkts,ph=phaseOf(inn.balls,this.maxBalls); await this.ball(inn); const X=(inn.ph||(inn.ph={}))[ph]||(inn.ph[ph]={r:0,w:0}); X.r+=inn.runs-r0; X.w+=inn.wkts-w0; }
      await this.endOverIfNeeded(inn);
    }
  }
  async endOverIfNeeded(inn){
    const isSecond=!!inn.target;
    if(!(inn.balls%6===0 && inn.balls>0 && inn.overStart!=null && inn.balls!==inn.lastOverEnd && inn.overStart!==inn.balls)) return;
    if((isSecond&&inn.runs>=inn.target) || inn.wkts>=10) return;
    inn.lastOverEnd=inn.balls;
    // runs and overs per phase, for the scout report's weakest phase
    { const px=inn.phx||(inn.phx={pp:[0,0],mid:[0,0],death:[0,0]}); const ph0=phaseOf(inn.balls-1,this.maxBalls); px[ph0][0]+=inn.overRuns||0; px[ph0][1]++; }
    czOver(this,inn);
    const s=inn.bw[inn.cur]; const fig=`${Math.floor(s.balls/6)}-${s.r}-${s.w}`;
    const bats=[inn.striker,inn.non].filter(id=>inn.bs[id]&&!inn.bs[id].out).map(id=>`${this.P(id).name.split(' ').slice(-1)[0]} ${inn.bs[id].r} (${inn.bs[id].b})`);
    const need=this.overNeed(inn);
    this.say(this.tr('over',{o:inn.balls/6,score:this.score(inn),bowler:this.P(inn.cur).name,fig}),'over',{ov:{n:inn.balls/6,runs:inn.overRuns,score:`${this.G.teams[inn.bat].name.split(' ')[0]} ${inn.runs}/${inn.wkts}`,bats,need,bowler:`${this.P(inn.cur).name} ${fig}`}});
    if(inn.balls===36&&!this.md) this.say(this.tr('pp',{score:this.score(inn)}),'over');
    inn.last=inn.cur; [inn.striker,inn.non]=[inn.non,inn.striker];
    if(this.hooks.overEnd) await this.hooks.overEnd(inn,this);
  }
  async ball(inn){
    const T=this.G.teams; const bat=this.P(inn.striker), bowl=this.P(inn.cur); const bs=inn.bs[inn.striker], bw=inn.bw[inn.cur];
    this._cur={bw:bowl.name,bt:bat.name};
    const ph=this.phaseAt(inn);
    // extras (the red ball: wides are called far less strictly)
    const acc=bowl.bowl;
    const cf=fieldComp(this,inn.bowl); const wideP=(0.045-acc*0.00028)*wideFactor(cf)*(this.md?0.3:1), nbP=(0.008-acc*0.00004)*(this.md?0.8:1);
    const ex=R();
    const user=this.G.user;
    const aggr=this.aggrFor(inn), field=this.fieldFor(inn,ph);
    const vars={bat:bat.name,bowler:bowl.name};
    if(ex<wideP){ inn.runs++; inn.extras++; bw.r++; bw.wd++; inn.overRuns++; inn.partnership++; this.say(this.tr('wide',vars),'extra',{ball:true,o:this.ballLbl(inn,false),ev:'wd'}); inn.overSeq.push('wd'); this.compose(inn,'wd'); if(this.hooks.afterBall) await this.hooks.afterBall(inn,this,{ev:'wd'}); return; }
    let noBall=false; if(ex<wideP+nbP){ noBall=true; }
    const {b,w,mu}=this.strengths(inn,bat,bowl,ph);
    if(mu>=0){ const e=this.opt.mu[mu]; if(!e.on){ e.on=1; this.say(`Plan: ${e.title}. The matchup edge is on.`,'comp plan'); } }
    const P=this.probs(b,w,aggr,{phase:ph,odi:this.maxBalls>150,set:bs.b,field,pitch:this.pitch,freeHit:inn.freeHit,comp:batComp(this,inn,inn.striker)});
    if(inn.bowl===user) applyBowlPlan(P,inn,bat,field);
    let out=choose(P);
    const wasFree=inn.freeHit; inn.freeHit=false;
    if(noBall){ inn.runs++; inn.extras++; bw.r++; bw.nb++; inn.overRuns++; this.say(this.md?`No-ball from ${bowl.name}, an extra run.`:this.tr('nb',vars),'extra',{ball:true,o:this.ballLbl(inn,false),ev:'nb'}); inn.overSeq.push('nb'); inn.freeHit=!this.md; if(out==='wkt') out='dot'; }
    else { inn.balls++; bw.balls++; bs.b++; }
    if(noBall) bs.b++;
    let runs=0, ev=out;
    if(out==='wkt'){
      // catches can be dropped
      const how=this.wicketType(bowl);
      const fielder=this.fielderFor(inn,how);
      if(how==='caught' && R()<0.07*(100-this.P(fielder).field)/40*dropFactor(cf)){
        this.say(this.tr('drop',{...vars,fielder:this.P(fielder).name}),'drop',{ball:true,o:this.ballLbl(inn)});
        out='dot'; ev='drop'; this.compose(inn,'drop'); this.muBall(bat,bowl,0,false);
      } else {
        // DRS for lbw / caught behind
        let finalOut=true;
        if((how==='lbw'||how==='behind') ){
          const wrong=R()<0.12; // umpire error: actually not out
          let rev=false;
          if(inn.reviews>0){
            const hint = wrong? (R()<0.7?'doubt':'plumb') : (R()<0.75?'plumb':'doubt');
            if(this.hooks.review && inn.bat===user) rev=await this.hooks.review(inn,this,{how,hint,bat:bat.name,side:'bat'});
            else rev = hint==='doubt'? R()<0.75 : R()<0.12;
          }
          if(rev){
            this.say(this.tr('review',{side:T[inn.bat].name}),'drs');
            if(wrong){ finalOut=false; this.say(this.tr('overturned',{txt: how==='lbw'?'Ball tracking shows it missing the stumps. NOT OUT.':'No edge on UltraEdge. NOT OUT.'}),'drs'); }
            else { inn.reviews--; this.say(this.tr('upheld',{side:T[inn.bat].name}),'drs'); }
          }
        }
        if(finalOut){
          ev='wkt'; this.muBall(bat,bowl,0,true); this.compose(inn,'wkt'); this.dismiss(inn,inn.striker,how,fielder,vars);
          if(this.hooks.afterBall) await this.hooks.afterBall(inn,this,{ev:'wkt',how});
          return;
        } else { out='dot'; ev='dot'; }
      }
    } else if(out==='dot' && !noBall && R()<0.03 && inn.reviews>=0){
      // turned-down appeal: bowling side may review
      const wasOut=R()<0.3; const hint=wasOut?(R()<0.7?'plumb':'doubt'):(R()<0.7?'doubt':'plumb');
      const bt=inn.bowl; const rv2=this.bowlRev||(this.bowlRev={});
      if(rv2[inn.bat]==null) rv2[inn.bat]=2;
      if(rv2[inn.bat]>0){
        let rev=false;
        if(this.hooks.review && bt===user) rev=await this.hooks.review(inn,this,{how:'lbw',hint,bat:bat.name,side:'bowl'});
        else rev= hint==='plumb'? R()<0.7: R()<0.08;
        if(rev){
          this.say(this.tr('review',{side:T[bt].name})+` (LBW appeal against ${bat.name})`,'drs');
          if(wasOut){ this.say(this.tr('overturned',{txt:'Hitting the stumps. OUT!'}),'drs'); this.muBall(bat,bowl,0,true); this.compose(inn,'wkt'); this.dismiss(inn,inn.striker,'lbw',null,vars); if(this.hooks.afterBall) await this.hooks.afterBall(inn,this,{ev:'wkt',how:'lbw'}); return; }
          rv2[inn.bat]--; this.say(this.tr('upheld',{side:T[bt].name}),'drs');
        }
      }
    }
    if(out==='one') runs=1; else if(out==='two') runs=2; else if(out==='three') runs=3; else if(out==='four') runs=4; else if(out==='six') runs=6;
    // run-out chance on twos/singles
    if((out==='two'||out==='one') && R()<0.012){
      const victim=R()<0.5?inn.striker:inn.non;
      if(out==='two'){ runs=1; } else runs=0;
      inn.runs+=runs; bs.r+=runs; bw.r+=runs; inn.overRuns+=runs; inn.partnership+=runs;
      const fielder=pick(this.lineups[inn.bowl].xi);
      this.dismiss(inn,victim,'runout',fielder,{bat:this.P(victim).name,bowler:bowl.name},true);
      if(this.hooks.afterBall) await this.hooks.afterBall(inn,this,{ev:'wkt',how:'runout'});
      return;
    }
    inn.runs+=runs; bs.r+=runs; bw.r+=runs; inn.overRuns+=runs; inn.partnership+=runs;
    if(runs===0 && !noBall) bw.dots++;
    if(!noBall) this.muBall(bat,bowl,runs,false);
    if(runs===4){bs.f++; inn.fours++;} if(runs===6){bs.s++; inn.sixes++;}
    const key = out==='drop'?null: ({dot:'dot',one:'one',two:'two',three:'three',four:'four',six:'six'})[out]||'dot';
    if(ev!=='drop'){
      const line=(wasFree?this.tr('freehit'):'')+this.tr(key,vars);
      this.say(line, runs===4?'four':runs===6?'six':'', {ball:true,o:noBall?this.ballLbl(inn,false):this.ballLbl(inn),ev:runs===0?'dot':String(runs)});
      if(runs>=4 && R()<0.35) this.crowd();
    }
    inn.overSeq.push(runs===0?'·':String(runs)); if(!noBall){bw.seq=bw.seq||[]; bw.seq.push('x');}
    const prev=bs.r-runs;
    if(prev<50&&bs.r>=50&&bs.r<100) this.say(this.tr('milestone50',{bat:bat.name,r:bs.r,b:bs.b}),'mile');
    if(prev<100&&bs.r>=100) this.say(this.tr('milestone100',{bat:bat.name,r:bs.r,b:bs.b}),'mile');
    if(ev!=='drop') this.compose(inn,noBall?'nb':runs===0?'dot':String(runs),{bat:bat.id});
    if(runs%2===1) [inn.striker,inn.non]=[inn.non,inn.striker];
    // injuries
    if(R()<0.0009){ const p=this.P(inn.cur); if(bw.balls%6!==0){ bw.injured=true; p.inj=this.G.injuryLength?this.G.injuryLength(inn.bowl,ri(1,3)):ri(1,3); this.say(`${p.name} pulls up holding his hamstring and leaves the field. He cannot bowl again today.`,'info inj'); inn.injSwap=true; } }
    if(this.hooks.afterBall) await this.hooks.afterBall(inn,this,{ev:String(runs)});
    if(inn.injSwap && inn.balls%6!==0){ inn.injSwap=false; const nb=this.aiBowler(inn,6-inn.balls%6); inn.cur=nb; if(!inn.bw[nb]) inn.bw[nb]={balls:0,r:0,w:0,dots:0,wd:0,nb:0}; this.say(`${this.P(nb).name} will finish the over.`,'info'); }
  }
  // body language from the team talk (opt.body), once per player: openers and the fielding side at
  // the start of an innings, later batters when they walk out
  body(ids){ const B=this.opt&&this.opt.body; if(!B) return; const cz=czInit(this); for(const id of ids){ if(id&&B[id]&&!cz.said['body'+id]){ cz.said['body'+id]=1; this.say(B[id],'comp body',{who:id}); } } }
  walkOut(inn){ const u=this.G.user; if(inn.bat===u) this.body([inn.striker,inn.non]); else if(inn.bowl===u) this.body(this.lineups[u].xi.filter(id=>!(this.inns[0]&&this.inns[0]!==inn&&this.inns[0].bs[id]&&(this.inns[0].bs[id].batted||this.inns[0].bs[id].in)))); }
  // composure after a ball, with a commentary line when someone crosses a threshold
  compose(inn,ev,info){ for(const l of czBall(this,inn,ev,info)) this.say(l.t,'comp',{who:l.who,v:l.v}); }
  // matchups: batter hand and player pair against this bowler, for the real league only
  muBall(bat,bowl,runs,out){ if(this.G.recMu) this.G.recMu(bat,bowl,runs,out); }
  ovStr(inn){ return Math.floor(inn.balls/6)+'.'+(inn.balls%6); }
  ballLbl(inn,legal){ const b=inn.balls; if(legal===false) return Math.floor(b/6)+'.'+(b%6+1); return b>0&&b%6===0? (b/6-1)+'.6' : Math.floor(b/6)+'.'+(b%6); }
  wicketType(b){ const r=R(); if(isSpin(b.type)) return r<.18?'bowled':r<.36?'lbw':r<.44?'stumped':r<.52?'behind':'caught'; return r<.22?'bowled':r<.36?'lbw':r<.46?'behind':'caught'; }
  fielderFor(inn,how){ const lu=this.lineups[inn.bowl]; if(how==='behind'||how==='stumped') return lu.keeper; if(how==='bowled'||how==='lbw') return null; const opts=lu.xi.filter(x=>x!==inn.cur); return pick(opts); }
  dismiss(inn,victim,how,fielder,vars,runout){
    const bs=inn.bs[victim], bw=inn.bw[inn.cur];
    bs.out=true; bs.in=false;
    const fname=fielder?this.P(fielder).name:'';
    const bname=this.P(inn.cur).name;
    bs.how = how==='bowled'?`b ${bname}`: how==='lbw'?`lbw b ${bname}`: how==='caught'?(fielder===inn.cur?`c & b ${bname}`:`c ${fname} b ${bname}`): how==='behind'?`c †${fname} b ${bname}`: how==='stumped'?`st †${fname} b ${bname}`:`run out (${fname})`;
    if(!runout){ bw.w++; inn.lastWktBowler.push(inn.cur); } else inn.lastWktBowler=[];
    if(fielder){ this.catches=this.catches||{}; this.catches[fielder]=(this.catches[fielder]||0)+1; }
    inn.wkts++; inn.fow.push(`${inn.runs}-${inn.wkts} (${this.P(victim).name}, ${this.ballLbl(inn)})`); inn.partnership=0;
    const key= how==='behind'?'behind':how;
    this.say(this.tr(key,{...vars,bat:this.P(victim).name,fielder:fname})+`  ${this.P(victim).name} ${bs.r} (${bs.b})`,'wkt',{ball:true,o:this.ballLbl(inn),ev:'W'});
    inn.overSeq.push('W');
    bw.seq=bw.seq||[]; bw.seq.push(runout?'x':'W');
    if(!runout){
      if(bw.w===5) this.say(this.tr('fivefor',{bowler:bname}),'mile');
      const q=bw.seq; if(q.length>=3 && q.slice(-3).every(x=>x==='W')){ this.say(this.tr('hattrick',{bowler:bname}),'mile'); this.hattricks=(this.hattricks||[]); this.hattricks.push(inn.cur); }
    }
    if(this.lang!=='en' && R()<0.5) this.crowd();
    if(inn.wkts<10){
      let nxt=null;
      const remaining=inn.order.filter(id=>!inn.bs[id].out && !inn.bs[id].in && !inn.bs[id].batted);
      nxt = (this.hooks.pickNext && inn.bat===this.G.user)? this.hooks.pickNext(inn,this,remaining): null;
      if(!nxt||!remaining.includes(nxt)) nxt=remaining[0];
      if(nxt){ inn.bs[nxt].in=true; inn.bs[nxt].batted=true; this.say(this.tr('newbat',{bat:this.P(nxt).name}),'info'); this.body([nxt]);
        if(victim===inn.striker) inn.striker=nxt; else inn.non=nxt; }
    }
  }
  finish(){
    const [i1,i2]=this.inns; const T=this.G.teams;
    let winner=null, margin='', method='';
    if(i2.rainStop){
      if(i2.balls<30){ this.result={nr:true,text:'No result. Rain washed out the chase before 5 overs.'}; this.say(this.result.text,'result'); return; }
      const used2=100-dlsRes(this.maxBalls-i2.balls,i2.wkts); const res1=100*dlsG(this.maxBalls,0)/dlsG(120,0);
      const par=Math.floor(i1.runs*used2/res1);
      method=' (DLS)';
      this.say(`DLS par score at this point: ${par}. ${T[i2.bat].name} are on ${i2.runs}.`,'info rain');
      if(i2.runs>par){ winner=i2.bat; margin=`${i2.runs-par} run${i2.runs-par===1?'':'s'} (DLS)`; }
      else if(i2.runs<par){ winner=i1.bat; margin=`${par-i2.runs} run${par-i2.runs===1?'':'s'} (DLS)`; }
      else { this.result={tie:true,text:'Match tied on DLS.'}; }
    } else if(i2.runs>=i2.target){ winner=i2.bat; margin=`${10-i2.wkts} wicket${10-i2.wkts===1?'':'s'} (${this.maxBalls-i2.balls} balls left)`; }
    else if(i2.runs===i2.target-1){ // tie -> super over
      this.say('SCORES LEVEL! We are going to a SUPER OVER!','head');
      winner=this.superOver(i2.bat,i1.bat); margin='Super Over';
    } else { winner=i1.bat; const d=i1.runs-i2.runs; margin=`${d} run${d===1?'':'s'}`; }
    if(!this.result){
      const loser= winner===this.home?this.away:this.home;
      this.result={winner,loser,text:`${T[winner].name} won by ${margin}`};
    }
    this.result.mom=this.pickMoM();
    this.say(this.result.text+'.','result');
    if(this.result.mom) this.say(`Player of the match: ${this.P(this.result.mom).name}`,'info');
  }
  superOver(first,second){
    const T=this.G.teams;
    for(let round=0;round<4;round++){
      const sc={};
      for(const side of [first,second]){
        const lu=this.lineups[side]; const other=side===first?second:first;
        const bats=lu.xi.slice().sort((x,y)=>this.P(y).bat-this.P(x).bat).slice(0,3);
        const blu=this.lineups[other]; const bowler=blu.xi.slice().sort((x,y)=>this.P(y).bowl-this.P(x).bowl)[0];
        let runs=0,w=0,bi=0,str=bats[0],idx=2,non=bats[1];
        for(let ball=0;ball<6&&w<2;ball++){
          if(side===second && sc[first]!=null && runs>sc[first]) break;
          const P=ballProbs(this.P(str).bat,this.P(bowler).bowl,2,{phase:'death',set:10,field:'death',pitch:1});
          const o=choose(P);
          if(o==='wkt'){ w++; this.say(`Super over: ${this.P(str).name} is out!`,'wkt'); str=bats[idx++]||str; }
          else { const r={dot:0,one:1,two:2,three:3,four:4,six:6}[o]; runs+=r; this.say(`Super over: ${this.P(str).name} ${r===0?'no run':r===4?'FOUR':r===6?'SIX':r+' run'+(r>1?'s':'')}.`, r>=4?(r===6?'six':'four'):''); if(r%2) [str,non]=[non,str]; }
        }
        sc[side]=runs; this.say(`${T[side].name} make ${runs}/${w} in the super over.`,'over');
      }
      if(sc[first]!==sc[second]) return sc[first]>sc[second]?first:second;
      this.say('Super over tied too! Another one!','head');
    }
    return R()<0.5?first:second;
  }
  pickMoM(){
    let best=null,bs=-1;
    for(const inn of this.inns){
      for(const id in inn.bs){ const s=inn.bs[id]; let v=s.r+(s.r>=50?10:0)+ (s.b>0? (s.r/s.b-1.2)*8:0); const t=v+(this.result&&this.result.winner===inn.bat?8:0); if(t>bs){bs=t;best=id;} }
      for(const id in inn.bw){ const s=inn.bw[id]; const eco=s.balls?s.r/(s.balls/6):10; let v=s.w*22+(8-eco)*3; v+= (this.result&&this.result.winner===inn.bowl?8:0); const bat=this.inns.find(x=>x.bat===inn.bowl); if(bat&&bat.bs[id]) v+=bat.bs[id].r; if(v>bs){bs=v;best=id;} }
    }
    return best;
  }
  // Win probability for the side batting now, from score, wickets, balls left, target and venue
  // par, with a small edge for the stronger XI that fades as the match goes on.
  // o overrides the state: {runs, wkts, balls} relative changes, for key-moment previews.
  winState(i,o){ o=o||{}; const par=venuePar(this.G.s,this.G.year);
    if(this.edge==null){ const G=this.G; let e=0; if(G.teamStrength&&G.winChance&&this.lineups[this.home]){ try{ const a=G.teamStrength(this.lineups[this.home].xi,this.lineups[this.home].order), b=G.teamStrength(this.lineups[this.away].xi,this.lineups[this.away].order); const pw=G.winChance(a,b); e=Math.log(pw/(1-pw)); }catch(err){ e=0; } } this.edge=Math.round(e*1000)/1000; }
    const e=i.bat===this.home?this.edge:-this.edge;
    return {runs:i.runs+(o.runs||0),wkts:Math.min(10,i.wkts+(o.wkts||0)),balls:Math.min(this.maxBalls,i.balls+(o.balls||0)),maxBalls:this.maxBalls,target:i.target,par,edge:e*0.6}; }
  winProb(o){ const i=this.inns[this.inns.length-1]; if(!i) return {bat:this.home,p:0.5,proj:venuePar(this.G.s,this.G.year)};
    const st=this.winState(i,o); return {bat:i.bat,p:winProbability(st),proj:i.target?null:projectedTotal(st),par:st.par}; }
}
// ===== Multi-day cricket: Tests and first-class =====
// Up to four innings with no over limit, inside a time limit: overs a day (fastfc.js FC), three sessions
// a day with lunch and tea, stumps, and overs lost to the weather. The red ball scores at about 3.3 an
// over; a new ball is due every 80 overs; the pitch wears, so spin grows from day 3; bowlers tire with the
// length of a spell and the overs bowled that day rather than a quota. Declarations, the follow-on, draws,
// ties, and wins by an innings, by runs or by wickets. Three reviews an innings.
// m.md: { fmt, days, perDay, follow, day, sess (0 morning, 1 afternoon, 2 evening), d0 (match balls when
//         the day began), ib (balls of play lost to innings breaks), lost [overs lost each day], over (time
//         is up), autoDec (the user's captain declares), fo (follow-on enforced), plan {id: spell length}, res }
const RED={dot:.70,one:.163,two:.044,three:.008,four:.071,six:.0035,wkt:.0072};
function redProbs(b,w,aggr,ctx){
  const d=(b-w)/100; const P={...RED};
  P.four*=Math.max(.2,1+1.6*d); P.six*=Math.max(.1,1+2*d); P.wkt*=d<0?Math.exp(-1.9*d):Math.max(.3,1-2.2*d); // a tail-ender does not last long P.dot*=Math.max(.5,1-.45*d); P.one*=1+.25*d; P.two*=1+.2*d;
  if(aggr>=0){ const a=aggr; P.four*=1+.45*a; P.six*=1+1.3*a; P.one*=1+.28*a; P.two*=1+.2*a; P.wkt*=1+.38*a; P.dot*=1-.1*a; }
  else { const a=-aggr; P.four*=1-.5*a; P.six*=1-.8*a; P.one*=1-.3*a; P.two*=1-.3*a; P.wkt*=1-.42*a; P.dot*=1+.08*a; }
  if(ctx.set<10){P.wkt*=1.3; P.four*=.85;} else if(ctx.set<25) P.wkt*=1.1; else if(ctx.set>90){P.wkt*=.82; P.four*=1.1;}
  const f=ctx.field;
  if(f==='attack'){P.wkt*=1.14; P.four*=1.15; P.one*=.9;}
  else if(f==='defend'){P.four*=.78; P.six*=.8; P.wkt*=.86; P.one*=1.12;}
  P.four*=ctx.pitch; P.six*=ctx.pitch; P.wkt/=Math.sqrt(ctx.pitch);
  // composure counts for less over a long innings than in a T20 chase
  if(ctx.comp!=null){ const k=1+(falseShot(ctx.comp)-1)*0.5; P.wkt*=k; if(k>1) P.dot*=1+(k-1)/4; else if(ctx.comp>75) P.four*=1.04; }
  const s=Object.values(P).reduce((x,y)=>x+y,0); for(const k in P)P[k]/=s;
  return P;
}
const fmOf=p=>(p&&p.fm&&p.fm.fc)||0;
const nth=n=>['first','second','third','fourth'][n-1]||`${n}th`;
// A bowler's natural spell (overs) before he tires, and the tiredness (in skill points) after sp overs of
// this spell and dov overs today.
const spellLim=p=>isSpin(p.type)?11:6;
function fatigueAt(p,sp,dov){ const sl=spellLim(p), dl=isSpin(p.type)?30:18; return Math.max(0,sp-sl)*(isSpin(p.type)?0.7:1.6)+Math.max(0,dov-dl)*0.4; }
const fatigueLabel=f=>f<1?'Fresh':f<4?'Tiring':'Tired';
const SESSIONS=['Morning','Afternoon','Evening'];

class MultiDay extends Match{
  constructor(G,home,away,opt){
    super(G,home,away,{...opt,noRain:true,night:false,dew:false});
    const F=FC[opt.fmt]; this.overs=F.days*F.perDay; this.maxBalls=this.overs*6;
    // time lost to the weather, exactly as in the fast sim (fastfc.js weatherLoss)
    const share=opt.weather!=null?opt.weather:weatherLoss(opt.fmt,R);
    const lost=Array(F.days).fill(0); let ov=Math.round(F.days*F.perDay*share);
    for(let g=0;ov>0&&g<200;g++){ const d=ri(0,F.days-1); const c=Math.min(ov,F.perDay-lost[d],ri(6,F.perDay)); if(c>0){ lost[d]+=c; ov-=c; } }
    this.md={fmt:opt.fmt,days:F.days,perDay:F.perDay,follow:F.follow,day:1,sess:0,d0:0,ib:0,lost,over:false,autoDec:true,fo:false,plan:{},res:null};
  }
  phaseAt(){ return 'red'; }
  probs(b,w,aggr,ctx){ return redProbs(b,w,aggr,ctx); }
  // ---- the clock ----
  totBalls(){ return this.inns.reduce((a,i)=>a+i.balls,0); }
  dayCap(d=this.md.day){ return Math.max(0,(this.md.perDay-(this.md.lost[d-1]||0))*6); }
  dayB(){ return this.totBalls()+this.md.ib-this.md.d0; }
  sessEnd(k){ return Math.round(this.dayCap()*(k+1)/18)*6; }
  // legal balls left in the match
  leftBalls(){ const M=this.md; if(M.over) return 0; let L=Math.max(0,this.dayCap()-this.dayB()); for(let d=M.day+1;d<=M.days;d++) L+=this.dayCap(d); return L; }
  sessionName(){ return SESSIONS[this.md.sess]; }
  nextBreak(){ const M=this.md; return M.sess===0?'lunch':M.sess===1?'tea':M.day>=M.days?'end':'stumps'; }
  wear(){ const M=this.md; return M.days>1?(M.day-1)/(M.days-1):0; }
  ballAge(inn){ return (inn.balls-(inn.nbAt||0))/6; }
  total(t){ return this.inns.filter(i=>i.bat===t).reduce((a,i)=>a+i.runs,0); }
  leadOf(inn){ return this.total(inn.bat)-this.total(inn.bowl); }
  sessKey(){ return this.md.day*3+this.md.sess; }
  // ---- conditions: the worn pitch, the age of the ball, tiredness ----
  bowlCond(inn,p){ const wr=this.wear(), age=this.ballAge(inn);
    if(isSpin(p.type)) return -2+7*wr+(age<15?-2:age>45?1.5:0);
    return 1-2*wr+(age<12?5*(1-age/12):age>60?1:0); }
  spellNext(s,ov){ if(!s||s.lo==null||s.sk!==this.sessKey()) return 1; const gap=ov-s.lo; if(gap===2) return (s.sp||0)+1; if(gap<8) return Math.max(0,Math.round((s.sp||0)*(1-gap/8)))+1; return 1; }
  fatigue(inn,id){ const s=inn.bw[id], p=this.P(id); if(!s||!p) return 0; return fatigueAt(p,s.sp||0,s.dd===this.md.day?s.dov||0:0); }
  fatigueLabel(inn,id){ return fatigueLabel(this.fatigue(inn,id)); }
  strengths(inn,bat,bowl,ph){
    const r=super.strengths(inn,bat,bowl,ph);
    if(isPace(bowl.type)) r.w-=3; // no powerplay or death overs
    r.b+=fmOf(bat)-3*this.wear()-(inn.target?4:0); // the fourth innings on a worn pitch, as in the fast sim r.w+=fmOf(bowl)+this.bowlCond(inn,bowl)-this.fatigue(inn,bowl.id);
    return r;
  }
  // ---- the captains ----
  bowlerOptions(inn){ const lu=this.lineups[inn.bowl]; return lu.xi.filter(id=>{const s=inn.bw[id]; return id!==inn.last && !(s&&s.injured);}); }
  // The best fresh bowler for the conditions; a bowler on a spell stays on until he tires (or reaches the
  // spell length in the user's plan: 0 keeps him out of the attack).
  aiBowler(inn){
    const opts=this.bowlerOptions(inn); const ov=Math.floor(inn.balls/6); const M=this.md;
    const plan=inn.bowl===this.G.user?(M.plan||{}):{};
    const cap=opts.filter(id=>this.P(id).bowl>=40); const pool=cap.length>=3?cap:opts;
    let best=null,bs=-1e9;
    for(const id of pool){ const p=this.P(id), s=inn.bw[id]; const sp=this.spellNext(s,ov); const dov=(s&&s.dd===M.day?s.dov||0:0)+1;
      const lim=plan[id]!=null?plan[id]:spellLim(p);
      let sc=p.bowl+fmOf(p)+(p.form||0)*0.8+this.bowlCond(inn,p)*1.5-fatigueAt(p,sp,dov)*2.5;
      if(lim===0) sc-=60; else if(sp>lim) sc-=10*(sp-lim);
      if(sp>1) sc+=4; if(p.bowl<50) sc-=6;
      sc+=rf(-2,2); if(sc>bs){bs=sc;best=id;} }
    return best||opts[0]||this.lineups[inn.bowl].xi[0];
  }
  assign(inn,bid){ const M=this.md; inn.cur=bid; if(!inn.bw[bid]) inn.bw[bid]={balls:0,r:0,w:0,dots:0,wd:0,nb:0};
    const s=inn.bw[bid]; const ov=Math.floor(inn.balls/6); s.sp=this.spellNext(s,ov); s.lo=ov; s.sk=this.sessKey();
    if(s.dd!==M.day){ s.dd=M.day; s.dov=0; } s.dov++; }
  // batting: steady by default; pushing on before a declaration; the chase on the last day by the rate
  // it needs; blocking when only a draw is left
  aggrFor(inn){ if(inn.bat===this.G.user && inn.aggr!=='auto') return +inn.aggr; const t=this.G.teams&&this.G.teams[inn.bat]; return clamp(this.autoAggr(inn)+((t&&t.aggrBias)||0)*0.5,-1,2); }
  autoAggr(inn){
    const L=this.leftBalls(), n=this.inns.indexOf(inn)+1;
    if(inn.target){ const need=inn.target-inn.runs; if(need<=0) return 0; const rrr=need/Math.max(1,L/6), k=10-inn.wkts;
      if(rrr>4.6||(k<=4&&rrr>3)) return -1; if(rrr<2.6) return 0; if(rrr<3.4) return 0.3; return k>=7?0.6:-1; }
    const dw=(inn.bat!==this.G.user||this.md.autoDec)?this.declareWant(inn):null; if(dw!=null && dw-inn.runs<120 && n>1) return 1;
    if(this.leadOf(inn)<0 && L<=this.md.perDay*6 && n>=3) return -1;
    return 0;
  }
  fieldFor(inn){ if(inn.bowl===this.G.user && inn.field!=='auto') return inn.field;
    const s=inn.bs[inn.striker]; const a=this.aggrFor(inn);
    if(inn.target){ const need=inn.target-inn.runs; return need/Math.max(1,this.leftBalls()/6)>3.8&&a>0?'defend':'attack'; }
    if(this.ballAge(inn)<15||(s&&s.b<12)||a<0) return 'attack';
    return a>=1?'defend':'balanced'; }
  // The runs at which the batting side declares this innings (null: it bats on).
  declareWant(inn){
    const n=this.inns.indexOf(inn)+1; if(n>=4) return null; const M=this.md; const L=this.leftBalls();
    const k=clamp(M.days*M.perDay/450,0.45,1); const prev=this.total(inn.bat)-inn.runs, opp=this.total(inn.bowl); const dw=inn.dw!=null?inn.dw:0.5;
    if(n===1){ const want=(520+120*dw)*k; return Math.round(L<this.maxBalls*0.62?Math.min(want,330*k):want); }
    if(n===2) return Math.round(opp+(180+120*dw)*k);
    if(M.fo&&opp>prev+inn.runs+60) return null; // following on: bat for the draw first
    return Math.round(opp-prev+clamp(L/6*3.3,180*k,450)); // a target at about 3.3 an over: a fair chase, or a draw
  }
  aiDeclares(inn){ const want=this.declareWant(inn); return want!=null && inn.wkts<9 && inn.runs>=want; }
  // The follow-on: enforced when there is time to bowl twice (AI captains sometimes bat again anyway).
  followRec(){ return this.leftBalls()>this.maxBalls*0.33; }
  // ---- the match ----
  dayStart(){ const M=this.md; const lost=M.lost[M.day-1]||0;
    let t=`Day ${M.day} of ${M.days}.`;
    if(lost>=M.perDay) t+=' Rain: no play is possible today.'; else if(lost>0) t+=` Rain and bad light: ${lost} overs lost today.`;
    if(M.days>=4&&M.day===3) t+=' The pitch is starting to wear and the spinners will enjoy it.'; else if(M.day>=3&&M.day===M.days) t+=' The last day: there is rough outside off stump and the ball is turning.';
    this.say(t,'brk',{brk:'day',day:M.day}); }
  stateLine(){ const i=this.inns[this.inns.length-1]; if(!i) return ''; const T=this.G.teams; const l=this.leadOf(i);
    return `${T[i.bat].name} ${i.runs}/${i.wkts}${i.target?`, needing ${i.target-i.runs} more`:this.inns.length>1?`, ${l>0?`${l} ahead`:l<0?`${-l} behind`:'level'}`:''}`; }
  // Breaks at the start of an over: lunch, tea, stumps (and the end of the match). True when time is up.
  async clock(){
    const M=this.md;
    for(let g=0;g<20;g++){
      const cap=this.dayCap(), b=this.dayB();
      if(b>=cap){
        if(M.day>=M.days){ M.over=true; return true; }
        this.say(`Stumps on day ${M.day}: ${this.stateLine()}.`,'brk',{brk:'stumps',day:M.day});
        M.day++; M.sess=0; M.d0=this.totBalls()+M.ib; this.dayStart();
        if(this.hooks.brk) await this.hooks.brk('stumps',this);
        continue;
      }
      if(M.sess<2 && b>=this.sessEnd(M.sess)){ const k=M.sess; M.sess++;
        if(this.sessEnd(k)<=0) continue; // a short, rain-hit day plays straight through
        this.say(`${k?'Tea':'Lunch'} on day ${M.day}: ${this.stateLine()}.`,'brk',{brk:k?'tea':'lunch',day:M.day});
        if(this.hooks.brk) await this.hooks.brk(k?'tea':'lunch',this);
        continue; }
      return false;
    }
    return false;
  }
  newBall(inn){
    if(this.ballAge(inn)<80) return; const u=inn.bowl===this.G.user;
    let take;
    if(u) take=inn.nbReq||inn.nbPol!=='hold';
    else { const lu=this.lineups[inn.bowl]; const best=t=>Math.max(0,...lu.xi.map(id=>this.P(id)).filter(p=>t(p.type)).map(p=>p.bowl)); take=this.wear()<0.7||best(isPace)>=best(isSpin)||this.ballAge(inn)>=95; }
    if(!take) return;
    inn.nbReq=false; inn.nbAt=inn.balls; inn.nbN=(inn.nbN||0)+1;
    this.say(`${this.G.teams[inn.bowl].name} take the new ball after ${Math.floor(inn.balls/6)} overs.`,'info nb');
  }
  startInnings(bat,bowl,target){ const T=this.G.teams, M=this.md; const inn=this.newInnings(bat,bowl,target); const n=this.inns.length+1;
    inn.reviews=3; inn.nbAt=0; inn.dw=R(); inn.n=n; inn.nbPol='auto'; (this.bowlRev||(this.bowlRev={}))[bat]=3; this.inns.push(inn);
    const k=this.inns.filter(i=>i.bat===bat).length;
    this.say(`${T[bat].name}, ${nth(k)} innings${M.fo&&n===3?' (following on)':''}`,'head');
    if(target) this.say(`${T[bat].name} need ${target} to win, with about ${Math.floor(this.leftBalls()/6)} overs left in the match.`,'head');
    this.walkOut(inn); return inn; }
  closeInnings(inn){ if(inn.closed) return; inn.closed=true; const T=this.G.teams, M=this.md;
    if(inn.dec) this.say(`${T[inn.bat].name} declare at ${inn.runs}/${inn.wkts}${this.inns.length>1?`, ${this.leadOf(inn)>=0?`${this.leadOf(inn)} ahead`:`${-this.leadOf(inn)} behind`}`:''}.`,'head');
    else if(inn.wkts>=10) this.say(`${T[inn.bat].name} are all out for ${inn.runs}.`,'head');
    if(!M.over) M.ib+=12; }
  async run(hooks){
    this.hooks=hooks||{}; const G=this.G,h=this.home,a=this.away,T=G.teams;
    if(!this.toss){
      const tossWin=R()<0.5?h:a; let batFirst;
      if(this.hooks.toss&&tossWin===G.user) batFirst=(await this.hooks.toss(this))==='bat'?tossWin:(tossWin===h?a:h);
      else batFirst=R()<(this.pitch<0.97?0.55:0.8)?tossWin:(tossWin===h?a:h);
      this.toss={win:tossWin,dec:batFirst===tossWin?'bat':'field'};
      this.say(`${T[tossWin].name} won the toss and chose to ${this.toss.dec==='bat'?'bat':'bowl'} first.`,'info');
      this.dayStart();
    }
    for(let g=0;g<8;g++){
      if(!this.inns.length){ const bf=this.toss.dec==='bat'?this.toss.win:(this.toss.win===h?a:h); this.startInnings(bf,bf===h?a:h,null); }
      const inn=this.inns[this.inns.length-1];
      if(!inn.closed){ await this.playInnings(inn); this.closeInnings(inn); }
      if(this.decide()) break;
      await this.nextInnings();
    }
    this.result=null; this.finish(); return this.result;
  }
  async playInnings(inn){
    const M=this.md;
    await this.endOverIfNeeded(inn);
    while(inn.wkts<10 && !(inn.target&&inn.runs>=inn.target)){
      if(inn.decReq){ inn.dec=true; break; }
      if(inn.balls%6===0 && inn.overStart!==inn.balls){
        if(await this.clock()) break;
        if(inn.decReq){ inn.dec=true; break; }
        if((inn.bat!==this.G.user||M.autoDec) && this.aiDeclares(inn)){ inn.dec=true; break; }
        this.newBall(inn);
        inn.overStart=inn.balls; inn.overRuns=0; inn.overW=0; inn.overSeq=[];
        let bid=null;
        if(this.hooks.chooseBowler && inn.bowl===this.G.user) bid=await this.hooks.chooseBowler(inn,this);
        if(!bid || !this.bowlerOptions(inn).includes(bid)) bid=this.aiBowler(inn);
        this.assign(inn,bid);
        if(this.hooks.beforeOver) await this.hooks.beforeOver(inn,this);
      }
      await this.ball(inn);
      await this.endOverIfNeeded(inn);
    }
  }
  overNeed(inn){ const M=this.md; const today=`day ${M.day}, ${Math.floor(this.dayB()/6)} overs today`;
    if(inn.target) return `Need ${inn.target-inn.runs}, ${Math.floor(this.leftBalls()/6)} overs left · ${today}`;
    if(this.inns.length<2) return `Run rate ${(inn.runs/(inn.balls/6)).toFixed(2)} · ${today}`;
    const l=this.leadOf(inn); return `${l>0?`Lead by ${l}`:l<0?`Trail by ${-l}`:'Scores level'} · ${today}`; }
  // red-ball composure: dots are the normal state of things, so only a long run of them (six at a time) tells
  compose(inn,ev,info){
    if(ev==='dot'){ const cz=czInit(this); const rd=(cz.rd||(cz.rd={})); const id=inn.striker; rd[id]=(rd[id]||0)+1; if(rd[id]%6) ev='still'; }
    else if(ev!=='wd'&&ev!=='nb'&&ev!=='drop'){ const cz=czInit(this); if(cz.rd) cz.rd[(info&&info.bat)||inn.striker]=0; }
    super.compose(inn,ev,info); }
  // a Test commentary log stays at a size a save can carry
  // (the innings, day and session lines are kept; the oldest ball-by-ball lines go)
  say(txt,cls,extra){ const e=super.say(txt,cls,extra);
    if(this.log.length>900){ const keep=x=>x.c==='head'||x.c==='brk'||x.c==='result'; let cut=this.log.length-600; this.log=this.log.filter((x,k)=>k>=this.log.length-600||keep(x)||!(cut-->0)); }
    return e; }
  decide(){
    const n=this.inns.length, inn=this.inns[n-1], M=this.md;
    if(inn.target && inn.runs>=inn.target){ M.res={w:inn.bat,k:'wkts'}; return true; }
    if(n===4 && inn.wkts>=10){ M.res=inn.runs===inn.target-1?{tie:1}:{w:inn.bowl,k:'runs'}; return true; }
    if(n===3 && (inn.wkts>=10||inn.dec) && this.total(inn.bat)<this.total(inn.bowl)){ M.res={w:inn.bowl,k:'inns'}; return true; }
    if(M.over){ M.res={draw:1}; return true; }
    return false;
  }
  async nextInnings(){
    const n=this.inns.length, T=this.G.teams, M=this.md; const [i1,i2,i3]=this.inns;
    if(n===1){ this.startInnings(i1.bowl,i1.bat,null); return; }
    if(n===2){ const lead=i1.runs-i2.runs; let fo=false;
      if(lead>=M.follow){
        if(i1.bat===this.G.user&&this.hooks.followOn) fo=!!(await this.hooks.followOn(this,{lead,left:this.leftBalls(),rec:this.followRec()}));
        else fo=this.followRec()&&R()<0.8;
        this.say(fo?`${T[i1.bat].name} enforce the follow-on: ${T[i2.bat].name} are ${lead} behind.`:`${T[i1.bat].name} bat again, ${lead} ahead, rather than enforce the follow-on.`,'head');
      }
      M.fo=fo; if(fo) this.startInnings(i2.bat,i1.bat,null); else this.startInnings(i1.bat,i2.bat,null); return; }
    if(n===3){ this.startInnings(i3.bowl,i3.bat,this.total(i3.bat)-this.total(i3.bowl)+1); }
  }
  finish(){
    const r=this.md.res||{draw:1}; const T=this.G.teams; const last=this.inns[this.inns.length-1];
    if(r.draw) this.result={draw:true,winner:null,loser:null,margin:'',text:'Match drawn'};
    else if(r.tie) this.result={tie:true,winner:null,loser:null,margin:'',text:'Match tied'};
    else { const w=r.w, l=w===this.home?this.away:this.home; let margin;
      if(r.k==='wkts') margin=`${10-last.wkts} wicket${10-last.wkts===1?'':'s'}`;
      else if(r.k==='inns'){ const d=this.total(w)-this.total(l); margin=`an innings and ${d} run${d===1?'':'s'}`; }
      else { const d=last.target-1-last.runs; margin=`${d} run${d===1?'':'s'}`; }
      this.result={winner:w,loser:l,margin,text:`${T[w].name} won by ${margin}`}; }
    this.result.mom=this.pickMoM();
    this.say(this.result.text+'.','result');
    if(this.result.mom) this.say(`Player of the match: ${this.P(this.result.mom).name}`,'info');
  }
  // Win, draw and loss chances for the side batting now (see mdWin).
  winProb(){ const i=this.inns[this.inns.length-1]; if(!i) return {bat:this.home,p:0.4,d:0.2,l:0.4,proj:null};
    const key=`${this.totBalls()}|${this.inns.length}|${i.runs}|${i.wkts}|${this.md.over}`;
    if(!this._wp||this._wp.k!==key) this._wp={k:key,v:mdWin(this)};
    return this._wp.v; }
}
// Win, draw and loss for the side batting now, from 240 quick futures of the rest of the match: each
// innings goes wicket by wicket, with the balls to the next wicket and the runs a ball from the two sides'
// batting and bowling, the pitch, how worn it is and how long is left; a chase speeds up or shuts up shop
// by the rate it needs, and the captains declare and enforce the follow-on as the AI does. Seeded by the
// state, so the bar is steady between renders.
function mdTeams(m){ const out={};
  for(const t of [m.home,m.away]){ const lu=m.lineups[t]; const ps=lu.xi.map(id=>m.P(id)).filter(Boolean);
    const top=lu.order.slice(0,7).map(id=>m.P(id)).filter(Boolean);
    out[t]={bat:top.reduce((a,p)=>a+p.bat+fmOf(p),0)/Math.max(1,top.length),bowl:ps.map(p=>p.bowl+fmOf(p)).sort((x,y)=>y-x).slice(0,5).reduce((a,x)=>a+x,0)/5}; }
  return out; }
const POS=[1.2,1.15,1.1,1.05,1,.95,.8,.55,.4,.3];
function mdWin(m){
  const i=m.inns[m.inns.length-1]; const T=mdTeams(m);
  let seed=((m.totBalls()*7919+m.inns.length*104729+i.wkts*31+i.runs)%2147483646)+1; const rng=()=>{seed=seed*16807%2147483647; return (seed-1)/2147483646;};
  const N=240; let win=0,draw=0;
  for(let k=0;k<N;k++){ const r=mdFuture(m,T,rng); if(r===i.bat) win++; else if(r==null) draw++; }
  return {bat:i.bat,p:win/N,d:draw/N,l:(N-win-draw)/N,proj:null};
}
function mdFuture(m,T,rng){
  const M=m.md; let L=m.leftBalls(); const k=clamp(M.days*M.perDay/450,0.45,1);
  let n=m.inns.length; const cur=m.inns[n-1]; let bat=cur.bat, bowl=cur.bowl, runs=cur.runs, w=cur.wkts, target=cur.target, fo=M.fo, dw=cur.dw!=null?cur.dw:0.5;
  const tot={[m.home]:m.total(m.home),[m.away]:m.total(m.away)}; tot[bat]-=runs;
  const inR=m.inns.slice(0,n-1).map(x=>x.runs);
  for(let g=0;g<6;g++){
    // the edge is relative: batting ratings sit below bowling ratings, so equal sides are level
    const e=((T[bat].bat-T[bowl].bowl)-(T[bowl].bat-T[bat].bowl))/200;
    while(w<10){
      const wear=clamp((m.maxBalls-L)/m.maxBalls,0,1);
      let bpw=72*Math.exp(1.6*e)*POS[w]*(1-0.25*wear)*Math.sqrt(m.pitch), rpb=0.55*(1+0.8*e)*(w>=7?0.85:1)*m.pitch;
      if(target){ const rrr=(target-runs)/Math.max(1,L/6); if(rrr>4.6||(w>=6&&rrr>3)){ bpw*=1.5; rpb*=0.7; } else if(rrr>3.4){ bpw*=0.9; rpb*=1.12; } }
      const b=Math.max(1,Math.round(-Math.log(1-rng()*0.999)*bpw)); const r=b*rpb;
      if(b>=L){ return target&&runs+L*rpb>=target?bat:null; }
      if(target&&runs+r>=target) return bat;
      let want=null;
      if(n===1) want=L<m.maxBalls*0.62?Math.min((520+120*dw)*k,330*k):(520+120*dw)*k;
      else if(n===2) want=inR[0]+(180+120*dw)*k;
      else if(n===3&&!(fo&&tot[bowl]>tot[bat]+runs+60)) want=tot[bowl]-tot[bat]+clamp(L/6*3.3,180*k,450);
      if(want!=null&&w<9&&runs+r>=want){ L-=Math.max(0,Math.round((want-runs)/rpb)); runs=want; break; }
      L-=b; runs+=r; w++;
    }
    tot[bat]+=runs; inR.push(runs);
    if(n===4) return Math.round(runs)===target-1?null:bowl;
    if(n===3&&tot[bat]<tot[bowl]) return bowl;
    L-=12; if(L<=0) return null;
    if(n===1){ [bat,bowl]=[bowl,bat]; }
    else if(n===2){ const lead=inR[0]-inR[1]; if(lead>=M.follow&&L>m.maxBalls*0.33&&rng()<0.8) fo=true; else [bat,bowl]=[bowl,bat]; }
    else if(n===3){ target=tot[bat]-tot[bowl]+1; [bat,bowl]=[bowl,bat]; }
    n++; runs=0; w=0; dw=0.5;
  }
  return null;
}

export {batProfile,R,ri,rf,pick,clamp,shuffle,isSpin,isPace,TYPE_LABEL,fmtL,ovr,calcValue,mkPlayer,Match,MultiDay,dlsRes,cm,setPID,getPID,ballProbs,autoAggr,phaseOf,redProbs,spellLim,fatigueLabel};
