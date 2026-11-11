// ===== Calendar dates =====
// The world clock is a day number: 0 is 1 Jan 2026. Day numbers make the calendar cheap to store,
// compare and step through; labels are only made for the screen.
const MS = 86400000;
const EPOCH = Date.UTC(2026, 0, 1);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const dayOfDate = (y, m, d) => Math.round((Date.UTC(y, m, d) - EPOCH) / MS);
export const dateOf = (day) => { const t = new Date(EPOCH + day * MS); return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), dow: t.getUTCDay() }; };
export const yearOf = (day) => dateOf(day).y;
// 'Nov 3' in a given year -> day number; null for anything that isn't a date.
export function dayOfLabel(label, y) { const m = /^([A-Z][a-z]{2}) (\d{1,2})$/.exec(label || ''); if (!m) return null; const mi = MON.indexOf(m[1]); return mi < 0 ? null : dayOfDate(y, mi, +m[2]); }
// A month-day window ['Mar 20', 'May 31'] in a year; a window that wraps the new year ends in y + 1.
export function windowDays([a, b], y) { const s = dayOfLabel(a, y); let e = dayOfLabel(b, y); if (e < s) e = dayOfLabel(b, y + 1); return [s, e]; }

export const short = (day) => { const t = dateOf(day); return `${MON[t.m]} ${t.d}`; };
export const label = (day) => { const t = dateOf(day); return `${DOW[t.dow]} ${t.d} ${MON[t.m]} ${t.y}`; };
export const monthLabel = (day) => { const t = dateOf(day); return `${MON[t.m]} ${t.y}`; };
export const MONTHS = MON;
