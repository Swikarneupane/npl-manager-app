import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import * as CR from '../world/career.js';

// Two of your teams play on the same day: you can be in only one dugout. Pick the match to play live;
// the assistant plays the other with the squad and XI you set.
export default function ClashPicker({ ev }) {
  const { G, ui, update, toast } = useGame(); const nav = useNavigate(); const [busy, setBusy] = useState(false);
  if (!ev || !ev.clash) return null;
  const opts = CR.clashOptions(ev);
  const pick = async (o) => {
    setBusy(true);
    try { await CR.settleClash(G, ev, o); ui.live = null; autosave(G); toast('The assistant played the other match.'); nav('/match'); } finally { setBusy(false); update(); }
  };
  return (
    <section className="card stack" style={{ gap: 10, padding: 16 }} aria-label="Fixture clash">
      <p className="t-h3">Two matches today</p>
      <p className="mut t-small">You can only play one live. The assistant plays the other, using the squad and XI you picked.</p>
      {opts.map((o, i) => (
        <div key={i} className="row" style={{ gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="t-small ell" style={{ minWidth: 0 }}>{CR.eventLabel(G, o)}</span>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => pick(o)}>Play this one live</button>
        </div>
      ))}
    </section>
  );
}
