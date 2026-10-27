// ===== Utilities =====
const R=Math.random;
const ri=(a,b)=>a+Math.floor(R()*(b-a+1));
const rf=(a,b)=>a+R()*(b-a);
const pick=a=>a[Math.floor(R()*a.length)];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const SPIN=['OB','LB','SLA','LWS'];
const isSpin=t=>SPIN.includes(t);
const isPace=t=>!!t&&!isSpin(t);
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
// ===== DLS (simplified resource model) =====
function dlsG(u,w){ const f=Math.pow(Math.max(0,1-w/10),0.9); return f*(1-Math.exp(-u/(70*f+5))); }
function dlsRes(ballsLeft,wkts){ if(wkts>=10) return 0; return 100*dlsG(ballsLeft,wkts)/dlsG(120,0); }
// ===== Match engine =====
function phaseOf(ballIdx){ const o=Math.floor(ballIdx/6); return o<6?'pp':o>=15?'death':'mid'; }
function autoAggr(inn,maxBalls){
  const bl=maxBalls-inn.balls, o=Math.floor(inn.balls/6), wk=inn.wkts;
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
  if(ctx.freeHit){P.wkt=0; P.six*=1.4;}
  const s=Object.values(P).reduce((x,y)=>x+y,0); for(const k in P)P[k]/=s;
  return P;
}
function choose(P){ let r=R(),acc=0; for(const k in P){acc+=P[k]; if(r<acc) return k;} return 'dot'; }

class Match{
  static FIELDS=['home','away','opt','overs','maxBalls','night','pitch','dew','lang','log','result','inns','weather','lineups','toss','bowlRev','catches','hattricks'];
  constructor(G,home,away,opt){
    this.G=G; this.home=home; this.away=away; this.opt=opt||{};
    this.overs=opt.overs||20; this.maxBalls=this.overs*6;
    this.night = opt.night!=null? opt.night : R()<0.5;
    this.pitch = rf(0.9,1.1); this.dew = opt.dew!=null ? !!opt.dew : (this.night && R()<0.6);
    this.lang=opt.lang||'en'; this.log=[]; this.result=null; this.inns=[];
    this.weather=null;
    const rainRoll=R();
    if(!opt.noRain){ if(rainRoll<0.02) this.weather={type:'pre',overs:ri(8,17)}; else if(rainRoll<0.055) this.weather={type:'mid'}; }
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
    const opts=this.bowlerOptions(inn,need); const o=Math.floor(inn.balls/6); const ph=o<6?'pp':o>=15?'death':'mid';
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
  aggrFor(inn){ return (inn.bat===this.G.user && inn.aggr!=='auto')? +inn.aggr : autoAggr(inn,this.maxBalls); }
  fieldFor(inn,ph){ return (inn.bowl===this.G.user && inn.field!=='auto')? inn.field : (ph==='death'?'death': (inn.target && (inn.target-inn.runs)/(Math.max(1,this.maxBalls-inn.balls)/6)>10)?'defend':'balanced'); }
  strengths(inn,bat,bowl,ph){
    let b=bat.bat+bat.form*1.2-(100-bat.fit)*0.08+(isSpin(bowl.type)?bat.vsSpin:-bat.vsSpin)*0.5;
    let w=bowl.bowl+bowl.form*1.0-(100-bowl.fit)*0.06;
    if(isPace(bowl.type)&&ph!=='mid') w+=3; if(isSpin(bowl.type)&&ph==='mid') w+=3;
    if(isSpin(bowl.type)&&this.dew&&inn===this.inns[1]) w-=4;
    // bowling coach: +0.4 x level at the death
    if(ph==='death'&&this.G.staffLevel) w+=0.4*this.G.staffLevel(inn.bowl,'bowl');
    if(bat.bat<30) b-=8;
    return {b,w};
  }
  // Outcome probabilities of the next ball for the current striker, without bowling it.
  // o.aggr / o.field / o.bowler override what the innings would use. Uses no randomness.
  preview(inn,o={}){
    const bat=this.P(inn.striker), bowl=this.P(o.bowler||inn.cur); if(!bat||!bowl||!inn.bs[inn.striker]) return null;
    const ph=phaseOf(inn.balls); const {b,w}=this.strengths(inn,bat,bowl,ph);
    return ballProbs(b,w,o.aggr!=null?o.aggr:this.aggrFor(inn),{phase:ph,set:inn.bs[inn.striker].b,field:o.field||this.fieldFor(inn,ph),pitch:this.pitch,freeHit:inn.freeHit});
  }
  // ---- save / resume ----
  serialize(){ const o={}; for(const k of Match.FIELDS) if(this[k]!==undefined) o[k]=this[k]; return JSON.parse(JSON.stringify(o)); }
  static restore(G,data){ const m=Object.create(Match.prototype); Object.assign(m,JSON.parse(JSON.stringify(data))); m.G=G; m.hooks={}; m._ne=null; m._cur=null; return m; }
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
    if(!this.inns.length){ this.inns.push(this.newInnings(batFirst,bat2,null)); this.say(`${T[batFirst].name} innings`,'head'); }
    const i1=this.inns[0];
    await this.playInnings(i1);
    if(this.inns.length<2){
      const target=i1.runs+1;
      this.inns.push(this.newInnings(bat2,batFirst,target));
      if(this.weather&&this.weather.type==='mid') this.weather.at=ri(30,this.maxBalls-6);
      this.say(`${T[bat2].name} need ${target} to win from ${this.overs} overs.`,'head');
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
        { const b=inn.bw[bid]; (b.ph||(b.ph={pp:0,mid:0,death:0}))[phaseOf(inn.balls)]++; }
        if(this.hooks.beforeOver) await this.hooks.beforeOver(inn,this);
      }
      await this.ball(inn);
      await this.endOverIfNeeded(inn);
    }
  }
  async endOverIfNeeded(inn){
    const isSecond=!!inn.target;
    if(!(inn.balls%6===0 && inn.balls>0 && inn.overStart!=null && inn.balls!==inn.lastOverEnd && inn.overStart!==inn.balls)) return;
    if((isSecond&&inn.runs>=inn.target) || inn.wkts>=10) return;
    inn.lastOverEnd=inn.balls;
    // runs and overs per phase, for the scout report's weakest phase
    { const px=inn.phx||(inn.phx={pp:[0,0],mid:[0,0],death:[0,0]}); const ph0=phaseOf(inn.balls-1); px[ph0][0]+=inn.overRuns||0; px[ph0][1]++; }
    const s=inn.bw[inn.cur]; const fig=`${Math.floor(s.balls/6)}-${s.r}-${s.w}`;
    const bats=[inn.striker,inn.non].filter(id=>inn.bs[id]&&!inn.bs[id].out).map(id=>`${this.P(id).name.split(' ').slice(-1)[0]} ${inn.bs[id].r} (${inn.bs[id].b})`);
    const need=isSecond?`Need ${inn.target-inn.runs} from ${this.maxBalls-inn.balls}`:`Run rate ${(inn.runs/(inn.balls/6)).toFixed(2)}`;
    this.say(this.tr('over',{o:inn.balls/6,score:this.score(inn),bowler:this.P(inn.cur).name,fig}),'over',{ov:{n:inn.balls/6,runs:inn.overRuns,score:`${this.G.teams[inn.bat].name.split(' ')[0]} ${inn.runs}/${inn.wkts}`,bats,need,bowler:`${this.P(inn.cur).name} ${fig}`}});
    if(inn.balls===36) this.say(this.tr('pp',{score:this.score(inn)}),'over');
    inn.last=inn.cur; [inn.striker,inn.non]=[inn.non,inn.striker];
    if(this.hooks.overEnd) await this.hooks.overEnd(inn,this);
  }
  async ball(inn){
    const T=this.G.teams; const bat=this.P(inn.striker), bowl=this.P(inn.cur); const bs=inn.bs[inn.striker], bw=inn.bw[inn.cur];
    this._cur={bw:bowl.name,bt:bat.name};
    const ph=phaseOf(inn.balls);
    // extras
    const acc=bowl.bowl;
    const wideP=0.045-acc*0.00028, nbP=0.008-acc*0.00004;
    const ex=R();
    const user=this.G.user;
    const aggr=this.aggrFor(inn), field=this.fieldFor(inn,ph);
    const vars={bat:bat.name,bowler:bowl.name};
    if(ex<wideP){ inn.runs++; inn.extras++; bw.r++; bw.wd++; inn.overRuns++; inn.partnership++; this.say(this.tr('wide',vars),'extra',{ball:true,o:this.ballLbl(inn,false),ev:'wd'}); inn.overSeq.push('wd'); if(this.hooks.afterBall) await this.hooks.afterBall(inn,this,{ev:'wd'}); return; }
    let noBall=false; if(ex<wideP+nbP){ noBall=true; }
    const {b,w}=this.strengths(inn,bat,bowl,ph);
    const P=ballProbs(b,w,aggr,{phase:ph,set:bs.b,field,pitch:this.pitch,freeHit:inn.freeHit});
    let out=choose(P);
    const wasFree=inn.freeHit; inn.freeHit=false;
    if(noBall){ inn.runs++; inn.extras++; bw.r++; bw.nb++; inn.overRuns++; this.say(this.tr('nb',vars),'extra',{ball:true,o:this.ballLbl(inn,false),ev:'nb'}); inn.overSeq.push('nb'); inn.freeHit=true; if(out==='wkt') out='dot'; }
    else { inn.balls++; bw.balls++; bs.b++; }
    if(noBall) bs.b++;
    let runs=0, ev=out;
    if(out==='wkt'){
      // catches can be dropped
      const how=this.wicketType(bowl);
      const fielder=this.fielderFor(inn,how);
      if(how==='caught' && R()<0.07*(100-this.P(fielder).field)/40){
        this.say(this.tr('drop',{...vars,fielder:this.P(fielder).name}),'drop',{ball:true,o:this.ballLbl(inn)});
        out='dot'; ev='drop';
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
          ev='wkt'; this.dismiss(inn,inn.striker,how,fielder,vars);
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
          if(wasOut){ this.say(this.tr('overturned',{txt:'Hitting the stumps. OUT!'}),'drs'); this.dismiss(inn,inn.striker,'lbw',null,vars); if(this.hooks.afterBall) await this.hooks.afterBall(inn,this,{ev:'wkt',how:'lbw'}); return; }
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
    if(runs%2===1) [inn.striker,inn.non]=[inn.non,inn.striker];
    // injuries
    if(R()<0.0009){ const p=this.P(inn.cur); if(bw.balls%6!==0){ bw.injured=true; p.inj=this.G.injuryLength?this.G.injuryLength(inn.bowl,ri(1,3)):ri(1,3); this.say(`${p.name} pulls up holding his hamstring and leaves the field. He cannot bowl again today.`,'info inj'); inn.injSwap=true; } }
    if(this.hooks.afterBall) await this.hooks.afterBall(inn,this,{ev:String(runs)});
    if(inn.injSwap && inn.balls%6!==0){ inn.injSwap=false; const nb=this.aiBowler(inn,6-inn.balls%6); inn.cur=nb; if(!inn.bw[nb]) inn.bw[nb]={balls:0,r:0,w:0,dots:0,wd:0,nb:0}; this.say(`${this.P(nb).name} will finish the over.`,'info'); }
  }
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
      if(nxt){ inn.bs[nxt].in=true; inn.bs[nxt].batted=true; this.say(this.tr('newbat',{bat:this.P(nxt).name}),'info');
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
  winProb(){ // for team batting in current innings perspective -> returns prob that team batting second wins
    const i=this.inns[this.inns.length-1]; if(!i) return 0.5;
    if(!i.target){ const proj=i.runs+ (dlsRes(this.maxBalls-i.balls,i.wkts)/100)*165; return {bat:i.bat,proj:Math.round(proj)}; }
    const need=i.target-i.runs; const exp=(dlsRes(this.maxBalls-i.balls,i.wkts)/100)*165*1.02;
    const p=1/(1+Math.exp(-(exp-need)/14)); return {bat:i.bat,p:need<=0?1:(i.wkts>=10||i.balls>=this.maxBalls)?0:p};
  }
}
export {R,ri,rf,pick,clamp,shuffle,isSpin,isPace,TYPE_LABEL,fmtL,ovr,calcValue,mkPlayer,Match,dlsRes,cm,setPID,getPID,ballProbs,autoAggr,phaseOf};
