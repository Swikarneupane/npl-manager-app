// Individual training programmes: a few focus slots a week on top of the team session plan.
// State: G.s.club.prog = { playerId: programmeName } (compact; absent on old saves, filled by progs()).
// Effects are small and flow through the existing mechanics: development points (p.tdev, capped by
// potential and the season gain cap), form (p.form) and fitness (p.fit, p.inj). Some effects are hidden.
import { clamp, ovr, isPace } from './engine.js';

export const PROG_SLOTS = 6;
const BAT = 'bat', BOWL = 'bowl', ANY = 'any';
export const PROGRAMMES = {
  Footwork: { kind: BAT, dev: 1.0, en: 'Moving the feet to spin and swing; builds batting.', ne: 'स्पिन र स्विङमा खुट्टा चलाउने; ब्याटिङ बलियो।' },
  'Playing pace': { kind: BAT, dev: 1.0, en: 'Handling pace and bounce; builds batting.', ne: 'गति र बाउन्स खेल्ने; ब्याटिङ बलियो।' },
  'Playing spin': { kind: BAT, dev: 1.0, en: 'Reading and playing spin in the middle overs; builds batting.', ne: 'स्पिन पढ्ने र खेल्ने; ब्याटिङ बलियो।' },
  'Aggressive shots': { kind: BAT, dev: 0.9, en: 'Power hitting and range for the death overs; builds batting.', ne: 'पावर हिटिङ; ब्याटिङ बलियो।' },
  'Defence and patience': { kind: BAT, dev: 0.9, en: 'Playing the ball on its merit and building an innings; builds batting.', ne: 'धैर्य र रक्षा; ब्याटिङ बलियो।' },
  'Opening or middle-order role': { kind: BAT, dev: 0.8, en: 'Practice for a set batting position; builds batting.', ne: 'तोकिएको क्रममा अभ्यास; ब्याटिङ बलियो।' },
  'Attacking limited-overs bowling': { kind: BOWL, dev: 1.0, en: 'Wicket-taking plans and yorkers in short formats; builds bowling.', ne: 'विकेट लिने योजना; बलिङ बलियो।' },
  'Defensive limited-overs bowling': { kind: BOWL, dev: 0.9, en: 'Dot balls and tight lines under pressure; builds bowling.', ne: 'कसिलो लाइन; बलिङ बलियो।' },
  'Control and accuracy': { kind: BOWL, dev: 1.0, en: 'Hitting the same spot every ball; builds bowling.', ne: 'सटीकता; बलिङ बलियो।' },
  'Pace and rhythm': { kind: BOWL, pace: 1, dev: 1.0, en: 'Run-up, rhythm and pace for fast bowlers; builds bowling.', ne: 'रन-अप र लय; बलिङ बलियो।' },
  'Spin variations': { kind: BOWL, pace: -1, dev: 1.0, en: 'Flight, turn and a new delivery for spinners; builds bowling.', ne: 'स्पिन भिन्नता; बलिङ बलियो।' },
  'Form recovery': { kind: ANY, dev: 0.2, en: 'Rebuilds confidence and rhythm for a player out of form.', ne: 'फर्ममा नभएको खेलाडीको आत्मविश्वास फर्काउँछ।' },
  Physio: { kind: ANY, dev: 0, en: 'Treatment and conditioning: helps fitness and recovery from injury.', ne: 'उपचार र फिटनेस: चोटबाट छिटो उम्कन मद्दत।' },
};
export const PROG_NAMES = Object.keys(PROGRAMMES);
const isBatter = (p) => p.role === 'BAT' || p.role === 'WK';
const isBowler = (p) => p.role === 'BOWL';
const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); };

// The programme map, created on first use (old saves). Entries for players who left the squad are dropped.
export function progs(G) {
  const C = G.s.club; if (!C) return {};
  C.prog ??= {};
  const sq = new Set(G.teams[G.user].squad);
  for (const id of Object.keys(C.prog)) if (!sq.has(id) || !PROGRAMMES[C.prog[id]]) delete C.prog[id];
  return C.prog;
}
export const slotsUsed = (G) => Object.keys(progs(G)).length;
export const progOf = (G, pid) => progs(G)[pid] || null;
// Programmes that make sense for a player: his discipline plus the two general ones.
export function optionsFor(p) {
  return PROG_NAMES.filter((n) => { const k = PROGRAMMES[n].kind; return k === ANY || (k === BAT ? !isBowler(p) : !isBatter(p)) && !(PROGRAMMES[n].pace && PROGRAMMES[n].pace !== (isPace(p) ? 1 : -1)); });
}
// Give a player a programme (null clears it). Returns an error string when the slots are full.
export function setProgramme(G, pid, name) {
  const C = progs(G); const had = !!C[pid];
  if (!name) { delete C[pid]; return null; }
  if (!PROGRAMMES[name]) return 'Unknown programme.';
  if (!had && slotsUsed(G) >= PROG_SLOTS) return `All ${PROG_SLOTS} slots are in use. Free one first.`;
  C[pid] = name; return null;
}
export const outOfForm = (p) => !p.inj && (p.form ?? 0) <= -2;
// Players who are out of form with no Form recovery programme, while slots are free.
export function slotPrompt(G) {
  const C = progs(G); const free = PROG_SLOTS - Object.keys(C).length;
  const need = G.teams[G.user].squad.map((id) => G.P(id)).filter((p) => p && outOfForm(p) && C[p.id] !== 'Form recovery');
  return { used: Object.keys(C).length, slots: PROG_SLOTS, free, need, unused: free > 0 && need.length > 0 };
}

// One week of one player's programme. Bounded: dev <= 1.2 points, form <= +0.8, fitness <= +3.
// A programme outside his discipline counts for 30%. Mood scales it in the caller (dev only here).
export function programmeEffect(G, p, name) {
  const S = PROGRAMMES[name]; const z = { dev: 0, form: 0, fit: 0, heal: false, bias: null };
  if (!S) return z;
  if (S.kind === BAT || S.kind === BOWL) {
    const fits = S.kind === BAT ? !isBowler(p) : !isBatter(p);
    z.dev = p.inj ? 0 : Math.min(1.2, S.dev * (fits ? 1 : 0.3)); z.bias = fits ? S.kind : null;
  } else if (name === 'Form recovery') {
    z.dev = p.inj ? 0 : S.dev;
    z.form = p.inj ? 0 : (p.form ?? 0) < 0 ? Math.min(0.8, 0.35 - (p.form ?? 0) * 0.06) : 0.1;
  } else if (name === 'Physio') {
    z.fit = (p.fit ?? 100) < 95 ? 2 + (hash(p.id + G.year) % 2) : 0; // part of this is hidden from the screen
    z.heal = !!p.inj && (hash(p.id + String(p.inj) + G.year + (G.s.club.applied || 0)) % 100) < 30;
  }
  return z;
}
// Applied by the training week for one player. mood: the existing 0.7..1.0 multiplier. Returns dev points to add.
export function applyProgramme(G, p, mood) {
  const name = progOf(G, p.id); p.pbias = null; if (!name) return 0;
  const e = programmeEffect(G, p, name);
  if (e.fit) p.fit = clamp(Math.round(p.fit + e.fit), 40, 100);
  if (e.form) p.form = clamp((p.form ?? 0) + e.form * mood, -10, 10);
  if (e.heal && p.inj > 1) p.inj -= 1;
  p.pbias = e.bias;
  return e.dev * mood * (p.age <= 25 ? 1 : p.age <= 29 ? 0.7 : 0.4);
}

// Assistant: injured or tired -> Physio, out of form -> Form recovery, then the rest by room to grow.
export function autoAssign(G) {
  const C = progs(G); for (const k of Object.keys(C)) delete C[k];
  const sq = G.teams[G.user].squad.map((id) => G.P(id)).filter((p) => p && !p.retired);
  const wk = G.s.club.applied || 0; const picks = [];
  for (const p of sq) if (p.inj || (p.fit ?? 100) < 70) picks.push([p, 'Physio', 3]);
  for (const p of sq) if (outOfForm(p) && !picks.some((x) => x[0] === p)) picks.push([p, 'Form recovery', 2]);
  const rest = sq.filter((p) => !picks.some((x) => x[0] === p)).sort((a, b) => (b.pot - ovr(b)) - (a.pot - ovr(a)));
  for (const p of rest) {
    const opts = optionsFor(p).filter((n) => PROGRAMMES[n].kind !== 'any');
    const weakBat = p.role === 'AR' ? p.bat <= p.bowl : isBatter(p);
    const pool = opts.filter((n) => PROGRAMMES[n].kind === (weakBat ? BAT : BOWL));
    if (pool.length && ovr(p) < p.pot) picks.push([p, pool[hash(p.id + wk) % pool.length], 1]);
  }
  for (const [p, n] of picks.slice(0, PROG_SLOTS)) C[p.id] = n;
  return Object.keys(C).length;
}
