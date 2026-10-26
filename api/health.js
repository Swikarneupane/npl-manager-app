import { cloudEnabled } from './_redis.js';
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ ok: true, cloudSaves: cloudEnabled(), time: new Date().toISOString() });
}
