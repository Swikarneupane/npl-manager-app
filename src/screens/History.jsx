import { useGame } from '../lib/store.jsx';
import { Dot, PageHead, Seg } from '../components/bits.jsx';
import { careerOf } from '../game/game.js';
import { seasonNo, tname, tshort } from '../lib/util.js';

const REAL = { hs: { v: 114, no: true, who: 'Mark Watt', team: 'KY', y: 2025 }, bb: { w: 6, r: 25, who: 'Shahab Alam', team: 'KG', y: 2025 }, ht: { v: 220, w: 6, team: 'BK', opp: 'PA', y: 2025 } };
const best = (a, b, f) => (!b ? a : !a ? b : f(a) >= f(b) ? a : b);

function Champions() {
  const { G } = useGame(); const H = G.s.history.slice().reverse();
  const inProgress = G.s.phase !== 'seasonEnd' && !G.s.history.some((h) => h.year === G.year);
  const ps = Object.values(G.players).filter((p) => p.stats[G.year]);
  const r = ps.slice().sort((a, b) => b.stats[G.year].r - a.stats[G.year].r)[0], w = ps.slice().sort((a, b) => b.stats[G.year].w - a.stats[G.year].w)[0];
  return (
    <>
      <div className="tblwrap"><table className="tbl"><thead><tr><th>Season</th><th>Champions</th><th>Final</th><th>Platinum Cap · most runs</th><th>Golden Cap · most wickets</th></tr></thead><tbody>
        {inProgress && <tr className="dim"><td>{seasonNo(G.year)} · {G.year}</td><td>In progress</td><td>—</td><td>{r ? `${r.name} · ${r.stats[G.year].r}, so far` : '—'}</td><td>{w ? `${w.name} · ${w.stats[G.year].w}, so far` : '—'}</td></tr>}
        {H.map((h) => { const topW = h.wkts.filter((x) => x[2] === h.wkts[0][2]); return (
          <tr key={h.year} className={h.champion === G.user ? 'me' : ''}><td>{seasonNo(h.year)} · {h.year}{h.real && <span className="faint t-micro"> real</span>}</td><td className="name"><Dot id={h.champion} />{tname(G, h.champion)}</td><td className="t-small mut" style={{ whiteSpace: 'normal', minWidth: 220 }}>{h.final}</td><td>{h.runs[0][0]} · {h.runs[0][2]}</td><td>{topW.map((x) => x[0]).join(', ')} · {h.wkts[0][2]}{topW.length > 1 ? ' each' : ''}</td></tr>); })}
      </tbody></table></div>
      <p className="faint t-small" style={{ marginTop: 8 }}>Seasons 1 and 2 are the real Nepal Premier League. From Season 3 on, this is your league.</p>
      {H.filter((h) => h.real).map((h) => <div key={h.year} className="panel" style={{ marginTop: 16 }}><h3 className="sec">{h.year} notes</h3><ul style={{ margin: 0, paddingLeft: 18 }} className="t-small mut">{h.notes.map((n) => <li key={n}>{n}</li>)}<li>Player of the tournament: {h.pot}</li></ul></div>)}
    </>
  );
}
function Records() {
  const { G } = useGame(); const R = G.s.records;
  const hs = best(R.hs, REAL.hs, (x) => x.v), bb = best(R.bb, REAL.bb, (x) => x.w * 1000 - x.r), ht = best(R.ht, REAL.ht, (x) => x.v);
  const allP = Object.values(G.players).map((p) => ({ p, c: careerOf(p) }));
  const mr = allP.slice().sort((a, b) => b.c.r - a.c.r)[0], mw = allP.slice().sort((a, b) => b.c.w - a.c.w)[0];
  let sR = null, sW = null;
  for (const h of G.s.history) { if (!sR || h.runs[0][2] > sR.v) sR = { v: h.runs[0][2], who: h.runs[0][0], y: h.year }; if (!sW || h.wkts[0][2] > sW.v) sW = { v: h.wkts[0][2], who: h.wkts.filter((x) => x[2] === h.wkts[0][2]).map((x) => x[0]).join(', '), y: h.year }; }
  const titles = {}; G.s.history.forEach((h) => { titles[h.champion] = (titles[h.champion] || 0) + 1; });
  const mc = G.s.manager.career; const mt = mc.filter((x) => x.champ).length;
  const Row = ({ k, children }) => <tr><td>{k}</td><td>{children}</td></tr>;
  return (
    <>
      <div className="tblwrap"><table className="tbl"><tbody>
        <Row k="Highest score, innings"><b>{hs.v}{hs.no ? '*' : ''}</b> · {hs.who} ({tshort(G, hs.team)}), {hs.y}</Row>
        <Row k="Best bowling, innings"><b>{bb.w}/{bb.r}</b> · {bb.who} ({tshort(G, bb.team)}), {bb.y}</Row>
        <Row k="Highest team total"><b>{ht.v}/{ht.w}</b> · {tname(G, ht.team)} v {tname(G, ht.opp)}, {ht.y}</Row>
        {R.lt && <Row k="Lowest all-out total"><b>{R.lt.v}</b> · {tname(G, R.lt.team)} v {tname(G, R.lt.opp)}, {R.lt.y}</Row>}
        <Row k="Most runs, season"><b>{sR.v}</b> · {sR.who}, {sR.y}</Row>
        <Row k="Most wickets, season"><b>{sW.v}</b> · {sW.who}, {sW.y}</Row>
        <Row k="Most runs, career (from 2026)">{mr && mr.c.r ? <><b>{mr.c.r}</b> · {mr.p.name}</> : '—'}</Row>
        <Row k="Most wickets, career (from 2026)">{mw && mw.c.w ? <><b>{mw.c.w}</b> · {mw.p.name}</> : '—'}</Row>
        <Row k="Most titles, franchise">{Object.entries(titles).sort((a, b) => b[1] - a[1]).map(([id, n]) => <span key={id} style={{ marginRight: 12 }}><Dot id={id} />{tshort(G, id)} {n}</span>)}</Row>
        <Row k="Your titles as manager">{mt} in {mc.length} season{mc.length === 1 ? '' : 's'}</Row>
      </tbody></table></div>
      <p className="faint t-small" style={{ marginTop: 8 }}>Records combine the real 2024 and 2025 seasons with everything played in this game.</p>
    </>
  );
}
function Fame() {
  const { G } = useGame(); const hof = G.s.hof.slice().reverse(); const ret = G.s.retiredList.slice(-30).reverse();
  return (
    <>
      <h2 className="t-h3" style={{ marginBottom: 10 }}>Hall of Fame</h2>
      {hof.length ? <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Player</th><th>Nat</th><th className="r">Retired</th><th className="r">M</th><th className="r">Runs</th><th className="r">Wkts</th></tr></thead><tbody>{hof.map((h, i) => <tr key={i}><td className="name">{h.name}</td><td>{h.nat}</td><td className="r">{h.y}</td><td className="r">{h.m}</td><td className="r">{h.r}</td><td className="r">{h.w}</td></tr>)}</tbody></table></div> : <p className="faint">No inductees yet. Great careers are inducted when the player retires.</p>}
      <h2 className="t-h3" style={{ margin: '28px 0 10px' }}>Recent retirements</h2>
      {ret.length ? <table className="tbl plain compact"><tbody>{ret.map((r, i) => <tr key={i}><td style={{ paddingLeft: 0 }}>{r.name}</td><td>{r.nat}</td><td className="r">{r.age}</td><td className="r faint">{r.y}</td></tr>)}</tbody></table> : <p className="faint">None yet.</p>}
    </>
  );
}
export default function History() {
  const { ui, update } = useGame(); const tab = ui.histTab;
  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHead title="History and records"><Seg options={[['champs', 'Champions'], ['records', 'Records'], ['hof', 'Hall of Fame']]} value={tab} onChange={(v) => update(() => { ui.histTab = v; })} label="History section" /></PageHead>
      {tab === 'champs' ? <Champions /> : tab === 'records' ? <Records /> : <Fame />}
    </div>
  );
}
