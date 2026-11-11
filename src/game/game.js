import {NE_TEAM,TEAMS,SQUADS,FREE_NEP,FREE_OS,HISTORY,FIX2026,PLAYOFF_DATES2026,NEP_NAMES,PROV_BIAS,OS_NAMES,COUNTRY_NAMES,PROVINCES,INTL_CALENDAR,INTL_OPPONENTS} from './data.js';
import {NEP_INTL,OS_INTL_STATUS,CONTRACTS_2026} from './intl-data.js';
import {FREE_OS_2,OS_INTL_STATUS_2} from './os-extra.js';
import {R,ri,rf,pick,clamp,shuffle,isSpin,isPace,TYPE_LABEL,fmtL,ovr,calcValue,mkPlayer,Match,setPID,getPID} from './engine.js';
import * as Depth from './depth.js';
import * as Matchday from './matchday.js';
import * as Club from './club.js';
import * as Office from './office.js';
import * as Living from './living.js';
import * as World from './world.js';
import * as Occasions from './occasions.js';
import * as WorldLink from './worldlink.js';
// Phase 2 modules; each may export migrate, afterMatch, seasonStart, seasonEnd, offseason, auctionSetup,
// and todayTasks (items for the Home "today" list).
const MODULES=[Depth,Matchday,Occasions,Club,Office,Living,World,WorldLink];
// ===== Game state & league logic =====
const SLABS={NEP:[12,9,6],OS:[30,22,15]};
const BOWL_PHASES={pp:6,mid:9,death:5}, PHASE_CAP={pp:3,mid:5,death:3};
// Squad needs by role for the shortlist and the auction room (a player can fill more than one).
const NEEDS=[['wk','Wicketkeepers','Keeper',2],['open','Openers','Opener',2],['pace','Pace bowlers','Pace',3],['spin','Spinners','Spin',2],['ar','All-rounders','All-rounder',2]];
function needRoles(p){ const r=[]; if(p.role==='WK') r.push('wk'); if((p.role==='BAT'||p.role==='WK')&&p.bat>=60) r.push('open');
  if(p.bowl>=55&&isPace(p.type)) r.push('pace'); if(p.bowl>=55&&isSpin(p.type)) r.push('spin'); if(p.role==='AR') r.push('ar'); return r; }
// Backroom staff: nine posts. Numeric level 1-4 (shown as grade D-A; older saves may hold a level-5 'A'),
// wage by level (support posts at half), 2-season contracts. staffLevel() stays numeric: 0 = vacant.
const STAFF_POSTS=[['assistant','Assistant manager'],['bat','Batting coach'],['bowl','Bowling coach'],['spin','Spin coach'],['field','Fielding coach'],['analyst','Analyst'],['physio','Physio'],['scout','Head scout'],['mental','Mental-skills coach']];
const STAFF_WAGE=[0,3,5,8,10,12];
const STAFF_CORE=new Set(['assistant','bat','bowl','physio']);
const staffWage=(post,level)=>STAFF_CORE.has(post)?STAFF_WAGE[level]:STAFF_WAGE[level]/2;
const gradeOf=(L)=>L>=4?'A':L===3?'B':L===2?'C':L>=1?'D':'';
const STAFF_SPEC={assistant:['Match reading','Man-management','Game plans','Selection calls'],bat:['Against spin','Young batters','Power hitting','Technique against pace'],bowl:['Seam','Workload','Death bowling','Yorkers and slower balls'],
  spin:['Leg-spin','Finger spin','Variations','Left-arm orthodox'],field:['Catching drills','Ground fielding','Throwing arms'],analyst:['Matchups','Opposition reports','Phase data'],physio:['Injury prevention','Rehab','Recovery'],
  scout:['Koshi and Madhesh','Bagmati and Gandaki','Lumbini and Karnali','Sudurpaschim','Overseas leagues'],mental:['Composure under pressure','Young players','Big games']};
const STAFF_NAT=['NEP','NEP','NEP','IND','ENG','AUS','SA','NZ','SL','PAK'];
// International layer: contract bonuses in Nepal selection, and the size of each grade (CAN 2026).
const GRADE_BONUS={'A+':6,A:4,B:3,C:2,D:1}; const GRADES=['A+','A','B','C','D']; const GRADE_SIZES=[['A+',3],['A',4],['B',5],['C',11],['D',15]];
// Difficulty: AI bidding, AI ratings in matches, and how low board confidence can fall before the sack.
const DIFFICULTY={easy:{label:'Easy',bid:0.85,rate:-2,sack:20},normal:{label:'Normal',bid:1,rate:0,sack:30},hard:{label:'Hard',bid:1.15,rate:2,sack:40}};
const roundL=(x)=>x<10?Math.round(x*2)/2:Math.round(x);
const OS_CAP=150, DOM_CAP=90, MAX_OS=8, MIN_OS=6, MAX_SQUAD=22, MIN_SQUAD=18;
// Lowest base price for each kind of player: the reserve kept back for every slot still to fill.
const MIN_BASE={NEP:2,OS:3};
const PERSONAS=['Big spender','Balanced','Bargain hunter','Youth builder','Loyalist','Balanced','Big spender','Bargain hunter'];
const MONTHS={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
// "Nov 3" -> epoch ms for that day; null for labels that are not dates ("Off-season").
function dayTime(d,y){ const m=/^([A-Z][a-z]{2}) (\d{1,2})$/.exec(d||''); return m&&m[1] in MONTHS? new Date(y,MONTHS[m[1]],+m[2]).getTime() : null; }
const hasPlayed=(p)=>Object.values(p.stats||{}).some(x=>x.m>0);
// The cautious choice for a decision; older saves carry no 'safe' field.
const CAUTIOUS=['Tell him to keep working','Decline, he needs rest','Back the players publicly','Rest him next match','Winning comes first'];
function cautiousIndex(n){ if(n.safe!=null&&n.choices[n.safe]) return n.safe; const k=n.choices.findIndex(c=>CAUTIOUS.includes(c.l)); if(k>=0) return k; const np=n.choices.findIndex(c=>!(c.fx&&c.fx.promise)); return np>=0?np:0; }
// What a choice does, as lines for the decision sheet and the stored outcome.
// tone: up (good), down (bad), warn (a condition you must meet), mut (neutral).
function effectLines(G,n,ci){
  const c=n.choices[ci], fx=c.fx||{}, out=[]; const sur=(id)=>G.P(id).name.split(' ').slice(-1)[0];
  const num=(v)=>(v>0?'+':'−')+Math.abs(v); const add=(v,text)=>out.push({sign:v>0?'+':'−',tone:v>0?'up':'down',text});
  if(fx.pid&&fx.morale) add(fx.morale,`${sur(fx.pid)} morale ${num(fx.morale)}`);
  if(fx.pid&&fx.fit) add(fx.fit,`${sur(fx.pid)} fitness ${num(fx.fit)}`);
  if(fx.pid&&fx.rest) out.push({sign:'·',tone:'mut',text:`${sur(fx.pid)} is rested for the next match`});
  if(fx.balance) add(fx.balance,`Club balance ${fx.balance>0?'+':'−'}Rs ${Math.abs(fx.balance)} L`);
  if(fx.team) add(fx.team,`Squad morale ${num(fx.team)}`);
  if(fx.cap) add(fx.cap,`Captain morale ${num(fx.cap)}`);
  if(fx.form) add(fx.form,`Senior players' form ${num(fx.form)}`);
  if(fx.fans) add(fx.fans,`Fan support ${num(fx.fans)}`);
  if(fx.board) add(fx.board,`Board confidence ${num(fx.board)}`);
  if(fx.promise==='start'){ const f=n.due!=null?G.s.fixtures.find(x=>x.n===n.due):G.userNext(); const opp=f?(f.home===G.user?f.away:f.home):null;
    out.push({sign:'!',tone:'warn',text:`He must start${opp?` v ${G.teams[opp].name.split(' ')[0]}`:' the next match'}, or morale −20 and board −4`}); }
  if(fx.promise==='debut') out.push({sign:'!',tone:'warn',text:`${sur(fx.pid)} must debut within 3 matches, or morale −20 and board −4`});
  if(!fx.promise&&n.choices.some(x=>x.fx&&x.fx.promise&&x.fx.promise!==true)) out.push({sign:'+',tone:'mut',text:'No promise to keep'});
  if(!out.length) out.push({sign:'·',tone:'mut',text:'No other effect'});
  return out;
}
class Game{
  constructor(s){ this.s=s; if(s&&s.pid) setPID(s.pid); if(s) this.migrate(); }
  // Defaults for state added after a save was written, so old saves keep loading.
  migrate(){ const s=this.s; s.inbox??=[]; s.promises??=[]; s.phaseEco??={}; if(s.settings) s.settings.difficulty??='normal';
    // shortlist: older saves kept a list of ids and a max-bid map on the auction
    if(!s.shortlist){ const A=s.auction||{}; s.shortlist=(A.shortlist||[]).map(pid=>({pid,max:(A.maxBid&&A.maxBid[pid])||0,priority:'B'})); }
    if(s.auction&&s.auction.prep===undefined) s.auction.prep=false;
    // staff: every team gets a backroom team on load if the save predates it
    s.staff??={}; s.staffPool??={}; if(s.teams) for(const tid in s.teams) if(!s.staff[tid]) s.staff[tid]=this.genStaffTeam(tid);
    // international data: real caps and contracts for real Nepali players, NOC and duty fields for overseas
    // older saves: the Phase 9 overseas players join the free-agent pool (anyone not already in the game)
    if(s.players&&!s.osPool2){ const have=new Set(Object.values(s.players).map(p=>p.name)); setPID(s.pid||getPID());
      for(const a of FREE_OS_2) if(!have.has(a[0])){ const p=mkPlayer(a,null,s.year); p.age=a[2]+Math.max(0,(s.year||2026)-2026); s.players[p.id]=p; }
      s.pid=getPID(); }
    s.osPool2=true;
    s.nepal??={}; if(s.players) for(const p of Object.values(s.players)) this.initIntl(p);
    // decisions from older saves: give them a title, a deadline (the user's next match) and a cautious choice
    const nf=s.fixtures&&s.user?this.userNext():null;
    for(const n of s.inbox) if(n.choices&&!n.done){ n.title??=n.text; if(n.due===undefined) n.due=nf?nf.n:null; n.safe??=cautiousIndex(n); }
    this.hook('migrate');
  }
  // Calls a lifecycle hook on every phase 2 module that defines it.
  hook(name,...args){ for(const M of MODULES) if(typeof M[name]==='function') M[name](this,...args); }
  // Today's tasks from every module: [{key, text, sub?, to}], most urgent first as each module orders them.
  tasks(){ const out=[]; for(const M of MODULES) if(typeof M.todayTasks==='function'){ try{ out.push(...(M.todayTasks(this)||[])); }catch(e){ console.error(e); } } return out; }
  logDecision(kind,title,pick,outcome,extra){ return Depth.logDecision(this,kind,title,pick,outcome,extra); }
  recMu(bat,bowl,runs,out){ Depth.recordMatchup(this,bat,bowl,runs,out); }
  // A fixture's date as epoch ms, and the in-game today (the latest match played, or null outside the season).
  dayOf(f){ return f?dayTime(f.date,this.year):null; }
  todayTime(){ return dayTime(this.dayLabel(),this.year); }
  get players(){return this.s.players;} get teams(){return this.s.teams;} get user(){return this.s.user;} get year(){return this.s.year;}
  P(id){return this.s.players[id];}
  diff(){ return DIFFICULTY[this.s.settings&&this.s.settings.difficulty]||DIFFICULTY.normal; }
  static create(userTeam,opts){
    setPID(1);
    const s={v:1,year:2026,phase:'preseason',user:userTeam,lang:opts.lang||'en',manager:{name:opts.manager||'Manager',rep:40,career:[]},
      settings:{difficulty:DIFFICULTY[opts.difficulty]?opts.difficulty:'normal',mode:opts.mode||'key',speed:2,megaEvery:3,nextMega:2027,retain:3,autoXI:false,theme:'auto',nepNum:false,pauseDRS:true,animate:true,autosave:true},
      teams:{},players:{},fixtures:[],table:{},history:JSON.parse(JSON.stringify(HISTORY)),records:{},inbox:[],retiredList:[],hof:[],news:[],seasonDone:false,osPool2:true};
    const personas=shuffle(PERSONAS.slice());
    TEAMS.forEach((t,i)=>{ s.teams[t.id]={...t,squad:[],purse:DOM_CAP,osPurse:OS_CAP,balance:200,fans:55+ri(0,20),ticket:500,board:60,objective:null,
      xi:null,order:null,captainId:null,training:'Normal',persona:personas[i],rtm:0,results:[]}; });
    const G=new Game(s);
    for(const tid in SQUADS){ for(const a of SQUADS[tid]){ const p=mkPlayer(a,tid,2026); p.prov=p.nat==='NEP'? (s.teams[tid].province):null; p.hist.push({year:2026,team:tid}); s.players[p.id]=p; s.teams[tid].squad.push(p.id); if(p.name===s.teams[tid].captain) s.teams[tid].captainId=p.id; } }
    for(const a of FREE_NEP){ const p=mkPlayer(a,null,2026); p.prov=pick(PROVINCES); s.players[p.id]=p; }
    for(const a of FREE_OS){ const p=mkPlayer(a,null,2026); s.players[p.id]=p; }
    // fictional uncapped domestic pool
    for(let i=0;i<16;i++){ const p=G.genNepali(ri(18,22)); s.players[p.id]=p; }
    // salaries
    for(const tid in s.teams){ G.initSalaries(tid); }
    s.pid=getPID();
    for(const p of Object.values(s.players)) G.initIntl(p);
    for(const tid in s.teams) s.staff[tid]=G.genStaffTeam(tid);
    G.setObjectives(); G.makeFixtures2026(); G.hook('migrate');
    G.news(`Welcome to ${s.teams[userTeam].name}. The 2026 season (NPL Season 3) starts on October 26 at Kirtipur.`,'board');
    G.news(`The ICC has sanctioned the NPL. Squads may now carry 6 to 8 overseas players, with exactly 4 in the playing XI.`,'league');
    return G;
  }
  initSalaries(tid){
    const t=this.teams[tid]; const dom=t.squad.map(id=>this.P(id)).filter(p=>p.nat==='NEP'&&!p.marquee);
    let tot=dom.reduce((a,p)=>a+p.value,0); const scale=tot>84?84/tot:1;
    dom.forEach(p=>{p.salary=Math.max(2,Math.round(p.value*scale*2)/2);});
    t.squad.map(id=>this.P(id)).forEach(p=>{ if(p.marquee) p.salary=calcValue(p); if(p.nat!=='NEP') p.salary=p.value; p.contractTo=this.s.settings.nextMega-1; });
    this.recalcPurse(tid);
  }
  recalcPurse(tid){
    const t=this.teams[tid]; let d=0,o=0;
    for(const id of t.squad){const p=this.P(id); if(p.temp) continue; if(p.nat==='NEP'){ if(!p.marquee) d+=p.salary; } else o+=p.salary;}
    t.purse=Math.round((DOM_CAP-d)*10)/10; t.osPurse=Math.round((OS_CAP-o)*10)/10;
  }
  news(text,kind,extra){ const d=this.dayLabel(); this.s.inbox.unshift({id:'n'+Date.now()+ri(0,9999),y:this.year,d,dt:dayTime(d,this.year),text,kind:kind||'info',read:false,...(extra||{})}); if(this.s.inbox.length>120) this.s.inbox.length=120; }
  // The in-game "today": the date of the latest match played this season, or the phase outside it.
  dayLabel(){ const ph=this.s.phase; if(ph==='league'||ph==='playoffs'||ph==='seasonEnd'){ const f=this.s.fixtures.filter(x=>x.res).pop(); if(f) return f.date; }
    return {preseason:'Pre-season',offseason:'Off-season',retention:'Retention',auction:'Auction'}[ph]||'Pre-season'; }
  genNepali(age,prov){
    prov=prov||pick(PROVINCES); const np=NEP_NAMES[prov]; const bias=PROV_BIAS[prov];
    let name; do{ name=pick(np.f)+' '+pick(np.l);}while(Object.values(this.s.players).some(p=>p.name===name)&&R()<0.9);
    const r=R(); let role= r<0.32?'BAT': r<0.68?'BOWL': r<0.88?'AR':'WK';
    let type='';
    if(role==='BOWL'||role==='AR'){ const sp=(bias.spin+3)/(bias.spin+bias.pace+6); type= R()<sp? pick(['OB','LB','SLA','SLA','OB']) : pick(['RFM','RM','RFM','LFM','RF']); }
    const base=ri(40,52);
    const bat= role==='BOWL'?ri(20,35): base+bias.bat+ri(-2,4);
    const bowl= role==='BAT'?0: role==='WK'?0: base+(isSpin(type)?bias.spin:bias.pace)+ri(-2,4);
    const p=mkPlayer([name,'NEP',age,role,clamp(bat,15,70),clamp(bowl,0,70),type,R()<0.25?'L':'R'],null,this.s?this.year:2026);
    p.prov=prov; p.real=false; p.pot=clamp(ovr(p)+ri(8,32),ovr(p)+5,92); p.value=calcValue(p); p.uncapped=true; this.initIntl(p);
    return p;
  }
  genOverseas(){
    const nat=pick(Object.keys(OS_NAMES)); const pool=OS_NAMES[nat]; const name=pick(pool.f)+' '+pick(pool.l);
    const age=ri(22,29); const r=R(); const role=r<0.35?'BAT':r<0.7?'BOWL':r<0.87?'AR':'WK';
    const type= role==='BOWL'||role==='AR'? pick(['RF','RFM','LFM','OB','LB','SLA','RF','LF']):'';
    const lvl=ri(56,76); const ar=role==='AR'?8:0;
    const p=mkPlayer([name,nat,age,role, role==='BOWL'?ri(20,40):lvl-ar+ri(-3,3), role==='BAT'||role==='WK'?0:lvl-ar+ri(-3,3), type, R()<0.3?'L':'R'],null,this.year);
    p.real=false; p.pot=clamp(ovr(p)+ri(0,12),ovr(p),92); p.value=calcValue(p); this.initIntl(p); return p;
  }
  osCount(tid){return this.teams[tid].squad.filter(id=>this.P(id).nat!=='NEP').length;}
  // ===== Lineups =====
  autoXI(tid){
    const t=this.teams[tid]; const av=t.squad.map(id=>this.P(id)).filter(p=>this.available(p));
    const os=av.filter(p=>p.nat!=='NEP'), nep=av.filter(p=>p.nat==='NEP');
    const osMax=Math.min(4,os.length), nepMax=11-osMax;
    const xi=[]; let osN=0,nepN=0;
    const score=p=>ovr(p)+p.form*0.6-(100-p.fit)*0.1;
    const add=p=>{xi.push(p); if(p.nat==='NEP') nepN++; else osN++;};
    const can=p=>!xi.includes(p) && (p.nat==='NEP'? nepN<nepMax : osN<osMax);
    const wks=av.filter(p=>p.role==='WK').sort((a,b)=>score(b)-score(a));
    if(wks.length) add(wks[0]);
    while(xi.length<11){
      const bowlers=xi.filter(p=>p.bowl>=50).length, batters=xi.filter(p=>p.bat>=55).length;
      let best=null,bs=-1e9;
      for(const p of av){ if(!can(p)) continue; let sc=score(p);
        if(bowlers<5&&p.bowl>=50) sc+=14; if(bowlers>=6&&p.role==='BOWL') sc-=12; if(batters<6&&p.bat>=55) sc+=9; if(p.role==='WK'&&xi.some(x=>x.role==='WK')) sc-=4;
        if(sc>bs){bs=sc;best=p;} }
      if(!best) break; add(best);
    }
    return xi.map(p=>p.id);
  }
  autoOrder(xi){
    const ps=xi.map(id=>this.P(id));
    const top=ps.filter(p=>p.role!=='BOWL'||p.bat>=50).sort((a,b)=>b.bat-a.bat);
    const tail=ps.filter(p=>!top.includes(p)).sort((a,b)=>b.bat-a.bat);
    // openers: two best among top that are BAT/WK; then rest by bat
    return top.concat(tail).map(p=>p.id);
  }
  // ===== Backroom staff =====
  // s.staff[teamId] = {assistant, bat, ...}; each is {name, nat, level, grade, wage, until, spec, op} or null when vacant.
  staffLevel(tid,post){ const x=this.s.staff&&this.s.staff[tid]&&this.s.staff[tid][post]; return x?x.level:0; }
  // Staff are fictional: a generated name that matches any player in the game is rolled again.
  genStaffName(post){ const players=new Set(Object.values(this.players).map(p=>p.name)), staff=new Set();
    for(const x of Object.values(this.s.staff||{})) for(const k in x) if(x[k]) staff.add(x[k].name.replace(/^Dr\. /,''));
    let nat, name, g=0;
    do { nat=pick(STAFF_NAT);
      if(nat==='NEP'){ const pr=pick(Object.keys(NEP_NAMES)); name=pick(NEP_NAMES[pr].f)+' '+pick(NEP_NAMES[pr].l); }
      else { const pool=OS_NAMES[nat]||OS_NAMES.ENG; name=pick(pool.f)+' '+pick(pool.l); } } while((players.has(name)||staff.has(name))&&g++<200);
    if(players.has(name)) name=name.split(' ')[0]+' '+pick(['Sharma','Basnet','Pant','Gurung','Joshi'])+'-'+pick(['Rana','Thapa','Karki']);
    if((post==='physio'||post==='mental')&&R()<0.35) name='Dr. '+name; return {name,nat}; }
  genStaff(post,level){ const until=this.year+1; level=clamp(level,1,5);
    return {...this.genStaffName(post),level,grade:gradeOf(level),wage:staffWage(post,level),until,spec:pick(STAFF_SPEC[post]||['General']),op:ri(50,65)}; }
  // AI teams: levels follow how much the owners spend; the user starts with level-2 (grade C) staff in
  // every post except the mental-skills coach, which is left for the first hire.
  genStaffTeam(tid){ const T=this.teams[tid]; const lv=()=>{ if(tid===this.user) return 2; const b=T&&T.persona==='Big spender'?1:T&&T.persona==='Bargain hunter'?-1:0; return clamp(ri(1,3)+b,1,4); };
    const o={}; for(const [k] of STAFF_POSTS) o[k]=tid===this.user&&k==='mental'?null:this.genStaff(k,lv()); return o; }
  staffWages(tid){ const st=this.s.staff[tid]||{}; return Math.round(STAFF_POSTS.reduce((a,[k])=>a+(st[k]?st[k].wage:0),0)*10)/10; }
  // Staff can be hired, replaced or released between seasons only.
  staffWindow(){ return ['preseason','offseason','retention','auction'].includes(this.s.phase); }
  // Three candidates per post, one low, one mid, one high grade; new ones each off-season.
  staffCandidates(post){ const P=this.s.staffPool; if(!P[post]||P[post].year!==this.year){ const lv=[ri(1,2),ri(2,3),ri(3,4)]; P[post]={year:this.year,list:lv.map(l=>this.genStaff(post,l))}; } return P[post].list; }
  // Release fee: half the wage still owed (seasons not yet paid; the coming season counts until it starts).
  releaseCost(tid,post){ const x=this.s.staff[tid][post]; if(!x) return 0; const unpaid=this.s.phase==='league'||this.s.phase==='playoffs'||this.s.phase==='seasonEnd'?0:1;
    const seasons=Math.max(0,x.until-this.year+unpaid); return Math.round(x.wage*seasons*0.5*10)/10; }
  releaseStaff(post,quiet){ const t=this.teams[this.user]; const x=this.s.staff[this.user][post]; if(!x) return 0; if(!this.staffWindow()) return null;
    const cost=this.releaseCost(this.user,post); t.balance-=cost; t.staffFees=(t.staffFees||0)+cost; this.s.staff[this.user][post]=null;
    // colleagues notice when one of them is let go
    for(const k in this.s.staff[this.user]){ const y=this.s.staff[this.user][k]; if(y) y.op=clamp((y.op??55)-3,0,100); }
    if(!quiet) this.news(`${x.name} leaves as ${STAFF_POSTS.find(p=>p[0]===post)[1].toLowerCase()}${cost?`. Release fee: ${fmtL(cost)}`:''}.`,'staff'); return cost; }
  hireStaff(post,i){ if(!this.staffWindow()) return 'Staff can be hired in the pre-season and off-season.';
    const c=this.staffCandidates(post)[i]; if(!c) return 'That candidate is no longer available.'; const t=this.teams[this.user];
    if(t.balance<c.wage) return 'The club balance cannot cover his wage.';
    const old=this.s.staff[this.user][post]; const fee=old?this.releaseStaff(post,true):0;
    this.s.staff[this.user][post]={...c,until:this.year+1,op:clamp((c.op??55)+(c.iv?5:0),0,100)}; delete this.s.staff[this.user][post].iv; this.s.staffPool[post].list.splice(i,1);
    this.news(`${c.name} joins as ${STAFF_POSTS.find(p=>p[0]===post)[1].toLowerCase()} (grade ${gradeOf(c.level)}, ${fmtL(c.wage)} a season, until ${this.year+1})${old?`, replacing ${old.name}${fee?` (release fee ${fmtL(fee)})`:''}`:''}.`,'staff');
    this.logDecision('staff',`Hire a ${STAFF_POSTS.find(p=>p[0]===post)[1].toLowerCase()}`,`${c.name}, grade ${gradeOf(c.level)}`,`${fmtL(c.wage)} a season until ${this.year+1}`);
    return null; }
  // Off-season: contracts that ran out leave; AI teams hire replacements straight away.
  staffTurnover(){ for(const tid in this.teams){ const st=this.s.staff[tid]||(this.s.staff[tid]={});
    for(const [k,label] of STAFF_POSTS){ const x=st[k]; if(x===undefined&&tid!==this.user){ st[k]=this.genStaff(k,ri(1,3)); continue; } if(!x||x.until>=this.year) continue;
      if(tid===this.user){ st[k]=null; this.news(`${x.name}'s contract as ${label.toLowerCase()} has ended. The post is vacant: hire a replacement on the Staff page.`,'staff'); }
      else st[k]=this.genStaff(k,clamp(x.level+ri(-1,1),1,4)); } }
    this.s.staffPool={}; }
  // Injury length after the physio: L/2 matches shorter (rounded, at least 1); a match longer with no physio.
  // The gym and recovery centre (a board facility) takes another match off longer injuries for the user.
  injuryLength(tid,base){ const L=this.staffLevel(tid,'physio'); let n=L? Math.max(1,base-Math.round(L/2)) : base+1;
    if(tid===this.user&&this.s.facilities&&this.s.facilities.gym&&n>=2) n--; return n; }
  // ===== International layer =====
  // p.intl = {t20i, odi, debut, grade, gradeYear, real}: caps at game start (null = not verified), from intl-data.js.
  // p.intlG = caps won in this game; p.intlLog = Nepal games played in this game.
  initIntl(p){
    if(p.nat==='NEP'){ if(!p.intl){ const r=p.real!==false?NEP_INTL[p.name]:null;
        p.intl=r?{t20i:r.t20i,odi:r.odi,debut:r.debut||null,grade:r.grade||null,gradeYear:r.grade?CONTRACTS_2026.year:null,real:true}:{t20i:0,odi:0,debut:null,grade:null,gradeYear:null,real:false}; }
      p.intlG??={t20i:0,odi:0}; p.intlLog??=[]; if(p.capBonus===undefined) p.capBonus=false; }
    else { if(p.intlStatus===undefined) p.intlStatus=p.real!==false?(OS_INTL_STATUS[p.name]||OS_INTL_STATUS_2[p.name]||null):null; p.nocStatus??='received'; p.duty??=null; }
  }
  // Total caps in a format: real at game start plus in-game; null if the real figure is not verified.
  intlCaps(p,fmt){ if(!p.intl) return 0; if(!fmt) return (this.intlCaps(p,'t20i')||0)+(this.intlCaps(p,'odi')||0); const r=p.intl[fmt]; return r==null&&!(p.intlG&&p.intlG[fmt])?null:(r||0)+((p.intlG&&p.intlG[fmt])||0); }
  // Unavailable: injured, rested, waiting for an NOC, or away on national duty.
  available(p){ return !p.inj && !p.rest && p.nocStatus!=='pending' && !(p.duty&&p.duty.started&&p.duty.left>0); }
  // NOC: overseas players signed between seasons sometimes wait 1-2 matches for their board's certificate.
  nocOnSigning(p){ if(p.nat==='NEP') return; if(this.s.phase!=='league'&&this.s.phase!=='playoffs'&&R()<0.2){ p.nocStatus='pending'; p.nocWait=ri(1,2); } else p.nocStatus='received'; }
  // National duty: an active international may be called away for 1-3 NPL matches during the season.
  drawNationalDuty(){ for(const p of Object.values(this.players)){ if(p.nat==='NEP'||!p.team) { if(p.nat!=='NEP') p.duty=null; continue; }
      p.duty= p.intlStatus==='active'&&R()<0.15 ? {nation:COUNTRY_NAMES[p.nat]||p.nat,at:ri(1,9),len:ri(1,3),left:0,started:false} : null; } }
  overseasTick(tid){ const t=this.teams[tid];
    for(const id of t.squad.slice()){ const p=this.P(id); if(p.nat==='NEP') continue;
      if(p.nocStatus==='pending'&&--p.nocWait<=0){ p.nocStatus='received'; if(tid===this.user) this.news(`${p.name}'s NOC has arrived. He is available for selection.`,'board'); }
      const d=p.duty; if(!d) continue;
      if(!d.started){ if(--d.at<=0){ d.started=true; d.left=d.len; if(tid===this.user) this.news(`${d.nation} call ${p.name} up for national duty. He misses the next ${d.len} match${d.len>1?'es':''}.`,'intl',{sub:'Called away',tags:[`Misses ${d.len}`],club:true}); } }
      else if(--d.left<=0){ p.duty=null; if(tid===this.user){ this.news(`${p.name} is back from national duty.`,'board'); this.releaseTemps(false,p.id); } } } }
  // Temporary replacement for a player who is away: a free agent whose salary does not count against the purse.
  canSignTemp(forId){ const f=this.P(forId); return f&&f.team===this.user&&f.nat!=='NEP'&&(f.nocStatus==='pending'||(f.duty&&(f.duty.started||f.duty.at<=1)))&&!this.teams[this.user].squad.some(id=>this.P(id).temp&&this.P(id).temp.for===forId); }
  signTemp(pid,forId){ const p=this.P(pid); if(!p||p.team||p.nat==='NEP') return 'Pick an overseas free agent.'; if(!this.canSignTemp(forId)) return 'No replacement is allowed for him.';
    const t=this.teams[this.user]; p.team=this.user; p.salary=0; p.temp={for:forId}; t.squad.push(p.id); this.recalcPurse(this.user);
    this.news(`${p.name} joins as a temporary replacement for ${this.P(forId).name}. His salary does not count against the purse.`,'signing',{club:true}); return null; }
  releaseTemps(all,forId){ for(const t of Object.values(this.teams)) for(const id of t.squad.slice()){ const p=this.P(id); if(!p.temp||(!all&&p.temp.for!==forId)) continue;
      t.squad=t.squad.filter(x=>x!==id); if(t.xi) t.xi=t.xi.filter(x=>x!==id); if(t.order) t.order=t.order.filter(x=>x!==id); p.team=null; p.temp=null; p.salary=0; this.recalcPurse(t.id); } }
  // Nepal selection: rating, NPL form and season, and the central contract.
  nepalScore(p){ const st=p.stats[this.year]||p.stats[this.year-1]; const perf=st?Math.min(8,st.r/45+st.w/2):0;
    return ovr(p)+((p.form+10)/2-5)*1.2+perf+(GRADE_BONUS[p.intl&&p.intl.grade]||0); }
  // 15-player squad: best by score with at least one keeper and five bowlers; ranks 16-18 are "on the fringe".
  pickNepal(){ const pool=Object.values(this.players).filter(p=>p.nat==='NEP'&&!p.retired&&!p.inj).sort((a,b)=>this.nepalScore(b)-this.nepalScore(a));
    const sq=[]; const add=p=>{ if(p&&!sq.includes(p)) sq.push(p); };
    add(pool.find(p=>p.role==='WK')); pool.filter(p=>p.bowl>=55).slice(0,5).forEach(add);
    for(const p of pool){ if(sq.length>=15) break; add(p); }
    const rest=pool.filter(p=>!sq.includes(p)); sq.sort((a,b)=>this.nepalScore(b)-this.nepalScore(a));
    return {squad:sq.map(p=>p.id),fringe:rest.slice(0,3).map(p=>p.id),ranked:sq.concat(rest).map(p=>p.id)}; }
  // A winter's events: the real 2026-27 calendar, then one ODI event and two T20I series a year, generated.
  winterEvents(w){ const real=INTL_CALENDAR.filter(e=>e.winter===w); if(real.length) return real;
    const C=(this.s.nepal.cal??={}); if(C[w]) return C[w];
    const o=pick(INTL_OPPONENTS.odi), t=shuffle(INTL_OPPONENTS.t20i.slice()).slice(0,2);
    return C[w]=[{id:`odi-${w}`,winter:w,name:`Nepal v ${o[0]}, ODI series`,short:`v ${o[0]}`,fmt:'ODI',official:true,dates:`Dec ${w}`,month:`Dec ${w}`,venue:'Kirtipur',squadDate:'Nov 28',matches:3,opp:o[0],strength:o[1],real:false},
      {id:`t1-${w}`,winter:w,name:`Nepal v ${t[0][0]}, 3 T20Is`,short:`v ${t[0][0]}`,fmt:'T20I',official:true,dates:`Feb ${w+1}`,month:`Feb ${w+1}`,venue:'Kirtipur',squadDate:'Feb 1',matches:3,opp:t[0][0],strength:t[0][1],real:false},
      {id:`t2-${w}`,winter:w,name:`Nepal v ${t[1][0]}, 3 T20Is`,short:`v ${t[1][0]}`,fmt:'T20I',official:true,dates:`Mar ${w+1}`,month:`Mar ${w+1}`,venue:'Mulpani',squadDate:'Mar 1',matches:3,opp:t[1][0],strength:t[1][1],real:false}]; }
  // Opponent XI generated at a strength level; these players exist only for the match.
  genOppXI(name,strength){ const L=[]; const roles=['WK','BAT','BAT','BAT','BAT','AR','AR','BOWL','BOWL','BOWL','BOWL'];
    roles.forEach((role,i)=>{ const lv=strength+ri(-6,6); const type=role==='BOWL'||role==='AR'?pick(['RFM','RF','LFM','OB','LB','SLA']):'';
      const p=mkPlayer([`${name} ${i+1}`,'OPP',ri(21,33),role,role==='BOWL'?ri(18,35):lv,role==='BAT'||role==='WK'?0:lv,type,'R'],null,this.year); p.id='opp'+i; p.form=0; p.fit=100; L.push(p); }); return L; }
  intlLineup(ids,P){ const ps=ids.map(id=>P[id]).filter(p=>!p.inj); const sc=p=>ovr(p)+p.form*0.6; const xi=[];
    const wk=ps.filter(p=>p.role==='WK').sort((a,b)=>sc(b)-sc(a))[0]; if(wk) xi.push(wk);
    ps.filter(p=>p.bowl>=55&&!xi.includes(p)).sort((a,b)=>sc(b)-sc(a)).slice(0,5).forEach(p=>xi.push(p));
    ps.filter(p=>!xi.includes(p)).sort((a,b)=>sc(b)-sc(a)).forEach(p=>{ if(xi.length<11) xi.push(p); });
    const top=xi.filter(p=>p.role!=='BOWL'||p.bat>=50).sort((a,b)=>b.bat-a.bat), tail=xi.filter(p=>!top.includes(p)).sort((a,b)=>b.bat-a.bat);
    const order=top.concat(tail).map(p=>p.id); const keeper=(wk||xi.slice().sort((a,b)=>b.field-a.field)[0]).id;
    return {xi:xi.map(p=>p.id),order,keeper,captain:xi.slice().sort((a,b)=>ovr(b)-ovr(a))[0].id}; }
  // Plays one Nepal match with the real engine against a generated XI; the league is untouched.
  async intlMatch(evt,squad){ const opp=this.genOppXI(evt.opp,evt.strength); const P={}; for(const id of squad) P[id]=this.P(id); for(const p of opp) P[p.id]=p;
    const G=this; const proxy={user:null,players:P,teams:{NEP:{id:'NEP',name:'Nepal',squad},OPP:{id:'OPP',name:evt.opp,squad:opp.map(p=>p.id)}},
      lineup:(tid)=>G.intlLineup(tid==='NEP'?squad:opp.map(p=>p.id),P),staffLevel:()=>0,injuryLength:(t,b)=>b};
    const home=R()<0.5; const m=new Match(proxy,home?'NEP':'OPP',home?'OPP':'NEP',{lang:'en',overs:evt.fmt==='ODI'?50:20,noRain:true,night:false,dew:false});
    // the engine marks mid-match injuries on the players; Nepal games do not carry injuries into the NPL
    const inj0=squad.map(id=>[id,this.P(id).inj]); await m.run({}); for(const [id,v] of inj0){ const p=this.P(id); p.inj=v; p.injCounted=false; } return m; }
  // Nepal's winter: name squads, play every event, apply call-up / dropped / experience / first-cap effects.
  async runIntlWinter(){
    const w=this.year-1; const evts=this.winterEvents(w); const N=this.s.nepal; const u=this.user;
    const prev=new Set(N.lastSquad||[]); const duty={}; const results=[]; let last=null;
    const mine=(p)=>p.team===u; const tag=(p)=>({club:mine(p)});
    for(const e of evts){
      const sel=this.pickNepal(); const squad=sel.squad; const sset=new Set(squad); const before=last?new Set(last):prev;
      for(const id of squad){ const p=this.P(id); if(!before.has(id)){ p.morale=clamp(p.morale+8,0,100); if(mine(p)) this.news(`${p.name} named in Nepal's squad for ${e.short}`,'intl',{...tag(p),sub:'Call-up',ne:`${p.name} राष्ट्रिय टोलीमा`,detail:`${e.name} · ${e.dates}`,tags:['Morale +8']}); } }
      for(const id of before){ if(sset.has(id)) continue; const p=this.P(id); if(!p||p.retired) continue; p.morale=clamp(p.morale-6,0,100); if(mine(p)) this.news(`${p.name} left out of the Nepal squad for ${e.short}`,'intl',{...tag(p),sub:'Dropped',ne:`${p.name} टोलीबाट बाहिर`,detail:'Selectors went with form and contracts.',tags:['Morale −6']}); }
      const played=new Set(); const rec={id:e.id,name:e.name,short:e.short,fmt:e.fmt,month:e.month,official:e.official,w:0,l:0,nr:0,games:[]};
      for(let k=0;k<e.matches;k++){
        // rotation: from the second match, rest one of the regulars in turn so squad players get games
        const base=this.intlLineup(squad,Object.fromEntries(squad.map(id=>[id,this.P(id)]))).xi;
        const rest=k>0?base.filter(id=>this.P(id).role!=='WK').sort((a,b)=>this.nepalScore(this.P(a))-this.nepalScore(this.P(b)))[(k-1)%5]:null;
        const m=await this.intlMatch(e,rest?squad.filter(id=>id!==rest):squad); const res=m.result; const nepWon=res.winner==='NEP', oppWon=res.winner==='OPP';
        if(nepWon) rec.w++; else if(oppWon) rec.l++; else rec.nr++;
        const ni=m.inns.find(i=>i.bat==='NEP'), oi=m.inns.find(i=>i.bat==='OPP');
        rec.games.push({r:nepWon?'W':oppWon?'L':'–',nep:ni?`${ni.runs}/${ni.wkts}`:'',opp:oi?`${oi.runs}/${oi.wkts}`:''});
        for(const id of m.lineups.NEP.xi){ const p=this.P(id); played.add(id);
          const bs=(ni&&ni.bs[id])||{r:0,b:0}, bw=(oi&&oi.bw[id])||{w:0,r:0,balls:0}; const d=(duty[id]??={games:0,r:0,w:0,dev:0,caps:0,firstCap:false,events:[]}); d.games++; d.r+=bs.r||0; d.w+=bw.w||0;
          if(e.official){ const fmt=e.fmt==='ODI'?'odi':'t20i'; const before0=this.intlCaps(p)||0; p.intlG[fmt]++; d.caps++;
            if(!before0&&!(p.intl&&(p.intl.t20i==null||p.intl.odi==null))){ p.capped=true; p.uncapped=false; p.capBonus=true; const v0=p.value; p.value=Math.round(p.value*1.5*2)/2; d.firstCap=true;
              if(!p.intl.debut) p.intl.debut={fmt:e.fmt==='ODI'?'ODI':'T20I',year:w,v:e.opp,game:true};
              this.news(`${p.name} makes his ${e.fmt} debut for Nepal`,'intl',{...tag(p),sub:'First cap',ne:`${p.name}को अन्तर्राष्ट्रिय डेब्यु`,detail:`${e.short} · ${bs.r||0} runs${bw.balls?`, ${bw.w}/${bw.r}`:''}`,tags:['Now capped',`Value ${fmtL(v0)} → ${fmtL(p.value)}`]}); }
            const tot=this.intlCaps(p); if([25,50,100].includes(tot)) this.news(`${p.name} wins his ${tot}th cap for Nepal`,'intl',{...tag(p),sub:'Milestone',ne:`${p.name}को ${tot}औँ खेल`,tags:[`${tot} caps`]}); }
          if((bs.r||0)>=100) this.news(`${p.name} scores a hundred for Nepal ${e.short}`,'intl',{...tag(p),sub:'Milestone',ne:`${p.name}को शतक`,detail:`${bs.r} off ${bs.b} balls · ${nepWon?'Nepal win':oppWon?'Nepal lose':'No result'}`,tags:['Form +2']}), p.form=clamp(p.form+2,-10,10);
          else if((bs.r||0)>=50&&mine(p)) this.news(`${p.name} hits a fifty for Nepal ${e.short}`,'intl',{...tag(p),sub:'Milestone',detail:`${bs.r} off ${bs.b} balls`,tags:['Form +1']}), p.form=clamp(p.form+1,-10,10);
          if((bw.w||0)>=5) this.news(`${p.name} takes five wickets for Nepal ${e.short}`,'intl',{...tag(p),sub:'Milestone',ne:`${p.name}को पाँच विकेट`,detail:`${bw.w}/${bw.r}`,tags:['Form +2']}), p.form=clamp(p.form+2,-10,10);
          p.intlLog.push({y:w,month:e.month,evt:e.short,fmt:e.fmt,r:bs.r||0,w:bw.w||0});
        }
      }
      // every series played: +1 to +2 rating (up to potential) and 10 fitness
      for(const id of played){ const p=this.P(id); const d=duty[id]; d.events.push(e.short); const add=Math.min(ri(1,2),Math.max(0,p.pot-ovr(p)));
        if(add){ if(p.role==='BOWL') p.bowl=clamp(p.bowl+add,10,96); else if(p.role==='AR'){ if(p.bat>=p.bowl) p.bat=clamp(p.bat+add,10,96); else p.bowl=clamp(p.bowl+add,10,96); } else p.bat=clamp(p.bat+add,10,96); }
        d.dev+=add; p.fit=clamp(p.fit-10,30,100); }
      rec.squad=squad; rec.fringe=sel.fringe; results.push(rec); last=squad;
    }
    N.winter=w; N.results=results; N.duty=duty; N.lastSquad=last||[];
    // CAN re-grades contracts for the coming year from the same ranking (in the game; 2026 is the real list)
    this.regradeContracts(this.year);
    return results; }
  regradeContracts(year){ if(year<=CONTRACTS_2026.year) return; const ranked=this.pickNepal().ranked.map(id=>this.P(id)); let i=0; const next={};
    for(const [g,n] of GRADE_SIZES) for(let k=0;k<n&&i<ranked.length;k++,i++) next[ranked[i].id]=g;
    for(const p of Object.values(this.players)){ if(p.nat!=='NEP'||!p.intl) continue; const old=p.intl.grade, g=next[p.id]||null; if(old===g&&p.intl.gradeYear) { p.intl.gradeYear=year; continue; }
      p.intl.grade=g; p.intl.gradeYear=year;
      if(p.team===this.user&&(old||g)){ const up=g&&(!old||GRADES.indexOf(g)<GRADES.indexOf(old));
        const text=!g?`${p.name} loses his CAN central contract`:!old?`CAN awards ${p.name} a Grade ${g} contract`:`CAN moves ${p.name} ${up?'up':'down'} to Grade ${g}`;
        this.news(text,'intl',{club:true,sub:'Contract',ne:g?`${p.name} ग्रेड ${g}मा`:`${p.name} केन्द्रीय अनुबन्धबाट बाहिर`,detail:`Central contracts for ${year}, in your game`,tags:up?['Fans +2']:[]}); if(up) this.teams[this.user].fans=clamp(this.teams[this.user].fans+2,0,100); }
    }
    this.s.nepal.contractYear=year; }
  // ===== Team sheet =====
  // Batting: the top seven in the order; bowling: the best five bowlers; fielding: all eleven.
  teamStrength(xi,order){
    const ps=(order&&order.length===11?order:xi).map(id=>this.P(id)); const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
    return {bat:Math.round(avg(ps.slice(0,7).map(p=>p.bat))),bowl:Math.round(avg(ps.map(p=>p.bowl||0).sort((a,b)=>b-a).slice(0,5))),field:Math.round(avg(ps.map(p=>p.field||50)))};
  }
  // Win chance: a logistic on the gap in combined strength (batting and bowling weigh 45% each).
  winChance(a,b){ const c=x=>0.45*x.bat+0.45*x.bowl+0.1*x.field; return 1/(1+Math.exp(-(c(a)-c(b))/6)); }
  orderWarnings(order,tid){
    const w=[]; const t=this.teams[tid||this.user];
    order.forEach((id,i)=>{ const p=this.P(id), n=i+1;
      if(p.bat>=68&&n>=8) w.push({pid:id,kind:'high',text:`${p.name} should bat higher than ${n}`});
      if(p.bat<45&&n<=7) w.push({pid:id,kind:'low',text:`${p.name} at ${n} makes a long tail`}); });
    if(!order.some(id=>this.P(id).role==='WK')&&!(t.keeperId&&order.includes(t.keeperId))) w.push({pid:null,kind:'wk',text:'No wicketkeeper in the XI'});
    return w;
  }
  // The five team-sheet rules: 7 Nepali, 4 overseas, a keeper, 5+ bowling options (bowl 50+), a captain.
  xiRules(tid,xi){
    const t=this.teams[tid], ps=xi.map(id=>this.P(id)); const nep=ps.filter(p=>p.nat==='NEP').length, os=ps.length-nep;
    const wk=(t.keeperId&&xi.includes(t.keeperId))?this.P(t.keeperId):ps.find(p=>p.role==='WK'); const bowl=ps.filter(p=>p.bowl>=50).length;
    const cap=t.captainId&&xi.includes(t.captainId)?this.P(t.captainId):null;
    return [
      {k:'nep',label:'Nepali players',value:`${nep} of 7`,ok:nep===7&&ps.length===11},
      {k:'os',label:'Overseas players',value:`${os} of 4`,ok:os===4||(os<4&&nep===11-os&&os>=Math.min(4,t.squad.filter(id=>this.P(id).nat!=='NEP'&&!this.P(id).inj).length))},
      {k:'wk',label:'Wicketkeeper',value:wk?wk.name:'None',ok:!!wk},
      {k:'bowl',label:'Bowling options',value:String(bowl),ok:bowl>=5},
      {k:'cap',label:'Captain',value:cap?cap.name:'Not in the XI',ok:!!cap},
    ];
  }
  // Bowling plan: overs per bowler per phase. Phase totals 6 / 9 / 5, at most 4 overs per bowler,
  // and at most 3 / 5 / 3 in one phase (a bowler cannot bowl consecutive overs).
  defaultBowlPlan(xi){ return this.fillBowlPlan({},xi); }
  fillBowlPlan(plan,xi){
    const P={}; for(const id of xi) if(plan[id]) P[id]={pp:plan[id].pp||0,mid:plan[id].mid||0,death:plan[id].death||0};
    const tot=id=>P[id]?P[id].pp+P[id].mid+P[id].death:0; const used=k=>Object.values(P).reduce((a,x)=>a+x[k],0);
    const pool=xi.map(id=>this.P(id)).filter(p=>p.bowl>=40);
    const fit=(p,k)=>p.bowl+(isPace(p.type)&&k!=='mid'?6:0)+(isSpin(p.type)&&k==='mid'?6:0)-(tot(p.id)*1.5);
    for(const k of ['death','pp','mid']){
      while(used(k)<BOWL_PHASES[k]){
        const c=pool.filter(p=>tot(p.id)<4&&((P[p.id]&&P[p.id][k])||0)<PHASE_CAP[k]).sort((a,b)=>fit(b,k)-fit(a,k))[0];
        if(!c) break; (P[c.id]??={pp:0,mid:0,death:0})[k]++;
      }
    }
    return P;
  }
  // Keep the user's plan in step with the XI: drop players who left it, fill any gaps from ratings.
  syncBowlPlan(tid){ const t=this.teams[tid]; if(!t.xi||t.xi.length!==11) return; t.bowlPlan=this.fillBowlPlan(t.bowlPlan||{},t.xi); }
  // One line on the next opponent: their two main bowlers, dew, and their weakest bowling phase.
  scoutReport(f){
    const opp=f.home===this.user?f.away:f.home; const T=this.teams[opp]; const sn=T.name.split(' ')[0];
    const xi=this.autoXI(opp).map(id=>this.P(id)).filter(p=>p.bowl>=50).sort((a,b)=>b.bowl-a.bowl).slice(0,2);
    const lab=p=>(TYPE_LABEL[p.type]||p.type||'').toLowerCase();
    const parts=[];
    if(xi.length) parts.push(`${sn} lean on ${xi.map(p=>`${p.name.split(' ').slice(-1)[0]}'s ${lab(p)}`).join(' and ')}.`);
    parts.push(this.dewFor(f)?'Dew expected tonight, which helps the side batting second.':f.night?'No dew expected tonight.':'Day match, so no dew.');
    const E=(this.s.phaseEco[this.year]||{})[opp];
    if(E){ const names={pp:'powerplay bowling',mid:'middle-overs bowling',death:'death bowling'};
      const ph=Object.keys(E).filter(k=>E[k][1]>=6).sort((a,b)=>E[b][0]/E[b][1]-E[a][0]/E[a][1])[0];
      if(ph) parts.push(`Their weak spot: ${names[ph]}, at ${(E[ph][0]/E[ph][1]).toFixed(1)} an over.`); }
    return parts.join(' ');
  }
  validXI(tid,xi){
    const t=this.teams[tid]; if(!xi||xi.length!==11) return false;
    const os=xi.filter(id=>this.P(id).nat!=='NEP').length; const osAvail=t.squad.filter(id=>this.P(id).nat!=='NEP'&&this.available(this.P(id))).length;
    if(os>4) return false; if(os<Math.min(4,osAvail)) return false;
    return xi.every(id=>t.squad.includes(id)&&this.available(this.P(id)));
  }
  lineup(tid){
    const t=this.teams[tid]; let xi, order;
    if(tid===this.user && !this.s.settings.autoXI && this.validXI(tid,t.xi)){ xi=t.xi.slice(); order=(t.order&&t.order.length===11&&t.order.every(id=>xi.includes(id)))?t.order.slice():this.autoOrder(xi); }
    else { xi=this.autoXI(tid); order=this.autoOrder(xi); if(tid===this.user){ t.xi=xi.slice(); t.order=order.slice(); } }
    if(tid===this.user){ const keep=t.xi; t.xi=xi; this.syncBowlPlan(tid); t.xi=keep; }
    const ps=xi.map(id=>this.P(id));
    let keeper=(ps.filter(p=>p.role==='WK').sort((a,b)=>b.bat-a.bat)[0]||ps.slice().sort((a,b)=>b.field-a.field)[0]).id;
    if(tid===this.user && t.keeperId && xi.includes(t.keeperId)) keeper=t.keeperId;
    let cap=t.captainId&&xi.includes(t.captainId)?t.captainId:ps.slice().sort((a,b)=>ovr(b)-ovr(a))[0].id;
    return {xi,order,keeper,captain:cap};
  }
  // ===== Fixtures =====
  makeFixtures2026(){
    this.s.fixtures=FIX2026.map((f,i)=>({n:i+1,home:f[0],away:f[1],date:f[2],stage:'L',res:null,night:i%2===1||[0,2,3,5,8].includes(i)}));
    this.s.fixtures.forEach(f=>f.night = /Oct 26|Oct 28|Nov 1/.test(f.date)? true : f.night);
    this.resetTable();
  }
  makeFixtures(){
    const ids=Object.keys(this.teams); const rounds=[]; const arr=shuffle(ids.slice());
    // circle method
    const n=arr.length; for(let r=0;r<n-1;r++){ const pairs=[]; for(let i=0;i<n/2;i++){ const a=arr[i],b=arr[n-1-i]; pairs.push(R()<0.5?[a,b]:[b,a]); } rounds.push(pairs); arr.splice(1,0,arr.pop()); }
    const list=[]; rounds.forEach(r=>shuffle(r).forEach(p=>list.push(p)));
    const start=new Date(this.year,9,24+ri(0,6)); let day=0;
    this.s.fixtures=list.map((p,i)=>{ if(i>0 && i%2===0) day+= (R()<0.3?2:1); const d=new Date(start.getTime()+day*86400000);
      return {n:i+1,home:p[0],away:p[1],date:d.toLocaleString('en-US',{month:'short',day:'numeric'}),stage:'L',res:null,night:i%2===1}; });
    this.resetTable();
  }
  resetTable(){ this.s.table={}; for(const id in this.teams) this.s.table[id]={p:0,w:0,l:0,nr:0,pts:0,rf:0,bf:0,ra:0,ba:0}; }
  standings(){
    const T=this.s.table; return Object.keys(T).map(id=>({id,...T[id],nrr: (T[id].bf?T[id].rf/(T[id].bf/6):0)-(T[id].ba?T[id].ra/(T[id].ba/6):0)}))
      .sort((a,b)=>b.pts-a.pts||b.nrr-a.nrr);
  }
  nextFixture(){ return this.s.fixtures.find(f=>!f.res); }
  // ===== Playing matches =====
  // beforeMatch(G, f, opt) lets modules add match options (team talk, moods, a hostile crowd) and apply
  // the training week before the first ball. A resumed match is restored, not rebuilt, so it runs once.
  newMatch(f){ const opt={lang:this.s.lang,night:f.night,stage:f.stage,dew:this.dewFor(f)}; this.hook('beforeMatch',f,opt); return new Match(this,f.home,f.away,opt); }
  // Dew is decided once per fixture so the scout report and the match agree.
  dewFor(f){ if(f.dew===undefined) f.dew=!!f.night&&R()<0.6; return f.dew; }
  async playFixture(f,hooks){
    const m=this.newMatch(f); await m.run(hooks); this.recordMatch(m,f); return m;
  }
  recordMatch(m,f){
    const y=this.year; const res=m.result; const [i1,i2]=m.inns;
    f.res={winner:res.winner||null,nr:!!res.nr,tie:!!res.tie,text:res.text,mom:res.mom||null,
      sc:m.inns.map(i=>({t:i.bat,r:i.runs,w:i.wkts,b:i.balls})),overs:m.overs};
    f.card=this.compactCard(m);
    const played=new Set();
    for(const inn of m.inns){
      for(const id in inn.bs){ const s=inn.bs[id]; const p=this.P(id); const st=this.st(p,y); played.add(id);
        if(s.batted||s.in||s.b>0||s.out){ st.inn++; st.r+=s.r; st.b+=s.b; st.f+=s.f; st.s+=s.s; if(!s.out) st.no++; if(s.r>st.hs||(s.r===st.hs&&!s.out)){st.hs=s.r; st.hsNo=!s.out;} if(s.r>=100) st.h++; else if(s.r>=50) st.ff++;
          p.form=clamp(p.form*0.7+(s.r-18)/9+(s.b>8?(s.r/s.b-1.25)*3:0),-10,10);
          this.recBat(p,s,f);
        }
      }
      for(const id in inn.bw){ const s=inn.bw[id]; const p=this.P(id); const st=this.st(p,y);
        st.bb+=s.balls; st.rc+=s.r; st.w+=s.w; if(s.w>st.bw||(s.w===st.bw&&s.r<st.br)){st.bw=s.w;st.br=s.r;}
        if(s.balls>0){ const eco=s.r/(s.balls/6); p.form=clamp(p.form*0.8+s.w*1.6-(eco-8)*0.5,-10,10); }
        this.recBowl(p,s,f);
      }
    }
    for(const side of [m.home,m.away]) for(const id of m.lineups[side].xi){ const p=this.P(id); played.add(id); this.st(p,y).m++; p.fit=clamp(p.fit-ri(2,6)-(this.teams[side].training==='Intense'?2:0),40,100); p.played=(p.played||0)+1; p.lastPlayed=f.n; }
    if(m.catches) for(const id in m.catches) this.st(this.P(id),y).ct+=m.catches[id];
    if(res.mom){ this.st(this.P(res.mom),y).mom++; }
    // non-playing squad members recover + injuries tick
    for(const side of [m.home,m.away]){
      const t=this.teams[side];
      // coaches speed form recovery 10% x L for their players; the physio adds L fitness after every match
      const Lb=this.staffLevel(side,'bat'), Lw=this.staffLevel(side,'bowl'), Lp=this.staffLevel(side,'physio');
      this.overseasTick(side);
      for(const id of t.squad){ const p=this.P(id); if(!m.lineups[side].xi.includes(id)){ p.fit=clamp(p.fit+(t.training==='Light'?10:7),0,100); if(p.inj>0 && !p.injNew) p.inj--; p.rest=false; }
        const L=Math.max(p.role==='BOWL'?0:Lb, p.role==='BAT'||p.role==='WK'?0:Lw); p.form*= p.form<0&&L ? 1-0.03*(1+0.1*L) : 0.97;
        if(Lp) p.fit=clamp(p.fit+Lp,0,100); p.injNew=false; }
      // training injury risk
      if(t.training==='Intense' && R()<0.05){ const p=this.P(pick(t.squad)); if(!p.inj){p.inj=this.injuryLength(side,ri(1,2)); if(side===this.user) this.news(`${p.name} picked up a knock in an intense training session and will miss ${p.inj} match${p.inj>1?'es':''}.`,'injury');} }
    }
    for(const side of [m.home,m.away]) for(const id of m.lineups[side].xi){ const p=this.P(id); if(p.inj>0 && !p.injCounted){ p.injCounted=true; if(side===this.user) this.news(`${p.name} is injured and will miss ${p.inj} match${p.inj>1?'es':''}.`,'injury',{ne:`${p.name} चोटका कारण ${p.inj} खेल बाहिर`}); } }
    for(const id in this.players){ this.players[id].injCounted=false; }
    // table
    if(f.stage==='L'){
      const T=this.s.table;
      for(const side of [m.home,m.away]) T[side].p++;
      if(res.nr||res.tie){ for(const side of [m.home,m.away]){T[side].nr++; T[side].pts++;} }
      else { T[res.winner].w++; T[res.winner].pts+=2; T[res.loser].l++; }
      if(!res.nr){
        const q=m.maxBalls;
        for(let k=0;k<2;k++){ const inn=m.inns[k]; const opp=m.inns[1-k]; const bf=(inn.wkts>=10?q:inn.balls); const t=T[inn.bat]; t.rf+=inn.runs; t.bf+=bf||1; T[inn.bowl].ra+=inn.runs; T[inn.bowl].ba+=bf||1; }
      }
    }
    // team records
    for(const inn of m.inns){ if(inn.wkts>=10||inn.balls>=m.maxBalls||inn.target&&inn.runs>=inn.target) this.recTeam(inn,f); }
    if(m.hattricks) for(const id of m.hattricks) this.news(`HAT-TRICK! ${this.P(id).name} (${this.P(id).team}) took a hat-trick in match ${f.n}.`,'league');
    // fans & finance
    if(res.winner){ this.teams[res.winner].fans=clamp(this.teams[res.winner].fans+1.5,0,100); this.teams[res.loser].fans=clamp(this.teams[res.loser].fans-0.8,0,100); }
    const home=this.teams[f.home]; const demand=6000+home.fans*110; const att=Math.min(15000,Math.round(demand*Math.pow(500/home.ticket,0.85)));
    f.att=att; const gate=att*home.ticket/1e5*0.3; home.balance+=gate; if(home.ledger) home.ledger.gate+=gate;
    home.fans=clamp(home.fans+ (home.ticket<400?0.4: home.ticket>900?-0.6:0),0,100);
    // user news
    if(f.home===this.user||f.away===this.user){ const t=this.teams[this.user]; if(res.winner===this.user) t.board=clamp(t.board+2,0,100); else if(res.winner) t.board=clamp(t.board-2,0,100); t.formStr=(t.formStr||''); t.lastXI={xi:m.lineups[this.user].xi.slice(),order:m.lineups[this.user].order.slice()}; this.expireDecisions(f.n); this.checkPromises(m.lineups[this.user].xi); this.matchNews(m,f); }
    // bowling economy by phase for each side this season (scout report)
    for(const inn of m.inns){ if(!inn.phx) continue; const E=((this.s.phaseEco[y]??={})[inn.bowl]??={pp:[0,0],mid:[0,0],death:[0,0]}); for(const k in inn.phx){ E[k][0]+=inn.phx[k][0]; E[k][1]+=inn.phx[k][1]; } }
    for(const side of [m.home,m.away]){ const t=this.teams[side]; t.form=(t.form||[]).concat([res.winner===side?'W':res.winner?'L':'–']).slice(-5); }
    this.hook('afterMatch',m,f);
    this.s.pid=getPID();
  }
  st(p,y){ p.stats[y]=p.stats[y]||{m:0,inn:0,r:0,b:0,no:0,f:0,s:0,hs:0,hsNo:false,ff:0,h:0,bb:0,rc:0,w:0,bw:0,br:999,ct:0,mom:0,team:p.team}; if(p.team) p.stats[y].team=p.team; return p.stats[y]; }
  recBat(p,s,f){ const R=this.s.records; if(!R.hs||s.r>R.hs.v||(s.r===R.hs.v&&!s.out)) R.hs={v:s.r,no:!s.out,b:s.b,who:p.name,team:p.team,y:this.year}; }
  recBowl(p,s,f){ const R=this.s.records; if(!R.bb||s.w>R.bb.w||(s.w===R.bb.w&&s.r<R.bb.r)) R.bb={w:s.w,r:s.r,who:p.name,team:p.team,y:this.year}; }
  recTeam(inn,f){ const R=this.s.records; if(!R.ht||inn.runs>R.ht.v) R.ht={v:inn.runs,w:inn.wkts,team:inn.bat,opp:inn.bowl,y:this.year}; if(inn.wkts>=10&&(!R.lt||inn.runs<R.lt.v)) R.lt={v:inn.runs,team:inn.bat,opp:inn.bowl,y:this.year}; }
  compactCard(m){
    return m.inns.map(inn=>({t:inn.bat,r:inn.runs,w:inn.wkts,b:inn.balls,ex:inn.extras,
      bat:inn.order.filter(id=>inn.bs[id].batted||inn.bs[id].in||inn.bs[id].b>0||inn.bs[id].out).map(id=>[this.P(id).name,inn.bs[id].r,inn.bs[id].b,inn.bs[id].f,inn.bs[id].s,inn.bs[id].out?inn.bs[id].how:'not out']),
      bowl:Object.keys(inn.bw).map(id=>[this.P(id).name,inn.bw[id].balls,inn.bw[id].r,inn.bw[id].w,inn.bw[id].wd+inn.bw[id].nb]),fow:inn.fow.slice()}));
  }
  matchNews(m,f){
    const u=this.user, T=this.teams; const res=m.result; const opp=f.home===u?f.away:f.home;
    let head;
    if(res.nr) head=`Rain ruins ${T[u].name} v ${T[opp].name} at Kirtipur`;
    else if(res.winner===u) head=pick([`${T[u].name} beat ${T[opp].name}`,`Win for ${T[u].name} as ${T[opp].name} fall short`,`${T[u].name} get the job done against ${T[opp].name}`]);
    else head=pick([`${T[opp].name} too strong for ${T[u].name}`,`Defeat for ${T[u].name} against ${T[opp].name}`,`${T[u].name} left to regroup after loss to ${T[opp].name}`]);
    const mom=res.mom?` Player of the match: ${this.P(res.mom).name}.`:'';
    const ne= res.winner? `${NE_TEAM[res.winner]}ले ${NE_TEAM[res.loser]}लाई हरायो` : 'वर्षाका कारण खेलको नतिजा निस्केन';
    this.news(head,'match',{detail:`${res.text}.${mom}`,ne,fix:f.n});
    if(R()<0.33) this.makeEvent(m,f);
  }
  // ===== Decisions and promises =====
  // Decisions are inbox items (kind 'event') with choices. Each carries a deadline (due: the n of the
  // user's next fixture) and a cautious choice (safe) that is taken if the deadline passes unanswered.
  makeEvent(m,f){
    const u=this.user, t=this.teams[u]; const xi=m.lineups[u].xi; const sur=(p)=>p.name.split(' ').slice(-1)[0];
    // one open promise per player: nobody who is already waiting on one is offered another
    const promised=new Set((this.s.promises||[]).map(pr=>pr.pid));
    const benched=t.squad.map(id=>this.P(id)).filter(p=>!xi.includes(p.id)&&!p.inj&&ovr(p)>=60&&!promised.has(p.id));
    const stars=xi.map(id=>this.P(id)).sort((a,b)=>ovr(b)-ovr(a));
    const tired=xi.map(id=>this.P(id)).filter(p=>p.fit<70);
    const young=t.squad.map(id=>this.P(id)).filter(p=>p.nat==='NEP'&&p.age<=23&&!p.inj&&!hasPlayed(p)&&!promised.has(p.id)).sort((a,b)=>ovr(b)-ovr(a))[0];
    const opts=[];
    if(benched.length) { const p=pick(benched); const cap=t.captainId&&t.captainId!==p.id&&t.squad.includes(t.captainId)?this.P(t.captainId):null;
      opts.push({cat:'Squad',title:`${p.name} wants to know why he isn't in the XI`,text:`${p.name} has asked to see you. He feels he deserves a place in the XI.`,pid:p.id,sum:'Morale and selection',
        quote:pick(["I'm hitting the ball as well as anyone. I can't win you matches from the bench.","I've done everything you asked in the nets. When do I get my chance?"]),
        choices:[{l:'Promise him the next match',fx:{pid:p.id,morale:12,promise:'start'}},{l:'Tell him to earn it in training',fx:{pid:p.id,morale:-10}},...(cap?[{l:`Ask ${cap.name} to talk to him`,fx:{pid:p.id,morale:5,cap:-3}}]:[])],safe:1}); }
    if(stars.length) { const p=stars[0]; opts.push({cat:'Sponsor',title:`A sponsor wants ${p.name} for an advert`,text:`A sponsor wants ${p.name} for an advert shoot on the rest day. They will pay Rs 3 lakh.`,pid:p.id,sum:'Rs 3 L, but he loses fitness',
      choices:[{l:'Agree',fx:{balance:3,pid:p.id,fit:-8}},{l:'Decline, he needs rest',fx:{board:-2}}],safe:1}); }
    if(m.result.loser===u) opts.push({cat:'Press',title:'A tense press conference after the defeat',text:'The press conference after the defeat is tense. A reporter asks if the team is good enough.',sum:'Squad morale or the board',
      quote:'Is this squad good enough to reach the playoffs?',choices:[{l:'Back the players publicly',fx:{team:6}},{l:'Demand more from the senior players',fx:{team:-4,board:3,form:1}}],safe:0});
    if(tired.length){ const p=pick(tired); opts.push({cat:'Medical',title:`The physio wants ${p.name} rested`,text:`The physio warns that ${p.name} is fatigued (fitness ${Math.round(p.fit)}%).`,pid:p.id,sum:'Fitness and selection',
      quote:`His fitness is down to ${Math.round(p.fit)}%. Another game now and we risk an injury.`,choices:[{l:'Rest him next match',fx:{pid:p.id,rest:true}},{l:'He plays',fx:{}}],safe:0}); }
    opts.push({cat:'Fans',title:`${t.city} fans want local youngsters given a chance`,text:`Fans from ${t.city} are asking for more chances for local youngsters.`,sum:'Fans and selection',
      choices:[young?{l:`Promise ${sur(young)} a debut`,fx:{fans:3,pid:young.id,promise:'debut'}}:{l:'Promise to give youth a chance',fx:{fans:3}},{l:'Winning comes first',fx:{fans:-2,board:2}}],safe:1});
    const ev=pick(opts); const nf=this.userNext();
    this.news(ev.text,'event',{title:ev.title,cat:ev.cat,quote:ev.quote,pid:ev.pid,sum:ev.sum,choices:ev.choices,safe:ev.safe,due:nf?nf.n:null,done:false});
  }
  userNext(){ return this.s.fixtures.find(f=>!f.res&&(f.home===this.user||f.away===this.user)); }
  pendingDecisions(){ return this.s.inbox.filter(n=>n.choices&&!n.done); }
  // Decisions that must be answered before the user's next match can be played.
  decisionsDue(){ const f=this.userNext(); return f? this.pendingDecisions().filter(n=>n.due!=null&&n.due<=f.n) : []; }
  applyEvent(n,ci,auto){
    const c=n.choices[ci]; const fx=c.fx||{}; const t=this.teams[this.user];
    if(fx.pid){ const p=this.P(fx.pid); if(fx.morale) p.morale=clamp(p.morale+fx.morale,0,100); if(fx.fit) p.fit=clamp(p.fit+fx.fit,30,100); if(fx.rest) p.rest=true; }
    if(fx.balance) t.balance+=fx.balance; if(fx.board) t.board=clamp(t.board+fx.board,0,100); if(fx.fans) t.fans=clamp(t.fans+fx.fans,0,100);
    if(fx.team) t.squad.forEach(id=>{const p=this.P(id); p.morale=clamp(p.morale+fx.team,0,100);});
    if(fx.form) t.squad.forEach(id=>{const p=this.P(id); if(ovr(p)>65) p.form=clamp(p.form+fx.form,-10,10);});
    if(fx.cap&&t.captainId){ const p=this.P(t.captainId); p.morale=clamp(p.morale+fx.cap,0,100); }
    if(fx.promise&&fx.pid&&fx.promise!==true) this.addPromise(fx.pid,fx.promise);
    n.done=true; n.picked=c.l; n.read=true;
    n.outcome=effectLines(this,n,ci).filter(e=>e.tone!=='mut').map(e=>e.text).join('. ');
    // with "Let the assistant decide" on, a deadline pick is the assistant's answer, not a missed one
    if(auto&&this.s.settings&&this.s.settings.assistant){ n.auto=true; n.assistant=true; n.outcome=(n.outcome?n.outcome+'. ':'')+'The assistant decided'; }
    else if(auto){ n.auto=true; t.board=clamp(t.board-2,0,100); n.outcome=(n.outcome?n.outcome+'. ':'')+'Board confidence −2 for not answering'; }
    this.logDecision(n.story?'story':'event',n.title||n.text,auto?`${c.l} (not answered in time)`:c.l,n.outcome,{cat:n.cat||null,pid:fx.pid||null});
  }
  // Unanswered decisions whose deadline has passed take the cautious option, and the board notices.
  expireDecisions(uptoN){
    const late=this.pendingDecisions().filter(n=>uptoN===Infinity||(n.due!=null&&n.due<=uptoN));
    for(const n of late){ this.applyEvent(n,cautiousIndex(n),true); this.news(`No answer in time: "${n.picked}" was chosen for you.`,'board',{detail:n.outcome}); }
    return late.length;
  }
  // A promise to start a player in the next match, or to give a young player a debut within 3.
  addPromise(pid,kind){
    if(this.s.promises.some(pr=>pr.pid===pid)) return;
    const ups=this.s.fixtures.filter(f=>!f.res&&(f.home===this.user||f.away===this.user)); if(!ups.length) return;
    const left=Math.min(kind==='start'?1:3,ups.length);
    this.s.promises.push({id:'pr'+Date.now()+ri(0,999),pid,kind,dueFixture:ups[left-1].n,matchesLeft:left});
  }
  // After each user match: kept if the player was in the XI; otherwise one match fewer left, broken at 0.
  // A player who cannot play (injured, NOC, national duty) does not use up a match; one who left voids it.
  checkPromises(xi){
    const keep=[];
    for(const pr of this.s.promises){
      if(pr.kind!=='start'&&pr.kind!=='debut'){ keep.push(pr); continue; } // judged by the module that made it
      const p=this.P(pr.pid); if(!p||p.team!==this.user||p.retired) continue;
      const logP=(result)=>(this.s.promiseLog??=[]).push({pid:pr.pid,kind:pr.kind,text:pr.kind==='debut'?`Give ${p.name} a debut`:`Start ${p.name}`,y:this.year,result});
      if(xi.includes(pr.pid)){ logP('kept'); this.news(`Promise kept: ${p.name} ${pr.kind==='debut'?'made his NPL debut':'started, as you promised'}.`,'board'); continue; }
      if(!this.available(p)){ const nx=this.userNext(); if(nx) pr.dueFixture=Math.max(pr.dueFixture,nx.n); keep.push(pr); continue; } // injured, NOC or national duty: not his manager's fault
      pr.matchesLeft--;
      if(pr.matchesLeft<=0){ const t=this.teams[this.user]; p.morale=clamp(p.morale-20,0,100); t.board=clamp(t.board-4,0,100); logP('broken'); p.happy=clamp((p.happy??70)-20,0,100); p.happyWhy='A promise you broke';
        this.news(`Promise broken: ${p.name} ${pr.kind==='debut'?'is still waiting for his debut':'did not start'}. His morale −20, board confidence −4.`,'board'); continue; }
      keep.push(pr);
    }
    this.s.promises=keep;
  }
  // ===== Season flow =====
  setObjectives(){
    const str=Object.keys(this.teams).map(id=>({id,v:this.strength(id)})).sort((a,b)=>b.v-a.v);
    str.forEach((x,i)=>{ const t=this.teams[x.id]; t.expRank=i+1; t.objective= i<2?{txt:'Win the title or reach the final',rank:2}: i<5?{txt:'Reach the playoffs (top 4)',rank:4}:{txt:'Finish in the top 6',rank:6}; });
  }
  strength(tid){ const xi=this.autoXI(tid); return xi.reduce((a,id)=>a+ovr(this.P(id)),0)/11; }
  leagueDone(){ return this.s.fixtures.filter(f=>f.stage==='L').every(f=>f.res); }
  setupPlayoffs(){
    const st=this.standings(); const d=this.year===2026?PLAYOFF_DATES2026:{Q1:'Playoffs',EL:'Playoffs',Q2:'Playoffs',F:'Final'};
    const n=this.s.fixtures.length;
    this.s.fixtures.push({n:n+1,stage:'Q1',home:st[0].id,away:st[1].id,date:d.Q1,res:null,night:true});
    this.s.fixtures.push({n:n+2,stage:'EL',home:st[2].id,away:st[3].id,date:d.EL,res:null,night:true});
    this.s.phase='playoffs';
    this.news(`League stage complete. Qualifier 1: ${this.teams[st[0].id].name} v ${this.teams[st[1].id].name}. Eliminator: ${this.teams[st[2].id].name} v ${this.teams[st[3].id].name}.`,'league');
  }
  advancePlayoffs(){
    const F=this.s.fixtures; const q1=F.find(f=>f.stage==='Q1'), el=F.find(f=>f.stage==='EL'), q2=F.find(f=>f.stage==='Q2'), fin=F.find(f=>f.stage==='F');
    const d=this.year===2026?PLAYOFF_DATES2026:{Q2:'Playoffs',F:'Final'};
    const st=this.standings(); const rank=id=>st.findIndex(x=>x.id===id);
    const w=f=>f.res.winner|| (rank(f.home)<rank(f.away)?f.home:f.away); // NR -> higher seed
    const l=f=>w(f)===f.home?f.away:f.home;
    if(q1.res&&el.res&&!q2){ F.push({n:F.length+1,stage:'Q2',home:l(q1),away:w(el),date:d.Q2,res:null,night:true}); }
    const q2b=F.find(f=>f.stage==='Q2');
    if(q2b&&q2b.res&&!fin){ F.push({n:F.length+1,stage:'F',home:w(q1),away:w(q2b),date:d.F,res:null,night:true}); this.news(`FINAL: ${this.teams[w(q1)].name} v ${this.teams[w(q2b)].name}.`,'league'); }
    const finb=F.find(f=>f.stage==='F');
    if(finb&&finb.res){ return w(finb); }
    return null;
  }
  seasonAwards(champ){
    const y=this.year; const ps=Object.values(this.players).filter(p=>p.stats[y]);
    const by=(f)=>ps.slice().sort((a,b)=>f(b)-f(a));
    const runs=by(p=>p.stats[y].r).slice(0,5), wk=by(p=>p.stats[y].w*1000-p.stats[y].rc).slice(0,5);
    const pot=by(p=>{const s=p.stats[y]; return s.r+s.w*22+s.ct*6+s.mom*10;})[0];
    const emerging=by(p=>{const s=p.stats[y]; return p.age<=22? s.r+s.w*22: -1;})[0];
    const nepBest=by(p=>{const s=p.stats[y]; return p.nat==='NEP'? s.r+s.w*22: -1;})[0];
    const final=this.s.fixtures.find(f=>f.stage==='F');
    const runner= final.res.winner? (final.res.winner===final.home?final.away:final.home) : (champ===final.home?final.away:final.home);
    const st=this.standings();
    const h={year:y,champion:champ,runner,final:final.res.text,pot:`${pot.name} (${pot.team})`,emerging:emerging?`${emerging.name} (${emerging.team})`:'',bestNep:nepBest?`${nepBest.name} (${nepBest.team})`:'',
      table:st.map(x=>[x.id,x.p,x.w,x.l,x.pts,Math.round(x.nrr*1000)/1000]),
      runs:runs.map(p=>[p.name,p.stats[y].team,p.stats[y].r]),wkts:wk.map(p=>[p.name,p.stats[y].team,p.stats[y].w]),notes:[]};
    this.s.history.push(h);
    // prize money
    this.teams[champ].balance+=100; this.teams[runner].balance+=50; if(this.teams[champ].ledger) this.teams[champ].ledger.prize+=100; if(this.teams[runner].ledger) this.teams[runner].ledger.prize+=50;
    this.news(`${this.teams[champ].name} are the ${y} NPL champions!`,'league',{detail:`${final.res.text}. Player of the tournament: ${h.pot}. Platinum Cap: ${h.runs[0][0]} (${h.runs[0][2]} runs). Golden Cap: ${h.wkts[0][0]} (${h.wkts[0][2]} wickets).`,ne:`${NE_TEAM[champ]} ${y} को एनपीएल च्याम्पियन!`});
    this.boardReview(champ,runner,st);
    this.s.phase='seasonEnd';
    this.hook('seasonEnd',champ);
    return h;
  }
  boardReview(champ,runner,st){
    const u=this.user,t=this.teams[u]; const pos=st.findIndex(x=>x.id===u)+1;
    const madeFinal= champ===u||runner===u; const madePO=pos<=4;
    let delta=0; const obj=t.objective;
    const effRank= champ===u?1: runner===u?2: pos;
    if(effRank<=obj.rank) delta+=14; else delta-= 6*(effRank-obj.rank);
    if(champ===u) delta+=18;
    if(t.balance<0) delta-=6;
    // the five pillars (results, finances, fans, youth, conduct) and the club's secondary objectives
    const pil=Office.pillarDelta?Office.pillarDelta(this):0, sec=Office.reviewObjectives?Office.reviewObjectives(this,effRank,obj):0;
    delta+=clamp(pil+sec,-8,8); // the pillars refine the verdict; results still decide it
    t.board=clamp(t.board+delta,0,100);
    this.s.lastReview={y:this.year,pos,effRank,champ:champ===u,runner:runner===u,obj:{...obj},delta,pil,sec,board:t.board};
    const M=this.s.manager; M.rep=clamp(M.rep+(champ===u?15:madeFinal?8:madePO?4:-3),0,100);
    M.career.push({year:this.year,team:u,pos,champ:champ===u,runner:runner===u});
    this.news(`Board review: you finished ${ordinal(pos)}${champ===u?' and won the title':runner===u?' and reached the final':''}. Objective was "${obj.txt}". Board confidence is now ${t.board}%.`,'board');
    if(t.board<this.diff().sack){ this.s.sacked=true; this.s.offers=this.jobOffers(true); this.news('The board has decided to relieve you of your duties. Other franchises have been in touch.','board'); }
    else if(M.rep>=60 && R()<0.5){ this.s.offers=this.jobOffers(false); if(this.s.offers.length) this.news(`Your reputation is growing. ${this.s.offers.map(id=>this.teams[id].name).join(' and ')} would like to talk about their head-coach role.`,'board'); }
  }
  jobOffers(sacked){
    const st=this.standings(); const ids=st.map(x=>x.id).filter(id=>id!==this.user);
    const pool= sacked? ids.slice(-4) : ids.slice(0,5);
    return shuffle(pool).slice(0,sacked?3:2);
  }
  takeJob(tid){ const old=this.user; this.s.user=tid; this.teams[tid].board=55; this.teams[tid].xi=null; this.teams[tid].order=null; this.s.sacked=false; this.s.offers=null; this.news(`You are the new head coach of ${this.teams[tid].name}. Good luck!`,'board'); this.setObjectives(); }
  // ===== Off-season =====
  startOffseason(){
    this.s.offStep='retire';
    this.expireDecisions(Infinity);
    { const lapse=this.s.promises.filter(pr=>pr.kind==='start'||pr.kind==='debut'); if(lapse.length){ this.news(`The season ended with ${lapse.length} promise${lapse.length>1?'s':''} still open. They lapse without penalty.`,'board'); this.s.promises=this.s.promises.filter(pr=>!lapse.includes(pr)); } }
    const y=this.year; const retired=[]; const nep=[], os=[];
    for(const p of Object.values(this.players)){
      if(p.retired) continue;
      // retirement check (on current age, before birthday)
      let chance=0;
      if(p.age>=40) chance=1; else if(p.age>=39) chance=0.75; else if(p.age>=38) chance=0.55; else if(p.age>=37) chance=0.38; else if(p.age>=36) chance=0.24; else if(p.age>=35) chance=0.12;
      if(chance>0&&chance<1){ if(ovr(p)>=75) chance*=0.6; if(p.form>4) chance*=0.8; if(!p.team) chance=Math.min(1,chance*1.5); }
      if(R()<chance){ p.retired=true; retired.push(p); continue; }
    }
    for(const p of retired){ if(p.team){ const t=this.teams[p.team]; t.squad=t.squad.filter(x=>x!==p.id); if(t.captainId===p.id) t.captainId=null; } p.prevTeam=p.team; p.team=null; p.retiredYear=y;
      const c=careerOf(p); const big=c.r>=1200||c.w>=60||(p.real&&ovr(p)>=78);
      this.s.retiredList.push({id:p.id,name:p.name,nat:p.nat,age:p.age,y,r:c.r,w:c.w,m:c.m});
      if(big) this.s.hof.push({name:p.name,nat:p.nat,y,r:c.r,w:c.w,m:c.m});
      (p.nat==='NEP'?nep:os).push(p);
    }
    const userRet=retired.filter(p=>p.prevTeam===this.user);
    if(retired.length) this.news(`${retired.length} players have retired`,'league',{ne:`${retired.length} खेलाडीले संन्यास लिए`,detail:`${retired.slice(0,14).map(p=>`${p.name} (${p.age})`).join(', ')}${retired.length>14?` and ${retired.length-14} more`:''}.`});
    if(userRet.length) this.news(`From your squad, ${userRet.map(p=>p.name).join(', ')} ${userRet.length>1?'have':'has'} retired. Thank you for everything.`,'board');
    // ageing & development
    for(const p of Object.values(this.players)){ if(p.retired) continue; p.prevOvr=ovr(p); p.refusedBy=null; p.mood=null; this.develop(p); p.age++; p.form=p.form*0.3; p.fit=100; p.inj=0; p.morale=clamp(p.morale*0.7+21,0,100); p.value=calcValue(p)*(p.capBonus?1.5:1); p.uncapped=p.uncapped&&!Object.keys(p.stats).length&&!this.intlCaps(p); }
    // new players
    const nNep=Math.max(14,nep.length+10), nOs=clamp(os.length+4,8,12); // 8-12 new overseas players a year
    const newNames=[];
    for(let i=0;i<nNep;i++){ const p=this.genNepali(ri(17,21)); this.players[p.id]=p; newNames.push(p); }
    for(let i=0;i<nOs;i++){ const p=this.genOverseas(); this.players[p.id]=p; }
    const gems=newNames.filter(p=>p.pot>=80);
    this.news(`${nNep} young Nepali players and ${nOs} new overseas players have entered the player pool.${gems.length?` Scouts are excited about ${gems.length} high-potential youngster${gems.length>1?'s':''}.`:''}`,'league');
    this.s.year++; this.s.pid=getPID();
    for(const tid in this.teams) this.recalcPurse(tid); // retirements left the squads; purses must match
    this.staffTurnover();
    this.releaseTemps(true);
    this.s.mega = this.year===this.s.settings.nextMega;
    this.s.newPlayers=newNames.map(p=>p.id); this.s.lastRetired=retired.map(p=>p.id);
    this.s.phase='offseason';
    this.hook('migrate'); this.hook('offseason');
  }
  develop(p){
    const o=ovr(p); let d;
    if(p.age<=20) d=ri(2,6); else if(p.age<=23) d=ri(1,5); else if(p.age<=26) d=ri(0,3); else if(p.age<=30) d=ri(-1,2); else if(p.age<=33) d=ri(-3,0); else d=ri(-5,-1);
    if(isPace(p.type)&&p.age>=31) d-=1;
    if(o+d>p.pot && d>0) d=Math.max(0,p.pot-o);
    const t=p.team?this.teams[p.team]:null; if(t&&t.training==='Intense'&&d>0) d+=R()<0.5?1:0;
    const fBat=p.focus==='Batting'?1.4:p.focus==='Bowling'?0.6:1, fBowl=p.focus==='Bowling'?1.4:p.focus==='Batting'?0.6:1;
    if(p.role==='BAT'||p.role==='WK') p.bat=clamp(Math.round(p.bat+d*(p.focus==='Bowling'?0.8:1)),10,96);
    else if(p.role==='BOWL') p.bowl=clamp(Math.round(p.bowl+d*(p.focus==='Batting'?0.8:1)),10,96);
    else { p.bat=clamp(Math.round(p.bat+d*fBat*0.8+rf(-0.5,0.5)),10,96); p.bowl=clamp(Math.round(p.bowl+d*fBowl*0.8+rf(-0.5,0.5)),10,96); }
    if(p.focus==='Fitness') p.field=clamp(p.field+1,30,95);
    // coaches: players under 26 get +round(L/2) a season in their discipline, up to potential. Pace bowlers
    // work with the bowling coach; spinners with the spin coach (or half the bowling coach's effect without one).
    if(t&&p.age<26){ const Lb=this.staffLevel(p.team,'bat'), Lw=this.staffLevel(p.team,'bowl'), Ls=this.staffLevel(p.team,'spin'); let extra=0;
      const Lbw=isSpin(p.type)?(Ls||Math.floor(Lw/2)):Lw;
      if(Lb&&(p.role==='BAT'||p.role==='WK'||p.role==='AR')){ const add=Math.min(Math.round(Lb/2),Math.max(0,p.pot-ovr(p))); p.bat=clamp(p.bat+add,10,96); extra+=add; }
      if(Lbw&&(p.role==='BOWL'||p.role==='AR')){ const add=Math.min(Math.round(Lbw/2),Math.max(0,p.pot-ovr(p))); p.bowl=clamp(p.bowl+add,10,96); extra+=add; }
      // indoor nets (a board facility): one more step for the user's young players, up to potential
      if(p.team===this.user&&p.age<24&&this.s.facilities&&this.s.facilities.nets){ const add=Math.min(1,Math.max(0,p.pot-ovr(p))); if(add){ if(p.role==='BOWL'||(p.role==='AR'&&p.bowl>p.bat)) p.bowl=clamp(p.bowl+add,10,96); else p.bat=clamp(p.bat+add,10,96); extra+=add; } }
      d+=extra; p.coachDev=extra; } else p.coachDev=0;
    // fielding coach: under-30s gain fielding (grade A or B every season, C and D some seasons)
    if(t&&p.age<30){ const Lf=this.staffLevel(p.team,'field'); if(Lf&&(Lf>=3||R()<Lf/4)) p.field=clamp((p.field||50)+1,30,95); }
    p.lastDev=d;
  }
  // AI trades are skipped; user trade proposals:
  tradeEval(myPid,theirPid){
    const a=this.P(myPid), b=this.P(theirPid); const them=this.teams[b.team];
    if(a.nat!==b.nat && ((a.nat!=='NEP'&&this.osCount(b.team)>=MAX_OS) || (b.nat!=='NEP'&&this.osCount(this.user)>=MAX_OS))) return {ok:false,why:'Overseas limits would be broken.'};
    let va=a.value*(a.age<=24?1.15:a.age>=33?0.8:1), vb=b.value*(b.age<=24?1.15:b.age>=33?0.8:1);
    const need=this.needFor(b.team,a); va*=need;
    const ok= va>=vb*1.08; return {ok, why: ok?`${them.name} accept the trade.`:`${them.name} say ${a.name} is not enough for ${b.name}.`};
  }
  doTrade(myPid,theirPid){
    const a=this.P(myPid), b=this.P(theirPid); const ta=a.team, tb=b.team;
    this.teams[ta].squad=this.teams[ta].squad.filter(x=>x!==a.id).concat([b.id]); this.teams[tb].squad=this.teams[tb].squad.filter(x=>x!==b.id).concat([a.id]);
    a.team=tb; b.team=ta; a.hist.push({year:this.year,team:tb}); b.hist.push({year:this.year,team:ta});
    [ta,tb].forEach(t=>{this.recalcPurse(t); const T=this.teams[t]; if(T.xi) T.xi=null;});
    this.news(`TRADE: ${a.name} joins ${this.teams[tb].name}; ${b.name} joins ${this.teams[ta].name}.`,'signing',{club:ta===this.user||tb===this.user});
  }
  needFor(tid,p){
    const sq=this.teams[tid].squad.map(id=>this.P(id));
    const goodBowl=sq.filter(x=>x.bowl>=60).length, goodBat=sq.filter(x=>x.bat>=60).length, wk=sq.filter(x=>x.role==='WK').length;
    let m=1;
    if(p.bowl>=55&&goodBowl<6) m+=0.25; if(p.bat>=58&&goodBat<6) m+=0.25; if(p.role==='WK'&&wk<2) m+=0.3;
    if(p.role==='WK'&&wk>=3) m-=0.3;
    return m;
  }
  // ===== Retention =====
  beginRetention(){
    this.s.phase='retention';
    const mega=this.s.mega;
    for(const tid in this.teams){ const t=this.teams[tid]; t.retainSel=[]; t.releaseSel=[]; if(tid!==this.user) this.aiRetention(tid); }
    this.news(mega?`MEGA AUCTION year! Every franchise may retain up to ${this.s.settings.retain} players. Unused retention slots become Right to Match (RTM) cards.`:`Mini auction year. Release the players you do not want; everyone else stays on their contract.`,'league');
  }
  aiRetention(tid){
    const t=this.teams[tid]; const sq=t.squad.map(id=>this.P(id));
    const keep=p=>ovr(p)+(p.age<=24?(p.pot-ovr(p))*0.4:0)-(p.age>=34?(p.age-33)*3:0);
    if(this.s.mega){ const sorted=sq.sort((a,b)=>keep(b)-keep(a)); const sel=[]; let os=0; for(const p of sorted){ if(sel.length>=this.s.settings.retain) break; if(keep(p)<64) continue; if(p.nat!=='NEP'){ if(os>=1) continue; os++; } sel.push(p.id);} t.retainSel=sel; }
    else { const rel=sq.filter(p=>{ const k=keep(p); return k<52 || (p.salary>p.value*1.6 && p.salary>=4) || (p.age>=35&&ovr(p)<66) || (t.persona==='Youth builder'&&p.age>=33); });
      t.releaseSel=rel.sort((a,b)=>keep(a)-keep(b)).slice(0,6).map(p=>p.id); }
  }
  applyRetention(){
    const ctx={}; this.hook('beforeRetention',ctx); this.applyRetentionCore(); this.hook('afterRetention',ctx);
  }
  applyRetentionCore(){
    const mega=this.s.mega; const costs=SLABS;
    for(const tid in this.teams){
      const t=this.teams[tid];
      if(mega){
        const keep=t.retainSel.slice(0,this.s.settings.retain);
        for(const id of t.squad){ const p=this.P(id); if(!keep.includes(id)){ p.prevTeam=tid; p.team=null; p.marquee=false; } else { const i=keep.indexOf(id); p.marquee=false; p.salary= p.nat==='NEP'? costs.NEP[i]: costs.OS[i]; p.contractTo=this.year+this.s.settings.megaEvery-1; } }
        t.squad=keep.slice(); t.rtm=this.s.settings.retain-keep.length; t.xi=null; t.order=null;
        if(t.captainId&&!keep.includes(t.captainId)) t.captainId=null;
      } else {
        for(const id of t.releaseSel){ const p=this.P(id); p.prevTeam=tid; p.team=null; if(p.marquee) p.marquee=false; }
        t.squad=t.squad.filter(id=>!t.releaseSel.includes(id)); t.rtm=0;
        if(t.captainId&&!t.squad.includes(t.captainId)) t.captainId=null; if(t.xi) t.xi=t.xi.filter(id=>t.squad.includes(id));
      }
      this.recalcPurse(tid);
    }
    if(mega) this.s.settings.nextMega=this.year+this.s.settings.megaEvery;
  }
  // ===== Auction =====
  basePrice(p){ const o=ovr(p); if(p.nat==='NEP') return o>=68?10:o>=60?5:o>=54?3:2; return o>=80?30:o>=74?20:o>=66?10:o>=60?5:3; }
  category(p){ const o=ovr(p); if(p.nat==='NEP') return p.uncapped?'Uncapped':o>=68?'Category A':o>=60?'Category B':'Category C'; return o>=78?'Overseas marquee':'Overseas'; }
  incr(p,bid){ if(p.nat==='NEP') return bid<10?0.5:bid<20?1:2; return bid<20?1:bid<50?2:5; }
  setupAuction(){
    const pool=Object.values(this.players).filter(p=>!p.team&&!p.retired&&!p.academy);
    const top=pool.filter(p=>ovr(p)>=72).sort((a,b)=>ovr(b)-ovr(a)).slice(0,10);
    const rest=pool.filter(p=>!top.includes(p));
    const sets=[['Marquee set',top]];
    const os=rest.filter(p=>p.nat!=='NEP').sort((a,b)=>ovr(b)-ovr(a));
    const nep=rest.filter(p=>p.nat==='NEP'&&!p.uncapped).sort((a,b)=>ovr(b)-ovr(a));
    const unc=rest.filter(p=>p.nat==='NEP'&&p.uncapped).sort((a,b)=>ovr(b)-ovr(a));
    sets.push(['Overseas set 1',os.slice(0,12)],['Nepali category A',nep.filter(p=>ovr(p)>=68)],['Overseas set 2',os.slice(12,this.s.mega?40:26)],['Nepali category B',nep.filter(p=>ovr(p)>=60&&ovr(p)<68)],['Nepali category C',nep.filter(p=>ovr(p)<60).slice(0,this.s.mega?60:30)],['Uncapped youngsters',unc.slice(0,this.s.mega?30:20)]);
    const lots=[]; for(const [name,arr] of sets) for(const p of arr) lots.push({pid:p.id,set:name});
    this.s.auction={kind:this.s.mega?'mega':'mini',lots,i:0,cur:null,sold:[],unsold:[],accel:false,log:[],prep:true};
    for(const tid in this.teams){ this.teams[tid].maxBids={}; }
    this.s.phase='auction';
    this.hook('auctionSetup');
  }
  // Slots a team must still fill: overseas to the minimum 6, and Nepali for the rest of the 18.
  requiredSlots(tid){ const t=this.teams[tid]; const os=this.osCount(tid); const osNeed=Math.max(0,MIN_OS-os); const total=Math.max(0,MIN_SQUAD-t.squad.length); return {os:osNeed,nep:Math.max(0,total-osNeed),total}; }
  // The most a team can bid on this lot: the purse it comes out of (overseas lots use the overseas
  // purse) minus a reserve, at the lowest base price, for every other slot it is still required to fill.
  lotMax(tid,p){ if(!this.canAdd(tid,p)) return 0; const n=this.requiredSlots(tid); const os=p.nat!=='NEP';
    const others=Math.max(0,(os?n.os:n.nep)-1); const reserve=others*(os?MIN_BASE.OS:MIN_BASE.NEP);
    const purse=os?this.teams[tid].osPurse:this.teams[tid].purse; return Math.max(0,Math.floor((purse-reserve)*2)/2); }
  slotsNeeded(tid){ const t=this.teams[tid]; const os=this.osCount(tid); const nep=t.squad.length-os; return {nep:Math.max(0,12-nep),os:Math.max(0,MIN_OS-os),total:Math.max(0,MIN_SQUAD-t.squad.length)}; }
  canAdd(tid,p){ const t=this.teams[tid]; const os=this.osCount(tid); if(t.squad.length>=MAX_SQUAD) return false; if(p.nat!=='NEP'&&os>=MAX_OS) return false; if(p.nat==='NEP'&&(t.squad.length-os)>=14) return false; return true; }
  budgetOf(tid,p){ const t=this.teams[tid]; return p.nat==='NEP'?t.purse:t.osPurse; }
  reserveFor(tid,p){ const n=this.slotsNeeded(tid); return p.nat==='NEP'? Math.max(0,n.nep-1)*2.5 : Math.max(0,n.os-1)*6; }
  aiMax(tid,p){
    if(!this.canAdd(tid,p)) return 0;
    const t=this.teams[tid]; const per=t.persona;
    let v=p.value*this.needFor(tid,p);
    const n=this.slotsNeeded(tid); if(p.nat!=='NEP'&&n.os>0) v*=1.2; if(p.nat==='NEP'&&n.nep>0) v*=1.1;
    if(per==='Big spender') v*=1.25; else if(per==='Bargain hunter') v*=0.85; else if(per==='Youth builder') v*= p.age<=23?1.35: p.age>=32?0.75:1; else if(per==='Loyalist'&&p.prevTeam===tid) v*=1.4;
    if(p.age<=21&&p.pot>=78) v*=1+(p.pot-78)/40;
    const key=p.id; t.maxBids=t.maxBids||{}; if(t.maxBids[key]==null) t.maxBids[key]=v*rf(0.8,1.3);
    const cap=this.budgetOf(tid,p)-this.reserveFor(tid,p);
    return Math.max(0,Math.min(t.maxBids[key]*this.diff().bid,cap));
  }
  lotStart(){
    const A=this.s.auction; const lot=A.lots[A.i]; if(!lot) return null;
    const p=this.P(lot.pid); A.cur={pid:p.id,set:lot.set,bid:null,base:this.basePrice(p),leader:null,userPassed:false,hist:[],done:false,rtmAsk:null};
    return A.cur;
  }
  // ===== Shortlist and scouting =====
  // Squad needs: how many of each role the user has against the target, and how many are still needed.
  userNeeds(tid){ const sq=this.teams[tid||this.user].squad.map(id=>this.P(id));
    return NEEDS.map(([k,label,short,target])=>{ const have=sq.filter(p=>needRoles(p).includes(k)).length; return {k,label,short,target,have,left:Math.max(0,target-have)}; }); }
  // Tags for a pool player: the needs he would fill, or high potential.
  fitTags(p,needs){ needs=needs||this.userNeeds(); const r=needRoles(p); const tags=needs.filter(n=>n.left>0&&r.includes(n.k)).map(n=>({t:`${n.short} need`,c:'b'}));
    if(p.age<=21&&p.pot>=78) tags.push({t:'High potential',c:'g'}); return tags; }
  // How many AI teams badly want this player (needFor above 1.2).
  needDemand(p){ let d=0; for(const tid in this.teams){ if(tid===this.user) continue; if(this.canAdd(tid,p)&&this.needFor(tid,p)>1.2) d++; } return d; }
  // Likely price: a range from value x need demand, never below the base price.
  likelyPrice(p){ const base=this.basePrice(p), d=this.needDemand(p), v=Math.max(p.value,base);
    const lo=Math.max(base,v*(0.9+0.06*d)), hi=Math.max(lo+(lo<10?1:2),v*(1.1+0.09*d)); return [roundL(lo),roundL(hi)]; }
  slEntry(pid){ return this.s.shortlist.find(e=>e.pid===pid)||null; }
  toggleShortlist(pid){ const i=this.s.shortlist.findIndex(e=>e.pid===pid); if(i>=0){ this.s.shortlist.splice(i,1); return false; } this.s.shortlist.push({pid,max:0,priority:'B'}); return true; }
  setShortlist(pid,patch){ let e=this.slEntry(pid); if(!e){ e={pid,max:0,priority:'B'}; this.s.shortlist.push(e); } Object.assign(e,patch); if(e.max<0) e.max=0; return e; }
  // The auction pool: lots in order, or before setup, everyone without a club.
  auctionPool(){ const A=this.s.auction; if(A&&A.lots) return A.lots.map(l=>this.P(l.pid)); return Object.values(this.players).filter(p=>!p.team&&!p.retired&&!p.academy); }
  // Sum of max bids per purse, and what still needs attention.
  budgetCheck(){ const t=this.teams[this.user]; const r={os:{sum:0,purse:t.osPurse},dom:{sum:0,purse:t.purse},warn:[]};
    for(const e of this.s.shortlist){ const p=this.P(e.pid); if(!p||p.team) continue; const k=p.nat==='NEP'?'dom':'os'; r[k].sum+=e.max||0;
      const [lo]=this.likelyPrice(p);
      if(!e.max&&e.priority==='A') r.warn.push(`Set a max for ${p.name}.${lo>r[k].purse?` His likely price is more than your remaining ${k==='os'?'overseas':'domestic'} budget.`:''}`);
      else if(e.max&&e.max<lo) r.warn.push(`Your max for ${p.name} is below his likely price.`); }
    for(const k of ['os','dom']) if(r[k].sum>r[k].purse) r.warn.push(`Your ${k==='os'?'overseas':'domestic'} max bids add up to more than the purse.`);
    return r; }
  // Best value per unfilled need, within each purse after keeping money back for the minimum squad.
  // Value = rating minus the likely price as a share of that purse, so a Rs 40 L overseas star can beat
  // a Rs 5 L Nepali squad player. Then overseas targets are topped up to the 6-player minimum.
  autoSuggest(){
    const t=this.teams[this.user]; const needs=this.userNeeds(); const added=[];
    const cap={os:t.osPurse,dom:t.purse}; const left={os:t.osPurse,dom:t.purse};
    const live=()=>this.s.shortlist.map(e=>({e,p:this.P(e.pid)})).filter(x=>x.p&&!x.p.team);
    for(const {e,p} of live()) left[p.nat==='NEP'?'dom':'os']-=e.max||0;
    const taken=new Set(this.s.shortlist.map(e=>e.pid)); const pool=this.auctionPool().filter(p=>p&&!p.team&&!p.retired&&!p.academy&&this.canAdd(this.user,p));
    const kind=p=>p.nat==='NEP'?'dom':'os';
    const score=(p,lp)=>ovr(p)-25*((lp[0]+lp[1])/2)/Math.max(10,cap[kind(p)]);
    const take=(p,lp)=>{ left[kind(p)]-=lp[1]; taken.add(p.id); this.s.shortlist.push({pid:p.id,max:lp[1],priority:added.length<2?'A':'B'}); added.push(p.id); };
    // money kept back for the minimum-squad slots still uncovered after this pick, priced at the cheapest
    // likely prices among players not yet targeted and not the candidate himself
    const LP=new Map(pool.map(p=>[p.id,this.likelyPrice(p)]));
    // slots can also be filled after the auction: overseas free agents who are not lots sign at their value in
    // the pre-season window, Nepali ones at base price, so they count towards the cheapest way to fill a slot
    const inLots=new Set(pool.map(p=>p.id)); const later=Object.values(this.players).filter(p=>!p.team&&!p.retired&&!p.academy&&!inLots.has(p.id)&&this.canAdd(this.user,p));
    for(const p of later){ const pr=p.nat==='NEP'?this.basePrice(p):p.value; LP.set(p.id,[pr,pr]); }
    const fillers=pool.concat(later);
    const reserve=(k,cand,lowP)=>{ const os=this.osCount(this.user)+live().filter(x=>x.p.nat!=='NEP').length, sq=t.squad.length+live().length;
      const osLeft=Math.max(0,MIN_OS-os), domLeft=Math.max(0,MIN_SQUAD-sq-osLeft); const n=(k==='os'?osLeft:domLeft)-1; if(n<=0) return 0;
      return fillers.filter(p=>kind(p)===k&&!taken.has(p.id)&&p.id!==cand).map(p=>LP.get(p.id)[lowP?0:1]).sort((a,b)=>a-b).slice(0,n).reduce((a,b)=>a+b,0); };
    // strict: keep the reserve at likely high prices; if nothing fits, fall back to low prices (unsold
    // players can still be signed at base in the accelerated round), so a tight purse gets a target, not none
    const fits=(filter,lowP)=>pool.filter(p=>!taken.has(p.id)&&filter(p)).map(p=>({p,lp:LP.get(p.id)})).filter(x=>x.lp[1]+reserve(kind(x.p),x.p.id,lowP)<=left[kind(x.p)]).map(x=>({...x,v:score(x.p,x.lp)})).sort((a,b)=>b.v-a.v);
    // role needs stay strict; only the overseas-minimum top-up may fall back to low prices
    const best=(filter,relax)=>{ const a=fits(filter,false); return a.length||!relax?a:fits(filter,true); };
    for(const nd of needs){ let want=nd.left-live().filter(x=>needRoles(x.p).includes(nd.k)).length;
      while(want>0){ const c=best(p=>needRoles(p).includes(nd.k))[0]; if(!c) break; take(c.p,c.lp); want--; } }
    let osWant=Math.max(0,MIN_OS-this.osCount(this.user)-live().filter(x=>x.p.nat!=='NEP').length);
    while(osWant>0){ const c=best(p=>p.nat!=='NEP',true)[0]; if(!c) break; take(c.p,c.lp); osWant--; }
    return added; }
  // "Jump to": two increments above the current bid (a normal bid is one).
  jumpBidAmount(){ const c=this.s.auction.cur; const p=this.P(c.pid); const a=this.nextBidAmount(); return Math.round((a+this.incr(p,a))*10)/10; }
  nextBidAmount(){ const c=this.s.auction.cur; const p=this.P(c.pid); return c.bid==null? c.base : Math.round((c.bid+this.incr(p,c.bid))*10)/10; }
  // returns {type:'bid',team,amount} | {type:'wait'} | {type:'hammer'}
  aiStep(userIsAI){
    const A=this.s.auction,c=A.cur; const p=this.P(c.pid); const nb=this.nextBidAmount();
    const cands=[];
    for(const tid in this.teams){ if(tid===c.leader) continue; if(tid===this.user && !userIsAI) continue; const m=this.aiMax(tid,p); if(m>=nb) cands.push([tid,m-nb+0.5]); }
    if(!cands.length) return {type:'none'};
    let tot=cands.reduce((a,x)=>a+x[1],0), r=R()*tot; let pickT=cands[0][0]; for(const x of cands){ r-=x[1]; if(r<=0){pickT=x[0];break;} }
    c.bid=nb; c.leader=pickT; c.hist.push([pickT,nb]); return {type:'bid',team:pickT,amount:nb};
  }
  userBid(amount){ const c=this.s.auction.cur; const p=this.P(c.pid); const nb=amount&&amount>this.nextBidAmount()?amount:this.nextBidAmount(); if(!this.canAdd(this.user,p)) return 'Your squad has no room for this player.'; if(nb>this.budgetOf(this.user,p)) return 'You cannot afford that bid.'; if(nb>this.lotMax(this.user,p)) return `Over your limit: your max on this lot is ${fmtL(this.lotMax(this.user,p))}.`; c.bid=nb; c.leader=this.user; c.hist.push([this.user,nb]); return null; }
  hammer(){
    const A=this.s.auction,c=A.cur; const p=this.P(c.pid);
    if(c.leader){ this.signPlayer(p,c.leader,c.bid); A.sold.push({pid:p.id,team:c.leader,price:c.bid,set:c.set}); }
    else { A.unsold.push(p.id); }
    c.done=true; A.i++;
    return c.leader;
  }
  rtmCandidate(){ // mega only: previous team may match
    const A=this.s.auction,c=A.cur; if(A.kind!=='mega'||!c.leader) return null; const p=this.P(c.pid); const pt=p.prevTeam;
    if(!pt||pt===c.leader||!this.teams[pt].rtm||!this.canAdd(pt,p)) return null; if(this.budgetOf(pt,p)<c.bid) return null; return pt;
  }
  useRTM(pt){ const c=this.s.auction.cur; this.teams[pt].rtm--; c.leader=pt; c.hist.push([pt,c.bid,'RTM']); }
  signPlayer(p,tid,price){ const t=this.teams[tid]; p.team=tid; this.nocOnSigning(p); p.salary=price; p.contractTo=this.s.settings.nextMega-1; t.squad.push(p.id); p.hist.push({year:this.year,team:tid}); this.recalcPurse(tid); }
  simLot(userIsAI){ // instant resolution of current lot
    const c=this.s.auction.cur; let guard=0;
    while(guard++<400){ const r=this.aiStep(userIsAI); if(r.type==='none') break; }
    const pt=this.rtmCandidate(); if(pt){ const p=this.P(c.pid); if(pt!==this.user||userIsAI){ if(p.value*this.needFor(pt,p)*1.1>=c.bid) this.useRTM(pt);} else { c.rtmAsk=pt; return 'rtm'; } }
    return this.hammer();
  }
  finishAuction(){
    const A=this.s.auction;
    // accelerated fill for AI teams to minimums
    // Nepali slots only: overseas free agents stay open for the user's pre-season window, and the AI
    // teams sign theirs in aiPreseason() when the user starts the season.
    const pool=()=>Object.values(this.players).filter(p=>!p.team&&!p.retired&&!p.academy&&p.nat==='NEP');
    for(const tid in this.teams){ if(tid===this.user) continue; this.fillSquad(tid,pool); }
    A.done=true; this.s.shortlist=[];
  }
  fillSquad(tid,poolFn){
    let guard=0;
    while(guard++<30){
      const need=this.slotsNeeded(tid); const t=this.teams[tid];
      if(need.os<=0&&need.nep<=0&&need.total<=0) break;
      const ok=p=>{ if(!this.canAdd(tid,p)) return false; const n=this.slotsNeeded(tid); const left=p.nat==='NEP'?Math.max(0,n.nep-1)*2:Math.max(0,n.os-1)*3; return this.basePrice(p)<=this.budgetOf(tid,p)-left; };
      let cands=[];
      if(need.os>0) cands=poolFn().filter(p=>p.nat!=='NEP'&&ok(p));
      if(!cands.length&&(need.nep>0||need.total>0)) cands=poolFn().filter(p=>p.nat==='NEP'&&ok(p));
      if(!cands.length&&need.total>0) cands=poolFn().filter(p=>ok(p));
      cands.sort((a,b)=>ovr(b)-ovr(a));
      if(!cands.length){ // last resort: minimum-wage contracts so a squad can always field a side
        const need2=this.slotsNeeded(tid);
        if(need2.os>0){ const c=poolFn().filter(p=>p.nat!=='NEP'&&this.canAdd(tid,p)).sort((a,b)=>a.value-b.value)[0]; if(c&&this.teams[tid].osPurse>=1){ this.signPlayer(c,tid,Math.min(3,this.teams[tid].osPurse)); continue; } }
        if(need2.nep>0||need2.total>0){ const c=poolFn().filter(p=>p.nat==='NEP'&&this.canAdd(tid,p)).sort((a,b)=>ovr(b)-ovr(a))[0]; if(c){ this.signPlayer(c,tid,Math.min(2,Math.max(0,this.teams[tid].purse))); continue; } }
        break; }
      const p=cands[0]; this.signPlayer(p,tid,this.basePrice(p)); this.s.auction&&this.s.auction.sold.push({pid:p.id,team:tid,price:this.basePrice(p),set:'Accelerated'});
    }
  }
  startSeason(){
    const poolFn=()=>Object.values(this.players).filter(p=>!p.team&&!p.retired&&!p.academy);
    for(const tid in this.teams){ if(this.teams[tid].squad.length<MIN_SQUAD) this.fillSquad(tid,poolFn); }
    for(const tid in this.teams){ const t=this.teams[tid]; const wages=t.squad.reduce((a,id)=>a+this.P(id).salary,0);
      // staff wages come from the balance; release fees already paid in the off-season are shown with them
      const sw=this.staffWages(tid), fees=t.staffFees||0; t.staffFees=0;
      t.ledger={gate:0,sponsor:Math.round(40+t.fans*0.5),central:50,prize:0,wages:-Math.round(wages),staff:-Math.round((sw+fees)*10)/10,staffFees:fees};
      t.balance+=t.ledger.sponsor+t.ledger.central+t.ledger.wages-sw; }
    for(const tid in this.teams){ const t=this.teams[tid]; if(!t.captainId||!t.squad.includes(t.captainId)) t.captainId=t.squad.slice().sort((a,b)=>ovr(this.P(b))-ovr(this.P(a)))[0]; this.recalcPurse(tid); }
    if(this.year>2026) this.makeFixtures();
    this.drawNationalDuty();
    this.setObjectives(); this.s.phase='league';
    const t=this.teams[this.user]; this.news(`Season ${this.year} begins. The board's objective: ${t.objective.txt}.`,'board');
    this.hook('seasonStart');
  }
  // Pre-season overseas signing window
  osFreeAgents(){ return Object.values(this.players).filter(p=>!p.team&&!p.retired&&!p.academy&&p.nat!=='NEP').sort((a,b)=>ovr(b)-ovr(a)); }
  signFA(pid,tid){ const p=this.P(pid); tid=tid||this.user; if(!this.canAdd(tid,p)) return 'No squad room.'; const price=p.nat==='NEP'?this.basePrice(p):p.value; if(price>this.budgetOf(tid,p)) return 'Not enough budget.'; this.signPlayer(p,tid,price); return null; }
  releasePlayer(pid){ const p=this.P(pid); const t=this.teams[p.team]; t.squad=t.squad.filter(x=>x!==pid); p.prevTeam=p.team; p.team=null; if(t.xi) t.xi=t.xi.filter(x=>x!==pid); this.recalcPurse(t.id); }
  aiPreseason(){
    const signed={};
    for(const tid in this.teams){ if(tid===this.user) continue; let g=0; while(this.osCount(tid)<MIN_OS && g++<10){ const c=this.osFreeAgents().filter(p=>p.value<=this.teams[tid].osPurse&&this.canAdd(tid,p)); if(!c.length) break; const p= R()<0.6? c[0]: pick(c.slice(0,6)); this.signFA(p.id,tid); (signed[tid]=signed[tid]||[]).push(`${p.name} (${fmtL(p.value)})`); }
      const pool=()=>Object.values(this.players).filter(p=>!p.team&&!p.retired&&!p.academy); this.fillSquad(tid,pool); }
    const k=Object.keys(signed); if(k.length) this.news(`Overseas signings: ${k.length} franchise${k.length>1?'s':''} strengthen${k.length>1?'':'s'} up`,'signing',{detail:k.map(t=>`${this.teams[t].name}: ${signed[t].join(', ')}`).join('. ')+'.',ne:'विदेशी खेलाडी अनुबन्ध'});
  }
}
function ordinal(n){const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
function careerOf(p){ const c={m:0,inn:0,r:0,b:0,no:0,f:0,s:0,hs:0,ff:0,h:0,bb:0,rc:0,w:0,bw:0,br:999,ct:0,mom:0}; for(const y in p.stats){const s=p.stats[y]; for(const k of ['m','inn','r','b','no','f','s','ff','h','bb','rc','w','ct','mom']) c[k]+=s[k]; if(s.hs>c.hs)c.hs=s.hs; if(s.bw>c.bw||(s.bw===c.bw&&s.br<c.br)){c.bw=s.bw;c.br=s.br;}} return c; }
export {dayTime,MIN_BASE};
export {Game,DIFFICULTY,STAFF_POSTS,STAFF_WAGE,STAFF_SPEC,gradeOf,staffWage,careerOf,ordinal,effectLines,cautiousIndex,BOWL_PHASES,PHASE_CAP,NEEDS,needRoles,OS_CAP,DOM_CAP,MAX_OS,MIN_OS,SLABS,MAX_SQUAD,MIN_SQUAD};
