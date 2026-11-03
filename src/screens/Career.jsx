import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { Dot } from '../components/bits.jsx';
import { repTier, REP_TIERS, styleLabels, cabinet, achievements, jobs, listenTo, takeNepalA, farewellCandidates, planFarewell, CHALLENGES } from '../game/living.js';
import { useNarrow, seasonNo, tname, tshort } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import MScreen, { useTab } from '../components/MScreen.jsx';
import '../styles/living.css';

function summary(G) {
  const C = G.s.manager.career; let m = 0, w = 0, l = 0; const teams = new Set(C.map((c) => c.team)); teams.add(G.user);
  for (const f of G.s.fixtures) if (f.res && (f.home === G.user || f.away === G.user)) { m++; if (f.res.winner === G.user) w++; else if (f.res.winner) l++; }
  const seasons = C.length + (G.s.phase === 'seasonEnd' || G.s.phase === 'offseason' ? 0 : 1);
  return `${seasons} season${seasons === 1 ? '' : 's'} · ${[...teams].map((t) => tname(G, t)).join(', ')} · this season ${m} matches, W${w} L${l}`;
}
function Head({ G }) {
  const rep = Math.round(G.s.manager.rep); const st = styleLabels(G);
  return (
    <div className="lv-head">
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="t-h1">{G.s.manager.name}, {T(G, 'manager', 'प्रशिक्षक')}</h1>
        <p className="mut">{summary(G)}</p>
        <div className="lv-chips">{st.length ? st.map((s) => <span key={s.t} className={`lv-chip${s.gold ? ' g' : ''}`}>{s.t}</span>) : <span className="lv-chip">Still finding a style</span>}</div>
      </div>
      <div className="r">
        <span className="faint t-small">{T(G, 'Reputation', 'प्रतिष्ठा')}</span>
        <span className="board-f lv-rep">{repTier(rep)} · {rep}</span>
        <div className="meter blue" style={{ width: 260, maxWidth: '100%' }}><i style={{ width: `${rep}%` }} /></div>
        <span className="faint t-micro">{REP_TIERS.map((t) => t[0]).join(' · ')}</span>
      </div>
    </div>
  );
}
function Cabinet({ G }) {
  const cab = cabinet(G); const C = G.s.manager.career; const runner = C.filter((c) => c.runner);
  return (
    <div className="lv-cab">
      {cab.map((c) => <div key={c.y} className="panel occasion stack" style={{ gap: 4 }}><span className="gld t-small b6">NPL champions</span><span className="board-f lv-yr">{c.y}</span><span className="t-small mut">{c.opp ? `Final v ${tshort(G, c.opp)}` : tname(G, c.team)}{c.text ? ` · ${c.text}` : ''}</span>{c.link && <Link to={c.link} className="t-small">Final scorecard</Link>}</div>)}
      {runner.map((c) => <div key={`r${c.year}`} className="panel stack" style={{ gap: 4 }}><span className="t-small b6 mut">Runners-up</span><span className="board-f lv-yr">{c.year}</span>{G.s.finals[c.year] && <Link to={`/scorecard/F${c.year}`} className="t-small">Final scorecard</Link>}</div>)}
      <div className="panel stack ghost" style={{ gap: 4 }}><span className="faint t-small">Next to win</span><span className="board-f faint lv-yr">{G.s.phase === 'offseason' || G.s.phase === 'seasonEnd' ? G.year + (G.s.phase === 'seasonEnd' ? 1 : 0) : G.year}</span><span className="t-small faint">{cab.length ? (cab[cab.length - 1].y === G.year - 1 || cab[cab.length - 1].y === G.year ? 'Back-to-back as manager' : 'Another title') : 'Your first title as manager'}</span></div>
    </div>
  );
}
function Achievements({ G }) {
  const A = achievements(G); const done = A.filter((a) => a.done);
  return (<>
    <h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'Achievements', 'उपलब्धि')} · {done.length} of {A.length}</h2>
    <ul className="mlist">{[...done, ...A.filter((a) => !a.done)].map((a) => <li key={a.k} className={a.done ? '' : 'dim'}><span className="grow">{a.n}<br /><span className="l2">{a.d}</span></span>
      {a.done ? <span className="gld t-small b6">Unlocked{a.y ? ` · ${a.y}` : ''}</span> : <span className="faint t-small num">{a.need > 1 ? `${a.have} of ${a.need}` : 'Locked'}</span>}</li>)}</ul>
  </>);
}
function Jobs({ G, update, toast }) {
  const J = jobs(G);
  return (<>
    <h2 className="sec">{T(G, 'Who wants you', 'कसले चाहन्छ')}</h2>
    <ul className="mlist">{J.map((j, i) => j.kind === 'nepalA'
      ? <li key={i} className={j.locked ? 'dim' : ''}><span className="grow">Nepal A team coach<br /><span className="l2">{j.line}</span></span>{j.locked ? <span className="faint t-small">Locked</span> : j.taken ? <span className="blu t-small">In post</span> : <button type="button" className="btn btn-sm" onClick={() => update(() => { if (takeNepalA(G)) { toast('You are Nepal A coach as well.'); autosave(G); } })}>Accept</button>}</li>
      : <li key={i}><span className="grow"><Dot id={j.tid} />{tname(G, j.tid)}<br /><span className="l2">{j.line}</span></span>
        {j.kind === 'offer' ? (j.canTake ? <button type="button" className="btn btn-sm btn-primary" onClick={() => update(() => { G.takeJob(j.tid); autosave(G); toast(`You join ${tname(G, j.tid)}.`); })}>Take the job</button> : <span className="t-small mut">At season end</span>)
          : j.listened ? <span className="t-small mut">Listening</span> : <button type="button" className="btn btn-sm" onClick={() => update(() => { listenTo(G, j.tid); autosave(G); toast('Noted. An offer may come at the end of the season.'); })}>Listen</button>}</li>)}</ul>
    {J.length === 1 && <p className="t-micro faint" style={{ marginTop: 6 }}>Clubs show interest from reputation 50, when their own manager is under pressure.</p>}
  </>);
}
function Legends({ G, update, toast }) {
  const F = G.s.living.farewell; const c = farewellCandidates(G);
  return (
    <div className="panel stack" style={{ gap: 8 }}>
      <h2 className="sec" style={{ margin: 0 }}>{T(G, 'Legends and farewells', 'दिग्गज र बिदाइ')}</h2>
      {c.length ? c.slice(0, 4).map((p) => { const fw = F[p.id] && F[p.id].y === G.year;
        return <div key={p.id} className="stack" style={{ gap: 4 }}><p className="t-small"><b>{p.name}</b> ({p.age}) may retire after this season. Plan a farewell game: a guard of honour at your last league match, and a vote for the Hall of Fame.</p>
          {fw ? <span className="t-small blu">{F[p.id].played ? 'Farewell played' : 'Farewell planned for the last league match'}</span> : <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => update(() => { planFarewell(G, p.id); autosave(G); toast(`Farewell planned for ${p.name}.`); })}>Plan farewell</button>}</div>; })
        : <p className="t-small faint">No veteran in your squad is near retirement.</p>}
      <Link to="/history" className="t-small">Hall of Fame and the ballot</Link>
    </div>
  );
}
function Challenges({ G }) {
  const c = G.s.living.challenge; const cur = c && CHALLENGES.find((x) => x.k === c.k);
  return (<>
    <h2 className="sec">{T(G, 'Challenges', 'चुनौती')}</h2>
    {cur && <p className="t-small" style={{ marginBottom: 6 }}>This save: <b>{cur.n}</b> · <span className={c.status === 'won' ? 'gld' : c.status === 'failed' ? 'crim' : 'mut'}>{c.status === 'won' ? 'Complete' : c.status === 'failed' ? `Failed${c.why ? ` · ${c.why}` : ''}` : 'In progress'}</span></p>}
    <ul className="mlist">{CHALLENGES.filter((x) => !cur || x.k !== cur.k).map((x) => <li key={x.k} style={{ padding: '8px 0' }}><span className="grow t-small">{x.n}<br /><span className="l2">{x.d}</span></span><span className="faint t-small">{x.tag}</span></li>)}</ul>
    <p className="t-micro faint" style={{ marginTop: 6 }}>Pick one when you start a new game.</p>
  </>);
}

export default function Career() {
  const { G, update, toast } = useGame(); const narrow = useNarrow();
  const [tab, setTab] = useTab(['career', 'ach', 'jobs', 'legends'], 'career');
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'Career'), sub: `${repTier(G.s.manager.rep)} · ${Math.round(G.s.manager.rep)}` }} tabs={[['career', tn(G, 'Career')], ['ach', T(G, 'Achievements', 'उपलब्धि')], ['jobs', T(G, 'Jobs', 'जागिर')], ['legends', T(G, 'Legends', 'दिग्गज')]]} tab={tab} onTab={setTab} label="Career">
      <div style={{ paddingTop: 12 }}>
        {tab === 'career' && <><Head G={G} /><h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'Trophy cabinet', 'ट्रफी')}</h2><Cabinet G={G} /></>}
        {tab === 'ach' && <Achievements G={G} />}
        {tab === 'jobs' && <><Jobs G={G} update={update} toast={toast} /><div style={{ marginTop: 20 }}><Challenges G={G} /></div></>}
        {tab === 'legends' && <Legends G={G} update={update} toast={toast} />}
      </div>
    </MScreen>);
  return (
    <div className="lv-wrap">
      <Head G={G} />
      <div className="lv-split">
        <section className="stack" style={{ gap: 30 }}>
          <div><h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'Trophy cabinet', 'ट्रफी')}</h2><Cabinet G={G} /></div>
          <div><Achievements G={G} /></div>
          <p className="t-micro faint">Season {seasonNo(G.year)}. Everything after the save started is simulated, in your game.</p>
        </section>
        <aside className="lv-side">
          <div><Jobs G={G} update={update} toast={toast} /></div>
          <Legends G={G} update={update} toast={toast} />
          <div><Challenges G={G} /></div>
        </aside>
      </div>
    </div>
  );
}
