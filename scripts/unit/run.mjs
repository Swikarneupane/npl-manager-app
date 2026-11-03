// Runs every scripts/unit/*.test.mjs. Exits non-zero on the first failure.
import { readdirSync } from 'node:fs';
import { tests, setFile } from './lib.mjs';
const dir = new URL('.', import.meta.url);
const only = process.argv[2];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.test.mjs')).sort()) { if (only && !f.includes(only)) continue; setFile(f); await import(new URL(f, dir)); }
let n = 0;
for (const t of tests) {
  try { await t.fn(); n++; if (process.env.VERBOSE) console.log(`ok   ${t.file} · ${t.name}`); }
  catch (e) { console.error(`FAIL ${t.file} · ${t.name}\n${e.stack || e}`); process.exit(1); }
}
console.log(`ok - ${n} unit tests`);
