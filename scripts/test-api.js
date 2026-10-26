// Tests the serverless functions locally against an in-memory Redis that speaks the Upstash REST protocol.
process.env.KV_REST_API_URL = 'https://fake-redis.local';
process.env.KV_REST_API_TOKEN = 'test-token';
const db = new Map();
globalThis.fetch = async (url, opts) => {
  const [cmd, key, ...rest] = JSON.parse(opts.body);
  let result = null;
  if (cmd === 'INCR') { result = (db.get(key) || 0) + 1; db.set(key, result); }
  else if (cmd === 'EXPIRE') result = 1;
  else if (cmd === 'GET') result = db.has(key) ? db.get(key) : null;
  else if (cmd === 'SET') { const nx = rest.includes('NX'); if (nx && db.has(key)) result = null; else { db.set(key, rest[0]); result = 'OK'; } }
  return { ok: true, json: async () => ({ result }) };
};
const { default: save } = await import('../api/save.js');
const { default: health } = await import('../api/health.js');
const { Game } = await import('../src/game/game.js');

const call = (handler, { method = 'GET', query = {}, body } = {}) => new Promise((resolve) => {
  const res = { code: 200, headers: {}, status(c) { this.code = c; return this; }, setHeader(k, v) { this.headers[k] = v; }, json(j) { resolve({ code: this.code, body: j }); } };
  handler({ method, query, body, headers: { 'x-forwarded-for': '1.2.3.4' }, socket: {} }, res);
});
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };

const h = await call(health); assert(h.body.cloudSaves === true, 'health reports cloud saves on');
const G = Game.create('KG', {});
const up = await call(save, { method: 'POST', body: { save: G.s } });
assert(up.code === 201 && /^[A-HJ-NP-Z2-9]{8}$/.test(up.body.code), `upload returns a code (${up.body.code}, ${Math.round(up.body.bytes / 1024)} KB gzipped of ${Math.round(JSON.stringify(G.s).length / 1024)} KB)`);
const down = await call(save, { query: { code: up.body.code.toLowerCase() } });
assert(down.code === 200 && down.body.save.user === 'KG' && Object.keys(down.body.save.players).length === Object.keys(G.s.players).length, 'download returns the same save (case-insensitive code)');
assert((await call(save, { query: { code: 'ZZZZZZZZ' } })).code === 404, 'unknown code is 404');
assert((await call(save, { query: { code: 'bad' } })).code === 400, 'malformed code is 400');
assert((await call(save, { method: 'POST', body: { save: { hello: 1 } } })).code === 400, 'non-save body is rejected');
assert((await call(save, { method: 'DELETE' })).code === 405, 'other methods are 405');
let last; for (let i = 0; i < 25; i++) last = await call(save, { method: 'POST', body: { save: G.s } });
assert(last.code === 429, 'uploads are rate limited per IP');
delete process.env.KV_REST_API_URL;
