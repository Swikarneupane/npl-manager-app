// ===== Competitions: schedules, tables, stages =====
// A competition definition (static, see comps.js) and a season instance (in the save):
//   season = { id, comp, y, teams, stages: [stageState], fx: [fixture], tables: { grp: { tid: row } }, done, champ, runner }
//   fixture = { id, d (day), a, b, fmt, stage, grp, res: null | { w, l, tie, nr, text, sc: [[t, r, w, b]] , pom } }
// Stages run in order; a stage's fixtures are made when the stage opens, from the tables so far.
//   { type: 'rr', groups: [[...]] | null, legs: 1 }            round robin (in groups, or all teams)
//   { type: 'events', size: 3, legs: 2, count: n }               tri-series events feeding one table (CWC League 2)
//   { type: 'series', n: 3 }                                     a bilateral series between the two teams
//   { type: 'super', take: 3, carry: true }                      the top teams of each group meet the other groups' (Super Six)
//   { type: 'ko', plan: 'semis' | 'final' | 'ipl4' | 'top2' }    knockouts seeded from the last table
const clampN = (n) => Math.max(0, n);
export const blankRow = () => ({ p: 0, w: 0, l: 0, t: 0, nr: 0, d: 0, pts: 0, rf: 0, bf: 0, ra: 0, ba: 0 });
export const nrr = (r) => (r.bf ? r.rf / (r.bf / 6) : 0) - (r.ba ? r.ra / (r.ba / 6) : 0);
export function standings(tbl) {
  return Object.entries(tbl || {}).map(([id, r]) => ({ id, ...r, nrr: nrr(r) })).sort((a, b) => b.pts - a.pts || b.w - a.w || b.nrr - a.nrr);
}
// Spread n match slots over [start, end]: `perDay` matches on a match day, match days evenly apart.
function slots(n, start, end, perDay = 2) {
  const matchDays = Math.ceil(n / perDay); const step = Math.max(1, Math.floor((end - start + 1) / Math.max(1, matchDays)));
  return Array.from({ length: n }, (_, i) => Math.min(end, start + Math.floor(i / perDay) * step));
}
// Circle-method round robin: rounds of pairings with every team once a round.
export function roundRobin(teams, legs = 1, rnd = Math.random) {
  const t = teams.slice(); if (t.length % 2) t.push(null); const n = t.length; const rounds = [];
  for (let r = 0; r < n - 1; r++) { const pairs = []; for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; if (a && b) pairs.push(r % 2 ? [b, a] : [a, b]); } rounds.push(pairs); t.splice(1, 0, t.pop()); }
  const all = []; for (let l = 0; l < legs; l++) for (const r of rounds) all.push(r.map(([a, b]) => (l % 2 ? [b, a] : [a, b])));
  return all; // [[pair...] per round]
}

let fxSeq = 0;
const fxId = (sid) => `${sid}#${(++fxSeq).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

// Make the fixtures for stage k of a season, between days [start, end].
export function openStage(season, def, k, start, end, rnd = Math.random) {
  const st = def.stages[k]; const S = season; S.stage = k; const fmt = st.fmt || def.fmt; const mk = (a, b, d, grp, extra) => ({ id: fxId(S.id), d, a, b, fmt, stage: k, grp: grp || null, res: null, ...(extra || {}) });
  const add = (list) => { S.fx.push(...list); };
  if (st.type === 'rr') {
    const groups = st.groups ? st.groups.map((g) => g.filter((x) => S.teams.includes(x))) : [S.teams]; const fx = [];
    groups.forEach((g, gi) => { const key = st.groups ? String.fromCharCode(65 + gi) : 'all'; S.tables[key] ??= {}; for (const t of g) S.tables[key][t] ??= blankRow();
      roundRobin(g, st.legs || 1, rnd).forEach((round, ri) => round.forEach(([a, b]) => fx.push({ a, b, grp: key, ri }))); });
    fx.sort((x, y) => x.ri - y.ri); const ds = slots(fx.length, start, end, st.perDay || groups.length * 2);
    add(fx.map((x, i) => mk(x.a, x.b, ds[i], x.grp)));
  } else if (st.type === 'events') {
    // tri-series events in rotation: each event takes `size` teams, every pair plays `legs` times
    const key = 'all'; S.tables[key] ??= {}; for (const t of S.teams) S.tables[key][t] ??= blankRow();
    const evs = []; const T = S.teams.slice(); const n = st.count || Math.round((T.length * (T.length - 1)) / 2 / 3);
    // greedy: the next event is the combination whose teams have played least, then whose pairs have met least
    const combos = []; const pickC = (start, cur) => { if (cur.length === st.size) { combos.push(cur.slice()); return; } for (let i = start; i < T.length; i++) { cur.push(T[i]); pickC(i + 1, cur); cur.pop(); } }; pickC(0, []);
    const used = Object.fromEntries(T.map((t) => [t, 0])); const met = {}; const pk = (a, b) => (a < b ? a + b : b + a);
    for (let e = 0; e < n; e++) { let best = null, bs = Infinity;
      for (const c of combos) { let sc = 0; for (const t of c) sc += used[t] * 10; for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) sc += (met[pk(c[i], c[j])] || 0) * 3; sc += rnd() * 0.5; if (sc < bs) { bs = sc; best = c; } }
      for (const t of best) used[t]++; for (let i = 0; i < best.length; i++) for (let j = i + 1; j < best.length; j++) met[pk(best[i], best[j])] = (met[pk(best[i], best[j])] || 0) + 1; evs.push(best); }
    const span = Math.max(1, Math.floor((end - start) / Math.max(1, evs.length)));
    evs.forEach((ev, e) => { const d0 = start + e * span; const fx = []; for (let l = 0; l < (st.legs || 2); l++) for (let i = 0; i < ev.length; i++) for (let j = i + 1; j < ev.length; j++) fx.push(l % 2 ? [ev[j], ev[i]] : [ev[i], ev[j]]);
      fx.forEach(([a, b], i) => S.fx.push(mk(a, b, d0 + i * 2, key, { ev: e }))); });
  } else if (st.type === 'series') {
    const [a, b] = S.teams; const n = st.n || 3; const gap = Math.max(2, Math.floor((end - start) / Math.max(1, n)));
    S.tables.series ??= { [a]: blankRow(), [b]: blankRow() };
    for (let i = 0; i < n; i++) add([mk(i % 2 ? b : a, i % 2 ? a : b, start + i * gap, 'series')]);
  } else if (st.type === 'super') {
    const prev = Object.keys(S.tables).filter((g) => g !== 'super'); const q = []; for (const g of prev) q.push(...standings(S.tables[g]).slice(0, st.take || 3).map((r) => [r.id, g]));
    S.tables.super = {}; for (const [t] of q) S.tables.super[t] = blankRow();
    if (st.carry) for (const g of prev) for (const f of S.fx) if (f.grp === g && f.res && q.some(([t]) => t === f.a) && q.some(([t]) => t === f.b)) applyRes(S.tables.super, f);
    const fx = []; for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) if (q[i][1] !== q[j][1]) fx.push([q[i][0], q[j][0]]);
    const ds = slots(fx.length, start, end, 2); add(fx.map(([a, b], i) => mk(a, b, ds[i], 'super')));
  } else if (st.type === 'ko') {
    const tabs = Object.keys(S.tables).filter((g) => g !== 'series'); const last = S.tables.super ? ['super'] : tabs;
    const seeds = last.length === 1 ? standings(S.tables[last[0]]).map((r) => r.id) : null;
    const gs = last.length > 1 ? last.map((g) => standings(S.tables[g]).map((r) => r.id)) : null;
    S.ko ??= {};
    if (st.plan === 'final' || st.plan === 'top2') add([mk(seeds[0], seeds[1], end, 'ko', { ko: 'F' })]);
    else if (st.plan === 'semis') { const [p1, p2] = gs ? [[gs[0][0], gs[1][1]], [gs[1][0], gs[0][1]]] : [[seeds[0], seeds[3]], [seeds[1], seeds[2]]];
      add([mk(p1[0], p1[1], start, 'ko', { ko: 'SF1' }), mk(p2[0], p2[1], start + 1, 'ko', { ko: 'SF2' })]); S.ko.final = end; }
    else if (st.plan === 'ipl4') { add([mk(seeds[0], seeds[1], start, 'ko', { ko: 'Q1' }), mk(seeds[2], seeds[3], start + 1, 'ko', { ko: 'EL' })]); S.ko.q2 = start + 3; S.ko.final = end; }
  }
}
// After a knockout fixture: the next round, when it is due.
function koNext(S) {
  // a drawn or tied knockout goes to the side ahead on first innings, then the higher seed (team a)
  const fiLead = (f) => { const fi = {}; for (const row of f.res.sc || []) if (!fi[row[0]]) fi[row[0]] = row[1]; return (fi[f.b] || 0) > (fi[f.a] || 0) ? f.b : f.a; };
  const by = (k) => S.fx.find((f) => f.ko === k); const W = (f) => f.res.w || fiLead(f), L = (f) => (W(f) === f.a ? f.b : f.a); const k = S.stage;
  const mk = (a, b, d, ko) => S.fx.push({ id: fxId(S.id), d, a, b, fmt: S.fx[0].fmt, stage: k, grp: 'ko', res: null, ko });
  const sf1 = by('SF1'), sf2 = by('SF2'); if (sf1 && sf2 && sf1.res && sf2.res && !by('F')) mk(W(sf1), W(sf2), S.ko.final, 'F');
  const q1 = by('Q1'), el = by('EL'); if (q1 && el && q1.res && el.res && !by('Q2')) mk(L(q1), W(el), S.ko.q2, 'Q2');
  const q2 = by('Q2'); if (q1 && q2 && q2.res && !by('F')) mk(W(q1), W(q2), S.ko.final, 'F');
  const f = by('F'); if (f && f.res) { S.done = true; S.champ = W(f); S.runner = L(f); }
}
// Table update for a finished fixture. points (defaults 2/1/1/0 for limited-overs):
//   { win, loss, tie, nr, draw,
//     leadDraw: [lead, trail]   points for the first-innings lead in a drawn match (Ranji style)
//     bigWin: n                 extra for winning by an innings or by 10 wickets
//     bonus: { overs, bat: [runs...], bowl: [wkts...] }  one point per threshold passed in each
//                               side's first innings, within the first `overs` (county style) }
export function applyRes(tbl, f, points) {
  const P = { win: 2, tie: 1, nr: 1, loss: 0, draw: 1, ...(points || {}) }; const r = f.res;
  for (const t of [f.a, f.b]) { tbl[t] ??= blankRow(); tbl[t].p++; }
  if (r.nr) { tbl[f.a].nr++; tbl[f.b].nr++; tbl[f.a].pts += P.nr; tbl[f.b].pts += P.nr; return; }
  if (r.draw) { tbl[f.a].d++; tbl[f.b].d++; tbl[f.a].pts += P.draw; tbl[f.b].pts += P.draw;
    if (P.leadDraw) { const lead = firstInnLead(f, r); if (lead) { tbl[lead.lead].pts += P.leadDraw[0]; tbl[lead.trail].pts += P.leadDraw[1]; } } }
  else if (r.tie && !r.w) { tbl[f.a].t++; tbl[f.b].t++; tbl[f.a].pts += P.tie; tbl[f.b].pts += P.tie; }
  else { tbl[r.w].w++; tbl[r.w].pts += P.win; tbl[r.l].l++; tbl[r.l].pts += P.loss;
    if (P.bigWin && /innings|10 wickets/.test(r.text || '')) tbl[r.w].pts += P.bigWin; }
  if (P.bonus) for (const [t, pts] of bonusPoints(f, r, P.bonus)) tbl[t].pts += pts;
  for (const [t, runs, , balls] of r.sc || []) { const o = t === f.a ? f.b : f.a; tbl[t].rf += runs; tbl[t].bf += balls; tbl[o].ra += runs; tbl[o].ba += balls; }
}
// First innings of each side (sc rows are in batting order).
function firstInns(r) { const out = {}; for (const row of r.sc || []) if (!out[row[0]]) out[row[0]] = row; return out; }
function firstInnLead(f, r) { const fi = firstInns(r); const a = fi[f.a], b = fi[f.b]; if (!a || !b || a[1] === b[1]) return null; return a[1] > b[1] ? { lead: f.a, trail: f.b } : { lead: f.b, trail: f.a }; }
// Batting points for runs and bowling points for wickets in the first innings, scaled to the overs cap.
function bonusPoints(f, r, B) {
  const fi = firstInns(r); const out = [];
  for (const [bat, row] of Object.entries(fi)) { const bowl = bat === f.a ? f.b : f.a; const [, runs, wkts, balls] = row;
    const cap = (B.overs || 110) * 6; const share = balls > cap ? cap / balls : 1; const rr = runs * share, ww = Math.round(wkts * share);
    out.push([bat, (B.bat || []).filter((x) => rr >= x).length]); out.push([bowl, (B.bowl || []).filter((x) => ww >= x).length]); }
  return out;
}
// Record a result and move the season on (opening the next stage when this one is complete).
export function record(S, def, f, res, rnd) {
  f.res = res; const st = def.stages[f.stage];
  if (f.grp && f.grp !== 'ko' && S.tables[f.grp]) applyRes(S.tables[f.grp], f, def.points);
  if (st.type === 'ko') koNext(S);
  const open = S.fx.some((x) => x.stage === S.stage && !x.res);
  if (!open && !S.done) {
    if (S.stage + 1 < def.stages.length) { const last = Math.max(...S.fx.map((x) => x.d)); const end = S.end ?? last + 20; openStage(S, def, S.stage + 1, last + (def.stages[S.stage + 1].gap ?? 2), Math.max(last + 3, end), rnd); }
    else { S.done = true; const t = S.tables.super || S.tables.all || S.tables.series || Object.values(S.tables)[0]; const st0 = standings(t); if (!S.champ && st0.length) { S.champ = st0[0].id; S.runner = st0[1] && st0[1].id; } }
  }
}
export function newSeason(def, y, teams, start, end, rnd) {
  const S = { id: `${def.id}-${y}`, comp: def.id, y, teams: teams.slice(), fx: [], tables: {}, stage: 0, done: false, champ: null, runner: null, start, end };
  openStage(S, def, 0, start, def.stages.length > 1 ? Math.round(start + (end - start) * (def.stageShare ?? 0.75)) : end, rnd);
  return S;
}
export const pending = (S) => S.fx.filter((f) => !f.res);
export { clampN };
