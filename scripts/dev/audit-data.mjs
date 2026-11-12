// Consistency audit over the whole player database (nation and league modules). Development tool.
// Usage: node scripts/dev/audit-data.mjs   Prints findings; exits 1 if there are hard errors.
const { NATIONS_DB } = await import('../../src/data/world/index.js');
const { LEAGUES_DB } = await import('../../src/data/world/leagues.js');
const recs = []; const where = {};
for (const [c] of NATIONS_DB) { const m = (await import(`../../src/data/world/nations/${c}.js`)).default; for (const r of m.players) { recs.push(r); where[r[0]] = `nation ${c}`; } }
for (const [c] of LEAGUES_DB) { const m = (await import(`../../src/data/world/leagues/${c}.js`)).default; for (const r of m.players || []) { if (where[r[0]]) { (global.dupIds ??= []).push(`${r[0]} in ${where[r[0]]} and league ${c}`); continue; } recs.push(r); where[r[0]] = `league ${c}`; } }
const out = { err: [], warn: [] }; const ROLES = ['BAT', 'BOWL', 'AR', 'WK']; const TYPES = ['RF', 'RFM', 'RM', 'LF', 'LFM', 'LM', 'OB', 'LB', 'SLA', 'LWS', '']; const byName = {};
for (const r of recs) {
  const [id, name, nat, born, role, bat, bowl, type, hand] = r; const gen = r[9] && r[9].gen;
  if (!ROLES.includes(role)) out.err.push(`${id}: role ${role}`); if (!TYPES.includes(type || '')) out.err.push(`${id}: bowling type ${type}`); if (!['R', 'L'].includes(hand)) out.err.push(`${id}: hand ${hand}`);
  if (!(bat >= 0 && bat <= 100 && bowl >= 0 && bowl <= 100)) out.err.push(`${id}: rating range ${bat}/${bowl}`);
  if (!gen && !(born >= 1972 && born <= 2012)) out.warn.push(`${id}: birth year ${born}`);
  if ((role === 'BOWL' || role === 'AR') && !type) out.err.push(`${id}: ${role} without a bowling type`);
  if (role === 'BOWL' && bowl < 40) out.warn.push(`${id}: bowler rated ${bowl}`);
  const k = `${nat}|${name.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}`; (byName[k] ??= []).push(`${id} (${born})`);
}
for (const [k, v] of Object.entries(byName)) if (v.length > 1) out.warn.push(`same name and nation: ${v.join(', ')}`);
for (const d of global.dupIds || []) out.warn.push(`duplicate id: ${d}`);
const unv = recs.filter((r) => r[9] && r[9].unv).length; console.log(`${recs.length} players audited, ${unv} with unverified details (flagged unv)`); console.log(`ERRORS ${out.err.length}`); out.err.slice(0, 80).forEach((x) => console.log('  ' + x)); console.log(`WARNINGS ${out.warn.length}`); out.warn.slice(0, 80).forEach((x) => console.log('  ' + x));
const kinds = {}; for (const w of out.warn) { const k = w.replace(/^[^:]*: /, '').replace(/\d+/g, '#').slice(0, 30); kinds[k] = (kinds[k] || 0) + 1; } console.log(JSON.stringify(kinds));
process.exit(out.err.length ? 1 : 0);
