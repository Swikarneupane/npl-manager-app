import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { Dot } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { useNarrow } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { digest, openNocs, decideNoc, assistantGrants, nm, today, tournaments } from '../game/world.js';
import { sbase, lastDay } from '../world/intl.js';
import { short as shortD } from '../world/dates.js';
import { LEAGUE_BY, NEP_ABROAD_FACTS } from '../game/world-data.js';
import '../styles/world.css';

const KIND = { dev: 'Development contract', inj: 'Injury replacement' };
const note = (y) => (y <= 2026 ? 'League and team names are real, and so are the 2026 results above the NPL. The NPL is played in your save.' : 'League and team names are real. Winners, scores and Nepali stints are simulated in your save.');
const short = (m) => m.replace('wickets', 'wkts').replace('wicket', 'wkt');

// NOC requests from foreign clubs for your players, answered in place.
export function NocRequests({ compact }) {
  const { G, update, toast } = useGame(); const list = openNocs(G);
  const answer = (r, grant) => update(() => { const x = decideNoc(G, r.id, grant); autosave(G); toast(x ? x.outcome : 'Done'); });
  if (!list.length) return compact ? null : <p className="t-small faint">No requests for your players right now.</p>;
  return (
    <div className="stack" style={{ gap: 10 }}>
      {list.map((r) => { const p = G.P(r.pid); const L = LEAGUE_BY[r.league]; const sug = assistantGrants(G, r); return (
        <div key={r.id} className="panel wd-noc stack" style={{ gap: 8 }}>
          <p className="t-micro faint">{T(G, 'NOC request', 'अनुमति माग')} · {L.name} · {KIND[r.kind]}</p>
          <p className="b6"><Link to={`/player/${p.id}`} style={{ color: 'inherit' }}>{p.name}</Link> <span className="faint t-small">to {r.team}</span></p>
          <ul className="wd-fx">
            <li><span className="blu">Grant:</span> Rs {r.fee} L to the club, up to +{r.exp} rating from the experience. Fitness −{r.risk.fat}, {r.risk.inj}% injury risk before the NPL.</li>
            <li><span className="crim">Refuse:</span> he stays fresh but is unhappy (happiness −{r.kind === 'dev' ? 10 : 7}).</li>
          </ul>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-sm btn-blue" onClick={() => answer(r, true)}>{T(G, 'Grant the NOC', 'अनुमति दिनुहोस्')}</button>
            <button type="button" className="btn btn-sm" onClick={() => answer(r, false)}>{T(G, 'Refuse', 'अस्वीकार')}</button>
            <span className="t-micro faint" style={{ alignSelf: 'center' }}>Assistant would {sug ? 'grant' : 'refuse'} · the window closes at the auction</span>
          </div>
        </div>); })}
    </div>
  );
}

function ChampRow({ x }) {
  const { G } = useGame(); const a = x.a; const L = LEAGUE_BY[a.league];
  return <li style={{ padding: '8px 0' }}><span className="grow">{x.p.name}{x.p.team && <span className="faint t-small"> · <Dot id={x.p.team} />{G.teams[x.p.team].name.split(' ')[0]}</span>}<br /><span className="l2">{L.short} {a.champ ? 'champion' : 'runner-up'} · {a.team}{a.m ? ` · ${a.m} games, ${a.r} runs, ${a.w} wkts` : ''}</span></span><span className={`t-small ${a.champ ? 'gld' : 'faint'}`}>{a.champ ? '★' : '2nd'}</span></li>;
}
function Abroad({ list }) {
  const { G } = useGame();
  if (!list.length) return <p className="t-small faint">No Nepali players abroad this year.</p>;
  return <ul className="mlist">{list.map((x) => { const L = LEAGUE_BY[x.a.league]; const mine = x.p.team === G.user; return (
    <li key={`${x.p.id}${x.a.league}`} className={mine ? 'me' : ''} style={{ padding: '8px 0' }}><span className="grow">{x.p.name}{mine && <span className="faint t-small"> · yours</span>}<br /><span className="l2">{L.short} · {x.a.team}{x.a.kind ? ` · ${KIND[x.a.kind].toLowerCase()}` : ''}{x.a.pend ? ' · to come' : x.a.m ? ` · ${x.a.m} games, ${x.a.r} runs, ${x.a.w} wkts` : ''}</span></span>{x.a.champ ? <span className="gld t-small">★</span> : null}</li>); })}</ul>;
}

// The year's international tournaments from the world calendar (in-game).
export function IntlHeads() {
  const { G } = useGame(); if (!G.s.wd) return null; const t = today(G); const { have } = tournaments(G, t - 365, t);
  const done = have.filter((S) => S.done).sort((a, b) => (b.endF ?? lastDay(b)) - (a.endF ?? lastDay(a))).slice(0, 6);
  return <div><h2 className="sec">International cricket</h2>
    {done.length ? <ul className="inbox">{done.map((S) => <li key={S.id}><span className="when">{shortD(S.endF ?? lastDay(S))}</span><div><p className="ttl"><Link to={`/comp/${encodeURIComponent(S.id)}`} style={{ color: 'inherit' }}>{sbase(S).replace("ICC Men's ", '')}</Link></p><p className="mut t-small">{nm(S.champ)} won{S.teams.includes('NEP') ? ' · Nepal took part' : ''} · in-game</p></div></li>)}</ul>
      : <p className="t-small faint">No international tournaments finished in the last year.</p>}
    <p className="t-micro faint" style={{ marginTop: 6 }}><Link to="/international?tab=results">All international results ›</Link></p></div>;
}

export default function World() {
  const { G } = useGame(); const narrow = useNarrow(); const d = digest(G); const [sel, setSel] = useState('');
  const [tab, setTab] = useTab(['champs', 'nepalis', 'next'], 'champs');
  const pickK = sel || (d.rows.find((r) => r.nep) || d.rows.find((r) => r.k === 'bpl') || d.rows[0]).k;
  const x = d.rows.find((r) => r.k === pickK);
  const abroadNow = d.coming.signed; const champs = d.champs; const nocs = openNocs(G).length;
  const thisYear = Object.values(G.players).flatMap((p) => (p.abroad || []).filter((a) => a.y === d.y).map((a) => ({ p, a })));
  const Account = ({ r }) => (
    <div className="panel stack" style={{ gap: 8 }}>
      <p className="faint t-small">{r.league} final · {r.when} {d.y}{r.real ? '' : r.npl ? ' · your save' : ' · in-game'}</p>
      {r.pending ? <h2 className="t-h2">{r.story}</h2> : <h2 className="t-h2"><span className="gld" aria-hidden="true">★ </span>{r.champ} beat {r.runner} {r.margin}</h2>}
      {!r.pending && <p className="mut" style={{ maxWidth: 680 }}>{r.story}</p>}
      {r.nep && <p className="t-small"><span className="crim b6">Nepali angle:</span> {r.nep}</p>}
    </div>);
  const heads = (
    <ul className="inbox">{d.heads.map((h, i) => <li key={i}><span className="when">{h.m}</span><div><p className="ttl">{h.t}</p></div></li>)}
      {(() => { const n = d.rows.find((r) => r.npl && r.champ); return n ? <li><span className="when">{n.when}</span><div><p className="ttl">{n.champ} win the NPL {n.margin}</p></div></li> : null; })()}</ul>);
  const coming = (
    <ul className="mlist">{d.coming.leagues.map((l) => <li key={l.k}><span className="grow">{l.name}<br /><span className="l2">Usually starts {l.start}</span></span></li>)}
      <li><span className="grow">Nepali players signed<br /><span className="l2">{abroadNow.length} so far, {d.coming.mine} from your club</span></span></li></ul>);

  if (narrow) return (
    <MScreen top={{ title: T(G, `Who won what in ${d.y}`, `${d.y} मा कसले के जित्यो`), sub: undefined, right: <>Off-season<br />{d.y <= 2026 ? 'real + save' : 'simulated'}</> }}
      tabs={[['champs', tn(G, 'Champions')], ['nepalis', tn(G, 'Nepalis'), nocs || null], ['next', tn(G, 'Coming up')]]} tab={tab} onTab={setTab} label="World sections">
      {tab === 'champs' && <>
        <ul className="mlist">{d.rows.map((r) => (
          <li key={r.k} className={r.npl ? 'me' : ''} style={{ padding: '9px 0' }} onClick={() => setSel(r.k === sel ? '' : r.k)} role="button" tabIndex={0}>
            <span className="grow"><span className="l2">{r.when} · {r.short}</span><br />{r.pending ? <span className="faint">To be decided</span> : <span className="b6"><span className="gld" aria-hidden="true">★ </span>{r.champ}</span>}{!r.pending && <><br /><span className="l2">beat {r.runner} {short(r.margin)}</span></>}
              {sel === r.k && <span className="wd-acc t-small">{r.story}{r.nep && <><br /><span className="crim b6">Nepali angle:</span> {r.nep}</>}</span>}</span>
            {r.nep && !r.npl ? <span className="crim t-micro b6">Nepali</span> : <span className="faint" aria-hidden="true">›</span>}
          </li>))}</ul>
        <p className="faint t-micro" style={{ marginTop: 12 }}>{note(d.y)} Tap a league for its final.</p>
      </>}
      {tab === 'nepalis' && <>
        {nocs > 0 && <><p className="mhead">Requests for your players · {nocs}</p><NocRequests compact /></>}
        <p className="mhead">Nepali champions abroad</p>
        {champs.length ? <ul className="mlist">{champs.map((c) => <ChampRow key={c.p.id + c.a.league} x={c} />)}</ul> : <p className="t-small faint">None this year.</p>}
        <p className="mhead">Nepalis abroad in {d.y}</p><Abroad list={thisYear} />
        <p className="faint t-micro" style={{ marginTop: 10 }}>{NEP_ABROAD_FACTS.join(' ')} Stints after the save starts are simulated.</p>
      </>}
      {tab === 'next' && <>{coming}<p className="mhead">Signed for {G.year}</p><Abroad list={abroadNow} /><div style={{ marginTop: 16 }}><IntlHeads /></div></>}
    </MScreen>);

  return (
    <div className="wd" style={{ maxWidth: 1220 }}>
      <div className="pagehead">
        <div className="stack" style={{ gap: 4 }}>
          <p className="faint t-small">Off-season digest · {d.y <= 2026 ? 'real results, NPL from your save' : 'simulated in your save'}</p>
          <h1 className="t-h1">{T(G, `Who won what in ${d.y}`, `${d.y} मा कसले के जित्यो`)}</h1>
          <p className="mut">Nine T20 leagues {d.rows.some((r) => r.pending) ? 'this year' : 'finished this year'}. Pick a league for its final.</p>
        </div>
        <div className="row" style={{ gap: 8 }}><Link className="btn btn-sm" to="/international">{tn(G, 'International')}</Link><Link className="btn btn-sm" to="/rankings">{tn(G, 'Rankings')}</Link></div>
      </div>
      <div className="split" style={{ gap: 40, gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>
        <section className="stack" style={{ gap: 14, minWidth: 0 }}>
          <div className="tblwrap"><table className="tbl wd-dg">
            <thead><tr><th>Finished</th><th>League</th><th>Champions</th><th>Beat</th><th>Final</th><th /></tr></thead>
            <tbody>{d.rows.map((r) => { const on = r.k === pickK; return (
              <tr key={r.k} className={r.npl ? 'me' : ''}><td className="faint">{r.when}</td><td>{r.league}</td>
                <td className="name">{r.pending ? <span className="faint">To be decided</span> : <><span className="gld" aria-hidden="true">★ </span>{r.champ}</>}</td><td className="mut">{r.runner}</td><td className="t-small">{r.margin}</td>
                <td className="r"><button type="button" className={`btn btn-sm${on ? ' btn-blue' : ''}`} aria-pressed={on} onClick={() => setSel(r.k)}>{on ? 'Showing' : 'Final'}</button></td></tr>); })}</tbody></table></div>
          <p className="faint t-micro">{note(d.y)}</p>
          {x && <Account r={x} />}
          {nocs > 0 && <section className="stack" style={{ gap: 8 }}><h2 className="t-h3">Requests for your players</h2><NocRequests /></section>}
        </section>
        <aside className="stack" style={{ gap: 24, minWidth: 0 }}>
          <div><h2 className="sec">Headlines from the year</h2>{heads}</div>
          <IntlHeads />
          <div><h2 className="sec">Nepali champions abroad</h2>{champs.length ? <ul className="mlist">{champs.map((c) => <ChampRow key={c.p.id + c.a.league} x={c} />)}</ul> : <p className="t-small faint">None this year.</p>}</div>
          <div className="panel stack" style={{ gap: 6 }}>
            <h2 className="sec" style={{ margin: 0 }}>Coming up this winter</h2>
            <p className="t-small">{d.coming.leagues.map((l) => `${l.short} from ${l.start}`).join(' · ')} · {abroadNow.length} Nepali player{abroadNow.length === 1 ? '' : 's'} signed so far{d.coming.mine ? `, ${d.coming.mine} from your club` : ''}</p>
          </div>
          <div><h2 className="sec">Nepalis abroad in {d.y}</h2><Abroad list={thisYear} /><p className="faint t-micro" style={{ marginTop: 8 }}>{NEP_ABROAD_FACTS.join(' ')}</p></div>
        </aside>
      </div>
    </div>
  );
}
