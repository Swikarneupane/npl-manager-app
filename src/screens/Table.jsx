import { useGame } from '../lib/store.jsx';
import { Dot, PageHead } from '../components/bits.jsx';
import { fmtNRR, seasonNo, tname, tshort, tr } from '../lib/util.js';

export default function Table() {
  const { G } = useGame(); const st = G.standings();
  const played = G.s.fixtures.filter((f) => f.stage === 'L' && f.res).length;
  const s = st.map((x) => x.id); const po = G.s.fixtures.filter((f) => f.stage !== 'L');
  const row = (stg, label, a, b, note) => { const f = po.find((x) => x.stage === stg);
    return <tr key={stg}><td style={{ paddingLeft: 0 }}>{label}</td><td>{f ? <><Dot id={f.home} />{tshort(G, f.home)} v <Dot id={f.away} />{tshort(G, f.away)}{f.res && <> · <b>{f.res.text}</b></>}</> : `${a} v ${b}`}</td><td className="faint">{note}</td></tr>; };
  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHead title={tr(G, 'Table')} sub={`Season ${seasonNo(G.year)} · ${played} of 28 league matches played · top four reach the playoffs`} />
      <div className="tblwrap"><table className="tbl"><thead><tr><th>#</th><th>Team</th><th className="r">P</th><th className="r">W</th><th className="r">L</th><th className="r">NR</th><th className="r">Pts</th><th className="r">NRR</th><th>Form</th></tr></thead>
        <tbody>{st.map((r, i) => (
          <tr key={r.id} className={`${r.id === G.user ? 'me' : ''} ${i === 3 ? 'cut' : ''}`}><td>{i + 1}</td><td className="name"><Dot id={r.id} />{tname(G, r.id)}</td><td className="r">{r.p}</td><td className="r">{r.w}</td><td className="r">{r.l}</td><td className="r">{r.nr}</td><td className="r"><b>{r.pts}</b></td><td className="r">{fmtNRR(r.nrr)}</td><td className="board-f" style={{ fontSize: 16, letterSpacing: '.08em' }}>{(G.teams[r.id].form || []).join(' ') || '–'}</td></tr>))}</tbody></table></div>
      <p className="faint t-small" style={{ marginTop: 8 }}>Dashed line: playoff cut. Ties on points are split by net run rate. Form reads oldest to newest; – is no result.</p>
      <section style={{ marginTop: 32 }}><h2 className="t-h3" style={{ marginBottom: 10 }}>Playoffs</h2>{!po.length && <p className="faint t-small" style={{ marginBottom: 8 }}>If the league ended today</p>}
        <table className="tbl plain compact"><tbody>
          {row('Q1', 'Qualifier 1', `1st ${tshort(G, s[0])}`, `2nd ${tshort(G, s[1])}`, 'Winner to the final')}
          {row('EL', 'Eliminator', `3rd ${tshort(G, s[2])}`, `4th ${tshort(G, s[3])}`, 'Loser is out')}
          {row('Q2', 'Qualifier 2', 'Loser of Q1', 'winner of Eliminator', 'Winner to the final')}
          {row('F', 'Final', 'Winner of Q1', 'winner of Q2', '')}
        </tbody></table>
        <p className="faint t-small" style={{ marginTop: 8 }}>A top-two finish gives two chances to reach the final.</p></section>
    </div>
  );
}
