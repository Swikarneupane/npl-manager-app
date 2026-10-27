import { Link, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Seg } from '../components/bits.jsx';
import { ordinal } from '../game/game.js';
import { playoffOdds, raceText } from '../game/odds.js';
import { fmtNRR, seasonNo, tname, tshort } from '../lib/util.js';

const nrr2 = (x) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2);
const TABS = [['table', 'Table'], ['fixtures', 'Fixtures'], ['results', 'Results'], ['playoffs', 'Playoffs']];

export function FormBars({ form }) {
  const f = (form || []).slice(-5);
  return <span className="fbars" aria-label={f.length ? `Form ${f.join(' ')}` : 'No form yet'}>{f.map((r, i) => <i key={i} className={r === 'W' ? 'w' : r === 'L' ? 'l' : 'n'} />)}</span>;
}

function RaceCard() {
  const { G } = useGame();
  const played = G.s.fixtures.filter((f) => f.stage === 'L' && f.res).length;
  if (G.s.phase === 'preseason' || !played) return (
    <section className="panel race"><div><p className="t-micro faint">Playoff race</p><p className="t-small b6">No matches played yet</p><p className="t-micro mut">Odds appear after the first league match.</p></div><span className="board-f race-n faint">—</span></section>);
  const o = playoffOdds(G); const st = o.status[G.user]; const { head, tip } = raceText(G);
  const val = st === 'in' ? 'Qualified' : st === 'out' ? 'Eliminated' : `${Math.round(o.odds[G.user] * 100)}%`;
  return (
    <section className="panel race"><div><p className="t-micro faint">Playoff race</p><p className="t-small b6">{head}</p><p className="t-micro mut">{tip}</p></div>
      <span className={`board-f race-n ${st === 'out' ? 'crim' : 'blu'}${st ? ' word' : ''}`}>{val}</span></section>);
}

function Standings() {
  const { G } = useGame(); const st = G.standings();
  return (
    <section className="panel flush">
      <div className="tblscroll"><table className="tbl compact plain season-tbl"><thead><tr><th>#</th><th>Team</th><th className="r wide">P</th><th className="r">W</th><th className="r wide">L</th><th className="r wide">NR</th><th className="r">Pts</th><th className="r">NRR</th><th>Form</th></tr></thead>
        <tbody>{st.map((r, i) => (
          <tr key={r.id} className={`${r.id === G.user ? 'me' : ''} ${i === 3 ? 'cut' : ''}`}><td className="faint">{i + 1}</td><td className="name"><Dot id={r.id} /><span className="wide">{tname(G, r.id)}</span><span className="narrow">{tshort(G, r.id)}{r.id === G.user ? ' (you)' : ''}</span></td>
            <td className="r wide">{r.p}</td><td className="r">{r.w}</td><td className="r wide">{r.l}</td><td className="r wide">{r.nr}</td><td className="r"><b>{r.pts}</b></td><td className="r t-micro faint"><span className="wide">{fmtNRR(r.nrr)}</span><span className="narrow">{nrr2(r.nrr)}</span></td><td><FormBars form={G.teams[r.id].form} /></td></tr>))}</tbody></table></div>
      <p className="t-micro faint" style={{ padding: '8px 10px 4px' }}>Top four reach the playoffs. Ties split by net run rate.</p>
    </section>
  );
}

function NextThree({ setTab }) {
  const { G } = useGame(); const st = G.standings(); const pos = (id) => st.findIndex((x) => x.id === id) + 1;
  const mine = G.s.fixtures.filter((f) => !f.res && (f.home === G.user || f.away === G.user)).slice(0, 3);
  if (!mine.length) return null;
  return (
    <section>
      <div className="sechead"><h2 className="t-h2">Your next {mine.length}</h2><button type="button" className="linkbtn t-small" onClick={() => setTab('fixtures')}>All fixtures</button></div>
      <ul className="flist">{mine.map((f) => { const opp = f.home === G.user ? f.away : f.home; return (
        <li key={`${f.stage}${f.n}`}><span className="t-micro faint">{f.date}</span><span className="t-small"><Dot id={G.user} />v{'\u00a0'}<Dot id={opp} />{tshort(G, opp)}</span><span className="t-micro mut">{f.stage === 'L' ? ordinal(pos(opp)) : f.stage}</span></li>); })}</ul>
    </section>
  );
}

function Matches({ done }) {
  const { G, ui, update } = useGame(); const flt = ui.fixFilter === 'mine' ? 'mine' : 'all';
  let list = G.s.fixtures.filter((f) => !!f.res === done);
  if (flt === 'mine') list = list.filter((f) => f.home === G.user || f.away === G.user);
  if (done) list = list.slice().reverse();
  const liveF = ui.live && !ui.live.done && ui.live.started ? ui.live.f : null;
  return (
    <section className="stack" style={{ gap: 12 }}>
      <Seg options={[['all', 'All'], ['mine', tshort(G, G.user)]]} value={flt} onChange={(v) => update(() => { ui.fixFilter = v; })} label="Filter matches" />
      {list.length ? <ul className="flist full">{list.map((f) => { const me = f.home === G.user || f.away === G.user; const i = liveF === f ? ui.live.m.inns[ui.live.m.inns.length - 1] : null;
        return (
          <li key={`${f.stage}${f.n}`} className={me ? 'me' : ''}>
            <span className="t-micro faint">{f.stage === 'L' ? `${f.n} · ` : ''}{f.date}{f.stage === 'L' ? (f.night ? ' · 7:15 pm' : ' · 3:00 pm') : ` · ${({ Q1: 'Qualifier 1', EL: 'Eliminator', Q2: 'Qualifier 2', F: 'Final' })[f.stage]}`}</span>
            <span className="t-small"><Dot id={f.home} />{tshort(G, f.home)} <span className="faint">v</span> <Dot id={f.away} />{tshort(G, f.away)}</span>
            <span className="t-micro">{f.res ? <><span className="mut">{f.res.text}</span> · <Link to={`/scorecard/${f.n}`}>Scorecard</Link></> : i ? <><span className="crim">Live</span> · {i.runs}/{i.wkts} ({ui.live.m.ovStr(i)})</> : <span className="faint">—</span>}</span>
          </li>); })}</ul>
        : <p className="faint t-small">{done ? 'No results yet.' : 'No fixtures left this season.'}</p>}
      <p className="faint t-micro">All matches at TU International Cricket Ground, Kirtipur.</p>
    </section>
  );
}

function Playoffs() {
  const { G } = useGame(); const st = G.standings(); const s = st.map((x) => x.id); const po = G.s.fixtures.filter((f) => f.stage !== 'L');
  const row = (stg, label, a, b, note) => { const f = po.find((x) => x.stage === stg);
    return <li key={stg}><span className="t-micro faint">{label}{f ? ` · ${f.date}` : ''}</span><span className="t-small">{f ? <><Dot id={f.home} />{tshort(G, f.home)} <span className="faint">v</span> <Dot id={f.away} />{tshort(G, f.away)}</> : `${a} v ${b}`}</span><span className="t-micro">{f && f.res ? <><span className="mut">{f.res.text}</span> · <Link to={`/scorecard/${f.n}`}>Scorecard</Link></> : <span className="faint">{note}</span>}</span></li>; };
  return (
    <section className="stack" style={{ gap: 10 }}>
      {!po.length && <p className="faint t-small">If the league ended today</p>}
      <ul className="flist full">
        {row('Q1', 'Qualifier 1', `1st ${tshort(G, s[0])}`, `2nd ${tshort(G, s[1])}`, 'Winner to the final')}
        {row('EL', 'Eliminator', `3rd ${tshort(G, s[2])}`, `4th ${tshort(G, s[3])}`, 'Loser is out')}
        {row('Q2', 'Qualifier 2', 'Loser of Q1', 'winner of Eliminator', 'Winner to the final')}
        {row('F', 'Final', 'Winner of Q1', 'winner of Q2', '')}
      </ul>
      <p className="faint t-micro">A top-two finish gives two chances to reach the final.</p>
    </section>
  );
}

export default function Season() {
  const { G } = useGame(); const [q, setQ] = useSearchParams();
  const tab = TABS.some(([k]) => k === q.get('tab')) ? q.get('tab') : 'table';
  const setTab = (k) => setQ(k === 'table' ? {} : { tab: k }, { replace: true });
  const played = G.s.fixtures.filter((f) => f.stage === 'L' && f.res).length;
  return (
    <div className="season">
      <div className="sechead" style={{ marginBottom: 10 }}><h1 className="t-h2">Season {seasonNo(G.year)} · {G.year}</h1><span className="t-small faint">{played} of 28 played</span></div>
      <div className="tabs" role="tablist" aria-label="Season">
        {TABS.map(([k, l]) => <button key={k} type="button" role="tab" id={`stab-${k}`} aria-selected={tab === k} aria-controls="stab-panel" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <div className="stack" style={{ gap: 16 }} role="tabpanel" id="stab-panel" aria-labelledby={`stab-${tab}`}>
        {tab === 'table' && <><RaceCard /><Standings /><NextThree setTab={setTab} /></>}
        {tab === 'fixtures' && <Matches done={false} />}
        {tab === 'results' && <Matches done />}
        {tab === 'playoffs' && <><RaceCard /><Playoffs /></>}
      </div>
    </div>
  );
}
