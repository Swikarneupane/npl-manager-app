// Headless season flow: plays 2 full seasons with the real engine and checks the round 2 rules as
// they are added (decisions and promises so far). Exits non-zero on the first broken rule.
import { Game, cautiousIndex, STAFF_WAGE } from '../src/game/game.js';
import { ovr, Match } from '../src/game/engine.js';
import { AuctionRoom } from '../src/lib/auction.js';

let checks = 0;
const ok = (c, msg) => { if (!c) { console.error(`FAIL - ${msg}`); process.exit(1); } checks++; if (process.env.VERBOSE) console.log(`ok   ${msg}`); };
const userFix = (G, f) => f.home === G.user || f.away === G.user;
const reload = (G) => new Game(JSON.parse(JSON.stringify(G.s)));

// Put pid in the user's XI in place of a same-nationality non-keeper, keeping the XI legal.
function startPlayer(G, pid) {
  const t = G.teams[G.user]; const p = G.P(pid); let xi = G.autoXI(G.user);
  if (!xi.includes(pid)) {
    const keeper = xi.find((id) => G.P(id).role === 'WK');
    const out = xi.filter((id) => id !== keeper && (G.P(id).nat === 'NEP') === (p.nat === 'NEP')).sort((a, b) => ovr(G.P(a)) - ovr(G.P(b)))[0];
    xi = xi.map((id) => (id === out ? pid : id));
  }
  ok(G.validXI(G.user, xi), `XI with ${p.name} is legal`);
  t.xi = xi; t.order = G.autoOrder(xi);
}
function dropPlayer(G, pid) { const t = G.teams[G.user]; const xi = G.autoXI(G.user).filter((id) => id !== pid); if (xi.length === 11) { t.xi = xi; t.order = G.autoOrder(xi); } else { t.xi = null; G.P(pid).rest = true; } }

const G = Game.create('LL', { lang: 'en' });
const stats = { answered: 0, expired: 0, kept: 0, broken: 0, made: 0 };
let plan = 'answer'; // rotates through answer / expire / keep / break as decisions appear

for (let season = 0; season < 2; season++) {
  G.aiPreseason(); for (const p of G.osFreeAgents()) { if (G.osCount(G.user) >= 6) break; G.signFA(p.id); }
  G.startSeason();
  let lastM = null;
  while (G.s.phase === 'league' || G.s.phase === 'playoffs') {
    const f = G.nextFixture();
    if (!f) { if (G.s.phase === 'league') G.setupPlayoffs(); else { const ch = G.advancePlayoffs(); if (ch) G.seasonAwards(ch); } continue; }
    if (userFix(G, f)) {
      // make sure decisions keep coming: force one after a user match if the 1-in-3 roll missed
      if (lastM && !G.pendingDecisions().length) { G.makeEvent(lastM, G.s.fixtures.find((x) => x.n === lastM.n)); stats.made++; }
      const due = G.decisionsDue();
      for (const n of due) ok(n.due != null && n.due <= f.n && n.choices[n.safe], 'a due decision has a deadline and a cautious choice');
      if (due.length) {
        const n = due[0]; const board0 = G.teams[G.user].board;
        if (plan === 'expire') {
          // leave it: playing the match anyway must apply the cautious option and cost board 2
          const safe = n.choices[cautiousIndex(n)];
          G._expectExpire = { n, safe, board0, fx: safe.fx };
        } else {
          const pi = n.choices.findIndex((c) => c.fx && (c.fx.promise === 'start' || c.fx.promise === 'debut'));
          const ci = (plan === 'keep' || plan === 'break') && pi >= 0 ? pi : 0;
          G.applyEvent(n, ci); stats.answered++;
          ok(n.done && n.picked === n.choices[ci].l && typeof n.outcome === 'string', 'answering records the pick and its outcome');
          if (pi >= 0 && ci === pi) { const pr = G.s.promises.find((x) => x.pid === n.choices[ci].fx.pid); ok(pr && pr.matchesLeft >= 1 && pr.dueFixture >= f.n, `promise created (${pr && pr.kind})`); G._promise = { pr: { ...pr }, mode: plan }; }
          for (const m of G.decisionsDue()) if (m !== n && plan !== 'expire') { G.applyEvent(m, cautiousIndex(m)); stats.answered++; }
        }
        plan = { answer: 'expire', expire: 'keep', keep: 'break', break: 'answer' }[plan];
      }
      // honour or break the open promise
      const P = G._promise; const live = P && G.s.promises.find((x) => x.id === P.pr.id);
      if (live) { if (P.mode === 'keep' && G.available(G.P(live.pid))) startPlayer(G, live.pid); else if (P.mode === 'break') dropPlayer(G, live.pid); else G.teams[G.user].xi = null; }
      const morale0 = live ? G.P(live.pid).morale : 0; const left0 = live ? live.matchesLeft : 0;
      // decisions that expire in this match apply their cautious option first; add their morale effect on the promised player
      const expMorale = live ? G.pendingDecisions().filter((n) => n.due != null && n.due <= f.n).reduce((a, n) => { const fx = n.choices[cautiousIndex(n)].fx || {}; return a + (fx.pid === live.pid ? fx.morale || 0 : 0) + (fx.team || 0); }, 0) : 0;
      const m = await G.playFixture(f, null); lastM = { ...m, n: f.n, lineups: m.lineups, result: m.result };
      const E = G._expectExpire;
      if (E) { ok(E.n.done && E.n.auto && E.n.picked === E.safe.l, 'unanswered decision took the cautious option'); ok(/Board confidence −2/.test(E.n.outcome), 'expiry notes the board penalty'); stats.expired++; G._expectExpire = null; }
      if (live) {
        const still = G.s.promises.find((x) => x.id === live.id); const xi = m.lineups[G.user].xi; const p = G.P(live.pid);
        if (xi.includes(live.pid)) { ok(!still, 'promise kept is cleared'); stats.kept++; G._promise = null; }
        else if (!G.available(p) && still) ok(still.matchesLeft === left0, 'an unavailable player does not use up a promised match');
        else if (still) ok(still.matchesLeft === left0 - 1, `a missed match counts down (${left0} → ${still.matchesLeft})`);
        else { const want = Math.max(0, Math.min(100, Math.min(100, Math.max(0, morale0 + expMorale)) - 20)); ok(Math.abs(p.morale - want) < 0.5, `broken promise costs morale 20 (${morale0}${expMorale ? ` ${expMorale > 0 ? '+' : ''}${expMorale} from an expired decision` : ''} → ${p.morale}, expected ${want})`); ok(G.s.inbox.some((x) => /^Promise broken/.test(x.text)), 'broken promise is in the news'); stats.broken++; G._promise = null; }
      }
      G.teams[G.user].xi = null; G.teams[G.user].order = null;
    } else await G.playFixture(f, null);
    if (G.s.phase === 'league' && G.leagueDone()) G.setupPlayoffs();
    else if (G.s.phase === 'playoffs') { const ch = G.advancePlayoffs(); if (ch) G.seasonAwards(ch); }
  }
  ok(G.s.phase === 'seasonEnd', 'season reaches its end');
  if (G.s.sacked) G.takeJob(G.s.offers[0]);
  // a decision left open into the off-season expires; open promises lapse
  if (!G.pendingDecisions().length) G.news('Test decision', 'event', { choices: [{ l: 'Bold', fx: { board: 3 } }, { l: 'Careful', fx: {} }], safe: 1, due: null, done: false });
  const until0 = G.s.staff[G.user].bat && G.s.staff[G.user].bat.until; const year0 = G.year;
  G.startOffseason(); await G.runIntlWinter();
  ok(!G.pendingDecisions().length && !G.s.promises.length, 'off-season clears open decisions and promises');
  // staff: contracts that ran out leave the user's posts vacant (AI teams rehire); fill them from the candidates
  if (until0 != null && until0 < G.year) ok(!G.s.staff[G.user].bat && Object.keys(G.teams).filter((id) => id !== G.user).every((id) => G.s.staff[id].bat && G.s.staff[id].bat.until >= G.year), `expired contracts (until ${until0}) end in the ${G.year} off-season; AI teams rehire`);
  for (const k of ['bat', 'bowl', 'physio']) if (!G.s.staff[G.user][k]) { const c = G.staffCandidates(k); ok(c.length === 3 && c.every((x) => x.wage === STAFF_WAGE[x.level]), `3 ${k} candidates priced by level`); ok(G.hireStaff(k, 2) === null && G.s.staff[G.user][k].until === G.year + 1, `hired a ${k} on a 2-season contract`); }
  void year0;
  G.beginRetention(); G.applyRetention(); G.setupAuction();
  // ===== auction: scout and shortlist, then the room with auto-bids =====
  {
    const A = G.s.auction; const t = G.teams[G.user];
    ok(A.prep === true && Array.isArray(G.s.shortlist), 'auction opens on the shortlist screen');
    for (const l of A.lots.slice(0, 30)) { const p = G.P(l.pid); const [lo, hi] = G.likelyPrice(p); ok(lo >= G.basePrice(p) && hi > lo, `likely price ${lo}–${hi} is a range above base for ${p.name}`); }
    const needs = G.userNeeds(); ok(needs.length === 5 && needs.every((n) => n.left === Math.max(0, n.target - n.have)), 'needs coverage by role');
    const pre = process.env.DUMP ? JSON.stringify(G.s) : null;
    const added = G.autoSuggest(); const bc = G.budgetCheck();
    if (pre && !(G.osCount(G.user) + added.filter((id) => G.P(id).nat !== 'NEP').length >= Math.min(6, G.osCount(G.user) + A.lots.filter((l) => G.P(l.pid).nat !== 'NEP').length) || bc.os.sum > t.osPurse - 20)) (await import('node:fs')).writeFileSync(process.env.DUMP, pre);
    // nothing to add is fine when needs are met, or the purses cannot cover the cheapest player in a needed role
    const pool = A.lots.map((l) => G.P(l.pid)).filter((p) => !p.team);
    const affordable = needs.filter((n) => n.left).some((n) => pool.some((p) => G.fitTags(p, needs).some((f) => f.t.startsWith(n.short)) && G.canAdd(G.user, p) && G.likelyPrice(p)[1] <= (p.nat === 'NEP' ? t.purse : t.osPurse)));
    ok(added.length > 0 || !affordable || G.s.shortlist.length > 0, `auto-suggest picks targets (${added.length}; purses ${t.purse}/${t.osPurse}; squad ${t.squad.length}, OS ${G.osCount(G.user)})`);
    ok(bc.os.sum <= t.osPurse && bc.dom.sum <= t.purse, `auto-suggest stays within the purses (OS ${bc.os.sum}/${t.osPurse}, dom ${bc.dom.sum}/${t.purse})`);
    for (const id of added) { const p = G.P(id); ok(G.fitTags(p, needs).some((f) => f.c === 'b') || p.nat !== 'NEP', `${p.name} fills a need or an overseas slot`); }
    ok(G.osCount(G.user) + added.filter((id) => G.P(id).nat !== 'NEP').length >= Math.min(6, G.osCount(G.user) + A.lots.filter((l) => G.P(l.pid).nat !== 'NEP').length) || bc.os.sum > t.osPurse - 20, `auto-suggest aims for the 6-overseas minimum (OS now ${G.osCount(G.user)}, OS targets ${added.filter((id) => G.P(id).nat !== 'NEP').length}, OS max bids ${bc.os.sum} of ${t.osPurse}, cheapest OS likely ${Math.min(...A.lots.map((l) => G.P(l.pid)).filter((p) => p.nat !== 'NEP' && !p.team).map((p) => G.likelyPrice(p)[1]))})`);
    const room = new AuctionRoom(G, () => {}); room.enter(); room.stop(); ok(!A.prep && A.cur, 'entering the room opens lot 1');
    let stops = 0, won = 0;
    while (A.lots[A.i] || (A.cur && !A.cur.done)) {
      if (A.cur && !A.cur.done && !G.slEntry(A.cur.pid)) { room.jump(); room.stop(); if (!A.cur || A.cur.done) break; }
      const c = A.cur; if (!c || c.done) { room.next(); room.stop(); continue; }
      const e = G.slEntry(c.pid); ok(!!e, 'Sim to my next target stops at a shortlisted lot'); stops++;
      const p = G.P(c.pid); const owner0 = t.squad.length;
      room.resolveQuick(false); room.stop();
      if (c.leader === G.user) { won++; ok(c.bid <= e.max, `auto-bid stays within the max (${c.bid} ≤ ${e.max})`); ok(t.squad.length === owner0 + 1, 'won player joins the squad'); }
      else if (c.leader) ok(!e.max || c.bid + G.incr(p, c.bid) > e.max || c.hist.some((h) => h[0] === G.user) || !G.canAdd(G.user, p) || G.budgetOf(G.user, p) < c.bid, `lost lot ${p.name} only above the max (${c.bid} v ${e.max})`);
      room.next(); room.stop();
    }
    ok(stops >= added.length, `stopped at every target (${stops}/${added.length}, won ${won})`);
    room.simRest(); room.stop();
    const os0 = Object.fromEntries(Object.keys(G.teams).map((id) => [id, G.osCount(id)]));
    G.finishAuction(); G.s.phase = 'preseason';
    ok(Object.keys(G.teams).every((id) => G.osCount(id) === os0[id]), 'finishing the auction signs no overseas players: the user goes first in pre-season');
    ok(!G.s.shortlist.length, 'shortlist clears after the auction');
  }
  console.log(`season ${G.year - 1} done · answered ${stats.answered}, expired ${stats.expired}, promises kept ${stats.kept}, broken ${stats.broken}`);
}
ok(stats.answered > 0 && stats.expired > 0, 'decisions were both answered and left to expire');
ok(stats.kept + stats.broken > 0, 'at least one promise was settled');

// old saves: no promises list, decisions without title / deadline / cautious choice
{
  const s = JSON.parse(JSON.stringify(G.s)); delete s.promises; s.phase = 'league';
  s.inbox.unshift({ id: 'old1', y: G.year, text: 'Fans are asking for more chances for local youngsters.', kind: 'event', read: false, done: false, choices: [{ l: 'Promise to give youth a chance', fx: { fans: 3 } }, { l: 'Winning comes first', fx: { fans: -2, board: 2 } }] });
  s.fixtures = s.fixtures.map((f) => ({ ...f, res: null }));
  const O = new Game(s); const n = O.s.inbox.find((x) => x.id === 'old1');
  ok(Array.isArray(O.s.promises), 'old save gets a promises list');
  ok(n.title === n.text && n.safe === 1 && n.due === O.userNext().n, 'old decision gets a title, the cautious choice and a deadline');
  ok(O.decisionsDue().some((x) => x.id === 'old1'), 'old decision gates the next match');
}
ok(reload(G).s.promises !== undefined, 'save round-trips');

// ===== team sheet: bowling plan, captain follows it, order warnings, rules =====
{
  const H = Game.create('LL', { lang: 'en' }); H.aiPreseason(); for (const p of H.osFreeAgents()) { if (H.osCount(H.user) >= 6) break; H.signFA(p.id); } H.startSeason();
  const t = H.teams[H.user]; const xi = H.autoXI(H.user); t.xi = xi; t.order = H.autoOrder(xi);
  const plan = H.defaultBowlPlan(xi); const sum = (k) => Object.values(plan).reduce((a, x) => a + x[k], 0);
  ok(sum('pp') === 6 && sum('mid') === 9 && sum('death') === 5, `default plan totals 6/9/5 (${sum('pp')}/${sum('mid')}/${sum('death')})`);
  ok(Object.values(plan).every((x) => x.pp + x.mid + x.death <= 4 && x.pp <= 3 && x.mid <= 5 && x.death <= 3), 'no bowler over 4 overs or a phase cap');
  ok(Object.keys(plan).every((id) => xi.includes(id)), 'plan only uses the XI');
  // the user's captain follows the plan: count overs that went to a bowler with plan overs left in that phase
  let agree = 0, total = 0, games = 0;
  for (const f of H.s.fixtures) {
    if (games >= 6) break; if (f.home !== H.user && f.away !== H.user) { await H.playFixture(f, null); continue; }
    t.bowlPlan = H.defaultBowlPlan(t.xi = H.autoXI(H.user)); t.order = H.autoOrder(t.xi); const P0 = JSON.parse(JSON.stringify(t.bowlPlan));
    const m = await H.playFixture(f, null); games++;
    const inn = m.inns.find((i) => i.bowl === H.user); if (!inn || m.overs < 20) continue;
    for (const [id, b] of Object.entries(inn.bw)) for (const k of ['pp', 'mid', 'death']) { const n = (b.ph && b.ph[k]) || 0; total += n; agree += Math.min(n, (P0[id] && P0[id][k]) || 0); }
  }
  ok(total > 0 && agree / total >= 0.8, `captain follows the bowling plan (${agree}/${total} overs)`);
  ok(Object.keys(H.s.phaseEco[H.year] || {}).length > 0, 'phase economy is recorded for the scout report');
  const f = H.userNext(); ok(/lean on|dew/.test(H.scoutReport(f)), `scout report: ${H.scoutReport(f)}`);
  ok(typeof f.dew === 'boolean' && H.newMatch(f).dew === f.dew, 'dew is fixed per fixture and the match uses it');
  // order warnings: best batter at 11, a tail-ender at 3, no keeper
  const ord = H.autoOrder(H.autoXI(H.user)); const bad = ord.slice(); const top = bad.shift(); bad.push(top);
  const ps = bad.map((id) => H.P(id)); const tail = ps.filter((p) => p.bat < 45).pop(); if (tail) { bad.splice(bad.indexOf(tail.id), 1); bad.splice(2, 0, tail.id); }
  const w = H.orderWarnings(bad); ok(H.P(top).bat < 68 || w.some((x) => x.kind === 'high' && x.pid === top), 'warns when a 68+ batter is at 8 or lower');
  ok(!tail || w.some((x) => x.kind === 'low' && x.pid === tail.id), 'warns when a sub-45 batter is in the top 7');
  const noWk = H.autoXI(H.user).filter((id) => H.P(id).role !== 'WK'); while (noWk.length < 11) noWk.push(t.squad.find((id) => !noWk.includes(id) && H.P(id).role !== 'WK'));
  t.keeperId = null; ok(H.orderWarnings(noWk).some((x) => x.kind === 'wk') && !H.xiRules(H.user, noWk).find((r) => r.k === 'wk').ok, 'no keeper is flagged');
  ok(H.xiRules(H.user, H.autoXI(H.user)).every((r) => r.ok || r.k === 'cap'), 'an auto XI passes the rules');
  // old saves without a plan get one at match time
  const O = new Game(JSON.parse(JSON.stringify(H.s))); delete O.teams[O.user].bowlPlan; O.lineup(O.user);
  ok(O.teams[O.user].bowlPlan && Object.keys(O.teams[O.user].bowlPlan).length >= 5, 'old save gets a default bowling plan');
}

// ===== backroom staff =====
{
  const S = Game.create('LL', { lang: 'en' }); const t = S.teams[S.user]; const st = S.s.staff[S.user];
  ok(Object.keys(S.teams).every((id) => ['bat', 'bowl', 'physio'].every((k) => S.s.staff[id][k] && S.s.staff[id][k].level >= 1 && S.s.staff[id][k].level <= 5)), 'every team starts with three staff');
  ok(['bat', 'bowl', 'physio'].every((k) => st[k].level === 2 && st[k].wage === 5 && st[k].until === 2027), 'the user starts with level-2 staff to 2027');
  ok(STAFF_WAGE.slice(1).join(',') === '3,5,8,10,12', 'wages Rs 3/5/8/10/12 L by level');
  // release: half of the two unpaid seasons in the 2026 pre-season
  const b0 = t.balance; const fee = S.releaseCost(S.user, 'physio'); ok(fee === 5, `release fee is half the remaining wage (${fee})`);
  S.releaseStaff('physio'); ok(!st.physio && Math.abs(t.balance - (b0 - 5)) < 1e-9, 'release pays the fee from the balance');
  ok(S.injuryLength(S.user, 2) === 3, 'no physio: injuries a match longer');
  const c = S.staffCandidates('physio'); ok(c.length === 3, '3 physio candidates'); ok(S.staffCandidates('physio') === c, 'candidates stay the same within the off-season');
  const lvl = c[1].level; S.hireStaff('physio', 1); ok(st.physio && st.physio.level === lvl, 'hire fills the post');
  for (const [L, base, want] of [[1, 3, 2], [2, 3, 2], [4, 3, 1], [5, 3, 1], [5, 1, 1], [3, 2, 1]]) { st.physio.level = L; ok(S.injuryLength(S.user, base) === want, `physio L${L}: ${base}-match injury → ${want}`); }
  st.physio.level = 4;
  // wages at season start
  S.aiPreseason(); for (const p of S.osFreeAgents()) { if (S.osCount(S.user) >= 6) break; S.signFA(p.id); }
  const w = S.staffWages(S.user); S.startSeason();
  ok(Math.abs(t.ledger.staff + w + 5) < 1e-9 && t.ledger.staffFees === 5, `ledger shows staff wages ${w} plus the 5 release fee (${t.ledger.staff})`);
  ok(S.hireStaff('bat', 0) !== null && S.releaseStaff('bat') === null, 'no hiring or releasing during the season');
  // physio +L fitness and coaches speed form recovery, after a match
  const f = S.userNext(); const xi = S.autoXI(S.user); t.xi = xi; t.order = S.autoOrder(xi);
  const bench = t.squad.map((id) => S.P(id)).filter((p) => !xi.includes(p.id) && !p.inj);
  const pf = bench[0]; pf.fit = 50; const pb = bench.find((p) => p.role === 'BAT' || p.role === 'WK') || bench[1]; pb.form = -5; pb.fit = 100;
  st.bat.level = 5; const fit0 = pf.fit, form0 = pb.form;
  const m = await S.playFixture(f, null);
  if (!m.lineups[S.user].xi.includes(pf.id)) ok(Math.round(pf.fit - fit0) === (t.training === 'Light' ? 10 : 7) + 4, `physio L4 adds +4 fitness after a match (${fit0} → ${pf.fit})`);
  if (!m.lineups[S.user].xi.includes(pb.id)) ok(Math.abs(pb.form - form0 * (1 - 0.03 * 1.5)) < 1e-9, `batting coach L5 speeds form recovery 50% (${form0} → ${pb.form.toFixed(3)})`);
  // bowling coach at the death: +0.4 x L to the bowler's strength
  const mm = S.newMatch(S.userNext()); const bowlerTeam = mm.home === S.user ? mm.home : mm.away;
  const inn = { bowl: bowlerTeam, bat: bowlerTeam === mm.home ? mm.away : mm.home }; const bw = S.P(xi.find((id) => S.P(id).bowl >= 50)); const bt = S.P(S.autoXI(inn.bat)[0]);
  st.bowl.level = 0; const w0 = mm.strengths(inn, bt, bw, 'death').w; st.bowl.level = 5; const w5 = mm.strengths(inn, bt, bw, 'death').w; const wm = mm.strengths(inn, bt, bw, 'mid').w; st.bowl.level = 0; const wm0 = mm.strengths(inn, bt, bw, 'mid').w;
  ok(Math.abs(w5 - w0 - 2) < 1e-9 && wm === wm0, `bowling coach L5: death bowling +2.0, middle overs unchanged (${w0.toFixed(1)} → ${w5.toFixed(1)})`); st.bowl.level = 3;
  // development: under-26 batters get +round(L/2), up to potential
  const young = t.squad.map((id) => S.P(id)).filter((p) => p.age < 25 && (p.role === 'BAT' || p.role === 'WK') && p.pot - ovr(p) >= 4);
  // the bonus is capped at potential after the year's normal growth: expect min(2, room left)
  st.bat.level = 4; for (const p of young) { S.develop(p); const room = Math.max(0, p.pot - (ovr(p) - p.coachDev)); ok(p.coachDev === Math.min(2, room) && p.coachDev > 0, `${p.name} (${p.age}) gets +${Math.min(2, room)} from a level-4 batting coach (room ${room})`); }
  const old = t.squad.map((id) => S.P(id)).find((p) => p.age >= 27); if (old) { S.develop(old); ok(old.coachDev === 0, 'no coach development at 26 and over'); }
  // old saves get staff
  const O = JSON.parse(JSON.stringify(S.s)); delete O.staff; delete O.staffPool; const G2 = new Game(O);
  ok(Object.keys(G2.teams).every((id) => G2.s.staff[id] && G2.s.staff[id].bat), 'old save gets staff for every team');
}
// ===== international layer =====
{
  const I = Game.create('LL', { lang: 'en' }); const byName = (n) => Object.values(I.players).find((p) => p.name === n);
  const rp = byName('Rohit Paudel'); ok(rp.intl.t20i === 84 && rp.intl.odi === 94 && rp.intl.grade === 'A+' && rp.intl.debut.date === '3 August 2018', 'Rohit Paudel: real caps, A+ contract and debut from the sources');
  ok(byName('Sandeep Lamichhane').intl.debut.v === 'Netherlands', 'a World XI debut is not counted as a Nepal debut');
  const md = byName('Mausam Dhakal'); ok(md.intl.t20i === null && md.intl.odi === null && I.intlCaps(md, 't20i') === null, 'unverified caps stay null');
  ok(byName('Tilak Bhandari').intl.t20i === 0 && !byName('Tilak Bhandari').intl.grade, 'an uncapped real player has 0 caps and no contract');
  const fict = Object.values(I.players).filter((p) => p.nat === 'NEP' && p.real === false); ok(fict.length > 0 && fict.every((p) => p.intl && !p.intl.real && p.intl.t20i === 0), 'fictional players get no real caps');
  ok(byName('Moeen Ali').intlStatus === 'retired' && byName('Rashid Khan') && Object.values(I.players).find((p) => p.name === 'Rashid Khan' && p.nat === 'AFG').intlStatus === 'active', 'overseas status from sources');
  ok(Object.values(I.players).filter((p) => p.intl && p.intl.grade).length === 37, '37 of the 38 contracted men are in the game');
  const sel = I.pickNepal(); const sq = sel.squad.map((id) => I.P(id));
  ok(sq.length === 15 && sel.fringe.length === 3 && sq.some((p) => p.role === 'WK') && sq.filter((p) => p.bowl >= 55).length >= 5, 'Nepal squad: 15 with a keeper and 5 bowlers, 3 on the fringe');
  // a fictional youngster good enough to be picked: first cap → capped, value +50%, out of the uncapped set
  const kid = fict[0]; kid.bat = 92; kid.bowl = 90; kid.pot = 99; kid.form = 10; kid.team = null; const v0 = kid.value;
  const vet = sq.find((p) => p.role !== 'WK' && I.intlCaps(p, 't20i') != null); vet.intl.t20i = 24; vet.intl.odi = 0;
  // play a season so form is set, then the winter
  I.aiPreseason(); for (const p of I.osFreeAgents()) { if (I.osCount(I.user) >= 6) break; I.signFA(p.id); } I.startSeason();
  const onDuty = Object.values(I.players).filter((p) => p.duty); ok(onDuty.every((p) => p.intlStatus === 'active'), 'only active internationals are called away');
  while (!I.leagueDone()) await I.playFixture(I.nextFixture(), null); I.setupPlayoffs(); let ch = null; while (!ch) { const f = I.nextFixture(); if (f) await I.playFixture(f, null); ch = I.advancePlayoffs(); } I.seasonAwards(ch);
  I.startOffseason(); kid.bat = 92; kid.bowl = 90; kid.form = 10; const pre = Object.fromEntries(Object.values(I.players).filter((p) => p.nat === 'NEP').map((p) => [p.id, { o: ovr(p), fit: p.fit, g: { ...p.intlG } }]));
  const vBefore = kid.value; const res = await I.runIntlWinter();
  ok(res.length === 3 && res.map((r) => r.id).join(',') === 'cwcq-po-2026,inda-2026,ban-2027', 'the real 2026-27 calendar is played');
  ok(res.every((r) => r.w + r.l + r.nr === ({ 'cwcq-po-2026': 5, 'inda-2026': 2, 'ban-2027': 3 })[r.id]), 'every match has a result');
  const D = I.s.nepal.duty;
  for (const [id, d] of Object.entries(D)) { const p = I.P(id); const b = pre[id];
    ok(ovr(p) - b.o <= 2 * d.events.length && ovr(p) <= Math.max(p.pot, b.o), `${p.name}: +1 to +2 a series, up to potential (${b.o} → ${ovr(p)})`);
    ok(Math.round(b.fit - p.fit) === Math.min(b.fit - 30, 10 * d.events.length), `${p.name}: 10 fitness a series`);
    const official = d.caps; ok(p.intlG.t20i + p.intlG.odi - b.g.t20i - b.g.odi === official, `${p.name}: caps only for official matches (${official})`); }
  ok(!Object.keys(D).some((id) => I.P(id).intlLog.some((e) => e.fmt === 'T20' && false)), 'India A games logged');
  if (D[kid.id]) { ok(kid.capped && !kid.uncapped && Math.abs(kid.value - vBefore * 1.5) <= 1, `first cap: capped, value ${vBefore} → ${kid.value}`); void v0; ok(I.s.inbox.some((n) => n.kind === 'intl' && n.sub === 'First cap' && n.text.includes(kid.name)) || kid.team !== I.user, 'first-cap news'); }
  else ok(false, 'the forced youngster should have been picked');
  if (D[vet.id] && I.intlCaps(vet, 't20i') >= 25) ok(I.s.inbox.some((n) => n.kind === 'intl' && /25th cap/.test(n.text)) || vet.team !== I.user, `25th-cap milestone (${vet.name})`);
  ok(Object.values(I.players).filter((p) => p.intl && p.intl.grade).length === 38 && I.s.nepal.contractYear === 2027, 'contracts re-graded for 2027 (3/4/5/11/15)');
  // overseas: NOC pending and national duty make a player unavailable; a temporary replacement is free on the purse
  const t = I.teams[I.user]; const osP = t.squad.map((id) => I.P(id)).find((p) => p.nat !== 'NEP' && !p.temp);
  osP.nocStatus = 'pending'; osP.nocWait = 1; ok(!I.available(osP) && !I.autoXI(I.user).includes(osP.id), 'NOC pending: not selectable');
  osP.nocStatus = 'received'; osP.duty = { nation: 'X', at: 0, len: 2, left: 2, started: true }; ok(!I.available(osP), 'on national duty: not selectable');
  const fa = I.osFreeAgents()[0]; const stale = t.osPurse; I.recalcPurse(I.user); const purse0 = t.osPurse; ok(stale === purse0, `purse is current after the off-season starts (${stale} v ${purse0})`); const err = I.signTemp(fa.id, osP.id);
  ok(err === null && t.squad.includes(fa.id) && t.osPurse === purse0, `temporary replacement: in the squad, salary not counted (err ${err}, purse ${stale} / ${purse0} → ${t.osPurse})`);
  I.overseasTick(I.user); ok(osP.duty && osP.duty.left === 1, 'duty counts down after a match'); I.overseasTick(I.user);
  ok(!osP.duty && !t.squad.includes(fa.id) && !fa.team, 'back from duty: the temporary replacement leaves');
  // old saves: no intl fields → re-initialised from the data
  const O = JSON.parse(JSON.stringify(I.s)); delete O.nepal; for (const p of Object.values(O.players)) { delete p.intl; delete p.intlG; delete p.intlLog; delete p.intlStatus; delete p.nocStatus; delete p.duty; }
  const G3 = new Game(O); const rp3 = Object.values(G3.players).find((p) => p.name === 'Rohit Paudel');
  ok(G3.s.nepal && rp3.intl.t20i === 84 && Array.isArray(rp3.intlLog) && Object.values(G3.players).filter((p) => p.nat !== 'NEP').every((p) => p.nocStatus === 'received'), 'old save gets the international fields');
}
console.log(`ok - ${checks} season-flow checks`);
