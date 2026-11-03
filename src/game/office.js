// ===== Phase 2 module: office (people, money and recruitment) =====
// Staff room extras (opinions, interviews, advice, budget), contract talks, the board meeting
// (pillars, objectives, facility requests), sponsors and fans, and the recruitment meeting.
// State lives in G.s.office; approved facilities in G.s.facilities = { key: yearApproved }.
// Staff, agents, sponsors, board members and fans here are all generated.
import { R, ri, pick, clamp, ovr, isSpin, isPace, fmtL, getPID } from './engine.js';
import { NEP_NAMES, PROVINCES } from './data.js';
import { nudgePillar, addPromise, logDecision, adjustHappy, injuryRisk, PILLARS } from './depth.js';
import { narrow as narrowPot, rateFor } from './club.js';

const POSTS = [['assistant', 'Assistant manager'], ['bat', 'Batting coach'], ['bowl', 'Bowling coach'], ['spin', 'Spin coach'], ['field', 'Fielding coach'], ['analyst', 'Analyst'], ['physio', 'Physio'], ['scout', 'Head scout'], ['mental', 'Mental-skills coach']];
export const POST_LABEL = Object.fromEntries(POSTS);
export const POST_NP = { assistant: 'सहायक प्रबन्धक', bat: 'ब्याटिङ प्रशिक्षक', bowl: 'बलिङ प्रशिक्षक', spin: 'स्पिन प्रशिक्षक', field: 'फिल्डिङ प्रशिक्षक', analyst: 'विश्लेषक', physio: 'फिजियो', scout: 'मुख्य स्काउट', mental: 'मानसिक प्रशिक्षक' };
const userFix = (G, f) => f && (f.home === G.user || f.away === G.user);
const sur = (p) => p.name.split(' ').slice(-1)[0];
const r1 = (x) => Math.round(x * 10) / 10;
const roundL = (x) => (x < 10 ? Math.round(x * 2) / 2 : Math.round(x));
const O = (G) => G.s.office;
const T = (G) => G.teams[G.user];
const leaguePlayed = (G) => G.s.fixtures.filter((f) => f.stage === 'L' && f.res && userFix(G, f)).length;
const ledgerAdd = (t, k, v) => { if (t.ledger) t.ledger[k] = r1((t.ledger[k] || 0) + v); };
const pay = (G, k, v) => { const t = T(G); t.balance = r1(t.balance + v); ledgerAdd(t, k, v); };
const auto = (G) => !!(G.s.settings && G.s.settings.assistant);

// ===================== staff =====================
export const gradeOfL = (L) => (L >= 4 ? 'A' : L === 3 ? 'B' : L === 2 ? 'C' : L >= 1 ? 'D' : '');
export const STAFF_DOES = {
  assistant: 'Advice quality, and runs the club when the assistant decides',
  bat: 'Development of batters under 26; form recovery',
  bowl: 'Development of pace bowlers under 26; death bowling',
  spin: 'Development of spinners under 26',
  field: 'Fielding of players under 30',
  analyst: 'Matchup and opposition advice',
  physio: 'Injury length and fitness after matches',
  scout: 'How fast reports narrow a player\'s potential',
  mental: 'Composure in key moments and playoffs',
};
// What a numeric level does in each post, from the rules in game.js, engine.js, composure.js and club.js.
export function staffEffect(post, L) {
  if (!L) return { physio: 'Injuries last a match longer', bat: 'Young batters develop at the normal rate', bowl: 'Young pace bowlers develop at the normal rate', spin: 'Spinners get half the bowling coach\'s help', field: 'No fielding work', analyst: 'Vaguer advice before matches', assistant: 'Vaguer advice; no one to run the club', scout: 'Reports narrow potential slowly', mental: 'No composure help' }[post];
  const d = Math.round(L / 2);
  return {
    assistant: `Advice quality +${L * 10}%`, bat: `+${d} a season for under-26 batters · form back ${L * 10}% quicker`, bowl: `+${d} a season for under-26 pace · death bowling +${(0.4 * L).toFixed(1)}`,
    spin: `+${d} a season for under-26 spinners`, field: L >= 3 ? '+1 fielding a season for under-30s' : '+1 fielding some seasons', analyst: `Advice quality +${L * 10}%`,
    physio: `Injuries ${d} match${d > 1 ? 'es' : ''} shorter · +${L} fitness a match`, scout: `Reports narrow potential ${L * 5}% faster`, mental: `Composure +${(1.5 * L).toFixed(1)} in every innings`,
  }[post];
}
export function opinionLabel(x) {
  const o = x.op ?? 55;
  if (o >= 75) return ['Loyal', 'blu']; if (o >= 58) return ['Respects you', '']; if (o >= 42) return ['Neutral', ''];
  return [x.want ? `Unhappy · ${x.want}` : 'Unhappy', 'crim'];
}
// Advice quality 0-1 from the assistant and the analyst (and the analysis room).
export function adviceQuality(G, tid = G.user) {
  const a = G.staffLevel(tid, 'assistant'), b = G.staffLevel(tid, 'analyst');
  return clamp((a + b) / 8 * 0.85 + (tid === G.user && facility(G, 'analysis') ? 0.15 : 0), 0, 1);
}
export const STAFF_BUDGET = 36;
export const staffBudget = (G) => STAFF_BUDGET + (facility(G, 'wages') ? 10 : 0);
// The grade a candidate shows before an interview is a range; an interview reveals it.
export function candGrade(c) { if (c.iv) return gradeOfL(c.level); const hi = gradeOfL(Math.min(4, c.level + 1)), lo = gradeOfL(Math.max(1, c.level - 1)); return hi === lo ? hi : `${hi}–${lo}`; }
const BIO = {
  hi: ['Worked with a national age-group side', 'Ten years in first-class cricket coaching', 'Respected across the league', 'Former captain at provincial level'],
  mid: ['Steady record with a provincial team', 'Former first-class player', 'Coached in the domestic one-day cup', 'Good with young players'],
  lo: ['New to the professional game', 'Background in club cricket', 'Came through school coaching', 'Cheap, slow to show results'],
};
export function candBio(c) { const k = c.level >= 4 ? 'hi' : c.level >= 2 ? 'mid' : 'lo'; const list = BIO[k]; return list[(c.name.length + c.level) % list.length]; }
export const IV_PER_WINDOW = 3;
export function interviewsLeft(G) { const iv = O(G).iv; return iv.y === G.year ? IV_PER_WINDOW - iv.n : IV_PER_WINDOW; }
export function interview(G, post, i) {
  if (!G.staffWindow()) return 'Interviews happen in the pre-season and off-season.';
  const c = G.staffCandidates(post)[i]; if (!c) return 'That candidate is no longer available.'; if (c.iv) return null;
  const iv = O(G).iv; if (iv.y !== G.year) { iv.y = G.year; iv.n = 0; } if (iv.n >= IV_PER_WINDOW) return 'No interview slots left this window.';
  iv.n++; c.iv = true;
  logDecision(G, 'staff', `Interview for ${POST_LABEL[post].toLowerCase()}`, c.name, `Grade ${gradeOfL(c.level)} · ${c.spec}`);
  return null;
}
// Hire the best candidate per vacant post that keeps the wage bill within the budget (the assistant).
export function autoStaff(G) {
  const st = G.s.staff[G.user]; if (!st || !G.staffWindow()) return 0; let n = 0;
  for (const [k] of POSTS) {
    if (st[k]) continue; const list = G.staffCandidates(k); const room = staffBudget(G) - G.staffWages(G.user);
    let best = -1; list.forEach((c, i) => { if (c.wage <= room && (best < 0 || c.level > list[best].level)) best = i; });
    if (best < 0) best = list.reduce((m, c, i) => (m < 0 || c.wage < list[m].wage ? i : m), -1);
    if (best >= 0 && !G.hireStaff(k, best)) n++;
  }
  return n;
}
function staffMood(G, d) { const st = G.s.staff[G.user] || {}; for (const k in st) if (st[k]) st[k].op = clamp(r1((st[k].op ?? 55) + d), 0, 100); }

// Staff advice to the inbox after the user's matches, every second match. Quality decides accuracy.
function staffAdvice(G) {
  const t = T(G); const st = G.s.staff[G.user] || {}; const q = adviceQuality(G); const nf = G.userNext();
  const sq = t.squad.map((id) => G.P(id)).filter((p) => p && !p.inj);
  const opts = [];
  if (st.physio && nf) { const risky = sq.map((p) => [p, injuryRisk(G, p)]).filter(([, r]) => r >= 8).sort((a, b) => b[1] - a[1])[0];
    if (risky) opts.push(() => ({ text: `${risky[0].name} should sit out the next match`, by: 'physio', sum: `Injury risk ${risky[1]}% after his recent workload. ${st.physio.name} wants him rested.`, pid: risky[0].id,
      choices: [{ l: 'Rest him', fx: { pid: risky[0].id, rest: true } }, { l: 'Keep him in', fx: {} }], safe: 0 })); }
  if (st.bat) { const p = sq.filter((x) => x.age < 26 && x.bat >= 45 && x.role !== 'BOWL' && x.focus !== 'Batting').sort((a, b) => a.form - b.form)[0];
    if (p && p.form < 0) opts.push(() => ({ text: `${p.name} needs work on his batting`, by: 'bat', sum: `Form ${((p.form + 10) / 2).toFixed(1)} of 10. A batting focus speeds his development this season.`, pid: p.id, ofx: { focus: 'Batting' },
      choices: [{ l: 'Set a batting focus', fx: { pid: p.id, morale: 2 } }, { l: 'Not now', fx: {} }], safe: 1 })); }
  if ((st.analyst || st.assistant) && nf) { const opp = nf.home === G.user ? nf.away : nf.home; const E = (G.s.phaseEco[G.year] || {})[opp];
    if (E) { const names = { pp: 'the powerplay', mid: 'the middle overs', death: 'the death' }; const ks = Object.keys(E).filter((k) => E[k][1] >= 6);
      if (ks.length) { const true_ = ks.sort((a, b) => E[b][0] / E[b][1] - E[a][0] / E[a][1])[0]; const said = R() < 0.45 + 0.55 * q ? true_ : pick(ks);
        const who = st.analyst ? 'analyst' : 'assistant';
        opts.push(() => ({ text: `Attack ${G.teams[opp].name.split(' ')[0]} in ${names[said]}`, by: who, sum: q >= 0.5 ? `They concede ${(E[said][0] / E[said][1]).toFixed(1)} an over there this season.` : 'A feeling from watching their games; the numbers are thin.' })); } } }
  if (st.scout) { const prov = pick(PROVINCES); opts.push(() => ({ text: `"Give me ${prov} this month. Nobody is watching it."`, by: 'scout', sum: `${st.scout.name}, head scout` })); }
  if (!opts.length) return;
  const recent = G.s.inbox.filter((n) => n.kind === 'staff').slice(0, 2).map((n) => n.by);
  const made = opts.map((f) => f()); const a = made.find((x) => !recent.includes(x.by)) || made[0]; const x = st[a.by];
  if (a.choices && auto(G)) { if (a.ofx && a.pid) G.P(a.pid).focus = a.ofx.focus; if (a.choices[0].fx.rest) G.P(a.pid).rest = true; x.op = clamp((x.op ?? 55) + 1, 0, 100); return; }
  G.news(a.text, 'staff', { title: a.text, cat: POST_LABEL[a.by], sum: a.sum, by: a.by, ofx: a.ofx, pid: a.pid, ...(a.choices ? { choices: a.choices, safe: a.safe, due: null, done: false } : {}) });
}
// Advice that was answered: taking it pleases the staff member; a batting focus is applied.
function sweepAdvice(G) {
  const st = G.s.staff[G.user] || {};
  for (const n of G.s.inbox) { if (n.kind !== 'staff' || !n.choices || !n.done || n.judged) continue; n.judged = true; const x = st[n.by]; const took = n.picked === n.choices[0].l;
    if (took && n.ofx && n.pid && G.P(n.pid)) G.P(n.pid).focus = n.ofx.focus; if (x) x.op = clamp((x.op ?? 55) + (took ? 3 : -2), 0, 100); }
}

// ===================== board =====================
// [key, name, what it does, cost (Rs L), annual?, base approval %]
export const FACILITIES = [
  ['nets', 'Indoor nets', 'Train through the monsoon: +1 development a year for players under 24', 40, false, 70],
  ['analysis', 'Analysis room', 'Sharper matchups and opposition advice (advice quality +15%)', 12, false, 85],
  ['gym', 'Gym and recovery centre', 'Injuries a match shorter (2+ matches) and +2 fitness after every match', 30, false, 65],
  ['scout', 'Bigger scouting budget', '2 more scouting trips before each auction', 5, true, 80],
  ['hostel', 'Academy hostel', 'A far-province prospect joins the pool each year; youth +2 a season', 25, false, 75],
  ['wages', 'Higher wage budget', '+Rs 10 L on the staff budget', 20, true, 45],
];
export const FAC = Object.fromEntries(FACILITIES.map((f) => [f[0], f]));
export const facility = (G, key) => !!(G.s.facilities && G.s.facilities[key]);
// Weighted pillar score 0-100 (results count most).
const PW = { results: 0.35, finances: 0.2, fans: 0.2, youth: 0.1, conduct: 0.15 };
export function pillarScore(G) { const P = G.s.pillars || {}; return Math.round(Object.keys(PW).reduce((a, k) => a + PW[k] * (P[k] ?? 60), 0)); }
// Board confidence moves with the pillars around a neutral 60: (score − 60) × 0.3, rounded.
export function pillarDelta(G) { return Math.round((pillarScore(G) - 60) * 0.3) || 0; }
export function approvalOdds(G, key, picks = []) {
  const f = FAC[key]; if (!f) return 0; const t = T(G); const P = G.s.pillars || {};
  const n = picks.includes(key) ? picks.length : picks.length + 1;
  let o = f[5] + (t.board - 60) * 0.4 + ((P.finances ?? 60) - 60) * 0.2 - 15 * (n - 1);
  if (t.balance < f[3]) o -= 20;
  return clamp(Math.round(o), 5, 95);
}
const MEET_PHASES = ['seasonEnd', 'offseason', 'retention', 'auction', 'preseason'];
export function meetingOpen(G) { const m = O(G).meeting; return !!(m && !m.done && MEET_PHASES.includes(G.s.phase)); }
export function putRequests(G, picks) {
  const m = O(G).meeting; if (!m || m.done) return 'There is no board meeting open.';
  picks = picks.filter((k) => FAC[k] && !facility(G, k)).slice(0, 2); const t = T(G); const out = [];
  for (const k of picks) { const odds = approvalOdds(G, k, picks); const ok = R() * 100 < odds; const f = FAC[k];
    if (ok) { G.s.facilities[k] = G.year; t.balance = r1(t.balance - f[3]); G.news(`The board approves the ${f[1].toLowerCase()}. ${fmtL(f[3])}${f[4] ? ' a season' : ''} from the club balance.`, 'board', { detail: f[2] }); }
    else G.news(`The board turns down the ${f[1].toLowerCase()}.`, 'board');
    out.push({ k, odds, ok }); logDecision(G, 'board', `Board request: ${f[1]}`, `Asked (${odds}% chance)`, ok ? 'Approved' : 'Turned down'); }
  if (picks.length === 2 && out.every((x) => !x.ok)) t.board = clamp(t.board - 2, 0, 100);
  m.asked = out; m.reqDone = true; return null;
}
// Objectives beyond the league finish: required ones cost confidence when missed, bonus ones only add.
function objectivesFor(G, y) {
  const t = T(G); const fans = t.fans || 55;
  return [
    { k: 'staff', txt: `Keep the staff wage bill within ${fmtL(staffBudget(G))}`, req: 'Required' },
    { k: 'youth', txt: 'Give 2 players aged 21 or under a game', target: 2, req: 'Required' },
    { k: 'crowd', txt: `Draw ${fans >= 65 ? '13,000' : '11,000'} or more to 3 home games`, target: 3, att: fans >= 65 ? 13000 : 11000, req: 'Bonus' },
  ].map((o) => ({ ...o, y }));
}
function judgeObjective(G, o) {
  const y = G.year;
  if (o.k === 'staff') { const w = G.staffWages(G.user), b = staffBudget(G); return { st: w <= b * 0.85 ? 'Exceeded' : w <= b ? 'Met' : 'Behind', note: `Ended at ${fmtL(w)}` }; }
  if (o.k === 'youth') { const n = T(G).squad.map((id) => G.P(id)).filter((p) => p && p.age <= 21 && p.stats[y] && p.stats[y].m > 0).length; return { st: n >= o.target + 2 ? 'Exceeded' : n >= o.target ? 'Met' : 'Behind', note: `${n} of ${o.target}` }; }
  if (o.k === 'crowd') { const n = G.s.fixtures.filter((f) => f.res && f.home === G.user && (f.att || 0) >= o.att).length; return { st: n >= o.target + 2 ? 'Exceeded' : n >= o.target ? 'Met' : 'Behind', note: `${n} of ${o.target} home games` }; }
  return { st: 'Met', note: '' };
}
// Called from boardReview: the secondary objectives' effect on confidence (0 when none were set).
export function reviewObjectives(G, effRank, obj) {
  const st = O(G) && O(G).obj; if (!st || st.y !== G.year) return 0;
  let d = 0; const out = [];
  const main = { k: 'rank', txt: obj.txt, req: 'Required', st: effRank < obj.rank ? 'Exceeded' : effRank <= obj.rank ? 'Met' : 'Behind', note: effRank === 1 ? 'Champions' : effRank === 2 ? 'Runners-up' : `Finished ${effRank}` };
  out.push(main);
  for (const o of st.list) { const j = judgeObjective(G, o); out.push({ ...o, ...j });
    if (o.req === 'Required') d += j.st === 'Behind' ? -3 : j.st === 'Exceeded' ? 2 : 0; else d += j.st === 'Behind' ? 0 : 2; }
  st.review = out; return d;
}
const TIERS = [{ txt: 'Win the title or reach the final', rank: 2 }, { txt: 'Reach the playoffs (top 4)', rank: 4 }, { txt: 'Finish in the top 6', rank: 6 }];
export function negotiate(G) {
  const m = O(G).meeting; if (!m || m.negotiated) return 'The objectives have already been discussed.';
  const t = T(G); const odds = clamp(Math.round(45 + (t.board - 60) * 0.6), 10, 85); const ok = R() * 100 < odds;
  m.negotiated = ok ? 'won' : 'lost'; m.ease = ok;
  if (ok) { for (const o of m.next) if (o.k === 'youth') o.target = Math.max(1, o.target - 1), o.txt = `Give ${o.target} player${o.target > 1 ? 's' : ''} aged 21 or under a game`; }
  else t.board = clamp(t.board - 3, 0, 100);
  logDecision(G, 'board', 'Negotiate next season\'s objectives', `Asked for easier targets (${odds}% chance)`, ok ? 'The board eases the league target by one step' : 'Refused; board confidence −3');
  return null;
}
export function closeMeeting(G) { const m = O(G).meeting; if (m) m.done = true; }
const CHAIR = {
  high: ['Two good years. Now show me a player who came through our own academy.', 'The city is proud of this team. Keep the books as tidy as the results.', 'Results like these sell tickets. Do not let the wage bill run away.'],
  mid: ['A fair season. Fair is not what we pay for.', 'We expect more next year, and so do the fans.', 'The board backs you, for now. Show us a plan.'],
  low: ['This was not good enough, and you know it.', 'The sponsors are asking questions. So am I.', 'One more season like this and we will be having a different conversation.'],
};
export function chairLine(G) { const b = T(G).board; const k = b >= 70 ? 'high' : b >= 50 ? 'mid' : 'low'; const L = CHAIR[k]; return L[(G.year + b) % L.length]; }

// ===================== contracts =====================
export const ROLES = ['Rotation', 'Regular', 'Key player'];
export const MAX_DEALS = 4;
const TALK_PHASES = ['playoffs', 'seasonEnd', 'offseason', 'retention'];
// The season a deal is struck in: this year during the season, last year once the off-season starts.
export const dealSeason = (G) => (['league', 'playoffs', 'seasonEnd', 'preseason'].includes(G.s.phase) ? G.year : G.year - 1);
export function talkWindow(G) { if (G.s.phase === 'league') return leaguePlayed(G) >= 10; return TALK_PHASES.includes(G.s.phase); }
export function dealsLeft(G) { const w = dealSeason(G); return MAX_DEALS - Object.values(O(G).talks).filter((x) => x.win === w && x.status === 'signed').length; }
export function expiring(G) {
  const w = dealSeason(G);
  return T(G).squad.map((id) => G.P(id)).filter((p) => p && !p.temp && p.contractTo != null && p.contractTo <= w).sort((a, b) => b.value - a.value);
}
function expectedRole(G, p) { const sq = T(G).squad.map((id) => G.P(id)).filter(Boolean).sort((a, b) => ovr(b) - ovr(a)); const i = sq.indexOf(p);
  const xi = G.autoXI(G.user); return i >= 0 && i < 4 ? 'Key player' : xi.includes(p.id) ? 'Regular' : 'Rotation'; }
// Agents are generated, and the same player keeps the same agent (picked from his id), never a real player's name.
function agentName(G, p) { const players = new Set(Object.values(G.players).map((x) => x.name)); const provs = Object.keys(NEP_NAMES);
  let h = 7; for (const c of String(p.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  for (let g = 0; g < 40; g++, h = (h * 1103515245 + 12345) >>> 0) { const N = NEP_NAMES[provs[h % provs.length]]; const n = `${N.f[(h >>> 4) % N.f.length]} ${N.l[(h >>> 9) % N.l.length]}`; if (!players.has(n)) return n; }
  return 'Bimal Karki-Rana'; }
export function askOf(G, p) {
  const base = p.nat === 'NEP' ? Math.max(2, p.value * 1.15 + Math.max(0, p.form) * 0.3) : p.value * 1.1;
  const amb = p.traits ? p.traits.amb : 50;
  return { wage: roundL(Math.max(base, (p.salary || 0) * 1.05)), role: expectedRole(G, p), yrs: p.age >= 30 ? 3 : p.age <= 23 && amb >= 60 ? 1 : 2, rel: amb >= 65 };
}
export function talkOf(G, pid) { const x = O(G).talks[pid]; return x && x.win === dealSeason(G) ? x : null; }
export function openTalk(G, pid) {
  const p = G.P(pid); if (!p || p.team !== G.user) return null; const ex = talkOf(G, pid); if (ex) return ex;
  const rivals = Object.keys(G.teams).filter((tid) => tid !== G.user && G.needFor(tid, p) > 1.2 && G.budgetOf(tid, p) >= askOf(G, p).wage).slice(0, 2);
  return (O(G).talks[pid] = { pid, win: dealSeason(G), round: 0, agent: agentName(G, p), ask: askOf(G, p), rivals, offers: [], status: 'open', reply: null });
}
export const relAmount = (wage) => roundL(Math.max(10, wage * 3));
// Wage room for this player: the purse he is paid from, plus his own current salary.
export function wageRoom(G, p) { const t = T(G); return r1((p.nat === 'NEP' ? t.purse : t.osPurse) + (p.marquee && p.nat === 'NEP' ? 0 : p.salary || 0)); }
export function signChance(G, p, talk, offer) {
  const a = talk.ask; let c = 50 + (offer.wage - a.wage) / Math.max(2, a.wage) * 80;
  const dr = ROLES.indexOf(offer.role) - ROLES.indexOf(a.role); c += dr < 0 ? 25 * dr : dr === 0 ? 5 : 10;
  c -= 6 * Math.abs(offer.yrs - a.yrs);
  if (offer.po) c += 4; if (offer.pom) c += 3; if (offer.rel) c += a.rel ? 12 : 4;
  c -= 6 * talk.rivals.length;
  c += ((p.happy ?? 70) - 60) * 0.3 + (((p.traits && p.traits.loyal) ?? 50) - 50) * 0.15;
  c -= 3 * talk.offers.filter((o) => o.wage < a.wage * 0.8).length;
  return clamp(Math.round(c), 3, 97);
}
function reply(c, signed, last, rival) {
  if (signed) return 'That works. We have a deal if you put it in writing today.';
  if (last) return 'We have gone as far as we can. He will see what the auction brings.';
  if (c >= 55) return 'Closer. Move on the wage or add a release clause and we are there.';
  return rival ? `With respect, ${rival} are talking about a lot more than this. Try again.` : 'With respect, that is not close. Try again.';
}
export function makeOffer(G, pid, offer) {
  const p = G.P(pid); const talk = openTalk(G, pid); if (!talk) return { err: 'He is not your player.' };
  if (talk.status !== 'open') return { err: 'These talks are over.' }; if (!talkWindow(G)) return { err: 'Contract talks run from late in the season to retention.' };
  if (dealsLeft(G) <= 0) return { err: `You have used all ${MAX_DEALS} new contracts for this window.` };
  offer = { wage: roundL(offer.wage), yrs: clamp(offer.yrs | 0, 1, 4), role: ROLES.includes(offer.role) ? offer.role : 'Regular', po: !!offer.po, pom: !!offer.pom, rel: !!offer.rel };
  if (offer.wage > wageRoom(G, p)) return { err: `Over your wage room: ${fmtL(wageRoom(G, p))}.` };
  const c = signChance(G, p, talk, offer); talk.round++;
  const signed = c >= 75 ? true : c < 30 ? false : R() * 100 < c;
  talk.offers.push({ ...offer, c, ok: signed }); const last = !signed && talk.round >= 3;
  const rival = talk.rivals[0] ? G.teams[talk.rivals[0]].name : null;
  talk.reply = reply(c, signed, last, rival);
  const terms = `${fmtL(offer.wage)}, ${offer.yrs} season${offer.yrs > 1 ? 's' : ''}, ${offer.role.toLowerCase()}${offer.po ? ', playoff bonus' : ''}${offer.pom ? ', match bonus' : ''}${offer.rel ? `, release clause ${fmtL(relAmount(offer.wage))}` : ''}`;
  logDecision(G, 'contract', `Contract offer to ${p.name} (round ${talk.round})`, terms, signed ? 'Signed' : last ? 'Rejected; talks have stalled' : `Rejected (${c}% chance)`, { pid });
  if (signed) signDeal(G, p, talk, offer); else if (last) talk.status = 'stalled';
  return { c, signed, last, reply: talk.reply };
}
function signDeal(G, p, talk, offer) {
  talk.status = 'signed'; p.salary = offer.wage; p.contractTo = talk.win + offer.yrs;
  p.deal = { wage: offer.wage, yrs: offer.yrs, role: offer.role, po: offer.po, pom: offer.pom, rel: offer.rel ? relAmount(offer.wage) : 0, y: talk.win };
  G.recalcPurse(G.user); adjustHappy(G, p.id, 6, 'New contract');
  if (offer.role !== 'Rotation') addPromise(G, p.id, 'role', `${offer.role === 'Key player' ? 'A key role' : 'A regular place'} for ${p.name}`, { role: offer.role, av: 0, pl: 0 });
  G.news(`${p.name} signs a new contract: ${fmtL(offer.wage)} a season until ${p.contractTo}.`, 'signing', { club: true, detail: `Promised role: ${offer.role.toLowerCase()}.` });
}
export function walkAway(G, pid) {
  const p = G.P(pid); const talk = openTalk(G, pid); if (!talk || talk.status === 'signed') return 'Nothing to walk away from.';
  talk.status = 'walked'; logDecision(G, 'contract', `Contract talks with ${p.name}`, 'Walked away', 'He enters the auction pool at the next retention', { pid });
  G.news(`Talks with ${p.name} are over. He leaves when his contract ends and enters the auction pool.`, 'signing', { club: true }); return null;
}
// The assistant offers fair terms to the most valuable expiring players worth keeping.
export function autoContracts(G) {
  if (!talkWindow(G)) return 0; let n = 0;
  for (const p of expiring(G)) { if (dealsLeft(G) <= 0) break; const t0 = talkOf(G, p.id); if (t0 && t0.status !== 'open') continue;
    if (ovr(p) < 62 && !(p.age <= 23 && p.pot >= 75)) continue;
    const talk = openTalk(G, p.id);
    for (let k = 0; k < 3 && talk.status === 'open'; k++) { const wage = Math.min(wageRoom(G, p), roundL(talk.ask.wage * (1 + 0.08 * k))); if (wage < talk.ask.wage * 0.85) break;
      makeOffer(G, p.id, { wage, yrs: talk.ask.yrs, role: talk.ask.role, po: true, pom: false, rel: talk.ask.rel }); }
    if (talk.status === 'signed') n++; else if (talk.status === 'open') talk.status = 'walked';
  }
  return n;
}
// Retention hooks (game.js applyRetention): players on a new deal stay through a mega auction;
// players whose deal ran out leave in a mini year.
export function beforeRetention(G, ctx) {
  const t = G.teams[G.user]; const signed = t.squad.filter((id) => { const p = G.P(id); return p.deal && p.contractTo >= G.year; });
  ctx.office = { signed, salary: Object.fromEntries(signed.map((id) => [id, G.P(id).salary])) };
}
export function afterRetention(G, ctx) {
  const u = G.user; const t = G.teams[u]; const { signed, salary } = ctx.office || { signed: [], salary: {} };
  if (G.s.mega) { for (const id of signed) if (!t.squad.includes(id)) { const p = G.P(id); p.team = u; p.salary = salary[id]; t.squad.push(id); } }
  else { for (const id of t.squad.slice()) { const p = G.P(id); if (p.deal && p.contractTo < G.year) { G.releasePlayer(id); p.deal = null; G.news(`${p.name}'s contract has ended. He enters the auction pool.`, 'signing', { club: true }); } } }
  G.recalcPurse(u);
}

// ===================== sponsors and fans =====================
const BRANDS = ['Phewa Mobile', 'Chure Agro', 'Sunkoshi Energy Drink', 'Rara Tea Estates', 'Bheri Noodles', 'Tilicho Cement', 'Mahabharat Paints', 'Kaligandaki Water', 'Himchuli Bank', 'Trishuli Motors', 'Seti River Dairy', 'Langtang Outdoor'];
const SLOTS = ['Shirt front', 'Sleeve', 'Training kit'];
export function condText(G, d) {
  const c = d.cond;
  if (c.k === 'wins') return `Win ${c.n} of the next ${c.of} league games or the fee drops ${Math.round(c.cut * 100)}%`;
  if (c.k === 'amb') { const p = G.P(c.pid); return `Their ambassador ${p ? p.name : 'player'} must play ${c.n} of the next ${c.of} games`; }
  if (c.k === 'clinic') return `${c.n} school clinics this season`;
  return `Average ${c.n.toLocaleString()} at home games`;
}
function genOffers(G) {
  const t = T(G); const fans = t.fans || 55; const used = new Set(O(G).sp.deals.filter((d) => d.y >= G.year && d.status !== 'done').map((d) => d.slot));
  const amb = t.squad.map((id) => G.P(id)).filter((p) => p && p.real === false && G.autoXI(G.user).includes(p.id)).sort((a, b) => ovr(b) - ovr(a))[0];
  const brands = BRANDS.slice().sort(() => R() - 0.5); const out = [];
  for (const slot of SLOTS) { if (used.has(slot)) continue; const k = out.length;
    const scale = slot === 'Shirt front' ? 1 : slot === 'Sleeve' ? 0.35 : 0.4; const fee = roundL((30 + fans * 0.5) * scale * (0.9 + R() * 0.3));
    let cond = k === 0 ? { k: 'wins', n: 4, of: 7, cut: 0.3 } : k === 1 ? { k: 'clinic', n: 2, cut: 0.4 } : amb ? { k: 'amb', pid: amb.id, n: 6, of: 7, cut: 0.4 } : { k: 'crowd', n: 10000, cut: 0.3 };
    out.push({ id: `sp${G.year}${ri(100, 999)}${k}`, name: brands[k], slot, fee, cond }); }
  O(G).sp.offers = out; return out;
}
export function acceptSponsor(G, id) {
  const S = O(G).sp; const o = S.offers.find((x) => x.id === id); if (!o) return 'That offer has gone.';
  const inSeason = ['league', 'playoffs'].includes(G.s.phase); const y = ['seasonEnd', 'offseason', 'retention', 'auction'].includes(G.s.phase) ? (G.s.phase === 'seasonEnd' ? G.year + 1 : G.year) : G.year;
  const d = { ...o, y, status: 'live', paid: false, start: inSeason ? leaguePlayed(G) : 0, got: 0, seen: 0 };
  if (inSeason) { pay(G, 'sponsor', d.fee); d.paid = true; }
  S.deals.push(d); S.offers = S.offers.filter((x) => x.id !== id && x.slot !== o.slot);
  logDecision(G, 'other', `Sponsor deal: ${o.name}`, `${o.slot}, ${fmtL(o.fee)}`, condText(G, d));
  G.news(`${o.name} signs as ${o.slot.toLowerCase()} sponsor for ${fmtL(o.fee)}.`, 'sponsor', { detail: condText(G, d) }); return null;
}
export function declineSponsor(G, id) { const S = O(G).sp; const o = S.offers.find((x) => x.id === id); if (!o) return; S.offers = S.offers.filter((x) => x.id !== id); logDecision(G, 'other', `Sponsor offer: ${o.name}`, 'Declined', ''); }
function settle(G, d, met, note) {
  d.status = 'done'; d.met = met; d.note = note;
  if (met) { nudgePillar(G, 'finances', 1); G.news(`${d.name}: condition met (${note}). The full fee stands.`, 'sponsor'); }
  else { const cut = roundL(d.fee * d.cond.cut); pay(G, 'sponsor', -cut); nudgePillar(G, 'finances', -2); G.news(`${d.name}: condition missed (${note}). They take back ${fmtL(cut)}.`, 'sponsor', { ne: 'प्रायोजकको सर्त पूरा भएन' }); }
}
// Judge live deals after each user league match; season-long conditions at the end of the season.
export function judgeSponsors(G, m, f) {
  for (const d of O(G).sp.deals) { if (d.status !== 'live' || d.y !== G.year) continue; const c = d.cond;
    if (c.k !== 'wins' && c.k !== 'amb') continue; if (!f || f.stage !== 'L' || !userFix(G, f)) continue;
    d.seen++; if (c.k === 'wins' && f.res.winner === G.user) d.got++; if (c.k === 'amb' && m && m.lineups[G.user].xi.includes(c.pid)) d.got++;
    if (d.got >= c.n) settle(G, d, true, `${d.got} of ${d.seen}`); else if (c.n - d.got > c.of - d.seen) settle(G, d, false, `${d.got} of ${c.of}`);
  }
}
function judgeSeasonSponsors(G) {
  for (const d of O(G).sp.deals) { if (d.status !== 'live' || d.y !== G.year) continue; const c = d.cond;
    if (c.k === 'clinic') { const n = (O(G).ev.y === G.year && O(G).ev.done.clinic) || 0; settle(G, d, n >= c.n, `${n} clinic${n === 1 ? '' : 's'}`); }
    else if (c.k === 'crowd') { const h = G.s.fixtures.filter((f) => f.res && f.home === G.user && f.att); const avg = h.length ? Math.round(h.reduce((a, f) => a + f.att, 0) / h.length) : 0; settle(G, d, avg >= c.n, `average ${avg.toLocaleString()}`); }
    else settle(G, d, d.got >= c.n, `${d.got} of ${d.seen}`); }
}
// Community events. Dashain falls before the season starts, Tihar during it; clinics run any time.
export function eventsFor(G) {
  const t = T(G); const city = t.city || 'the city'; const ph = G.s.phase; const E = O(G).ev; const done = E.y === G.year ? E.done : {};
  const played = ph === 'league' ? leaguePlayed(G) : 0;
  return [
    { k: 'dashain', name: `Dashain meet-and-greet in ${city}`, sub: '2 players for an afternoon · fans +4 · locals warm to the club · two players lose some fitness', open: ph === 'preseason' && !done.dashain, why: 'Around Dashain, before the season' },
    { k: 'tihar', name: 'Tihar charity match against legends', sub: 'Rs 4 L to a local cause · board +2 · conduct +3 · small injury risk', open: ph === 'league' && played >= 3 && played <= 10 && !done.tihar, why: 'Around Tihar, during the league' },
    { k: 'clinic', name: 'School cricket clinics', sub: `Fans +2 · students +1 · youth +1 · sometimes finds a prospect · ${(done.clinic || 0)} of 4 this season`, open: (done.clinic || 0) < 4 && ['preseason', 'league', 'offseason'].includes(ph), why: 'Up to 4 a season' },
  ];
}
export function runEvent(G, k) {
  const ev = eventsFor(G).find((e) => e.k === k); if (!ev || !ev.open) return 'Not available now.';
  const E = O(G).ev; if (E.y !== G.year) { E.y = G.year; E.done = {}; } E.done[k] = (E.done[k] || 0) + 1;
  const t = T(G); const seg = O(G).seg; let out = '';
  if (k === 'dashain') { t.fans = clamp(t.fans + 4, 0, 100); seg.locals += 3; nudgePillar(G, 'fans', 3);
    const two = t.squad.map((id) => G.P(id)).filter((p) => p && !p.inj).sort(() => R() - 0.5).slice(0, 2); for (const p of two) p.fit = clamp(p.fit - 4, 30, 100);
    out = `Fans +4. ${two.map(sur).join(' and ')} lose some fitness.`; }
  if (k === 'tihar') { pay(G, 'community', -4); t.board = clamp(t.board + 2, 0, 100); nudgePillar(G, 'conduct', 3); t.fans = clamp(t.fans + 2, 0, 100); seg.locals += 1;
    let hurt = null; if (R() < 0.04) { hurt = G.P(pick(t.squad)); if (hurt && !hurt.inj) hurt.inj = 1; }
    out = `Rs 4 L donated. Board +2, conduct +3.${hurt ? ` ${hurt.name} picked up a knock (1 match).` : ''}`; }
  if (k === 'clinic') { t.fans = clamp(t.fans + 2, 0, 100); seg.students += 2; nudgePillar(G, 'youth', 1); nudgePillar(G, 'fans', 1);
    if (R() < 0.25 && G.genNepali) { const p = G.genNepali(ri(16, 17), t.province); p.pot = clamp(p.pot + 4, 60, 92); G.players[p.id] = p; G.s.pid = getPID();
      out = `A clinic turned up ${p.name}, ${p.age}, ${p.role.toLowerCase()} from ${p.prov}. He is in the player pool.`; G.news(out, 'scout'); }
    else out = 'Fans +2; the students loved it.'; }
  logDecision(G, 'other', ev.name, 'Held', out); G.news(`${ev.name}: ${out}`, 'sponsor'); return null;
}
// Merchandise. Units sold build through the season from fans, results and price.
export const MERCH = [['shirt', 'Home shirt', 1800, 5200], ['cap', 'Cap', 700, 6000], ['scarf', 'Scarf', 500, 2600]];
export const PRICE_TIERS = [['low', 'Low', 0.8], ['std', 'Standard', 1], ['high', 'Premium', 1.25]];
export function merchPrice(G, k) { const it = MERCH.find((m) => m[0] === k); const tier = PRICE_TIERS.find((x) => x[0] === (O(G).merch.tier[k] || 'std')); return Math.round(it[2] * tier[2] / 50) * 50; }
function sellMerch(G, won) {
  const M = O(G).merch; if (M.y !== G.year) { M.y = G.year; M.sold = {}; } const t = T(G); let rev = 0;
  for (const [k, , , base] of MERCH) { const tier = PRICE_TIERS.find((x) => x[0] === (M.tier[k] || 'std'))[2]; const units = Math.round(base / 14 * Math.pow((t.fans || 55) / 60, 1.4) * (won ? 1.2 : 0.9) * Math.pow(1 / tier, 1.6));
    M.sold[k] = (M.sold[k] || 0) + units; rev += units * merchPrice(G, k) * 0.35 / 1e5; }
  pay(G, 'merch', r1(rev));
}
export function bestSeller(G) { const sq = T(G).squad.map((id) => G.P(id)).filter((p) => p && p.stats[G.year]); const b = sq.sort((a, b) => (b.stats[G.year].r + b.stats[G.year].w * 22) - (a.stats[G.year].r + a.stats[G.year].w * 22))[0]; return b ? `${sur(b)} shirts` : '—'; }
// Fan segments, as shares of the support.
export const SEGS = [['locals', 'Province locals'], ['valley', 'Kathmandu Valley'], ['abroad', 'Nepalis abroad'], ['students', 'Students']];
export function segShares(G) { const s = O(G).seg; const tot = SEGS.reduce((a, [k]) => a + s[k], 0) || 1; return SEGS.map(([k, l]) => [k, l, Math.round(s[k] / tot * 100)]); }
function driftSegs(G) { const s = O(G).seg; const t = T(G); const stars = t.squad.map((id) => G.P(id)).filter((p) => p && ovr(p) >= 76).length;
  s.abroad += stars * 0.05; s.students += t.ticket < 450 ? 0.15 : t.ticket > 900 ? -0.2 : 0; for (const k in s) s[k] = clamp(r1(s[k]), 4, 80); }
// The fan feed: fictional fans, real Nepali.
const WHERE = { locals: () => null, valley: () => 'Kathmandu', abroad: () => pick(['Doha', 'Sydney', 'Tokyo', 'London', 'Dubai', 'Seoul']), students: () => pick(['Kirtipur', 'Pokhara', 'Dharan']) };
const POSTS_WIN = [['कस्तो खेल! यो टोलीमा गर्व छ।', 'What a game! Proud of this team.'], ['{T} जिन्दाबाद! अर्को खेलमा पनि यस्तै खेल्नुहोस्।', '{T} forever! Play like this next time too.'], ['{P} ले आज कमाल गरे।', '{P} was brilliant today.'], ['विदेशबाट पनि हेर्दै छौँ, जित्दै जानुहोस्!', 'Watching from abroad too, keep winning!']];
const POSTS_LOSS = [['फेरि हार? बलिङमा केही त गर्नुपर्‍यो।', 'Lost again? Something has to change in the bowling.'], ['हार्नु त खेलकै हिस्सा हो, तर यसरी होइन।', 'Losing is part of the game, but not like this.'], ['धैर्य गरौँ, टोली अझै राम्रो छ।', 'Let us be patient, the team is still good.']];
const POSTS_PRICE = ['टिकट अलि सस्तो गर्नुस्, विद्यार्थीलाई पनि हेर्नुस्।', 'Make tickets a bit cheaper, think of the students.'];
const POSTS_EN = { win: ['Top of the world tonight!', 'That is how you finish a game.'], loss: ['Why do we keep losing the last five overs?', 'Changes needed for the next match.'] };
function feedPost(G, m, f) {
  const t = T(G); const won = f.res.winner === G.user; const F = O(G).feed; const segK = pick(['locals', 'locals', 'valley', 'abroad', 'students']);
  let top = null; if (m) { const inn = m.inns.find((i) => i.bat === G.user); if (inn) { const best = Object.entries(inn.bs).sort((a, b) => b[1].r - a[1].r)[0]; if (best && best[1].r >= 30) top = G.P(best[0]); } }
  const pool = won ? POSTS_WIN.filter((x) => top || !x[0].includes('{P}')) : POSTS_LOSS; let [ne, en] = pick(pool);
  const fill = (s) => s.replace('{T}', t.name.split(' ')[0]).replace('{P}', top ? top.name : '');
  const city = WHERE[segK]() || t.city;
  F.unshift({ ne: fill(ne).replace('{T}', ''), en: fill(en), who: `fan, ${city}`, likes: ri(40, 1400), y: G.year });
  if (t.ticket > 800 && R() < 0.35) F.unshift({ ne: POSTS_PRICE[0], en: POSTS_PRICE[1], who: `student, ${pick(['Kirtipur', 'Butwal', 'Dharan'])}`, likes: ri(100, 900), y: G.year });
  else if (R() < 0.4) F.unshift({ en: pick(POSTS_EN[won ? 'win' : 'loss']), who: `fan, ${t.city}`, likes: ri(30, 600), y: G.year });
  if (F.length > 10) F.length = 10;
  const form = (t.form || []).slice(-3); const w = form.filter((x) => x === 'W').length, l = form.filter((x) => x === 'L').length;
  O(G).sent = clamp(Math.round(50 + (w - l) * 10 + ((t.fans || 55) - 55) * 0.6 - (t.ticket > 900 ? 8 : 0)), 5, 95);
}

// ===================== recruitment =====================
export const PRIORITY = { High: 3, Medium: 2, Low: 1 };
const PRI_SL = { High: 'A', Medium: 'B', Low: 'C' };
export const gapFits = (g, p) => (g.pool === 'os') === (p.nat !== 'NEP') && (!g.need || needRolesOf(p).includes(g.need)) && (!g.bat || p.bat >= g.bat) && (!g.bowl || p.bowl >= g.bowl) && (!g.young || (p.age <= 21 && p.pot >= 70));
function needRolesOf(p) { const r = []; if (p.role === 'WK') r.push('wk'); if ((p.role === 'BAT' || p.role === 'WK') && p.bat >= 60) r.push('open');
  if (p.bowl >= 55 && isPace(p.type)) r.push('pace'); if (p.bowl >= 55 && isSpin(p.type)) r.push('spin'); if (p.role === 'AR') r.push('ar'); return r; }
export function gapsFor(G) {
  const needs = G.userNeeds(); const req = G.requiredSlots(G.user); const out = [];
  const one = { wk: 'Wicketkeeper', open: 'Opening batter', pace: 'Pace bowler', spin: 'Spinner', ar: 'All-rounder' };
  const E = (G.s.phaseEco[G.year] || G.s.phaseEco[G.year - 1] || {})[G.user];
  for (const n of needs) { if (!n.left) continue; let why = `${n.have} of ${n.target} in the squad`;
    if (n.k === 'pace' && E && E.death[1]) why += ` · ${(E.death[0] / E.death[1]).toFixed(1)} an over at the death last season`;
    out.push({ k: n.k, name: one[n.k], why, pool: 'dom', need: n.k, n: n.left, pr: n.k === 'wk' || n.left >= 2 ? 'High' : 'Medium' }); }
  if (req.os > 0) { const osq = T(G).squad.map((id) => G.P(id)).filter((p) => p.nat !== 'NEP'); const b = Math.ceil(req.os / 2);
    out.push({ k: 'osbat', name: 'Overseas batter', why: `Need 6 overseas; ${osq.length} signed`, pool: 'os', bat: 62, n: b, pr: 'High' });
    out.push({ k: 'osbowl', name: 'Overseas bowler', why: `${osq.filter((p) => p.bowl >= 60).length} overseas bowlers in the squad`, pool: 'os', bowl: 62, n: Math.max(1, req.os - b), pr: 'High' }); }
  out.push({ k: 'young', name: 'Young Nepali talent', why: 'Board objective: players aged 21 or under', pool: 'dom', young: true, n: 1, pr: 'Low' });
  const P = O(G).plan; if (P && P.y === G.year && P.pr) for (const g of out) if (P.pr[g.k]) g.pr = P.pr[g.k];
  return out;
}
export function splitBudget(G, gaps) {
  const t = T(G); const purse = { dom: t.purse, os: t.osPurse }; const sum = { dom: 0, os: 0 };
  for (const g of gaps) sum[g.pool] += PRIORITY[g.pr]; const out = {};
  for (const g of gaps) out[g.k] = roundL(purse[g.pool] * PRIORITY[g.pr] / Math.max(1, sum[g.pool])); return out;
}
export function targetsFor(G, gap, budget, taken = new Set()) {
  const pool = G.auctionPool().filter((p) => p && !p.team && !p.retired && !taken.has(p.id) && gapFits(gap, p) && G.canAdd(G.user, p));
  const rows = pool.map((p) => ({ p, lp: G.likelyPrice(p), d: G.needDemand(p) })).sort((a, b) => ovr(b.p) - ovr(a.p)); const out = [];
  const first = rows.find((x) => x.lp[0] <= budget); if (first) out.push({ ...first, tag: 'First choice' });
  const back = rows.find((x) => x !== first && x.lp[1] <= budget * 0.6); if (back) out.push({ ...back, tag: 'Backup' });
  const barg = rows.filter((x) => !out.some((o) => o.p === x.p) && x.lp[1] <= Math.max(3, budget * 0.25)).sort((a, b) => (b.p.pot - ovr(b.p)) + ovr(b.p) * 0.5 - ((a.p.pot - ovr(a.p)) + ovr(a.p) * 0.5))[0]; if (barg) out.push({ ...barg, tag: 'Bargain' });
  for (const o of out) taken.add(o.p.id); return out;
}
export function planTargets(G, gaps) { const b = splitBudget(G, gaps); const taken = new Set(); return gaps.map((g) => ({ g, budget: b[g.k], t: targetsFor(G, g, b[g.k], taken) })); }
export function setGapPriority(G, k, pr) { const P = O(G).plan; if (P.y !== G.year) { P.y = G.year; P.pr = {}; P.saved = false; } P.pr[k] = pr; }
export function savePlan(G) {
  const gaps = gapsFor(G); const rows = planTargets(G, gaps); let n = 0;
  for (const { g, budget, t } of rows) for (const x of t) {
    const max = x.tag === 'First choice' ? Math.min(Math.max(x.lp[1], x.lp[0]), Math.max(budget, x.lp[0])) : x.lp[1];
    G.setShortlist(x.p.id, { max: roundL(max), priority: x.tag === 'Bargain' ? 'C' : PRI_SL[g.pr] }); n++; }
  const P = O(G).plan; P.y = G.year; P.saved = true; P.pr = Object.fromEntries(gaps.map((g) => [g.k, g.pr]));
  P.gaps = gaps.map(({ k, name, pool, need, bat, bowl, young, pr }) => ({ k, name, pool, need, bat, bowl, young, pr }));
  logDecision(G, 'plan', 'Recruitment plan', gaps.map((g) => `${g.name} ${g.pr.toLowerCase()}`).join(', '), `${n} players on the shortlist`);
  return n;
}
export const planSaved = (G) => { const P = O(G).plan; return !!(P && P.saved && P.y === G.year); };
export const recruitOpen = (G) => G.s.phase === 'retention' || (G.s.phase === 'auction' && G.s.auction && G.s.auction.prep) || G.s.phase === 'offseason';
export function tripsLeft(G) { const T0 = O(G).trips; const base = 2 + (facility(G, 'scout') ? 2 : 0) + (G.staffLevel(G.user, 'scout') >= 4 ? 1 : 0); return T0.y === G.year ? base - T0.used : base; }
export function scoutTrip(G, pid) {
  if (tripsLeft(G) <= 0) return 'No scouting trips left this window.'; const p = G.P(pid); if (!p) return 'No such player.';
  const T0 = O(G).trips; if (T0.y !== G.year) { T0.y = G.year; T0.used = 0; } T0.used++;
  const r = narrowPot(p, rateFor(G, 'A') + 0.1); const st = G.s.staff[G.user] && G.s.staff[G.user].scout; if (st) st.op = clamp((st.op ?? 55) + 2, 0, 100);
  G.news(`Scouting trip: ${p.name}'s potential now reads ${p.potLo === p.potHi ? p.potLo : `${p.potLo}–${p.potHi}`}.`, 'scout'); logDecision(G, 'plan', `Scouting trip: ${p.name}`, 'Watched', `Potential ${r.to.join('–')}`); return null;
}
export function rivalsNeeds(G) {
  return Object.keys(G.teams).filter((tid) => tid !== G.user).map((tid) => { const t = G.teams[tid]; const n = G.userNeeds(tid).filter((x) => x.left > 0).map((x) => x.short.toLowerCase());
    const os = G.requiredSlots(tid).os; if (os) n.push(`${os} overseas`); return { tid, needs: n, purse: r1(t.purse + t.osPurse) }; }).sort((a, b) => b.purse - a.purse);
}
export function staffViews(G, rows) {
  const st = G.s.staff[G.user] || {}; const q = adviceQuality(G); const out = [];
  const hot = rows.flatMap((r) => r.t.filter((x) => x.tag === 'First choice')).sort((a, b) => b.d - a.d)[0];
  if (st.scout && hot) out.push({ who: 'Head scout', q: `${sur(hot.p)}'s price will go above ${hot.lp[1]}. Decide now if he is worth it${hot.d >= 2 ? `; ${hot.d} rivals want him` : ''}.` });
  const E = (G.s.phaseEco[G.year] || G.s.phaseEco[G.year - 1] || {})[G.user];
  if (st.analyst && E) { const names = { pp: 'powerplay', mid: 'middle overs', death: 'death overs' }; const k = Object.keys(E).filter((x) => E[x][1]).sort((a, b) => E[b][0] / E[b][1] - E[a][0] / E[a][1])[0];
    if (k) out.push({ who: 'Analyst', q: q >= 0.5 ? `We went at ${(E[k][0] / E[k][1]).toFixed(1)} an over in the ${names[k]}. That is the gap to fix.` : `I think the ${names[k]} hurt us most, but the numbers are thin.` }); }
  if (st.assistant) { const t = T(G); out.push({ who: 'Assistant manager', q: `Keep something back. ${fmtL(t.purse)} domestic and ${fmtL(t.osPurse)} overseas has to cover the whole squad.` }); }
  return out;
}

// ===================== lifecycle =====================
export function migrate(G) {
  const s = G.s;
  s.office ??= {}; const o = s.office;
  o.talks ??= {}; o.meeting ??= null; o.obj ??= null; o.sp ??= { offers: [], deals: [] }; o.ev ??= { y: 0, done: {} }; o.merch ??= { y: 0, tier: {}, sold: {}, last: null };
  o.seg ??= { locals: 46, valley: 24, abroad: 18, students: 12 }; o.feed ??= []; o.sent ??= 60; o.trips ??= { y: 0, used: 0 }; o.plan ??= { y: 0, pr: {}, saved: false };
  o.iv ??= { y: 0, n: 0 }; o.checks ??= []; o.um ??= 0;
  s.facilities ??= {};
  if (s.teams && s.staff && s.players) for (const tid in s.teams) { const st = s.staff[tid] || (s.staff[tid] = {});
    for (const [k] of POSTS) { if (st[k] === undefined) st[k] = tid === s.user ? null : G.genStaff(k, ri(1, 3)); const x = st[k]; if (!x) continue;
      x.grade = gradeOfL(x.level); x.spec ??= 'General'; x.op ??= 55; } }
}
export function afterMatch(G, m, f) {
  if (!userFix(G, f) || !G.s.office) return;
  const t = T(G); const won = f.res.winner === G.user, lost = f.res.winner && !won; const o = O(G);
  // pillars from real outcomes: results, finances (the gate and the balance), fans
  nudgePillar(G, 'results', won ? (f.stage === 'L' ? 1.5 : 3) : lost ? -1.2 : 0);
  if (f.home === G.user && f.att) nudgePillar(G, 'finances', f.att >= 12000 ? 0.5 : 0.1);
  if (t.balance < 0) nudgePillar(G, 'finances', -1);
  const P = G.s.pillars; if (P) P.fans = clamp(Math.round((P.fans * 0.75 + (t.fans || 55) * 0.25) * 10) / 10, 0, 100);
  staffMood(G, won ? 0.5 : lost ? -0.3 : 0);
  // contract bonuses
  for (const id of m.lineups[G.user].xi) { const p = G.P(id); if (!p.deal) continue;
    if (p.deal.po && f.stage !== 'L' && won) pay(G, 'bonus', -1); if (p.deal.pom && f.res.mom === id) pay(G, 'bonus', -0.5); }
  if (facility(G, 'gym')) for (const id of t.squad) { const p = G.P(id); p.fit = clamp(p.fit + 2, 0, 100); }
  judgeSponsors(G, m, f); sellMerch(G, won); driftSegs(G); feedPost(G, m, f); sweepAdvice(G);
  o.um++; if (o.um % 2 === 0) staffAdvice(G);
  // mid-season board checks after the user's 7th and 14th league games
  const lp = leaguePlayed(G);
  if (f.stage === 'L' && (lp === 7 || lp === 14) && !o.checks.includes(`${G.year}-${lp}`)) { o.checks.push(`${G.year}-${lp}`); if (o.checks.length > 6) o.checks.shift();
    const d = Math.round((pillarScore(G) - 60) * 0.1); t.board = clamp(t.board + d, 0, 100);
    const low = PILLARS.slice().sort((a, b) => (P[a[0]] ?? 60) - (P[b[0]] ?? 60))[0];
    G.news(`Mid-season board check: confidence ${t.board}${d ? ` (${d > 0 ? '+' : '−'}${Math.abs(d)})` : ''}. The board is watching ${low[1].toLowerCase()} (${Math.round(P[low[0]])}).`, 'board', { ne: 'बोर्डको मध्य-सिजन समीक्षा' }); }
}
export function seasonStart(G) {
  if (!G.s.office) return; const o = O(G); const t = T(G);
  o.obj = { y: G.year, list: (o.meeting && o.meeting.next && o.meeting.nextY === G.year ? o.meeting.next : objectivesFor(G, G.year)).map((x) => ({ ...x, y: G.year })) };
  if (o.meeting && o.meeting.ease && o.meeting.nextY === G.year) { const i = TIERS.findIndex((x) => x.rank === t.objective.rank); if (i >= 0 && i < TIERS.length - 1) { t.objective = { ...TIERS[i + 1] }; G.news(`As agreed with the board, this season's objective is "${t.objective.txt}".`, 'board'); } }
  for (const d of o.sp.deals) if (d.y === G.year && !d.paid) { pay(G, 'sponsor', d.fee); d.paid = true; }
  for (const k of ['scout', 'wages']) if (facility(G, k)) pay(G, 'facilities', -FAC[k][3]);
  if (G.staffWages(G.user) > staffBudget(G)) { nudgePillar(G, 'finances', -3); G.news(`Staff wages (${fmtL(G.staffWages(G.user))}) are over the board's budget of ${fmtL(staffBudget(G))}.`, 'board'); }
  if (!o.sp.offers.length) genOffers(G);
  if (auto(G)) for (const d of o.sp.offers.slice()) if (d.cond.k === 'clinic' || d.cond.k === 'crowd') acceptSponsor(G, d.id);
  o.sp.deals = o.sp.deals.filter((d) => d.y >= G.year - 1);
}
export function seasonEnd(G) {
  if (!G.s.office) return; const o = O(G); const t = T(G); const R0 = G.s.lastReview;
  judgeSeasonSponsors(G);
  const M = o.merch; if (M.y === G.year) M.last = { y: G.year, sold: { ...M.sold }, best: bestSeller(G) };
  if (facility(G, 'hostel')) nudgePillar(G, 'youth', 2);
  const net = t.ledger ? Object.values(t.ledger).reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0) - (t.ledger.staffFees || 0) : 0;
  nudgePillar(G, 'finances', clamp(net / 10, -8, 8));
  o.meeting = { y: G.year, nextY: G.year + 1, review: (o.obj && o.obj.y === G.year && o.obj.review) || (R0 ? [{ k: 'rank', txt: R0.obj.txt, req: 'Required', st: R0.effRank < R0.obj.rank ? 'Exceeded' : R0.effRank <= R0.obj.rank ? 'Met' : 'Behind', note: `Finished ${R0.effRank}` }] : []),
    board: t.board, next: objectivesFor(G, G.year + 1), nextMain: TIERS.find((x) => x.rank === (t.objective || TIERS[1]).rank) || TIERS[1], done: false, reqDone: false, asked: [], negotiated: null };
  genOffers(G);
  G.news('The board meeting is ready: objectives, the five pillars, your requests and next season\'s targets.', 'board', { ne: 'सिजन अन्त्यको बोर्ड बैठक' });
  if (auto(G)) { o.meeting.done = true; autoContracts(G); }
}
export function offseason(G) {
  if (!G.s.office) return; const o = O(G); const t = T(G);
  for (const k in o.talks) if (o.talks[k].win < G.year - 1) delete o.talks[k];
  if (facility(G, 'hostel') && G.genNepali) { const prov = pick(['Karnali', 'Sudurpaschim', 'Koshi']); const p = G.genNepali(17, prov); p.pot = clamp(p.pot + 6, 65, 92); G.players[p.id] = p; G.s.pid = getPID();
    G.news(`The academy hostel brings in ${p.name}, 17, from ${prov}. He is in the player pool.`, 'scout'); }
  o.feed = o.feed.slice(0, 6); o.um = 0;
  if (auto(G)) { autoStaff(G); autoContracts(G); }
  for (const [k] of POSTS) { const x = G.s.staff[G.user] && G.s.staff[G.user][k]; if (x && k === 'scout' && tripsLeft(G) > 0 && o.trips.y === G.year - 1) { x.op = clamp(x.op - 4, 0, 100); x.want = 'wants more trips'; } }
  void t;
}
export function auctionSetup(G) {
  if (!G.s.office) return; const t = T(G);
  for (const id of t.squad.slice()) { const p = G.P(id); if (!p.deal || !p.deal.rel) continue;
    const buyer = Object.keys(G.teams).find((tid) => tid !== G.user && G.canAdd(tid, p) && G.budgetOf(tid, p) >= p.deal.wage + 5 && p.value * 2 >= p.deal.rel && G.needFor(tid, p) > 1.2);
    if (buyer && R() < 0.4) { const fee = p.deal.rel; G.releasePlayer(id); p.deal = null; G.signPlayer(p, buyer, Math.min(G.budgetOf(buyer, p), Math.max(p.salary || 2, 2))); t.balance = r1(t.balance + fee);
      G.news(`${G.teams[buyer].name} trigger ${p.name}'s release clause. ${fmtL(fee)} comes to the club.`, 'signing', { club: true }); } }
  if (auto(G) && !planSaved(G)) savePlan(G);
}
export function todayTasks(G) {
  if (!G.s.office || !G.teams[G.user]) return []; const out = []; const o = O(G);
  if (meetingOpen(G) && !auto(G)) out.push({ key: 'office-board', text: 'Board meeting', sub: 'Objectives reviewed · requests · next season', to: '/board' });
  if (talkWindow(G) && !auto(G) && dealsLeft(G) > 0) { const ex = expiring(G).filter((p) => { const x = talkOf(G, p.id); return !x || x.status === 'open'; });
    if (ex.length) out.push({ key: 'office-contracts', text: `${ex.length} contract${ex.length > 1 ? 's' : ''} ending`, sub: `Talk to ${ex.slice(0, 2).map((p) => p.name).join(' and ')}`, to: `/contract/${ex[0].id}` }); }
  if (recruitOpen(G) && G.s.phase !== 'offseason' && !planSaved(G) && !auto(G)) out.push({ key: 'office-recruit', text: 'Recruitment meeting', sub: 'Set the gaps and priorities before the auction', to: '/recruitment' });
  const st = G.s.staff[G.user] || {}; const vac = POSTS.filter(([k]) => !st[k]);
  if (G.staffWindow() && vac.length && !auto(G)) out.push({ key: 'office-staff', text: `${vac.length} staff post${vac.length > 1 ? 's' : ''} vacant`, sub: vac.map((x) => x[1]).slice(0, 2).join(', '), to: '/staff' });
  if (o.sp.offers.length && !auto(G)) out.push({ key: 'office-sponsor', text: `${o.sp.offers.length} sponsor offer${o.sp.offers.length > 1 ? 's' : ''}`, sub: o.sp.offers.map((x) => x.name).slice(0, 2).join(', '), to: '/commercial' });
  const ev = eventsFor(G).find((e) => e.open && e.k !== 'clinic'); if (ev && !auto(G)) out.push({ key: `office-ev-${ev.k}`, text: ev.name, sub: ev.why, to: '/commercial' });
  return out.slice(0, 3);
}
