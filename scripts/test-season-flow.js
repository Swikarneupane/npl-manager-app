// Headless season flow: plays 2 full seasons with the real engine and checks the round 2 rules as
// they are added (decisions and promises so far). Exits non-zero on the first broken rule.
import { Game, cautiousIndex } from '../src/game/game.js';
import { ovr } from '../src/game/engine.js';

let checks = 0;
const ok = (c, msg) => { if (!c) { console.error(`FAIL - ${msg}`); process.exit(1); } checks++; };
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
      if (live) { if (P.mode === 'keep' && !G.P(live.pid).inj) startPlayer(G, live.pid); else if (P.mode === 'break') dropPlayer(G, live.pid); else G.teams[G.user].xi = null; }
      const morale0 = live ? G.P(live.pid).morale : 0; const left0 = live ? live.matchesLeft : 0;
      const m = await G.playFixture(f, null); lastM = { ...m, n: f.n, lineups: m.lineups, result: m.result };
      const E = G._expectExpire;
      if (E) { ok(E.n.done && E.n.auto && E.n.picked === E.safe.l, 'unanswered decision took the cautious option'); ok(/Board confidence −2/.test(E.n.outcome), 'expiry notes the board penalty'); stats.expired++; G._expectExpire = null; }
      if (live) {
        const still = G.s.promises.find((x) => x.id === live.id); const xi = m.lineups[G.user].xi; const p = G.P(live.pid);
        if (xi.includes(live.pid)) { ok(!still, 'promise kept is cleared'); stats.kept++; G._promise = null; }
        else if (p.inj && still) ok(still.matchesLeft === left0, 'an injured player does not use up a promised match');
        else if (still) ok(still.matchesLeft === left0 - 1, `a missed match counts down (${left0} → ${still.matchesLeft})`);
        else { ok(Math.round(morale0 - p.morale) >= 19 || p.morale === 0, `broken promise costs morale 20 (${morale0} → ${p.morale})`); ok(G.s.inbox.some((x) => /^Promise broken/.test(x.text)), 'broken promise is in the news'); stats.broken++; G._promise = null; }
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
  G.startOffseason();
  ok(!G.pendingDecisions().length && !G.s.promises.length, 'off-season clears open decisions and promises');
  G.beginRetention(); G.applyRetention(); G.setupAuction(); while (G.lotStart()) G.simLot(true); G.finishAuction();
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

console.log(`ok - ${checks} season-flow checks`);
