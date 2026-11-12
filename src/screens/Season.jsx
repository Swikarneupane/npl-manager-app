import { Link, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Seg } from '../components/bits.jsx';
import { ordinal } from '../game/game.js';
import { playoffOdds, raceText } from '../game/odds.js';
import { fmtNRR, seasonNo, tname, tshort, useNarrow, stageName } from '../lib/util.js';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { tn } from '../lib/i18n.js';
import * as CR from '../world/career.js';
import * as ST from '../world/state.js';
import { short } from '../world/dates.js';

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

// ===== Phone: Table · Fixtures · Playoffs · Caps, with your position pinned =====
const nrr3 = (x) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(3);
function MFixtures() {
  const { G, ui } = useGame(); const [flt, setFlt] = useTab(['all', 'mine', 'results'], 'mine', 'f');
  const mine = (f) => f.home === G.user || f.away === G.user;
  const liveF = ui.live && !ui.live.done && ui.live.started ? ui.live.f : null;
  const done = G.s.fixtures.filter((f) => f.res && (flt !== 'mine' || mine(f))).slice().reverse();
  const next = G.s.fixtures.filter((f) => !f.res && (flt !== 'mine' || mine(f)));
  const opp = (f) => (f.home === G.user ? f.away : f.home);
  const resLine = (f) => { if (f.res.nr) return ['No result', 'faint']; if (!f.res.winner) return ['Tied', 'faint']; const m = /won by (\d+) (run|wicket)/.exec(f.res.text); const by = m ? ` by ${m[1]}${m[2] === 'wicket' ? ' wkts' : ''}` : '';
    if (!mine(f)) return [`${tshort(G, f.res.winner)} won${by}`, 'mut']; return f.res.winner === G.user ? [`Won${by}`, 'blu'] : [`Lost${by}`, 'crim']; };
  const sc = (f) => (f.res && f.res.sc ? f.res.sc.map((x) => `${x.r}/${x.w}`).join(' v ') : '');
  const title = (f) => (mine(f) ? <>v {tname(G, opp(f))}</> : <><Dot id={f.home} />{tshort(G, f.home)} v <Dot id={f.away} />{tshort(G, f.away)}</>);
  return (
    <>
      <div className="seg" role="group" aria-label="Filter" style={{ margin: '12px 0 4px', display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>{[['all', 'All'], ['mine', tshort(G, G.user)], ['results', 'Results']].map(([k, l]) => <button key={k} type="button" className={flt === k ? 'on' : ''} onClick={() => setFlt(k)}>{l}</button>)}</div>
      {done.length > 0 && <><p className="mhead">Results</p><ul className="mlist">{done.slice(0, flt === 'results' ? 60 : 4).map((f) => { const [txt, cls] = resLine(f); return (
        <li key={`${f.stage}${f.n}`}><span className="grow">{title(f)} <span className="faint t-small">· {f.date}{f.stage !== 'L' ? ` · ${stageName(f)}` : ''}</span><br /><span className="l2">{sc(f)}</span></span><Link to={`/scorecard/${f.n}`} className={`${cls} t-small`} style={{ fontWeight: 500 }}>{txt}</Link></li>); })}</ul></>}
      {flt !== 'results' && next.length > 0 && <><p className="mhead">Next</p><ul className="mlist">{next.slice(0, flt === 'all' ? 40 : 14).map((f, k) => (
        <li key={`${f.stage}${f.n}`}><span className={`grow${mine(f) && k === 0 ? ' b6' : ''}`}>{mine(f) && <Dot id={opp(f)} />}{title(f)}<br /><span className="l2" style={{ fontWeight: 400 }}>{f.date} · {f.night ? '7:15 pm' : '3:00 pm'}{f.stage !== 'L' ? ` · ${stageName(f)}` : ` · Match ${f.n}`}</span></span>
          {liveF === f && <Link to="/match" className="crim t-small" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><span className="live" />Live</Link>}</li>))}</ul></>}
      {!done.length && !next.length && <p className="faint t-small" style={{ paddingTop: 12 }}>No fixtures.</p>}
    </>
  );
}
function MCaps() {
  const { G } = useGame(); const y = G.year;
  const ps = Object.values(G.players).filter((p) => p.stats[y] && p.stats[y].m > 0);
  const runs = ps.slice().sort((a, b) => b.stats[y].r - a.stats[y].r).slice(0, 5);
  const wk = ps.slice().sort((a, b) => b.stats[y].w - a.stats[y].w || a.stats[y].rc - b.stats[y].rc).slice(0, 5);
  const L = (list, v) => <ul className="mlist">{list.filter((p) => v(p) > 0).map((p, i) => <li key={p.id}><span className="board-f faint" style={{ width: 14 }}>{i + 1}</span><Link to={`/player/${p.id}`} className="grow" style={{ color: 'inherit', textDecoration: 'none' }}><Dot id={p.stats[y].team || p.team} />{p.name}</Link><span className="board-f" style={{ fontSize: 18, fontWeight: 600 }}>{v(p)}</span></li>)}{!list.some((p) => v(p) > 0) && <li className="faint t-small">No leader yet.</li>}</ul>;
  return (
    <>
      <p className="mhead">Platinum Cap · most runs</p>{L(runs, (p) => p.stats[y].r)}
      <p className="mhead">Golden Cap · most wickets</p>{L(wk, (p) => p.stats[y].w)}
      <Link to="/history" className="t-small" style={{ display: 'inline-block', marginTop: 10 }}>Records and past champions</Link>
    </>
  );
}
function SeasonMobile() {
  const { G } = useGame(); const [tab, setTab] = useTab(['table', 'fixtures', 'playoffs', 'caps'], 'table');
  const st = G.standings(); const me = st.findIndex((r) => r.id === G.user);
  const played = G.s.fixtures.filter((f) => f.stage === 'L' && f.res).length;
  return (
    <MScreen top={{ title: tn(G, 'League'), sub: `Season ${seasonNo(G.year)} · ${played} of 28 played`, right: <><Dot id={G.user} /><b>{ordinal(me + 1)} · {st[me].pts} pts</b></> }}
      label="League sections" tab={tab} onTab={setTab} tabs={[['table', tn(G, 'Table')], ['fixtures', tn(G, 'Fixtures')], ['playoffs', tn(G, 'Playoffs')], ['caps', tn(G, 'Caps')]]}>
      {tab === 'table' && <>
        <table className="tbl compact plain" style={{ marginTop: 6 }}><thead><tr><th style={{ paddingLeft: 0 }}>#</th><th>Team</th><th className="r">P</th><th className="r">W</th><th className="r">Pts</th><th className="r">NRR</th></tr></thead>
          <tbody>{st.map((r, i) => <tr key={r.id} className={`${r.id === G.user ? 'me' : ''}${i === 3 ? ' cut' : ''}`}><td style={{ paddingLeft: 0 }}>{i + 1}</td><td><Dot id={r.id} />{tshort(G, r.id)}</td><td className="r">{r.p}</td><td className="r">{r.w}</td><td className="r b6">{r.pts}</td><td className="r faint">{nrr3(r.nrr)}</td></tr>)}</tbody></table>
        <p className="faint t-small" style={{ marginTop: 10 }}>Top four reach the playoffs. L and NR columns are in the full table.</p>
        <div style={{ marginTop: 12 }}><RaceCard /></div>
        <Link to="/league" className="t-small" style={{ display: 'inline-block', marginTop: 10 }}>League hub: managers, rivalries and the news wire</Link>
      </>}
      {tab === 'fixtures' && <MFixtures />}
      {tab === 'playoffs' && <div style={{ paddingTop: 12 }}><Playoffs /><Link to="/playoffs" className="t-small" style={{ display: 'inline-block', marginTop: 10 }}>Playoff week</Link></div>}
      {tab === 'caps' && <MCaps />}
    </MScreen>
  );
}

// The user's other teams: the national side and a club abroad, each with its live competitions.
function WorldTeams({ job }) {
  const { G } = useGame(); const wd = G.s.wd; const t = job.team; const name = ST.teamName(G, t);
  const live = ST.seasons(G).filter((S) => S.teams.includes(t) && !S.done).sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  const last = ST.seasons(G).filter((S) => S.teams.includes(t) && S.done).slice(-3).reverse();
  const nextOf = (S) => S.fx.filter((f) => !f.res && (f.a === t || f.b === t)).sort((a, b) => a.d - b.d)[0];
  return (
    <section className="stack" style={{ gap: 10, marginTop: 8 }} aria-label={name}>
      <p className="t-h3">{name} · {job.kind === 'nation' ? 'national team' : 'club job'}</p>
      {!live.length && <p className="mut t-small">No competition is running for {name} right now{wd ? ` (today is ${short(wd.day)})` : ''}.</p>}
      {live.map((S) => { const f = nextOf(S); return (
        <Link key={S.id} to={`/comp/${S.id}`} className="card stack" style={{ gap: 2, padding: 12, textDecoration: 'none', color: 'inherit' }}>
          <b>{CR.seasonName(S)}</b>
          <span className="t-small mut">{f ? `Next: ${ST.teamName(G, f.a)} v ${ST.teamName(G, f.b)} · ${short(f.d)}` : 'No fixtures left for you'}</span>
        </Link>); })}
      {last.length > 0 && <p className="t-small faint">Recently finished: {last.map((S) => CR.seasonName(S)).join(' · ')}</p>}
    </section>
  );
}
// League tab: your NPL club's league, plus the country and any club abroad you manage.
export default function Season() {
  const { G } = useGame(); const narrow = useNarrow(); const [q, setQ] = useSearchParams();
  const jobs = G.s.wd ? CR.jobs(G) : []; const nation = jobs.find((j) => j.kind === 'nation'); const abroad = CR.abroadJob(G);
  const scopes = [...(CR.hasClub(G) || !G.s.wd ? [['npl', 'NPL']] : []), ...(nation ? [['nation', ST.teamName(G, nation.team)]] : []), ...(abroad ? [['abroad', ST.teamName(G, abroad.team)]] : [])];
  const scope = scopes.some(([k]) => k === q.get('scope')) ? q.get('scope') : (scopes[0] ? scopes[0][0] : 'npl');
  const bar = scopes.length > 1 && <div style={{ margin: narrow ? '8px 16px 0' : '0 0 10px' }}><Seg value={scope} onChange={(k) => setQ(k === scopes[0][0] ? {} : { scope: k }, { replace: true })} options={scopes} label="League scope" /></div>;
  if (scope === 'nation' || scope === 'abroad') return <div className={narrow ? 'stack' : 'season'} style={narrow ? { padding: '12px 0' } : {}}><h1 className="t-h2" style={narrow ? { margin: '0 16px' } : { marginBottom: 10 }}>{tn(G, 'League')}</h1>{bar}<div style={narrow ? { padding: '0 16px' } : {}}><WorldTeams job={scope === 'nation' ? nation : abroad} /></div></div>;
  return <>{bar}{narrow ? <SeasonMobile /> : <SeasonDesktop />}</>;
}
function SeasonDesktop() {
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
