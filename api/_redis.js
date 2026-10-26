// Minimal Upstash Redis REST client (works with Vercel's Upstash/KV marketplace integration).
// No SDK needed: one HTTPS POST per command, so it runs in any Node 18+ serverless function.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const cloudEnabled = () => Boolean(URL_ && TOKEN);

export async function redis(...command) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

// Fixed-window rate limit per IP. Returns true when the caller is over the limit.
export async function rateLimited(req, bucket, limit, windowSec) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon').split(',')[0].trim();
  const key = `rl:${bucket}:${ip}`;
  const n = await redis('INCR', key);
  if (n === 1) await redis('EXPIRE', key, windowSec);
  return n > limit;
}
