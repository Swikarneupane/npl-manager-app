import { useState } from 'react';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import * as CR from '../world/career.js';
import { short } from '../world/dates.js';

// A step of the NPL calendar (off-season, retention, auction, season start) opens on its date. Before that
// the button moves the world clock there; on the day it is the real button.
export default function DateGate({ what, className = 'btn btn-primary', disabled, onClick, children }) {
  const { G, update, toast } = useGame(); const [busy, setBusy] = useState(false);
  const day = CR.dueDay(G, what);
  if (day == null) return <button type="button" className={className} disabled={disabled} onClick={onClick}>{children}</button>;
  const go = async () => { setBusy(true); toast('The world moves on…'); try { await CR.continueWorld(G); autosave(G); } finally { setBusy(false); update(); } };
  return <button type="button" className={className} disabled={busy} onClick={go} title={`Opens on ${short(day)}`}>{busy ? 'Moving on…' : `Wait until ${short(day)}`}</button>;
}
