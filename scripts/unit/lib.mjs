// A tiny test harness: test(name, fn) registers; run.mjs runs every *.test.mjs file in this folder.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
export const tests = [];
export function test(name, fn) { tests.push({ name, fn, file: currentFile }); }
let currentFile = '';
export const setFile = (f) => { currentFile = f; };
// A save written by the phase 1 code, before any phase 2 field existed.
export function oldSave() { return JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/save-phase1.json.gz', import.meta.url))).toString()); }
