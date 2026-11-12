// Appends the real state-team squads (squads.txt) to ../in/IND.txt, then run: node tools/worlddata/asia/gen.mjs IND
// Skips anyone already in a nation or league file (matched by name). Ratings are estimates from role and a name hash.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
const inPath = here + '../in/IND.txt';
const BEGIN = '// BEGIN state squads (ind-states/build.mjs)';
let txt = readFileSync(inPath, 'utf8'); const i = txt.indexOf(BEGIN); if (i >= 0) txt = txt.slice(0, i).trimEnd() + '\n';
const have = new Set();
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
for (const l of txt.split('\n')) if (l && !l.startsWith('#') && !l.startsWith('//')) have.add(norm(l.split(';')[0]));
const root = here + '../../../../src/data/world/';
for (const d of ['nations/', 'leagues/']) for (const f of readdirSync(root + d)) { if (f === 'IND.js') continue;
  for (const m of readFileSync(root + d + f, 'utf8').matchAll(/\[\s*["']([a-z0-9-]+)["'],\s*["']([^"']+)["'],\s*["'][A-Z]+["'],\s*\d{4}/g)) have.add(norm(m[2])); }
const h = (s) => { let x = 7; for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };
let out = BEGIN + '\n'; let team = ''; const per = {}; let skipped = 0;
for (let line of readFileSync(here + 'squads.txt', 'utf8').split('\n')) { line = line.trim(); if (!line || line[0] === '#') continue;
  if (line[0] === '@') { team = line.slice(1); per[team] = 0; out += `// ${team}\n`; continue; }
  const [name, born, role0, hand, type] = line.split(';'); const k = norm(name);
  // an all-rounder with no known bowling type is listed as a batter; a bowler with none is skipped (nothing is guessed)
  let role = role0; if (type === '-' && role === 'AR') role = 'BAT'; if (type === '-' && role === 'BOWL') { skipped++; continue; }
  if (!+born || have.has(k)) { skipped++; continue; } have.add(k);
  const r = h(name) % 15, age = 2026 - +born; let bat, bowl;
  if (role === 'BAT') { bat = 50 + r; bowl = type === '-' ? 0 : 15 + (r % 20); }
  else if (role === 'WK') { bat = 50 + r; bowl = 0; }
  else if (role === 'AR') { bat = 46 + (r % 12); bowl = 46 + ((r * 7) % 12); }
  else { bat = 15 + (r % 14); bowl = 48 + r; }
  if (type === '-') bowl = 0;
  if (age < 21) { bat -= 3; bowl = bowl ? bowl - 3 : 0; }
  out += `${name};${born};${role};${bat};${bowl};${type};${hand};-;${team}\n`; per[team]++;
}
writeFileSync(inPath, txt + '\n' + out);
console.log(JSON.stringify(per), 'skipped', skipped);
