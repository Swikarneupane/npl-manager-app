import { ovr } from '../game/engine.js';
export const seasonNo = (y) => y - 2023;
export const last = (n) => String(n).split(' ').slice(-1)[0];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const fmtNRR = (x) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(3);
const NPD = '०१२३४५६७८९';
export const nn = (G, s) => (G && G.s.settings.nepNum ? String(s).replace(/[0-9]/g, (d) => NPD[d]) : s);
export function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }
export const formDisp = (p) => ((p.form + 10) / 2).toFixed(1);
export function potRange(p) {
  const o = ovr(p); if (p.scouted || p.pot <= o) return String(Math.max(o, p.pot));
  const h = hash(p.id); const lo = Math.max(o, p.pot - (h % 7) - 1), hi = Math.min(97, p.pot + ((h >> 4) % 6) + 1);
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}
export const stageName = (f) => ({ L: `Match ${f.n} of 28`, Q1: 'Qualifier 1', EL: 'Eliminator', Q2: 'Qualifier 2', F: 'Final' })[f.stage];
export const tname = (G, id) => G.teams[id].name;
export const tshort = (G, id) => G.teams[id].name.split(' ')[0];
export const userNextFixture = (G) => G.s.fixtures.find((f) => !f.res && (f.home === G.user || f.away === G.user));
export const nextUnplayed = (G) => G.s.fixtures.find((f) => !f.res);
export function boardMood(bc) { return bc >= 75 ? 'Delighted' : bc >= 60 ? 'Satisfied' : bc >= 45 ? 'Uneasy' : bc >= 30 ? 'Concerned' : 'Losing patience'; }
export const NP_UI = { Home: 'गृह', Squad: 'टोली', Match: 'खेल', Fixtures: 'तालिका', Table: 'अंकतालिका', Auction: 'लिलामी', Stats: 'तथ्यांक', History: 'इतिहास', Club: 'क्लब', Settings: 'सेटिङ', Signings: 'अनुबन्ध', 'Off-season': 'अफ-सिजन' };
export const tr = (G, k) => (G && G.s.lang === 'np' && NP_UI[k] ? NP_UI[k] : k);
