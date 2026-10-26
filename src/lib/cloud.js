// In the desktop/Android apps there is no /api on the same origin; set VITE_API_BASE to your Vercel URL to enable cloud saves.
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
// Client for the /api/save serverless function.
export async function cloudStatus() {
  try { const r = await fetch(`${BASE}/api/health`); if (!r.ok) return false; const j = await r.json(); return !!j.cloudSaves; } catch { return false; }
}
export async function uploadSave(state) {
  const r = await fetch(`${BASE}/api/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ save: state }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Upload failed (${r.status})`);
  return j.code;
}
export async function downloadSave(code) {
  const r = await fetch(`${BASE}/api/save?code=${encodeURIComponent(code.trim())}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Download failed (${r.status})`);
  return j.save;
}
