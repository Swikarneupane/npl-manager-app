import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { Dot } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { useNarrow } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { nm, decideClash, pathState, t20State, nextNepal, tournaments, today, worldTick } from '../game/world.js';
import { info, placing, stageTables, sbase, monthOf, lastDay, cupStage } from '../world/intl.js';
import { teamRank } from '../world/rankings.js';
import { squadFor, tableOf } from '../world/state.js';
import { short, label as dayLabel } from '../world/dates.js';
import { standings } from '../world/comp.js';
import { T20WC_2026, T20WC_2024 } from '../game/world-data.js';
import { REAL } from '../data/world/calendar.js';
import '../styles/world.css';

export const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
export const nrrS = (x) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2);
export const span = (a, b) => (a === b ? short(a) : `${short(a)} – ${short(b)}`);
// A standings table for one group of a season. cut: the line under the top `cut`; status(i): the right-hand note.
export function Standings({ rows, title, sub, cut, status, real, compact }) {
  return (
    <div style={{ minWidth: 0 }}>
      {title && <div className="wd-th"><h3 className="t-h3">{title}</h3><span className="faint t-small">{real ? 'real result' : 'in-game'}</span></div>}
      <div className="tblwrap"><table className={`tbl compact${compact ? ' plain' : ''}`} style={{ marginTop: 6 }}>
        <thead><tr><th style={{ paddingLeft: compact ? 0 : undefined }}>#</th><th>Team</th><th className="r">P</th><th className="r">W</th><th className="r">L</th><th className="r">NR</th><th className="r">Pts</th><th className="r">NRR</th>{status && <th />}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.id} className={`${r.id === 'NEP' ? 'me' : ''}${cut && i === cut - 1 ? ' cut' : ''}`}><td style={{ paddingLeft: compact ? 0 : undefined }}>{i + 1}</td><td className="name">{nm(r.id)}</td><td className="r">{r.p}</td><td className="r">{r.w}</td><td className="r">{r.l}</td><td className="r">{r.nr + (r.t || 0)}</td><td className="r b6">{r.pts}</td><td className="r faint">{nrrS(r.nrr)}</td>{status && <td className={`t-small ${cut && i < cut ? 'blu' : 'faint'}`}>{status(i, r)}</td>}</tr>)}</tbody>
      </table></div>
      {sub && <p className="faint t-micro" style={{ marginTop: 6 }}>{sub}</p>}
    </div>);
}
const groupsOf = (S, k) => { const T0 = stageTables(S, k); const labels = (info(S).labels[k] || []); return Object.keys(T0).map((g, i) => ({ key: g, label: labels[i] || (g === 'super' ? info(S).stages[1] || 'Super stage' : g === 'all' || g === 'series' ? '' : `Group ${g}`), rows: standings(T0[g]) })); };
const CompLink = ({ S, children }) => <Link to={`/comp/${encodeURIComponent(S.id)}`} style={{ color: 'inherit' }}>{children || sbase(S)}</Link>;

// The 50-over pathway, top to bottom, with Nepal's place in it.
function Pathway({ ps }) {
  const L = [
    ['wc', ps.cup.name, `${ps.cup.hosts} · Oct–Nov ${ps.W} · 14 teams`],
    ['wcq', 'World Cup Qualifier', `${ps.W === 2027 ? '22 Feb – 23 Mar 2027 · ' : ''}10 teams for 4 places`],
    ['po', 'Qualifier Play-off', `${ps.W === 2027 ? '4–21 Dec 2026 · Kirtipur and Mulpani · ' : ''}top four to the Qualifier`],
    ['l2', 'CWC League 2', '8 teams · tri-series of ODIs · top four to the Qualifier'],
    ['cl', 'Challenge League', '12 teams in two leagues · List A · top two of each to the Play-off'],
  ];
  return (
    <ol className="wd-path">{L.map(([k, name, sub]) => { const on = k === ps.at; const S = ps.step[k]; const pos = ps.pos(k);
      const state = S ? (S.done ? (S.real ? 'Finished (real)' : 'Finished · in-game') : S.fx.some((f) => f.res) ? 'Under way · in-game' : `From ${dayLabel(S.start)}`) : 'Field not drawn yet';
      return (
        <li key={k} className={on ? 'on' : ''}><span className={k === 'wc' ? 'gld b6' : 'b6'}>{S ? <CompLink S={S}>{name}</CompLink> : name}</span>
          <span className={`t-small${on ? '' : ' mut'}`}>{on && <b>{ps.out ? 'Nepal went out here. ' : 'Nepal are here. '}</b>}{sub}<br /><span className="faint">{state}{S && pos >= 0 && S.done ? ` · Nepal ${ord(pos + 1)}` : ''}</span></span></li>); })}</ol>);
}

function NepalTab() {
  const { G } = useGame(); const ps = pathState(G); const t2 = t20State(G); const next = nextNepal(G, 6);
  const cur = ['l2', 'cl', 'po', 'wcq'].map((k) => [k, ps.step[k]]).filter(([, S]) => S && S.teams.includes('NEP'));
  const sq = useMemo(() => { try { return squadFor(G, 'NEP', next[0] ? next[0][1].fmt : 'T20').map((p) => p.id); } catch { return []; } }, [G, next.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = sq.filter((id) => G.P(id) && G.P(id).team === G.user);
  return (
    <div className="split wd-split">
      <section className="stack" style={{ gap: 28, minWidth: 0 }}>
        <div>
          <h2 className="t-h3" style={{ marginBottom: 4 }}>The 50-over pathway</h2>
          <p className="mut t-small" style={{ marginBottom: 12 }}>Three tiers feed the ODI World Cup. The highlighted step is where Nepal are in your save.</p>
          <Pathway ps={ps} />
        </div>
        {cur.slice().reverse().map(([k, S]) => {
          const gs = groupsOf(S, S.stage); const cut = { l2: 4, cl: 2, po: 4, wcq: 4 }[k]; const note = { l2: (i) => (i < 4 ? 'Qualifier' : 'Play-off'), cl: (i) => (i < 2 ? 'Play-off' : i >= 4 ? 'Drops out' : ''), po: (i) => (i < 4 ? 'Qualifier' : 'Challenge League'), wcq: (i) => (i < 4 ? 'World Cup' : '') }[k];
          const grp = gs.find((g) => g.key === 'super' && g.rows.some((r) => r.id === 'NEP')) || gs.find((g) => g.rows.some((r) => r.id === 'NEP')) || gs[0]; if (!grp) return null;
          return <Standings key={S.id} title={<CompLink S={S}>{sbase(S)}{grp.label ? ` · ${grp.label}` : ''}</CompLink>} rows={grp.rows} cut={cut} status={grp.rows.every((r) => !r.p) ? null : note} real={S.real}
            sub={S.real ? `Final table as published. Source: ${S.id === 'CL-2024' ? 'Wikipedia, 2024–26 CWC Challenge League' : 'Wikipedia, 2023–27 CWC League 2'}.` : S.done ? 'Final table · in-game.' : `${S.fx.filter((f) => f.res).length} of ${S.fx.length} matches played · in-game.`} />; })}
        <div>
          <h2 className="t-h3" style={{ marginBottom: 4 }}>The T20 route · {t2.name.replace("ICC Men's ", '')}</h2>
          <p className="mut t-small" style={{ marginBottom: 8 }}>{t2.hosts} · from {dayLabel(t2.start)} · 20 teams</p>
          <ul className="mlist">
            <li style={{ padding: '8px 0' }}><span className="grow">Twelve automatic places<br /><span className="l2">Hosts, the previous World Cup's best and the ranking</span></span><span className={`t-small ${t2.via === 'auto' ? 'blu' : 'faint'}`}>{t2.via === 'auto' ? 'Nepal' : '—'}</span></li>
            <li style={{ padding: '8px 0' }}><span className="grow">Asia regional final<br /><span className="l2">Two places in the Global Qualifier</span></span><span className={`t-small ${t2.via === 'rq' ? 'crim' : 'faint'}`}>{t2.rq ? <CompLink S={t2.rq}>{t2.rq.done ? 'Played' : 'Fixtures'}</CompLink> : t2.via === 'rq' ? 'Nepal' : '—'}</span></li>
            <li style={{ padding: '8px 0' }}><span className="grow">Global Qualifier<br /><span className="l2">16 teams; the best of each region and the next three go through</span></span><span className={`t-small ${t2.gq && t2.gq.teams.includes('NEP') ? 'crim' : 'faint'}`}>{t2.gq ? <CompLink S={t2.gq}>{t2.gq.teams.includes('NEP') ? 'Nepal' : 'Fixtures'}</CompLink> : t2.via === 'gq' ? 'Nepal go straight in' : '—'}</span></li>
          </ul>
          <p className="t-small" style={{ marginTop: 6 }}><b>Nepal:</b> {t2.status}{t2.T === 2028 ? ' (real: Nepal go straight to the 2028 Global Qualifier).' : '.'}</p>
        </div>
      </section>
      <aside className="stack" style={{ gap: 22, minWidth: 0 }}>
        <div><h2 className="sec">Nepal's next games</h2>
          {next.length ? <ul className="mlist">{next.map(([S, f]) => { const o = f.a === 'NEP' ? f.b : f.a; return <li key={f.id} style={{ padding: '8px 0' }}><span className="grow"><CompLink S={S}>v {nm(o)}</CompLink><br /><span className="l2">{sbase(S)}{/Kirtipur|Mulpani/.test(S.name || '') ? ` · ${(S.name || '').split(' · ').pop()}` : ''}</span></span><span className="t-small mut">{dayLabel(f.d).replace(/ \d{4}$/, '')}<br />{info(S).fmtL}</span></li>; })}</ul>
            : <p className="t-small faint">No fixtures scheduled yet.</p>}
        </div>
        <Clash />
        <div><h2 className="sec">Your players in the Nepal squad</h2>
          {mine.length ? <ul className="mlist">{mine.map((id) => { const p = G.P(id); const caps = G.intlCaps(p); return <li key={id}><span className="grow"><Link to={`/player/${id}?tab=nepal`} className="b6" style={{ color: 'inherit' }}>{p.name}</Link><br /><span className="l2">{caps != null ? `${caps} caps` : 'Caps not verified'}{p.intlG && (p.intlG.odi + p.intlG.t20i) ? ` · ${p.intlG.odi + p.intlG.t20i} in your save` : ''}</span></span><span className={`t-small ${caps ? 'blu' : 'gld'}`}>{caps ? 'In the squad' : 'Uncapped'}</span></li>; })}</ul>
            : <p className="t-small faint">None of your players are in the squad.</p>}
          <p className="faint t-micro" style={{ marginTop: 6 }}>The selectors pick from ratings and form. Each event adds experience; call-ups lift morale.</p>
        </div>
        <Record />
        <p className="t-small"><Link to="/nepal">Squad, calendar and central contracts ›</Link></p>
      </aside>
    </div>);
}

function Clash() {
  const { G, update, toast } = useGame(); const c = G.s.world.clash; if (!c || c.y !== G.year) return null;
  const names = c.pids.map((id) => G.P(id).name);
  const go = (k) => update(() => { const r = decideClash(G, k); autosave(G); if (r) toast(r.outcome); });
  return (
    <div className="panel stack" style={{ gap: 8 }}>
      <h2 className="sec" style={{ margin: 0 }}>{T(G, 'Clash with your calendar', 'तालिका टकराव')}</h2>
      <p className="t-small">The {c.comp} ({c.when}, in-game) overlaps your pre-season camp. {names.join(', ')} {names.length > 1 ? 'are' : 'is'} likely to be with Nepal.</p>
      {c.status === 'open' ? <>
        <ul className="wd-fx"><li><span className="blu">Move the camp:</span> Rs 3 L; everyone trains together.</li><li><span className="crim">Train without them:</span> free; they start the NPL 8 fitness down.</li></ul>
        <div className="row" style={{ gap: 8 }}><button type="button" className="btn btn-sm btn-blue" onClick={() => go('move')}>{T(G, 'Move the camp', 'क्याम्प सार्नुहोस्')}</button><button type="button" className="btn btn-sm" onClick={() => go('without')}>{T(G, 'Train without them', 'उनीहरूबिना प्रशिक्षण')}</button></div></>
        : <p className="t-small mut">You chose: {c.status === 'move' ? 'Move the camp' : 'Train without them'}{c.how !== 'you' ? ` (${c.how === 'assistant' ? 'assistant' : 'not answered in time'})` : ''}. {c.outcome}</p>}
    </div>);
}

// Nepal's finishes: the save's events, newest first, then the real ones before it.
function Record() {
  const { G } = useGame(); const list = [];
  for (const S of Object.values(G.s.wd ? G.s.wd.seasons : {})) { const k = info(S).kind; if (!S.done || !S.teams.includes('NEP') || ['bilat', 'tri'].includes(k)) continue; const p = placing(S).indexOf('NEP');
    list.push([S.endF ?? lastDay(S), S, info(S).cup ? cupStage(S, 'NEP') : p >= 0 ? ord(p + 1) : '—']); }
  list.sort((a, b) => b[0] - a[0]);
  for (const h of (G.s.world.wcHist || []).slice().reverse()) list.push([0, null, `${h.nepal} · older save`, h.name]);
  return <div><h2 className="sec">Nepal's record</h2><ul className="mlist">
    {list.slice(0, 8).map(([d, S, res, nm2]) => <li key={S ? S.id : nm2} style={{ padding: '8px 0' }}><span className="grow t-small">{S ? <CompLink S={S} /> : nm2}<br /><span className="l2">{S ? (S.real ? 'Real result' : `${monthOf(d)} · in-game`) : ''}</span></span><span className="t-small mut">{res}</span></li>)}
    <li style={{ padding: '8px 0' }}><span className="grow t-small">{T20WC_2026.name} · {T20WC_2026.hosts}<br /><span className="l2">Real result</span></span><span className="t-small mut">Group stage · beat Scotland</span></li>
    <li style={{ padding: '8px 0' }}><span className="grow t-small">{REAL.accpc26.name}<br /><span className="l2">Real result</span></span><span className="t-small mut">Champions · beat UAE</span></li>
    <li style={{ padding: '8px 0' }}><span className="grow t-small">{T20WC_2024.name} · {T20WC_2024.hosts}<br /><span className="l2">Real result</span></span><span className="t-small mut">Group stage</span></li>
  </ul></div>;
}

function CompsTab() {
  const { G } = useGame(); const t = today(G); const [from, to] = [t - 200, t + 540]; const { have, later } = tournaments(G, from, to);
  const status = (S) => (S.done ? 'Played' : S.fx.some((f) => f.res) ? 'Under way' : 'Next');
  const nep = (S) => { if (!S.teams.includes('NEP')) return S.done ? '—' : 'Not in it'; if (!S.done) return 'In it'; return info(S).cup ? cupStage(S, 'NEP') : `${ord(placing(S).indexOf('NEP') + 1)}`; };
  return (
    <div style={{ marginTop: 24 }}>
      <div className="tblwrap"><table className="tbl"><thead><tr><th>Competition</th><th>When</th><th>Teams</th><th>Nepal</th><th>Status</th></tr></thead>
        <tbody>
          {have.map((S) => <tr key={S.id} className={S.teams.includes('NEP') ? 'me' : ''}><td className="name"><CompLink S={S}>{sbase(S)}</CompLink>{info(S).realFixture && <span className="faint t-micro"> · real fixture</span>}</td><td>{span(S.start, S.endF ?? lastDay(S))}</td><td>{S.teams.length}</td><td>{nep(S)}</td><td className={S.done ? 'faint' : 'blu'}>{status(S)} · {S.done ? `${nm(S.champ)} won` : 'in-game'}</td></tr>)}
          {later.map((it) => <tr key={it.id} className="dim"><td className="name">{it.name.split(' · ')[0]}</td><td>{span(it.start, it.ends ? it.ends[it.ends.length - 1] : it.end)}</td><td>—</td><td>{it.teams && it.teams.includes('NEP') ? 'In it' : 'To be decided'}</td><td className="faint">Field drawn from earlier results</td></tr>)}
        </tbody></table></div>
      <p className="faint t-small" style={{ marginTop: 8 }}>Real fixtures and hosts follow the ICC's announcements (sources in the game's calendar data); formats the ICC has not announced, and every result after October 2026, are the game's. Bilateral series are in Results.</p>
    </div>);
}

function ResultsTab() {
  const { G } = useGame(); const [onlyNep, setOnly] = useState(false); const t = today(G);
  const rows = []; for (const S of Object.values(G.s.wd ? G.s.wd.seasons : {})) { if (S.real) continue; const done = S.fx.filter((f) => f.res); if (!done.length) continue; const last = Math.max(...done.map((f) => f.d)); if (t - last > 120) continue; if (onlyNep && !S.teams.includes('NEP')) continue;
    const k = info(S).kind; let line;
    if (k === 'bilat') { const [a, b] = S.teams; const tb = S.tables.series || {}; const wa = (tb[a] || {}).w || 0, wb = (tb[b] || {}).w || 0; line = S.done ? (wa === wb ? `Series drawn ${wa}–${wb}` : `${nm(wa > wb ? a : b)} win ${Math.max(wa, wb)}–${Math.min(wa, wb)}`) : `${nm(a)} ${wa} – ${wb} ${nm(b)} so far`; }
    else line = S.done ? `${nm(S.champ)} won${S.runner ? `, beating ${nm(S.runner)}` : ''}` : `${done.length} of ${S.fx.length} played`;
    rows.push({ S, last, line }); }
  rows.sort((a, b) => b.last - a.last);
  return (
    <div style={{ marginTop: 20 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}><p className="faint t-small">Around the world · the last four months · in-game</p>
        <div className="seg" role="group" aria-label="Filter"><button type="button" className={!onlyNep ? 'on' : ''} onClick={() => setOnly(false)}>All</button><button type="button" className={onlyNep ? 'on' : ''} onClick={() => setOnly(true)}>Nepal</button></div></div>
      {rows.length ? <ul className="inbox">{rows.slice(0, 40).map(({ S, last, line }) => <li key={S.id}><span className="when">{short(last)}</span><div><p className="ttl">{S.teams.includes('NEP') && <span className="crim b6">Nepal · </span>}<CompLink S={S}>{(S.name || sbase(S)).split(' · ').slice(0, 2).join(' · ')}</CompLink></p><p className="mut t-small">{line}</p></div></li>)}</ul>
        : <p className="t-small faint">No international results yet. The world's games are played alongside the NPL and through the off-season.</p>}
    </div>);
}

export default function International() {
  const { G, update } = useGame(); const narrow = useNarrow();
  useEffect(() => { worldTick(G); autosave(G); update(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useTab(['nepal', 'comps', 'results'], 'nepal');
  if (!G.s.wd) return <div className="wd"><p className="t-small faint">The cricket world is not set up in this save yet.</p></div>;
  const ps = pathState(G); const odi = teamRank(G, 'ODI'), t20 = teamRank(G, 'T20');
  const tierS = ['l2', 'cl'].map((k) => ps.step[k]).find((S) => S && S.teams.includes('NEP')); const tierPos = tierS ? (() => { const g = Object.keys(tierS.tables).find((k) => tierS.tables[k].NEP); const rows = g ? tableOf(tierS, g) : []; const i = rows.findIndex((r) => r.id === 'NEP'); return i >= 0 && rows.some((r) => r.p) ? ord(i + 1) : '—'; })() : '—';
  const tabs = [['nepal', tn(G, 'Nepal')], ['comps', T(G, 'Competitions', 'प्रतियोगिता')], ['results', T(G, 'Results', 'नतिजा')]];
  const hero = (
    <section className="board wd-hero" aria-label="Nepal">
      <div className="wd-hero-in">
        <div className="stack" style={{ gap: 6 }}>
          <span className="blbl wd-flagline"><span className="wd-flag" aria-hidden="true" />Nepal · men's team · {dayLabel(today(G))}</span>
          <span className="bf wd-hero-t">{ps.title}</span>
          <span className="blbl" style={{ fontSize: 14 }}>{ps.next}</span>
        </div>
        <div className="cells" style={{ gap: '10px 28px' }}>
          <div className="cell"><span className="blbl">{tierS && info(tierS).kind === 'cl' ? 'Challenge League' : 'League 2'}</span><span className="bf mid">{tierPos}</span></div>
          <div className="cell"><span className="blbl">ODI ranking</span><span className="bf mid">{odi ? odi.pos : '—'}</span></div>
          <div className="cell"><span className="blbl">T20I ranking</span><span className="bf mid">{t20 ? t20.pos : '—'}</span></div>
        </div>
      </div>
    </section>);
  const body = tab === 'nepal' ? <NepalTab /> : tab === 'comps' ? <CompsTab /> : <ResultsTab />;
  if (narrow) return (
    <MScreen top={{ title: <><Dot id={G.user} />{tn(G, 'International')}</>, sub: 'in-game', right: <>ODI {odi ? odi.pos : '—'}<br />T20I {t20 ? t20.pos : '—'}</> }} pinRaw={<div className="wd-mhero">{hero}</div>}
      tabs={tabs} tab={tab} onTab={setTab} label="International sections">
      {body}
    </MScreen>);
  return (
    <div className="wd" style={{ maxWidth: 1220 }}>
      {hero}
      <div className="tabs wd-tabs" role="tablist" aria-label="International sections">
        {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        <span style={{ flex: 1 }} /><Link className="btn btn-sm" to="/worldcup">{tn(G, 'World Cup')}</Link><Link className="btn btn-sm" to="/rankings">{tn(G, 'Rankings')}</Link>
      </div>
      {body}
    </div>);
}
