// Live match controller. Drives the async Match engine through hooks and pauses for the user.
// It lives outside React so a match survives navigation; screens re-render via onChange().
import { R, Match } from '../game/engine.js';
import { sleep } from './util.js';
import { afterFixture } from './flow.js';
import { autosave, saveLocal } from './save.js';
import { applyPlan, keyMoment, resolveKey, addExpert, alsoFixture, simAlso } from '../game/matchday.js';
import { newWorldMatch, recordWorld, injuries } from '../world/match.js';

export const SPEEDS = { 0.5: 1700, 1: 950, 2: 480, 4: 170 };

// A world fixture (a national side's match) is played the same way: G is then the stand-in from
// world/match.js (worldGame), world = { S } its season, and the real game is G.real.
export class LiveMatch {
  constructor(G, f, onChange, saved, world) {
    this.G = G; this.f = f; this.onChange = onChange; this.world = world || null; this.RG = world ? G.real : G;
    this.m = saved ? Match.restore(G, saved.data) : world ? newWorldMatch(G, f) : G.newMatch(f);
    // key moments are written for 20 overs; a 50-over or multi-day match plays without them
    this.md = !!this.m.md; this.noKey = this.md || (!!world && this.m.maxBalls > 120); this.inj0 = world ? (saved && saved.inj0) || injuries(G) : null;
    this.done = false; this.started = false; this.wait = null; this.simTo = null; this.pauseReq = false;
    this.pending = null; this.mode = G.s.settings.mode; this.prevOver = null; this.nextBat = null; this.nextBowler = null; this.lastInn = null; this.innIdx = 1;
    this.error = null; this.snap = null; this.resumed = false;
    if (saved) { this.mode = saved.mode || this.mode; this.prevOver = saved.prevOver || null; this.resumed = true; this.snap = saved.data; this.lastInn = this.m.inns[this.m.inns.length - 1] || null; }
  }
  // Snapshot is taken after each completed ball (a safe point), then written to disk at over ends,
  // when the game pauses for the user, and when the app is closed or sent to the background.
  takeSnap() { this.snap = this.m.serialize(); }
  persist(urgent = false) {
    if (!this.snap || this.done) return;
    const L = { n: this.f.n, year: this.G.year, mode: this.mode, prevOver: this.prevOver, data: this.snap };
    if (this.world) { delete L.n; L.w = this.f.id; L.sid = this.world.S.id; L.inj0 = this.inj0; }
    this.RG.s.liveMatch = L; saveLocal(this.RG, urgent);
  }
  get inn() { return this.m.inns[this.m.inns.length - 1]; }
  speed() { return SPEEDS[this.G.s.settings.speed] || 480; }
  // simTo: 'over', 'innings', 'match'; multi-day also 'session' (to the next lunch, tea or stumps) and 'stumps'
  fast() { return this.mode === 'quick' || ['match', 'over', 'innings', 'session', 'stumps'].includes(this.simTo); }
  refresh() { this.onChange && this.onChange(); }
  waitUser(label) { this.persist(); return new Promise((res) => { this.wait = { res, label }; this.refresh(); }); }
  resume() { if (this.wait) { const r = this.wait.res; this.wait = null; r(); } this.refresh(); }
  resolvePending(v) { const p = this.pending; this.pending = null; if (p) p.res(v); this.refresh(); }
  // Simming hands any open call to the defaults: the captain's bowler, the usual toss choice,
  // no review, and the recommended key-moment option.
  sim(to) {
    this.simTo = to; this.innIdx = this.m.inns.length; const p = this.pending;
    if (p) {
      if (p.type === 'bowler') this.resolvePending(null);
      else if (p.type === 'toss') this.resolvePending(this.m.night ? 'field' : 'bat');
      else if (p.type === 'drs') this.resolvePending(p.info && p.info.hint === 'doubt');
      else if (p.type === 'key') this.resolvePending(p.pick);
      else if (p.type === 'follow') this.resolvePending(p.pick);
    }
    this.resume();
  }
  // The assistant (or any fast sim) resolves key moments; otherwise the match pauses on a gold card.
  async askKey(inn, km) {
    if (!km) return null;
    if (this.fast() || this.G.s.settings.assistant) return resolveKey(this.G, this.m, inn, km, km.rec, true);
    const idx = await new Promise((res) => { this.pending = { type: 'key', km, res, pick: km.rec }; this.persist(); this.refresh(); });
    return resolveKey(this.G, this.m, inn, km, idx, false);
  }
  // Fraction of the match bowled, for the "also live" ticker.
  progress() { const m = this.m; if (this.md) return 1 - m.leftBalls() / m.maxBalls; return m.inns.reduce((a, i) => a + i.balls, 0) / (2 * m.maxBalls); }
  // Multi-day: the user's batting side declares before the next ball.
  declare() { const i = this.inn; if (!this.md || !i || i.bat !== this.G.user || this.m.inns.length >= 4 || this.done) return; i.decReq = true; this.takeSnap(); this.persist(); if (this.wait) this.resume(); else this.refresh(); }
  setMode(m) { this.mode = m; if (m !== 'ball' && this.wait && this.wait.label === 'Next ball') this.resume(); this.refresh(); }

  start() {
    if (this.started) return; // a second tap must never start the same match twice
    const self = this, G = this.G;
    this.started = true;
    const hooks = {
      onLine: () => {},
      toss: () => (self.fast() ? (self.m.night ? 'field' : 'bat') : new Promise((res) => { self.pending = { type: 'toss', res }; self.refresh(); })),
      // A bowler picked ahead of time (nextBowler) is used without stopping; otherwise the game
      // stops at the overs the mode asks about, with the captain's pick preselected.
      chooseBowler: async (inn, m) => {
        const km = self.noKey ? null : keyMoment(G, m, inn, 'bowler');
        if (km) { const b = await self.askKey(inn, km); if (b) { self.nextBowler = null; return b; } }
        const want = self.nextBowler; self.nextBowler = null;
        const ok = want && m.bowlerOptions(inn).includes(want) ? want : null;
        if (self.fast()) return ok;
        if (self.md) {
          // a spell carries on without asking; the game stops when the captain would make a change
          if (ok) return ok; const pick = m.aiBowler(inn); const s = inn.bw[pick]; const ov = Math.floor(inn.balls / 6);
          if (s && s.lo === ov - 2 && m.spellNext(s, ov) > 1 && self.mode !== 'ball') return pick;
          return new Promise((res) => { self.pending = { type: 'bowler', res, pick }; self.refresh(); });
        }
        const o = Math.floor(inn.balls / 6);
        if (ok || (self.mode === 'key' && !(o === 0 || o === 6 || o >= 15))) return ok;
        return new Promise((res) => { self.pending = { type: 'bowler', res, pick: m.aiBowler(inn) }; self.refresh(); });
      },
      review: (inn, m, info) => {
        if (self.fast() && !G.s.settings.pauseDRS) return info.hint === 'doubt' ? R() < 0.7 : R() < 0.1;
        return new Promise((res) => { self.pending = { type: 'drs', info, res, ov: m.ovStr(inn), bowler: G.P(inn.cur).name }; self.refresh(); });
      },
      pickNext: (inn, m, rem) => (self.nextBat && rem.includes(self.nextBat) ? self.nextBat : null),
      beforeOver: async (inn) => {
        if (self.lastInn && self.lastInn !== inn) { self.lastInn = inn; self.prevOver = null; if (!self.fast()) await self.waitUser(self.md ? `Start the ${['', 'first', 'second', 'third', 'fourth'][self.m.inns.length]} innings` : 'Start the second innings'); }
        self.lastInn = inn; if (!self.md) applyPlan(G, self.m, inn);
        const km = self.noKey ? null : keyMoment(G, self.m, inn, 'over'); if (km) await self.askKey(inn, km);
        self.refresh();
      },
      overEnd: async (inn) => {
        self.prevOver = { seq: inn.overSeq.slice(), n: inn.balls / 6, bowler: G.P(inn.cur).name };
        if (!self.fast() || inn.balls % 36 === 0) self.persist();
        if (self.simTo === 'over') self.simTo = null;
        if (!self.fast() && self.mode === 'over') { self.refresh(); await self.waitUser('Next over'); }
      },
      // Multi-day: lunch, tea and stumps. The match pauses at each in normal play; a session or day sim
      // stops at the break it was asked for.
      brk: async (kind, m) => {
        self.takeSnap(); self.prevOver = null;
        if (self.simTo === 'session' || (self.simTo === 'stumps' && kind === 'stumps')) self.simTo = null;
        if (self.fast()) { self.persist(); await sleep(0); return; }
        await self.waitUser(kind === 'lunch' ? 'Start the afternoon session' : kind === 'tea' ? 'Start the evening session' : `Start day ${m.md.day}`);
      },
      followOn: (m, info) => (self.fast() ? info.rec : new Promise((res) => { self.pending = { type: 'follow', info, res, pick: info.rec }; self.persist(); self.refresh(); })),
      afterBall: async (inn, m, info) => {
        if (self.mode !== 'quick' && self.simTo !== 'match' && !(self.md && (info.ev === '0' || self.fast()))) addExpert(G, m, inn, info.ev === 'drop' ? 'drop' : info.ev === 'wkt' ? 'wkt' : info.ev === '0' ? 'dot' : info.ev);
        // a multi-day sim snapshots once an over (a Test is long, and so is its log)
        if (!self.md || !self.fast() || inn.balls % 6 === 0) self.takeSnap(); self.refresh();
        if (self.simTo === 'innings' && self.innIdx !== m.inns.length) self.simTo = null;
        if (self.fast()) { if (inn.balls % 12 === 0) await sleep(0); return; }
        const key = info.ev === 'wkt' || m.log.slice(-3).some((e) => e.c === 'mile' || e.c === 'drs');
        if (self.pauseReq) { self.pauseReq = false; await self.waitUser('Continue'); return; }
        if (self.mode === 'ball') { await self.waitUser('Next ball'); return; }
        // whatever the mode, a wicket always stops the play (the key-moments mode stops on it below)
        if (info.ev === 'wkt' && self.mode !== 'key') { await sleep(self.speed() * 0.5); await self.waitUser('Continue'); return; }
        if (self.mode === 'key' && key) { await sleep(self.speed()); await self.waitUser('Continue'); return; }
        // a multi-day match plays its quiet balls at a third of the speed setting's pause, so a session watches in minutes
        await sleep(self.md && !key ? self.speed() * 0.3 : self.mode === 'key' && Math.floor(inn.balls / 6) < 15 && !key ? self.speed() * 0.45 : self.speed());
      },
    };
    if (this.world) {
      // a national match: recorded into the world (table, stats, the board), never into the NPL
      this.m.run(hooks)
        .then(() => { recordWorld(this.RG, this.world.S, this.f, this.m, this.inj0); this.done = true; autosave(this.RG); this.refresh(); })
        .catch((e) => { console.error(e); this.error = e.message; this.refresh(); });
      this.refresh(); return;
    }
    const af = alsoFixture(G, this.f);
    if (af && af.res) this.also = { f: af };
    else if (af) this.alsoP = simAlso(G, af).then((a) => { this.also = a; this.refresh(); return a; }).catch((e) => { console.error(e); return null; });
    this.m.run(hooks)
      .then(async () => { G.recordMatch(this.m, this.f);
        if (this.alsoP) { const a = await this.alsoP; if (a && a.m && !a.f.res) G.recordMatch(a.m, a.f); } this.done = true; delete G.s.liveMatch; afterFixture(G); autosave(G); this.refresh(); })
      .catch((e) => { console.error(e); this.error = e.message; this.refresh(); });
    this.refresh();
  }
}
