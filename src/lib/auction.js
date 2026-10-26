// Auction room controller: AI teams bid on a timer, the user bids or passes, RTM in mega auctions.
import { SPEEDS } from './live.js';
import { autosave } from './save.js';

export class AuctionRoom {
  constructor(G, onChange) { this.G = G; this.onChange = onChange; this.timer = null; this.count = 0; this.state = 'idle'; this.tickCls = ''; this.rtmAsk = null; }
  get A() { return this.G.s.auction; }
  shortlist() { const a = this.A; a.shortlist = a.shortlist || []; a.maxBid = a.maxBid || {}; return a.shortlist; }
  userMax(pid) { const a = this.A; return this.shortlist().includes(pid) && a.maxBid[pid] ? a.maxBid[pid] : 0; }
  delay() { return Math.max(250, (SPEEDS[this.G.s.settings.speed] || 480) * 0.9); }
  stop() { clearTimeout(this.timer); this.timer = null; }
  schedule() { this.stop(); this.timer = setTimeout(() => this.tick(), this.delay()); }
  refresh() { this.onChange && this.onChange(); }
  flip() { this.tickCls = this.tickCls === 'tick-a' ? 'tick-b' : 'tick-a'; }
  ensureLot() {
    const a = this.A; if (!a) return;
    if ((!a.cur || a.cur.done) && a.lots[a.i] && this.state !== 'done') { this.G.lotStart(); this.state = 'open'; this.count = 0; }
    if (a.cur && !a.cur.done && !this.timer && !this.rtmAsk) this.schedule();
  }
  logSale(c, w) { const a = this.A; a.log = a.log || []; a.log.unshift({ pid: c.pid, team: w, price: c.bid }); if (a.log.length > 40) a.log.length = 40; }
  canUserBid() { const G = this.G, c = this.A.cur; if (!c || c.done) return false; const p = G.P(c.pid); return c.leader !== G.user && G.canAdd(G.user, p) && G.nextBidAmount() <= G.budgetOf(G.user, p); }
  tick() {
    const G = this.G, c = this.A.cur; this.timer = null;
    if (!c || c.done || this.rtmAsk) return;
    const p = G.P(c.pid);
    const r = G.aiStep(false);
    if (r.type === 'bid') { this.count = 0; this.flip(); this.refresh(); return this.schedule(); }
    const nb = G.nextBidAmount();
    if (this.userMax(c.pid) >= nb && this.canUserBid()) { G.userBid(); this.count = 0; this.flip(); this.refresh(); return this.schedule(); }
    this.count++;
    const limit = !c.userPassed && this.canUserBid() ? 3 : 2;
    if (this.count < limit) { this.refresh(); return this.schedule(); }
    const pt = G.rtmCandidate();
    if (pt === G.user) { this.rtmAsk = { pid: c.pid, team: c.leader, price: c.bid }; this.refresh(); return undefined; }
    if (pt && p.value * G.needFor(pt, p) * 1.1 >= c.bid) G.useRTM(pt);
    this.hammer();
  }
  hammer() { const c = this.A.cur; const w = this.G.hammer(); this.logSale(c, w); this.state = 'done'; autosave(this.G); this.refresh(); }
  answerRTM(use) { this.rtmAsk = null; if (use) this.G.useRTM(this.G.user); this.hammer(); }
  bid() { const e = this.G.userBid(); if (e) return e; this.count = 0; this.flip(); this.refresh(); this.schedule(); return null; }
  pass() { this.A.cur.userPassed = true; this.refresh(); }
  next() { this.stop(); this.state = 'idle'; this.ensureLot(); if (!this.A.lots[this.A.i] && (!this.A.cur || this.A.cur.done)) this.state = 'end'; this.refresh(); }
  // Resolve the current lot instantly. The user only bids via shortlist max bids unless userIsAI.
  resolveQuick(userIsAI) {
    const G = this.G, c = this.A.cur, p = G.P(c.pid); let g = 0;
    while (g++ < 500) {
      const r = G.aiStep(!!userIsAI); if (r.type === 'bid') continue;
      if (!userIsAI && this.userMax(c.pid) >= G.nextBidAmount() && this.canUserBid()) { G.userBid(); continue; }
      break;
    }
    const pt = G.rtmCandidate();
    if (pt) { if (pt === G.user && !userIsAI) { if (this.userMax(c.pid) >= c.bid) G.useRTM(pt); } else if (p.value * G.needFor(pt, p) * 1.1 >= c.bid) G.useRTM(pt); }
    const w = G.hammer(); this.logSale(c, w);
  }
  skip() { this.stop(); const c = this.A.cur; if (c && !c.done) { c.userPassed = true; this.resolveQuick(false); } this.state = 'idle'; this.next(); }
  jump() {
    this.stop(); const a = this.A; if (a.cur && !a.cur.done) this.resolveQuick(false);
    const sl = this.shortlist();
    while (a.lots[a.i] && !sl.includes(a.lots[a.i].pid)) { this.G.lotStart(); this.resolveQuick(false); }
    this.state = 'idle'; this.next(); autosave(this.G);
  }
  simRest() { this.stop(); const a = this.A; if (a.cur && !a.cur.done) this.resolveQuick(true); while (this.G.lotStart()) this.resolveQuick(true); this.state = 'end'; autosave(this.G); this.refresh(); }
}
