import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Meter } from '../components/bits.jsx';
import { Icon } from '../components/icons.jsx';
import { NewsRow, ageOf, isPending, today } from '../components/news.jsx';
import { ovr } from '../game/engine.js';
import { ordinal } from '../game/game.js';
import { seasonNo, fmtNRR, formDisp, stageName, tname, tshort, userNextFixture, nextUnplayed, boardMood } from '../lib/util.js';
import { autosave } from '../lib/save.js';
import { simUntilUser, simFixture, simToSeasonEnd, completeSquad, startSeason, savedMatchFor, quickSimUserMatch } from '../lib/flow.js';

export function xiStatus(G) {
  const t = G.teams[G.user]; if (!t.xi || t.xi.length !== 11) return 'auto-pick';
  const os = t.xi.filter((id) => G.P(id).nat !== 'NEP').length;
  return G.validXI(G.user, t.xi) ? `${11 - os} + ${os} set` : 'needs attention';
}

const H1 = ({ children }) => <h1 className="t-h1 teams">{children}</h1>;
const KV = ({ k, children }) => <tr><td className="faint" style={{ paddingLeft: 0 }}>{k}</td>{children}</tr>;
const Card = ({ children }) => <section className="panel hero p-next">{children}</section>;
const clip = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s || '');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// A portal heading with its "See all" link.
function Head({ title, to, link }) {
  return <div className="sechead"><h2 className="t-h2">{title}</h2>{to && <Link to={to} className="t-small seeall">{link}<Icon name="chevron" size={16} /></Link>}</div>;
}

function DecisionPin() {
  const { G } = useGame(); const p = G.s.inbox.filter(isPending);
  if (!p.length) return null;
  const before = (G.s.phase === 'league' || G.s.phase === 'playoffs') && userNextFixture(G);
  return (
    <Link to="/news" className="pin p-pin"><Icon name="alert" size={22} />
      <span className="pin-body"><span className="t-small b6">{plural(p.length, 'decision')} {before ? 'before your next match' : 'waiting'}</span><span className="t-micro">{clip(p[0].text, 64)}</span></span>
      <span className="t-small b6">Decide</span></Link>
  );
}

function Hero() {
  const { G, ui, update, toast, setG } = useGame(); const nav = useNavigate();
  const s = G.s, t = G.teams[G.user];
  const busy = (fn) => async () => { toast('Simulating…'); await fn(); autosave(G); update(); };
  if (s.sacked) return (
    <Card><H1>You have been dismissed.</H1><p className="mut">The {t.name} board has ended your contract. Board confidence fell to {t.board}.</p>
      <div className="acts"><button className="btn btn-primary btn-lg" onClick={() => nav('/club')}>See job offers · {(s.offers || []).length}</button><button className="btn btn-lg" onClick={() => setG(null)}>Start a new game</button></div></Card>);
  if (s.phase === 'preseason') {
    const os = G.osCount(G.user); const ok = os >= 6 || !G.osFreeAgents().some((p) => p.value <= t.osPurse);
    return (
      <Card>
        <p className="faint t-micro">Season {seasonNo(G.year)} · {G.year} · first ball at Kirtipur{G.year === 2026 ? ' on October 26' : ''}</p>
        <H1>Pre-season</H1>
        <table className="tbl plain compact"><tbody>
          <KV k="Squad"><td className="wrapcell">{t.squad.length} players · need 18 to 22</td></KV>
          <KV k="Overseas"><td className={`wrapcell ${os < 6 ? 'crim' : ''}`}>{os} signed · need 6 to 8</td></KV>
          <KV k="Objective"><td className="wrapcell">{(t.objective || {}).txt}</td></KV></tbody></table>
        <div className="acts">
          <button className={`btn ${ok ? '' : 'btn-primary'}`} onClick={() => nav('/signings')}>Overseas signing window</button>
          <button className="btn" onClick={() => nav('/squad')}>Review squad</button>
          <button className={`btn ${ok ? 'btn-primary' : ''}`} disabled={!ok} onClick={() => update(() => { const n = startSeason(G); autosave(G); if (n) toast(`${n} free agent${n > 1 ? 's' : ''} signed at base price to complete your squad.`); })}>Start Season {seasonNo(G.year)}</button>
        </div>
        {(t.squad.length < 18 || os < 6) && <div className="row" style={{ gap: 10, alignItems: 'center' }}><button className="btn btn-ghost" onClick={() => update(() => { const n = completeSquad(G); autosave(G); toast(n ? `Signed ${n} free agent${n > 1 ? 's' : ''} at base price.` : 'No affordable free agents left.'); })}>Auto-complete squad</button><span className="faint t-small">Signs the best affordable free agents up to 18 players and 6 overseas.</span></div>}
        {!ok && <p className="crim t-small">Sign overseas players until you have at least 6, or auto-complete the squad.</p>}
      </Card>);
  }
  if (s.phase === 'league' || s.phase === 'playoffs') {
    const f = userNextFixture(G); const nu = nextUnplayed(G);
    if (f) {
      const st = G.standings(); const pos = (id) => ordinal(st.findIndex((x) => x.id === id) + 1);
      const before = s.fixtures.filter((x) => !x.res && x.n < f.n).length;
      const live = (ui.live && !ui.live.done && ui.live.started) || !!savedMatchFor(G, f);
      const form = (id) => (G.teams[id].form || []).slice(-3).join(' ') || '–';
      const goMatch = async () => { if (!live) { if (before) toast('Simulating other matches…'); await simUntilUser(G); autosave(G); if (ui.live && ui.live.done) ui.live = null; } nav('/match'); };
      const quick = async () => { await simUntilUser(G); const ff = userNextFixture(G); if (ff) { ui.live = null; const m = await quickSimUserMatch(G, ff); autosave(G); toast(`${m.result.text}.`); } update(); };
      return (
        <Card>
          <p className="faint t-micro">Next match · {f.date}, {f.night ? '7:15 pm' : '3:00 pm'} · {f.stage === 'L' ? `Match ${f.n}` : stageName(f)}</p>
          <H1><span className="tm"><Dot id={f.home} big />{tshort(G, f.home)}</span><span className="faint" style={{ fontWeight: 400 }}>v</span><span className="tm"><Dot id={f.away} big />{tshort(G, f.away)}</span></H1>
          <p className="t-small mut">{f.stage === 'L' && <>{pos(f.home)} v {pos(f.away)} · </>}Form <span className="board-f formstr">{form(f.home)}</span> v <span className="board-f formstr">{form(f.away)}</span></p>
          <div className="hero-btns">
            <button className="btn btn-primary btn-lg" onClick={goMatch}>{live ? (ui.live && ui.live.started ? 'Back to live match' : 'Resume match') : 'Go to match'}</button>
            <button className="btn btn-lg" onClick={() => nav('/squad')} title={`XI: ${xiStatus(G)}`}>Review XI</button>
          </div>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            {!(ui.live && ui.live.started && !ui.live.done) && <button className="btn btn-ghost btn-sm" onClick={quick}>{live ? 'Quick sim the rest' : 'Quick sim'}</button>}
            {before > 0 && !live && <span className="faint t-micro">{before} other match{before > 1 ? 'es' : ''} will be simulated first.</span>}
          </div>
        </Card>);
    }
    if (nu) return (
      <Card><H1>{s.phase === 'playoffs' ? 'Playoffs' : 'League'} continue without you</H1><p className="mut">Next: {stageName(nu)}, {tname(G, nu.home)} v {tname(G, nu.away)}.</p>
        <div className="acts"><button className="btn btn-primary btn-lg" onClick={busy(() => simFixture(G, nu))}>Simulate next match</button><button className="btn btn-lg" onClick={busy(() => simToSeasonEnd(G, false))}>Simulate to the end of the season</button></div></Card>);
  }
  if (s.phase === 'seasonEnd') {
    const h = s.history[s.history.length - 1];
    return (
      <Card><p className="faint t-micro">Season {seasonNo(h.year)} · {h.year} is over</p>
        <H1><span className="tm"><Dot id={h.champion} big />{tname(G, h.champion)} are champions</span></H1>
        <p className="mut">{h.final}. Player of the tournament: {h.pot}.</p>
        <table className="tbl plain compact"><tbody>
          <KV k="Platinum Cap"><td className="wrapcell">{h.runs[0][0]} · {h.runs[0][2]} runs</td></KV><KV k="Golden Cap"><td className="wrapcell">{h.wkts[0][0]} · {h.wkts[0][2]} wickets</td></KV>
          {h.emerging && <KV k="Emerging player"><td className="wrapcell">{h.emerging}</td></KV>}</tbody></table>
        <div className="acts"><button className="btn btn-primary btn-lg" onClick={() => { G.startOffseason(); autosave(G); update(); nav('/offseason'); }}>Start the off-season</button>{s.offers && s.offers.length > 0 && <button className="btn btn-lg" onClick={() => nav('/club')}>Job offers</button>}</div></Card>);
  }
  const simple = (title, text, label, to) => <Card><H1>{title}</H1><p className="mut">{text}</p><div className="acts"><button className="btn btn-primary btn-lg" onClick={() => nav(to)}>{label}</button></div></Card>;
  if (s.phase === 'offseason') return simple('Off-season', `Players have aged a year. Review the changes, make trades, then move on to ${s.mega ? 'retention for the mega auction' : 'releases for the mini auction'}.`, 'Off-season summary', '/offseason');
  if (s.phase === 'retention') return simple(s.mega ? 'Retention' : 'Releases', s.mega ? 'Pick up to 3 players to keep before the mega auction.' : 'Choose who to release before the mini auction.', `Go to ${s.mega ? 'retention' : 'releases'}`, '/retention');
  if (s.phase === 'auction') return simple(`${s.auction.kind === 'mega' ? 'Mega' : 'Mini'} auction ${G.year}`, 'The auction room is open.', 'Enter the auction room', '/auction');
  return null;
}

function NewsPortal() {
  const { G } = useGame(); const now = today(G);
  const items = G.s.inbox.filter((n) => !isPending(n)).slice(0, 3);
  const when = (n) => { const a = ageOf(G, n, now); return a === 'Today' || a === 'Yesterday' ? a : n.d || `Season ${seasonNo(n.y)}`; };
  return (
    <section className="p-news"><Head title="News" to="/news" link={`All news · ${G.s.inbox.length}`} />
      {items.length ? items.map((n) => <NewsRow key={n.id} G={G} n={n} sub={[clip((n.detail || '').split('. ')[0], 48), when(n)].filter(Boolean).join(' · ')} />) : <p className="faint t-small">Nothing yet.</p>}
    </section>
  );
}

function TablePortal() {
  const { G } = useGame(); const st = G.standings(); const me = st.findIndex((r) => r.id === G.user);
  const rows = st.slice(0, 4).map((r, i) => [r, i]); const out = me >= 4;
  const anyPlayed = st.some((r) => r.p > 0);
  const gap = out ? st[3].pts - st[me].pts : 0;
  const note = !anyPlayed ? null : out ? (gap > 0 ? `${plural(gap, 'point')} off the playoff places` : 'Level on points with 4th') : 'In the playoff places';
  const Row = ([r, i]) => <tr key={r.id} className={r.id === G.user ? 'me' : ''}><td className="faint">{i + 1}</td><td className="name"><Dot id={r.id} />{tshort(G, r.id)}{r.id === G.user ? ' (you)' : ''}</td><td className="r faint">{r.p}</td><td className="r"><b>{r.pts}</b></td><td className="r faint">{fmtNRR(r.nrr)}</td></tr>;
  return (
    <section className="p-table"><Head title="Table" to="/season" link="Full table" />
      <table className="tbl compact plain mini"><thead><tr><th>#</th><th>Team</th><th className="r">P</th><th className="r">Pts</th><th className="r">NRR</th></tr></thead>
        <tbody>{rows.map(Row)}{out && <tr className="gap" aria-hidden="true"><td colSpan={5} /></tr>}{out && Row([st[me], me])}</tbody></table>
      {note && <p className="t-micro faint" style={{ marginTop: 6 }}>{note}</p>}
    </section>
  );
}

// "Lumbini beat Karnali" / "by 4 wickets" from a stored result.
function resultLine(G, f) {
  const r = f.res; const opp = f.home === G.user ? f.away : f.home;
  if (r.nr) return ['–', `No result v ${tshort(G, opp)}`, 'Rain'];
  if (!r.winner) return ['–', `Tied with ${tshort(G, opp)}`, r.text.replace(/\.$/, '')];
  const loser = r.winner === f.home ? f.away : f.home; const m = /won (by .+?)\.?$/.exec(r.text);
  return [r.winner === G.user ? 'W' : 'L', `${tshort(G, r.winner)} beat ${tshort(G, loser)}`, m ? m[1] : ''];
}

function ResultsPortal() {
  const { G } = useGame();
  const mine = G.s.fixtures.filter((f) => f.res && (f.home === G.user || f.away === G.user)).slice(-3).reverse();
  return (
    <section className="p-results"><Head title="Results" to="/season?tab=results" link="All fixtures" />
      {mine.length ? mine.map((f) => { const [wl, txt, by] = resultLine(G, f); return (
        <Link key={`${f.stage}${f.n}`} to={`/scorecard/${f.n}`} className="rrow"><span className={`board-f wl ${wl === 'W' ? 'w' : wl === 'L' ? 'l' : ''}`}>{wl}</span><span className="t-small rrow-t">{txt}</span><span className="t-micro faint">{by}</span></Link>); })
        : <p className="faint t-small">No results yet.</p>}
    </section>
  );
}

function CapRaces() {
  const { G } = useGame(); const y = G.year;
  const ps = Object.values(G.players).filter((p) => p.stats[y] && p.stats[y].m > 0);
  const runs = ps.slice().sort((a, b) => b.stats[y].r - a.stats[y].r);
  const wkts = ps.slice().sort((a, b) => b.stats[y].w - a.stats[y].w || a.stats[y].rc - b.stats[y].rc);
  const lastName = (p) => p.name.split(' ').slice(-1)[0];
  const Cap = ({ label, list, v }) => {
    const [a, b] = list;
    return (
      <div className="panel cap"><p className="t-micro faint">{label}</p>
        {a && v(a) > 0 ? <><Link to={`/player/${a.id}`} className="t-small b6 ell cap-n">{a.name}</Link><p className="board-f cap-v">{v(a)}</p><p className="t-micro faint ell">{b ? `Next: ${lastName(b)} ${v(b)}` : ''}</p></>
          : <><p className="t-small faint">No leader yet</p><p className="board-f cap-v faint">—</p></>}
      </div>);
  };
  return (
    <section className="p-caps"><Head title="Cap races" to="/stats" link="All stats" />
      <div className="caps"><Cap label="Platinum Cap · runs" list={runs} v={(p) => p.stats[y].r} /><Cap label="Golden Cap · wickets" list={wkts} v={(p) => p.stats[y].w} /></div>
    </section>
  );
}

function SquadWatch() {
  const { G } = useGame(); const t = G.teams[G.user]; const pre = G.s.phase === 'preseason';
  const sq = t.squad.map((id) => G.P(id));
  const items = [
    ...sq.filter((p) => p.inj).map((p) => [p, <span className="t-micro crim b6">Injured · {p.inj} match{p.inj > 1 ? 'es' : ''}</span>]),
    ...sq.filter((p) => !p.inj && p.fit < 75).sort((a, b) => a.fit - b.fit).map((p) => [p, <span className="t-micro mut">Fitness {Math.round(p.fit)}%</span>]),
    ...(pre ? sq.filter((p) => p.lastDev && Math.abs(p.lastDev) >= 3).map((p) => [p, <span className={`t-micro b6 ${p.lastDev > 0 ? 'up' : 'down'}`}>Rating {p.prevOvr} → {ovr(p)}</span>]) : []),
    ...sq.filter((p) => !p.inj && p.fit >= 75 && p.form >= 5).sort((a, b) => b.form - a.form).map((p) => [p, <span className="t-micro blu b6">In form · {formDisp(p)}</span>]),
  ].slice(0, 3);
  return (
    <section className="p-watch"><Head title="Squad watch" to="/squad" link={`Squad · ${t.squad.length}`} />
      {items.length ? items.map(([p, tag]) => <Link key={p.id} to={`/player/${p.id}`} className="wrow"><span className="t-small ell">{p.name}</span>{tag}</Link>) : <p className="faint t-small">Everyone is fit.</p>}
    </section>
  );
}

function BoardPortal() {
  const { G } = useGame(); const t = G.teams[G.user]; const bc = t.board;
  return (
    <section className="p-board"><Head title="Board" to="/club" link="Club" />
      <div className="panel stack" style={{ gap: 8, padding: '12px 14px' }}>
        <div className="sechead" style={{ margin: 0 }}><span className="t-small b6">{(t.objective || { txt: '—' }).txt}</span><span className="t-small mut num">{bc} · {boardMood(bc)}</span></div>
        <Meter pct={bc} blue />
        <p className="faint t-micro">Below 30 at the end-of-season review puts your job at risk.</p>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="wrap portals">
      <div className="pcol"><DecisionPin /><Hero /><NewsPortal /><ResultsPortal /></div>
      <div className="pcol"><TablePortal /><CapRaces /><SquadWatch /><BoardPortal /></div>
    </div>
  );
}
