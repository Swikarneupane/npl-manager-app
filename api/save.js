// Cloud saves: POST a save to get a share code, GET it back on any device.
// Saves are gzipped and kept for 90 days in Redis.
import { gzipSync, gunzipSync } from 'node:zlib';
import { randomInt } from 'node:crypto';
import { cloudEnabled, redis, rateLimited } from './_redis.js';

const TTL = 60 * 60 * 24 * 90;
const MAX_BYTES = 4 * 1024 * 1024;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

const makeCode = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

function looksLikeSave(s) {
  return s && typeof s === 'object' && s.teams && s.players && typeof s.year === 'number' && typeof s.user === 'string';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!cloudEnabled()) return res.status(503).json({ error: 'Cloud saves are not set up on this deployment.' });
  try {
    if (req.method === 'POST') {
      if (await rateLimited(req, 'save-up', 20, 3600)) return res.status(429).json({ error: 'Too many uploads. Try again in an hour.' });
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);
      const save = body && body.save;
      if (!looksLikeSave(save)) return res.status(400).json({ error: 'That is not an NPL Manager save.' });
      const raw = Buffer.from(JSON.stringify(save));
      if (raw.length > MAX_BYTES) return res.status(413).json({ error: 'Save is too large.' });
      const packed = gzipSync(raw).toString('base64');
      let code = makeCode();
      // SET NX so two uploads can never collide on a code
      for (let i = 0; i < 4; i++) {
        const ok = await redis('SET', `save:${code}`, packed, 'EX', TTL, 'NX');
        if (ok === 'OK') return res.status(201).json({ code, expiresInDays: 90, bytes: packed.length });
        code = makeCode();
      }
      return res.status(500).json({ error: 'Could not allocate a code.' });
    }
    if (req.method === 'GET') {
      if (await rateLimited(req, 'save-down', 60, 3600)) return res.status(429).json({ error: 'Too many requests. Try again later.' });
      const code = String(req.query.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!CODE_RE.test(code)) return res.status(400).json({ error: 'Save codes are 8 letters and numbers.' });
      const packed = await redis('GET', `save:${code}`);
      if (!packed) return res.status(404).json({ error: 'No save with that code. Codes expire after 90 days.' });
      const save = JSON.parse(gunzipSync(Buffer.from(packed, 'base64')).toString());
      return res.status(200).json({ save });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('save api error', err);
    return res.status(500).json({ error: 'Cloud save failed. Please try again.' });
  }
}
