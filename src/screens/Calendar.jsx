// The calendar: a month of your fixtures across both jobs (national matches, NPL matches and the NPL's
// deadlines), and a list of every competition running in the world.
import { Link, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { Seg } from '../components/bits.jsx';
import { NDot } from '../components/NationBits.jsx';
import { useNarrow, tshort } from '../lib/util.js';
import * as CR from '../world/career.js';
import { seasons } from '../world/state.js';
import { dateOf, dayOfDate, short, monthLabel, MONTHS } from '../world/dates.js';
import '../styles/career.css';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Every dated thing in [from, to] for the user: { day, kind: 'world' | 'npl' | 'ph', text, sub, to, done }
function events(G, from, to) {
  const out = []; const me = CR.userNation(G);
  if (me) for (const S of seasons(G)) for (const f of S.fx) {
    if ((f.a !== me && f.b !== me) || f.d < from || f.d > to) continue; const opp = f.a === me ? f.b : f.a;
    out.push({ day: f.d, kind: 'world', text: `${f.a === me ? 'v' : '@'} ${CR.nationName(G, opp)}`, sub: `${CR.seasonName(S)} · ${f.fmt === 'ODI' ? 'ODI' : 'T20I'}${f.res ? ` · ${f.res.text}` : ''}`, to: `/comp/${S.id}?tab=fixtures&fx=${encodeURIComponent(f.id)}`, done: !!f.res });
  }
  if (CR.hasClub(G) && (G.s.phase === 'league' || G.s.phase === 'playoffs' || G.s.phase === 'seasonEnd' || G.s.phase === 'preseason')) for (const f of G.s.fixtures) {
    if (f.home !== G.user && f.away !== G.user) continue; const d = CR.nplDay(G, f); if (d < from || d > to) continue; const opp = f.home === G.user ? f.away : f.home;
    out.push({ day: d, kind: 'npl', text: `NPL v ${tshort(G, opp)}`, sub: f.res ? f.res.text : f.stage === 'L' ? `Match ${f.n}` : 'Playoffs', to: f.res ? `/scorecard/${f.n}` : '/', done: !!f.res });
  }
  const ne = CR.hasClub(G) ? CR.nplEvent(G) : null;
  if (ne && ne.what !== 'match' && ne.what !== 'sim' && ne.day >= from && ne.day <= to) out.push({ day: ne.day, kind: 'ph', text: CR.NPL_WHAT[ne.what], sub: 'Needs you', to: '/' });
  return out.sort((a, b) => a.day - b.day);
}
function useMonth(G) {
  const [q, setQ] = useSearchParams(); const t = dateOf(G.s.wd.day); const cur = t.y * 12 + t.m;
  const v = q.get('m') != null && !Number.isNaN(+q.get('m')) ? +q.get('m') : cur;
  const set = (x) => { const n = new URLSearchParams(q); if (x === cur) n.delete('m'); else n.set('m', String(x)); setQ(n, { replace: true }); };
  return [v, set, cur];
}
function MonthNav({ mi, setMi, cur }) {
  const y = Math.floor(mi / 12), m = mi % 12;
  return (
    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
      <button type="button" className="btn btn-sm" aria-label="Previous month" onClick={() => setMi(mi - 1)}>‹</button>
      <span className="b6 num" style={{ minWidth: 92, textAlign: 'center' }}>{MONTHS[m]} {y}</span>
      <button type="button" className="btn btn-sm" aria-label="Next month" onClick={() => setMi(mi + 1)}>›</button>
      {mi !== cur && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMi(cur)}>Today</button>}
    </div>
  );
}
function Month({ narrow }) {
  const { G } = useGame(); const [mi, setMi, cur] = useMonth(G); const y = Math.floor(mi / 12), m = mi % 12;
  const first = dayOfDate(y, m, 1), last = dayOfDate(y, m + 1, 1) - 1; const lead = (dateOf(first).dow + 6) % 7;
  const start = first - lead; const weeks = Math.ceil((lead + last - first + 1) / 7); const evs = events(G, start, start + weeks * 7 - 1);
  const now = G.s.wd.day; const inMonth = evs.filter((e) => e.day >= first && e.day <= last);
  return (
    <>
      <div className="cr-head"><MonthNav mi={mi} setMi={setMi} cur={cur} />{!narrow && <span className="faint t-small">{inMonth.length ? `${inMonth.length} fixture${inMonth.length === 1 ? '' : 's'} and deadline${inMonth.length === 1 ? '' : 's'} this month` : 'Nothing for you this month'}</span>}</div>
      <div className="cr-cal" role="grid" aria-label={`${MONTHS[m]} ${y}`}>
        {DOW.map((d) => <div key={d} className="dow" role="columnheader">{narrow ? d[0] : d}</div>)}
        {Array.from({ length: weeks * 7 }, (_, k) => { const d = start + k; const t = dateOf(d); const list = evs.filter((e) => e.day === d);
          return (
            <div key={d} role="gridcell" className={`cr-day${d < first || d > last ? ' out' : ''}${d === now ? ' now' : ''}`} aria-label={`${t.d} ${MONTHS[t.m]}${list.length ? `: ${list.map((e) => e.text).join(', ')}` : ''}`}>
              <span className="n">{t.d}</span>
              {list.map((e, i) => <Link key={i} to={e.to} className={`cr-ev ${e.kind === 'world' ? '' : e.kind === 'npl' ? 'club' : e.kind}${e.done ? ' done' : ''}`} title={`${e.text} · ${e.sub}`}>{e.kind === 'world' ? <b>{e.text}</b> : e.text}</Link>)}
            </div>); })}
      </div>
      <div className="cr-legend"><span><i />National team</span>{CR.hasClub(G) && <><span><i className="club" />NPL</span><span><i className="ph" />NPL deadline</span></>}<span className="faint">Today is {short(now)}</span></div>
      {narrow && <><p className="mhead">This month</p>{inMonth.length ? <ul className="cr-agenda">{inMonth.map((e, i) => { const t = dateOf(e.day); return <li key={i}><span className="d"><b>{t.d}</b>{MONTHS[t.m]}</span><Link to={e.to} style={{ color: 'inherit', textDecoration: 'none' }}><span className={`t-small b6 ${e.kind === 'npl' ? 'crim' : e.kind === 'ph' ? 'gld' : ''}`}>{e.text}</span><br /><span className="t-micro faint">{e.sub}</span></Link></li>; })}</ul> : <p className="t-small faint">Nothing for you this month.</p>}</>}
    </>
  );
}
// Every competition with a season in the world, grouped by when it runs.
function List() {
  const { G } = useGame(); const now = G.s.wd.day; const me = CR.userNation(G);
  const all = seasons(G).slice().sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  const running = all.filter((S) => !S.done && (S.start ?? 0) <= now); const soon = all.filter((S) => !S.done && (S.start ?? 0) > now && S.start <= now + 120);
  const later = all.filter((S) => !S.done && S.start > now + 120); const fin = all.filter((S) => S.done && (S.end ?? 0) >= now - 120).reverse();
  const Row = ({ S }) => { const p = S.fx.filter((f) => f.res).length; const mine = me && S.teams.includes(me);
    return <li><Link to={`/comp/${S.id}`} className="grow" style={{ color: 'inherit', textDecoration: 'none' }}><span className={mine ? 'b6' : ''}>{CR.seasonName(S)}</span>{mine && <span className="cr-pill b">{CR.nationName(G, me)}</span>}<br />
      <span className="l2">{S.start != null ? `${short(S.start)} – ${short(S.end ?? S.start)}` : S.y} · {S.teams.length} teams · {S.done ? (S.champ ? `${CR.nationName(G, S.champ)} won` : 'Finished') : `${p} of ${S.fx.length} played`}</span></Link><span className="faint" aria-hidden="true">›</span></li>; };
  const Group = ({ title, list }) => (list.length ? <><p className="mhead">{title} · {list.length}</p><ul className="mlist">{list.map((S) => <Row key={S.id} S={S} />)}</ul></> : null);
  const ph = { preseason: 'Pre-season', league: 'League stage', playoffs: 'Playoffs', seasonEnd: 'Season over', offseason: 'Off-season', retention: 'Retention', auction: 'Auction' }[G.s.phase] || G.s.phase;
  return (
    <>
      <p className="mhead" style={{ marginTop: 4 }}>Nepal Premier League</p>
      <ul className="mlist"><li><Link to="/season" className="grow" style={{ color: 'inherit', textDecoration: 'none' }}><span className={CR.hasClub(G) ? 'b6' : ''}>NPL {G.year}</span>{CR.hasClub(G) && <span className="cr-pill c">{tshort(G, G.user)}</span>}<br /><span className="l2">{ph}{CR.hasClub(G) ? '' : ' · run without you'}</span></Link><span className="faint" aria-hidden="true">›</span></li></ul>
      <Group title="Running now" list={running} /><Group title="Coming up" list={soon} /><Group title="Later" list={later} /><Group title="Finished recently" list={fin} />
      {!all.length && <p className="t-small faint" style={{ marginTop: 12 }}>No international competitions are scheduled yet.</p>}
      <p className="t-micro faint" style={{ marginTop: 14 }}>Everything after the save started is simulated.</p>
    </>
  );
}

export default function Calendar() {
  const { G } = useGame(); const narrow = useNarrow(); const [view, setView] = useTab(['month', 'list'], 'month', 'view');
  if (!G.s.wd) return <p className="mut">The calendar starts with the world.</p>;
  const me = CR.userNation(G);
  if (narrow) return (
    <MScreen top={{ title: 'Calendar', sub: short(G.s.wd.day) }} tabs={[['month', 'Month'], ['list', 'Competitions']]} tab={view} onTab={setView} label="Calendar views">
      <div style={{ paddingTop: 12 }}>{view === 'month' ? <Month narrow /> : <List />}</div>
    </MScreen>);
  return (
    <div className="wrap" style={{ maxWidth: 1180 }}>
      <div className="cr-head"><div><h1 className="t-h1">Calendar</h1><p className="mut t-small">{me ? <><NDot id={me} />{CR.nationName(G, me)}</> : null}{me && CR.hasClub(G) ? ' and ' : ''}{CR.hasClub(G) ? G.teams[G.user].name : ''}</p></div>
        <Seg options={[['month', 'Month'], ['list', 'Competitions']]} value={view} onChange={setView} label="View" /></div>
      {view === 'month' ? <Month /> : <List />}
    </div>
  );
}
