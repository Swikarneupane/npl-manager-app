// Generates src/data/world/leagues/IPL.js from in/IPL-2026.json (the registered squads) and the nation files.
// Run from the repo root: node tools/worlddata/asia/ipl-gen.mjs
// Input rows: [name, nationality, birth year, batting hand, bowling style, salary in crore]. Source: Wikipedia,
// "2026 <franchise> season" squad tables (end of the 2026 season; withdrawn players left out), read November 2026.
// Players already in a nation file are referenced by 'Name|NAT'; the others are written as records here.
// Roles and ratings are the game's estimates; the real facts are name, nationality, birth year, hand and bowling type.
import fs from 'node:fs';
import { NATION_CODES, loadNation } from '../../../src/data/world/index.js';

const IN = JSON.parse(fs.readFileSync(new URL('./in/IPL-2026.json', import.meta.url)));
const mods = await Promise.all(NATION_CODES.map((c) => loadNation(c).then((m) => m.default || m)));
const key = (n, c) => `${c}|${n.toLowerCase().replace(/[^a-z]/g, '')}`;
const have = {}; const ids = new Set();
for (const m of mods) for (const r of m.players) { have[key(r[1], r[2])] = r; ids.add(r[0]); }

// role, bat, bowl, state side (a state side only where I am sure of it): estimates for the known names; the rest are derived below
const K = {
  'MS Dhoni': ['WK', 70, 0, 'IND-JHA'], 'Ajinkya Rahane': ['BAT', 72, 10, 'IND-MUM'], 'Nitish Rana': ['BAT', 70, 20, 'IND-DEL'], 'Manish Pandey': ['BAT', 64, 10, 'IND-KAR'],
  'Rahul Tripathi': ['BAT', 68, 10], 'Rahul Tewatia': ['AR', 66, 55, 'IND-HAR'], 'Ishant Sharma': ['BOWL', 15, 68, 'IND-DEL'], 'T. Natarajan': ['BOWL', 15, 72, 'IND-TN'],
  'Deepak Chahar': ['BOWL', 35, 74, 'IND-RAJ'], 'Rahul Chahar': ['BOWL', 15, 68, 'IND-RAJ'], 'Umran Malik': ['BOWL', 12, 68, 'IND-JK'], 'Navdeep Saini': ['BOWL', 20, 64, 'IND-DEL'],
  'Sandeep Sharma': ['BOWL', 15, 70, 'IND-PUN'], 'Tushar Deshpande': ['BOWL', 20, 68, 'IND-MUM'], 'Krunal Pandya': ['AR', 62, 70, 'IND-BAR'], 'Jayant Yadav': ['AR', 45, 60, 'IND-HAR'],
  'Shahbaz Ahmed': ['AR', 56, 62, 'IND-BEN'], 'Jaydev Unadkat': ['BOWL', 15, 68, 'IND-SAU'], 'Prabhsimran Singh': ['WK', 70, 0, 'IND-PUN'], 'Shreyas Gopal': ['BOWL', 50, 62, 'IND-KAR'],
  'Kuldeep Sen': ['BOWL', 15, 66, 'IND-MP'], 'Prithvi Shaw': ['BAT', 68, 10, 'IND-MAH'], 'Abdul Samad': ['BAT', 66, 20, 'IND-JK'], 'Ayush Badoni': ['BAT', 68, 25, 'IND-DEL'],
  'Nehal Wadhera': ['BAT', 68, 20, 'IND-PUN'], 'Harpreet Brar': ['AR', 40, 66, 'IND-PUN'], 'Vijaykumar Vyshak': ['BOWL', 20, 68, 'IND-KAR'], 'Mohsin Khan': ['BOWL', 15, 68, 'IND-UP'],
  'Arjun Tendulkar': ['AR', 40, 58, 'IND-GOA'], 'Ashutosh Sharma': ['BAT', 68, 10, 'IND-RLY'], 'Shahrukh Khan': ['BAT', 64, 30, 'IND-TN'], 'Ramandeep Singh': ['AR', 62, 50, 'IND-PUN'],
  'Arshad Khan': ['AR', 45, 60, 'IND-MP'], 'Mayank Markande': ['BOWL', 20, 66, 'IND-PUN'], 'Anuj Rawat': ['WK', 62, 0, 'IND-DEL'], 'Suyash Sharma': ['BOWL', 12, 66, 'IND-DEL'],
  'Rasikh Salam': ['BOWL', 15, 68, 'IND-JK'], 'Vignesh Puthur': ['BOWL', 12, 62, 'IND-KER'], 'Digvesh Rathi': ['BOWL', 12, 62, 'IND-DEL'], 'Gurjapneet Singh': ['BOWL', 15, 64, 'IND-TN'],
  'Vaibhav Arora': ['BOWL', 20, 66, 'IND-HP'], 'Kartik Tyagi': ['BOWL', 15, 62, 'IND-UP'], 'Angkrish Raghuvanshi': ['BAT', 64, 15, 'IND-MUM'], 'Daksh Kamra': ['WK', 56, 0],
  'Vishnu Vinod': ['WK', 64, 0, 'IND-KER'], 'Abhishek Porel': ['WK', 66, 0, 'IND-BEN'], 'Sameer Rizvi': ['BAT', 66, 20, 'IND-UP'], 'Musheer Khan': ['AR', 58, 40, 'IND-MUM'],
  'Mukesh Choudhary': ['BOWL', 15, 62, 'IND-MAH'], 'Akash Madhwal': ['BOWL', 15, 64, 'IND-UKD'], 'Tripurana Vijay': ['AR', 50, 52, 'IND-HYD'], 'Zeeshan Ansari': ['BOWL', 20, 58],
  'Kartik Sharma': ['WK', 58, 0], 'Salil Arora': ['WK', 58, 0], 'Urvil Patel': ['WK', 62, 0, 'IND-GUJ'], 'Aman Rao': ['WK', 50, 0], 'Kumar Kushagra': ['WK', 58, 0, 'IND-JHA'],
  'Robin Minz': ['WK', 60, 0, 'IND-JHA'], 'Mukul Choudhary': ['BAT', 56, 0], 'Tejasvi Singh': ['WK', 56, 0], 'Himmat Singh': ['BAT', 56, 15, 'IND-DEL'],
  'Aniket Verma': ['BAT', 58, 10, 'IND-MP'], 'Smaran Ravichandran': ['BAT', 60, 15, 'IND-KAR'], 'Praful Hinge': ['BOWL', 15, 60, 'IND-VID'], 'Sakib Hussain': ['BOWL', 12, 60, 'IND-BIH'],
  'Vicky Ostwal': ['BOWL', 25, 60, 'IND-VID'], 'Shubham Dubey': ['BAT', 58, 15, 'IND-VID'], 'Mahipal Lomror': ['AR', 58, 40, 'IND-RAJ'], 'Vipraj Nigam': ['AR', 48, 58, 'IND-UP'],
  'Dian Forrester': ['BOWL', 20, 66], 'Connor Esterhuizen': ['WK', 66, 0], 'Richard Gleeson': ['BOWL', 15, 70],
};
// state sides from the existing nation file are kept; a few known batters have no bowling style listed
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const TYPE = (b, hand) => {
  const t = b.toLowerCase(); if (!t) return ''; const L = t.startsWith('left');
  if (/off/.test(t)) return 'OB'; if (/leg/.test(t)) return 'LB'; if (/wrist|unorthodox/.test(t)) return L ? 'LWS' : 'LB'; if (/orthodox|slow/.test(t)) return 'SLA';
  if (/fast-medium|medium-fast|medium fast/.test(t)) return L ? 'LFM' : 'RFM'; if (/medium/.test(t)) return L ? 'LFM' : 'RM'; if (/fast/.test(t)) return L ? 'LFM' : 'RF'; return 'RM';
};
const owner = {}; const squads = {}; const players = []; const seen = new Set(); const warn = [];
const ALIAS = { 'Allah Ghazanfar': 'Allah Mohammad Ghazanfar' }; // the nation file's spelling
const FIX = { 'Mangesh Yadav': 2000 }; // the source table gives an impossible birth year (2022)
for (const [team, list] of Object.entries(IN)) {
  squads[team] = [];
  for (const [name0, nat, by, hand, bowl, sal] of list) { const name = ALIAS[name0] || name0;
    const k = key(name, nat); squads[team].push(`${name}|${nat}`); if (owner[k] && owner[k] !== team) warn.push(`dup ${name} ${owner[k]} ${team}`); owner[k] = team;
    if (have[k] || seen.has(k)) continue; seen.add(k);
    const born = FIX[name] || by; const kn = K[name]; const type = TYPE(bowl, hand); const h = hash(name);
    let role, bat, bw, st;
    if (kn) [role, bat, bw, st] = kn;
    else { const q = Math.min(64, 52 + Math.round((sal || 0.3) * 2.5)); role = type ? 'BOWL' : 'BAT'; bat = role === 'BOWL' ? 14 + (h % 14) : q; bw = role === 'BOWL' ? q : 0; }
    if (role === 'BAT' && bw === 0 && type) bw = 10;
    let id = `${nat.toLowerCase()}-${slug(name)}`; for (let n = 2; ids.has(id); n++) id = `${nat.toLowerCase()}-${slug(name)}-${n}`; ids.add(id);
    for (const r of Object.values(have)) if (r[2] === nat && r[3] === born && r[1].split(' ').pop() === name.split(' ').pop()) warn.push(`maybe same person: ${name} / ${r[1]}`);
    const regs = [nat]; if (st) regs.push(st);
    players.push([id, name, nat, born, role, bat, bw, role === 'BAT' || role === 'WK' ? (bw ? type : '') : type, hand, { t20: role === 'BAT' ? 2 : 0 }, regs]);
  }
}
const R = (r) => JSON.stringify(r).replace(/"t20":/g, 't20: ');
const teams = [['IPL-CSK', 'Chennai Super Kings', 'CSK', 'Chennai'], ['IPL-MI', 'Mumbai Indians', 'MI', 'Mumbai'], ['IPL-RCB', 'Royal Challengers Bengaluru', 'RCB', 'Bengaluru'], ['IPL-KKR', 'Kolkata Knight Riders', 'KKR', 'Kolkata'],
  ['IPL-DC', 'Delhi Capitals', 'DC', 'Delhi'], ['IPL-PBKS', 'Punjab Kings', 'PBKS', 'Mullanpur'], ['IPL-RR', 'Rajasthan Royals', 'RR', 'Jaipur'], ['IPL-SRH', 'Sunrisers Hyderabad', 'SRH', 'Hyderabad'],
  ['IPL-GT', 'Gujarat Titans', 'GT', 'Ahmedabad'], ['IPL-LSG', 'Lucknow Super Giants', 'LSG', 'Lucknow']];
const out = `// Indian Premier League. GENERATED by tools/worlddata/asia/ipl-gen.mjs from in/IPL-2026.json: edit the generator, never this file.
// Squads: the end of the 2026 season (withdrawn players left out), before the 2027 retentions (deadline reported as 17 Nov 2026) and the
// 2027 mini-auction (Goa, 16 Dec 2026). Players already in a nation file are referenced by 'Name|NAT'; the rest are listed in \`players\`.
// Real facts only: name, nationality, birth year, role, hand, bowling type, state side where known. Ratings are the game's estimates.
export default {
  code: 'IPL', name: 'Indian Premier League', kind: 'franchise', host: 'IND', asOf: '2026-11-11',
  sources: [
    'Wikipedia, "2026 Indian Premier League" and the ten "2026 <franchise> season" pages (squad tables, retention and auction notes, 28 March to 31 May 2026, 74 matches), read November 2026',
    'crictracker.com and outlookindia.com, IPL 2027 mini-auction in Goa on 16 December 2026 (retention deadline 15, then 17 November 2026), November 2026',
    'IPL 2027 window 14 March to 30 May 2027, as sent to franchises by the BCCI in 2024 (Wikipedia, "2026 Indian Premier League")',
  ],
  teams: ${JSON.stringify(teams.map(([id, name, short, city]) => ({ id, name, short, city })))},
  players: [
${players.map((p) => '    ' + R(p) + ',').join('\n')}
  ],
  squads: {
${Object.entries(squads).map(([t, l]) => `    '${t}': ${JSON.stringify(l)},`).join('\n')}
  },
  // 2026 purse 125 crore (mini-auction; retentions unlimited, each deducted from the purse); the 2025 mega-auction had 120 crore and 6 retentions.
  // Overseas: at most 8 in a squad of 18 to 25 and 4 in the XI. Whether a mega-auction returns after 2027 could not be verified.
  rules: { min: 18, max: 25, overseas: { max: 8, xi: 4 }, recruit: 'auction', retain: 'any', purse: 125, auction: { type: 'mini', date: '2026-12-16', place: 'Goa' } },
};
`;
fs.writeFileSync(new URL('../../../src/data/world/leagues/IPL.js', import.meta.url), out);
console.log(players.length, 'new players;', warn.length ? warn.join('\n') : 'no warnings');
