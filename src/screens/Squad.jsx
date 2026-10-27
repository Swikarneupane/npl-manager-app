import { Link, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { PageHead, Role, Seg } from '../components/bits.jsx';
import TeamSheet from '../components/TeamSheet.jsx';
import { ovr, fmtL } from '../game/engine.js';
import { formDisp, potRange, tr } from '../lib/util.js';

const FOCUS = ['Balanced', 'Batting', 'Bowling', 'Fitness'];
// Who runs training: the batting and bowling coaches, by name and level.
export function coachLine(G, p) {
  const st = G.s.staff[G.user]; const b = st.bat, w = st.bowl;
  const part = (x, who, what) => (x ? `${x.name} (level ${x.level}) works with the ${who}: +${Math.round(x.level / 2)} a season for under-26s, form back ${x.level * 10}% quicker${what}.` : `No ${who === 'batters' ? 'batting' : 'bowling'} coach: ${who} under 26 develop at the normal rate.`);
  if (p) { const bat = p.role === 'BAT' || p.role === 'WK' || (p.role === 'AR' && p.focus !== 'Bowling'); return bat ? part(b, 'batters', '') : part(w, 'bowlers', ', and better death bowling'); }
  return `${part(b, 'batters', '')} ${part(w, 'bowlers', ', and better death bowling')}`;
}
const INTENS = { Light: 'Faster recovery between matches, slower development.', Normal: 'Balanced load.', Intense: 'Better development and sharper form, more knocks in training.' };

// The full squad: ratings, training focus, wages and contracts. The XI itself lives on the team sheet.
function SquadList() {
  const { G, update } = useGame();
  const t = G.teams[G.user]; const xi = t.xi || [];
  const sq = t.squad.map((id) => G.P(id)).sort((a, b) => { const ia = xi.includes(a.id), ib = xi.includes(b.id); if (ia !== ib) return ia ? -1 : 1; return ovr(b) - ovr(a); });
  const wage = t.squad.reduce((a, id) => a + G.P(id).salary, 0);
  return (
    <>
      <p className="mut t-small" style={{ marginBottom: 12 }}>{t.squad.length} players · {t.squad.length - G.osCount(G.user)} Nepali, {G.osCount(G.user)} overseas · wage bill {fmtL(wage)}</p>
      <div className="tblwrap" style={{ maxWidth: 1220 }}><table className="tbl compact"><thead><tr><th>Player</th><th>Nat</th><th className="r">Age</th><th>Role</th><th className="r">Bat</th><th className="r">Bowl</th><th className="r">Potential</th><th className="r">Form</th><th className="r">Fitness</th><th>Injury</th><th className="r">Salary</th><th className="r">Value</th><th>Training focus</th></tr></thead>
        <tbody>{sq.map((p) => (
          <tr key={p.id} className={`${xi.includes(p.id) ? 'me' : ''}${p.inj ? ' dim' : ''}`}>
            <td className="name"><Link to={`/player/${p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link> <span className="faint t-small">{t.captainId === p.id ? '(c)' : ''}{p.role === 'WK' ? ' (wk)' : ''}</span></td>
            <td className={p.nat !== 'NEP' ? 'blu' : ''}>{p.nat}</td><td className="r">{p.age}</td><td><Role r={p.role} /></td><td className="r">{p.bat}</td><td className="r">{p.bowl || '–'}</td>
            <td className={`r ${p.scouted ? '' : 'faint'}`}>{potRange(p)}</td><td className="r">{formDisp(p)}</td><td className="r">{Math.round(p.fit)}%</td>
            <td className={p.inj ? 'crim' : 'faint'}>{p.inj ? `${p.inj} match${p.inj > 1 ? 'es' : ''}` : '–'}</td>
            <td className="r">{fmtL(p.salary)}</td><td className="r">{fmtL(p.value)}</td>
            <td><select className="input" value={p.focus} onChange={(e) => update(() => { p.focus = e.target.value; })} aria-label={`Training focus for ${p.name}`}>{FOCUS.map((f) => <option key={f}>{f}</option>)}</select></td>
          </tr>))}</tbody></table></div>
      <p className="faint t-small" style={{ marginTop: 10 }}>Highlighted rows are in the current XI. Potential shows as a range until a scout files a report. Form is a 0–10 rating that follows recent matches. Ratings are out of 100.</p>
      <div className="field" style={{ marginTop: 24, maxWidth: 520 }}><span className="lbl">Team training intensity</span><Seg options={['Light', 'Normal', 'Intense'].map((x) => [x, x])} value={t.training} onChange={(v) => update(() => { t.training = v; })} label="Training intensity" /><p className="mut t-small" style={{ marginTop: 4 }}>{INTENS[t.training]}</p><p className="t-small" style={{ marginTop: 6 }}>{coachLine(G)} <Link to="/staff">Staff</Link></p></div>
    </>
  );
}

export default function Squad() {
  const { G } = useGame(); const [q, setQ] = useSearchParams(); const tab = q.get('tab') === 'list' ? 'list' : 'sheet';
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title={tr(G, 'Squad')} style={{ marginBottom: 12 }}>
        <div className="tabs" role="tablist" aria-label="Squad" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', margin: 0, minWidth: 260 }}>
          <button type="button" role="tab" aria-selected={tab === 'sheet'} className={tab === 'sheet' ? 'on' : ''} onClick={() => setQ({}, { replace: true })}>Team sheet</button>
          <button type="button" role="tab" aria-selected={tab === 'list'} className={tab === 'list' ? 'on' : ''} onClick={() => setQ({ tab: 'list' }, { replace: true })}>Squad list</button>
        </div>
      </PageHead>
      {tab === 'sheet' ? <TeamSheet /> : <SquadList />}
    </div>
  );
}
