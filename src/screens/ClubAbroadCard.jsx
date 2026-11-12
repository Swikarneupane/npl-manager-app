// Home cards for a club job abroad: the recruitment step that needs you, and the club's board and next fixture.
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Meter } from '../components/bits.jsx';
import { autosave } from '../lib/save.js';
import * as CR from '../world/career.js';
import * as K from '../world/club.js';
import * as RC from '../world/recruit.js';
import { short } from '../world/dates.js';
import { boardMood } from '../lib/util.js';
import '../styles/clubabroad.css';

export function ClubEventCard({ ev }) {
  const { G, update, toast } = useGame(); const j = K.abroadJob(G); if (!j) return null; const due = ev.day <= G.s.wd.day; const mode = RC.rulesOf(j.comp).recruit;
  const assist = () => update(() => { RC.runRest(G, j.comp, Math.random, null); autosave(G); toast('The assistant finished it.'); });
  return (
    <section className="panel stack" style={{ gap: 8, padding: '14px 16px' }}>
      <p className="t-micro faint">{ST_name(G, j.team)} · {due ? 'Open now' : `Opens ${short(ev.day)}`}</p>
      <p className="t-h3">{ev.what === 'retain' ? 'Retention' : mode === 'auction' ? 'The auction' : mode === 'draft' ? 'The draft' : 'The transfer market'}</p>
      <p className="t-small mut">{ev.what === 'retain' ? 'Choose who stays; the rest go back to the pool.' : 'Rival clubs are building their squads. Squad rules apply.'}</p>
      <div className="ca-row"><Link className="btn btn-primary" to="/clubabroad?tab=recruit">Open</Link>{due && <button type="button" className="btn btn-ghost" onClick={assist}>Let the assistant do it</button>}</div>
    </section>
  );
}
const ST_name = (G, t) => CR.nationName(G, t);
export function ClubPortal() {
  const { G } = useGame(); const j = K.abroadJob(G); if (!j) return null; const f = RC.payroll ? K.finances(G, j.team) : null;
  return (
    <section className="p-board"><div className="sechead"><h2 className="t-h3">{ST_name(G, j.team)}</h2><Link to="/clubabroad" className="t-small">Club</Link></div>
      <div className="panel stack" style={{ gap: 8, padding: '12px 14px' }}>
        <div className="sechead" style={{ margin: 0 }}><span className="t-small b6">Record P{j.rec.p} W{j.rec.w} L{j.rec.l}</span><span className="t-small mut num">{j.board} · {boardMood(j.board)}</span></div><Meter pct={j.board} blue />
        {j.obj.map((o) => <div key={o.sid} className="t-small">{o.t} <span className="faint">{o.done === true ? '· met' : o.done === false ? '· missed' : ''}</span></div>)}
        {f && f.cap > 0 && <p className="t-micro faint">Wages {f.payroll} of {f.cap}</p>}
      </div></section>
  );
}
