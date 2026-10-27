import { useEffect, useRef, useState } from 'react';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { effectLines } from '../game/game.js';
import { formDisp } from '../lib/util.js';

// Opens the blocking decision sheet on every open decision; `first` puts one decision first.
export function openDecisions(G, ui, update, first) {
  const ids = G.pendingDecisions().map((n) => n.id);
  if (!ids.length) return false;
  ui.decide = first && ids.includes(first) ? [first, ...ids.filter((x) => x !== first)] : ids;
  update(); return true;
}
export const dueLabel = (G, n) => { const f = n.due != null && G.s.fixtures.find((x) => x.n === n.due); return f ? `Before ${f.stage === 'L' ? `Match ${f.n}` : 'the next match'} · ${f.date}` : 'Before the off-season'; };
const initials = (name) => name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Full-screen and blocking: no close button, no Esc. It closes once every decision is answered.
export default function DecisionSheet() {
  const { G, ui, update, toast } = useGame(); const [pick, setPick] = useState(null); const head = useRef(null);
  const ids = ui.decide || [];
  const list = ids.map((id) => G.s.inbox.find((n) => n.id === id)).filter(Boolean);
  const k = list.findIndex((n) => !n.done); const n = k >= 0 ? list[k] : null;
  useEffect(() => { setPick(null); if (head.current) head.current.focus(); }, [n && n.id]);
  useEffect(() => { if (ui.decide && !n) { ui.decide = null; update(); } }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!n) return undefined; const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; }, [!n]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!n) return null;
  const p = n.pid ? G.P(n.pid) : null; const lastOne = k === list.length - 1; const gating = G.decisionsDue().some((x) => x.id === n.id);
  const confirm = () => {
    update(() => { G.applyEvent(n, pick); autosave(G); });
    if (lastOne) toast(list.length > 1 ? 'All decisions answered.' : 'Decision answered.');
  };
  return (
    <div className="dsheet-wrap">
      <section className="dsheet" role="dialog" aria-modal="true" aria-labelledby="dsheet-t">
        <div className="dsheet-top">
          <div className="sechead" style={{ margin: 0, alignItems: 'center' }}><span className="ptag c">Decision {k + 1} of {list.length}</span><span className="t-micro faint">{dueLabel(G, n)}</span></div>
          {list.length > 1 && <div className="dsteps" aria-hidden="true">{list.map((x, j) => <i key={x.id} className={j <= k ? 'on' : ''} />)}</div>}
          <h1 id="dsheet-t" className="t-h1 dsheet-h" tabIndex={-1} ref={head}>{n.title || n.text}</h1>
        </div>
        <div className="dsheet-body">
          {p && <div className="panel dperson"><span className="board-f dinit">{initials(p.name)}</span><div><p className="t-small b6">{p.name} · {p.role} · {p.age}</p><p className="t-micro faint">Form {formDisp(p)} · morale {Math.round(p.morale)} · fitness {Math.round(p.fit)}%</p></div></div>}
          {n.quote ? <blockquote className="dquote">“{n.quote}”</blockquote> : n.title && n.title !== n.text && <p className="mut">{n.text}</p>}
          <div className="dchoices" role="radiogroup" aria-labelledby="dsheet-t">
            {n.choices.map((c, i) => (
              <button key={i} type="button" role="radio" aria-checked={pick === i} className={`dchoice${pick === i ? ' on' : ''}`} onClick={() => setPick(i)}>
                <span className="dradio" aria-hidden="true">{pick === i && <i />}</span>
                <span><span className="t-small b6">{c.l}</span>
                  <ul className="dfx">{effectLines(G, n, i).map((e, j) => <li key={j} className={`t-micro fx-${e.tone}`}><b aria-hidden="true">{e.sign}</b>{e.text}</li>)}</ul></span>
              </button>))}
          </div>
        </div>
        <div className="dsheet-foot">
          <button type="button" className="btn btn-primary btn-lg b6" disabled={pick == null} onClick={confirm}>{lastOne ? 'Confirm' : 'Confirm · next decision'}</button>
          <p className="t-micro faint" style={{ textAlign: 'center' }}>{pick == null ? 'Pick an option to continue.' : gating ? 'You need to answer before the match can start.' : 'Unanswered decisions take the cautious option at the deadline.'}</p>
        </div>
      </section>
    </div>
  );
}
