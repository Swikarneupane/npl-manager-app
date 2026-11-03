// Live match controller. Drives the async Match engine through hooks and pauses for the user.
// It lives outside React so a match survives navigation; screens re-render via onChange().
import { R, Match } from '../game/engine.js';
import { sleep } from './util.js';
import { afterFixture } from './flow.js';
import { autosave, saveLocal } from './save.js';
import { applyPlan, keyMoment, resolveKey, addExpert, alsoFixture, simAlso } from '../game/matchday.js';

export const SPEEDS = { 0.5: 1700, 1: 950, 2: 480, 4: 170 };

export class LiveMatch {
  constructor(G, f, onChange, saved) {
    this.G = G; this.f = f; this.onChange = onChange;
    this.m = saved ? Match.restore(G, saved.data) : G.newMatch(f);
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
    this.G.s.liveMatch = { n: this.f.n, year: this.G.year, mode: this.mode, prevOver: this.prevOver, data: this.snap };
    saveLocal(this.G, urgent);
  }
  get inn() { return this.m.inns[this.m.inns.length - 1]; }
  speed() { return SPEEDS[this.G.s.settings.speed] || 480; }
  fast() { return this.mode === 'quick' || this.simTo === 'match' || this.simTo === 'over' || this.simTo === 'innings'; }
  refresh() { this.onChange && this.onChange(); }
  waitUser(label) { this.persist(); return new Promise((res) => { this.wait = { res, label }; this.refresh(); }); }
  resume() { if (this.wait) { const r = this.wait.res; this.wait = null; r(); } this.refresh(); }
  resolvePending(v) { const p = this.pending; this.pending = null; if (p) p.res(v); this.refresh(); }
  sim(to) { this.simTo = to; this.innIdx = this.m.inns.length; if (this.pending && this.pending.type === 'bowler') this.resolvePending(null); this.resume(); }
  // The assistant (or any fast sim) resolves key moments; otherwise the match pauses on a gold card.
  async askKey(inn, km) {
    if (this.fast() || this.G.s.settings.assistant) return resolveKey(this.G, this.m, inn, km, km.rec, true);
    const idx = await new Promise((res) => { this.pending = { type: 'key', km, res, pick: km.rec }; this.persist(); this.refresh(); });
    return resolveKey(this.G, this.m, inn, km, idx, false);
  }
  // Fraction of the match bowled, for the "also live" ticker.
  progress() { const m = this.m; return m.inns.reduce((a, i) => a + i.balls, 0) / (2 * m.maxBalls); }
  setMode(m) { this.mode = m; if (m !== 'ball' && this.wait && this.wait.label === 'Next ball') this.resume(); this.refresh(); }

  start() {
    const self = this, G = this.G;
    this.started = true;
    const hooks = {
      onLine: () => {},
      toss: () => (self.fast() ? (self.m.night ? 'field' : 'bat') : new Promise((res) => { self.pending = { type: 'toss', res }; self.refresh(); })),
      // A bowler picked ahead of time (nextBowler) is used without stopping; otherwise the game
      // stops at the overs the mode asks about, with the captain's pick preselected.
      chooseBowler: async (inn, m) => {
        const km = keyMoment(G, m, inn, 'bowler');
        if (km) { const b = await self.askKey(inn, km); if (b) { self.nextBowler = null; return b; } }
        const want = self.nextBowler; self.nextBowler = null;
        const ok = want && m.bowlerOptions(inn).includes(want) ? want : null;
        if (self.fast()) return ok;
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
        if (self.lastInn && self.lastInn !== inn) { self.lastInn = inn; self.prevOver = null; if (!self.fast()) await self.waitUser('Start the second innings'); }
        self.lastInn = inn; applyPlan(G, self.m, inn);
        const km = keyMoment(G, self.m, inn, 'over'); if (km) await self.askKey(inn, km);
        self.refresh();
      },
      overEnd: async (inn) => {
        self.prevOver = { seq: inn.overSeq.slice(), n: inn.balls / 6, bowler: G.P(inn.cur).name };
        if (!self.fast() || inn.balls % 36 === 0) self.persist();
        if (self.simTo === 'over') self.simTo = null;
        if (!self.fast() && self.mode === 'over') { self.refresh(); await self.waitUser('Next over'); }
      },
      afterBall: async (inn, m, info) => {
        if (self.mode !== 'quick' && self.simTo !== 'match') addExpert(G, m, inn, info.ev === 'drop' ? 'drop' : info.ev === 'wkt' ? 'wkt' : info.ev === '0' ? 'dot' : info.ev);
        self.takeSnap(); self.refresh();
        if (self.simTo === 'innings' && self.innIdx !== m.inns.length) self.simTo = null;
        if (self.fast()) { if (inn.balls % 12 === 0) await sleep(0); return; }
        const key = info.ev === 'wkt' || m.log.slice(-3).some((e) => e.c === 'mile' || e.c === 'drs');
        if (self.pauseReq) { self.pauseReq = false; await self.waitUser('Continue'); return; }
        if (self.mode === 'ball') { await self.waitUser('Next ball'); return; }
        if (self.mode === 'key' && key) { await sleep(self.speed()); await self.waitUser('Continue'); return; }
        await sleep(self.mode === 'key' && Math.floor(inn.balls / 6) < 15 && !key ? self.speed() * 0.45 : self.speed());
      },
    };
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
