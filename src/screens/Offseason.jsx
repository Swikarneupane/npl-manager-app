import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, PageHead, Role } from '../components/bits.jsx';
import { ovr, fmtL } from '../game/engine.js';
import { potRange, seasonNo, tname } from '../lib/util.js';
import { autosave } from '../lib/save.js';

export default function Offseason() {
  const { G, ui, update, toast } = useGame(); const nav = useNavigate(); const s = G.s, t = G.teams[G.user];
  const sq = t.squad.map((id) => G.P(id)).filter((p) => p.prevOvr != null).sort((a, b) => (ovr(b) - b.prevOvr) - (ovr(a) - a.prevOvr));
  const why = (p) => { const d = ovr(p) - p.prevOvr; const r = []; if (p.age <= 22) r.push('Young'); if (p.focus !== 'Balanced' && d > 0) r.push(`${p.focus.toLowerCase()} focus`); if (t.training === 'Intense' && d > 0) r.push('hard training'); if (p.age >= 31 && d < 0) r.push('Age'); if (p.age >= 35) r.push('retirement possible'); if (d === 0 && p.pot <= ovr(p)) r.push('At his ceiling'); if (!r.length) r.push(d > 0 ? 'Regular cricket' : d < 0 ? 'Lost a step' : 'Steady'); return r.join(' · '); };
  const ret = (s.lastRetired || []).map((id) => G.P(id)).filter(Boolean);
  const np = (s.newPlayers || []).map((id) => G.P(id)).filter((p) => p && !p.team).sort((a, b) => b.pot - a.pot);
  const others = Object.values(G.teams).filter((x) => x.id !== G.user);
  const tr = ui.trade; const tt = tr.team || others[0].id;
  const myOpts = t.squad.map((id) => G.P(id)).sort((a, b) => ovr(b) - ovr(a));
  const theirOpts = G.teams[tt].squad.map((id) => G.P(id)).sort((a, b) => ovr(b) - ovr(a));
  const canGo = s.phase === 'offseason';
  const propose = () => {
    const mine = tr.mine && t.squad.includes(tr.mine) ? tr.mine : myOpts[0].id; const theirs = tr.theirs && G.teams[tt].squad.includes(tr.theirs) ? tr.theirs : theirOpts[0].id;
    const r = G.tradeEval(mine, theirs); update(() => { if (r.ok) { G.doTrade(mine, theirs); ui.trade = {}; autosave(G); } }); toast(r.why);
  };
  const Sel = ({ label, value, opts, onChange }) => <div className="field" style={{ flex: '1 1 220px' }}><label>{label}</label><select className="input" style={{ width: '100%', height: 44 }} value={value || ''} onChange={(e) => onChange(e.target.value)}>{opts}</select></div>;
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title="Off-season summary" sub={`Season ${seasonNo(G.year - 1)} is over. A year older, a year better or worse. Next: ${s.mega ? `retention for the ${G.year} mega auction` : `releases before the ${G.year} mini auction`}.`}>
        {canGo && <button className="btn btn-primary btn-lg" onClick={() => { update(() => { G.beginRetention(); autosave(G); }); nav('/retention'); }}>Continue to {s.mega ? 'retention' : 'releases'}</button>}
      </PageHead>
      <section><h2 className="t-h3" style={{ marginBottom: 10 }}>Your squad, a year on</h2>
        <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Player</th><th className="r">Age</th><th className="r">Rating</th><th className="r">Change</th><th>Why</th></tr></thead>
          <tbody>{sq.map((p) => { const d = ovr(p) - p.prevOvr; return <tr key={p.id}><td className="name">{p.name}</td><td className="r">{p.age}</td><td className="r">{p.prevOvr} → {ovr(p)}</td><td className={`r ${d > 0 ? 'up' : d < 0 ? 'down' : 'faint'}`}>{d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '–'}</td><td className="mut t-small">{why(p)}</td></tr>; })}</tbody></table></div></section>
      <div className="cols" style={{ marginTop: 32 }}>
        <section><h2 className="t-h3" style={{ marginBottom: 6 }}>Retirements</h2><p className="faint t-small" style={{ marginBottom: 8 }}>Players retire between 35 and 40. Odds rise each year past 35.</p>
          <table className="tbl plain compact"><tbody>{ret.length ? ret.map((p) => <tr key={p.id}><td style={{ paddingLeft: 0 }}>{p.name}</td><td className="r">{p.age}</td><td>{p.prevTeam ? <><Dot id={p.prevTeam} />{tname(G, p.prevTeam)}</> : <span className="faint">Free agent</span>}</td><td className="faint">{p.nat === 'NEP' ? 'Nepal' : 'Overseas'}</td></tr>) : <tr><td className="faint">No retirements.</td></tr>}</tbody></table></section>
        <section><h2 className="t-h3" style={{ marginBottom: 6 }}>New players by province</h2><p className="faint t-small" style={{ marginBottom: 8 }}>{np.length} new Nepali players enter the auction pool. Potential stays a range until scouted.</p>
          <table className="tbl plain compact"><tbody>{np.slice(0, 14).map((p) => <tr key={p.id}><td style={{ paddingLeft: 0 }}><Link to={`/player/${p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link> {p.pot >= 80 && <span className="gld t-micro">High potential</span>}</td><td>{p.prov}</td><td className="r">{p.age}</td><td><Role r={p.role} /></td><td className="r">{ovr(p)}</td><td className="r faint">{potRange(p)}</td></tr>)}</tbody></table></section>
      </div>
      <section style={{ marginTop: 32 }} className="panel stack"><h2 className="t-h3">Trade window</h2><p className="t-small mut">Swap one of your players for one of theirs. The other franchise accepts if the deal improves their squad.</p>
        <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
          <Sel label="You give" value={tr.mine} onChange={(v) => update(() => { tr.mine = v; })} opts={myOpts.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role} · {ovr(p)} · {fmtL(p.value)}</option>)} />
          <Sel label="Trade with" value={tt} onChange={(v) => update(() => { tr.team = v; tr.theirs = null; })} opts={others.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)} />
          <Sel label="You get" value={tr.theirs} onChange={(v) => update(() => { tr.theirs = v; })} opts={theirOpts.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role} · {ovr(p)} · {fmtL(p.value)}</option>)} />
          <button className="btn btn-blue" disabled={!canGo} onClick={propose}>Propose trade</button>
        </div></section>
    </div>
  );
}
