import { Link } from 'react-router-dom';
import '../styles/club.css';
import { useGame } from '../lib/store.jsx';
import { PageHead, Meter } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { useNarrow, nn } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { autosave } from '../lib/save.js';
import { PROG_SLOTS, slotPrompt, progs, optionsFor, setProgramme, PROGRAMMES } from '../game/training.js';
import { SESSIONS, SESSION_NAMES, SESSION_NP, planDays, projectWeek, setSession, coachesPlan, confirmWeek, workloadRows, toggleSpare } from '../game/club.js';

const opp = (G, f) => (f.home === G.user ? f.away : f.home);
function matchNote(G, f) {
  const o = G.teams[opp(G, f)]; const form = o.form || []; const l = form.slice().reverse(); let k = 0; const c = l[0];
  for (const x of l) { if (x === c) k++; else break; }
  const run = c === 'W' && k >= 2 ? `they have won ${k} in a row` : c === 'L' && k >= 2 ? `they have lost ${k} in a row` : null;
  const st = G.standings ? G.standings() : []; const pos = st.findIndex((x) => x.id === o.id);
  return `${f.night ? '7:15 pm' : '3:00 pm'}${run ? ` · ${run}` : pos === 0 && st[0].p > 0 ? ' · top of the table' : ''}`;
}
const sesLabel = (G, s) => T(G, s, SESSION_NP[s]);

function DayCard({ d, G, onSet }) {
  if (d.match) return (
    <div className={`day match${d.today ? ' today' : ''}`}>
      <div className="cl-dh"><span style={{ fontWeight: 600 }}>{d.name}</span><span className="faint t-micro">{d.date}</span></div>
      <span className="slot mt">v {G.teams[opp(G, d.match)].name}</span>
      <span className="faint t-micro">{matchNote(G, d.match)}</span>
    </div>);
  const load = SESSIONS[d.sessions[0]].load + SESSIONS[d.sessions[1]].load;
  return (
    <div className={`day${d.today ? ' today' : ''}`}>
      <div className="cl-dh"><span style={{ fontWeight: 600 }}>{d.name}{d.today ? <span className="faint t-micro"> · {T(G, 'today', 'आज')}</span> : null}</span><span className="faint t-micro">{d.date}</span></div>
      {[0, 1].map((i) => (
        <div key={i} className="stack" style={{ gap: 2 }}>
          <label className="faint t-micro" htmlFor={`s${d.key}${i}`}>{i ? T(G, 'Afternoon', 'दिउँसो') : T(G, 'Morning', 'बिहान')}</label>
          <select id={`s${d.key}${i}`} className={`input cl-sel${d.sessions[i] === 'Rest' ? ' rest' : ''}`} value={d.sessions[i]} onChange={(e) => onSet(d.t, i, e.target.value)}>
            {SESSION_NAMES.map((s) => <option key={s} value={s}>{sesLabel(G, s)} · {SESSIONS[s].load}</option>)}
          </select>
        </div>))}
      <span className={`t-micro ${load >= 7 ? 'crim' : 'faint'}`}>Load {nn(G, load)}{d.custom ? '' : ' · coaches'}</span>
    </div>);
}

function Effect({ G, pr }) {
  return (
    <section className="stack" style={{ gap: 12 }}>
      <h2 className="t-h3">{T(G, 'Effect of this plan', 'योजनाको असर')}</h2>
      <div className="stack" style={{ gap: 4 }}><div className="cl-kv t-small"><span className="mut">Freshness {pr.next ? `on ${pr.next.date}` : ''}</span><span className={pr.fresh < 70 ? 'crim' : 'blu'}>{nn(G, pr.fresh)}%</span></div><Meter pct={pr.fresh} blue /></div>
      <div className="stack" style={{ gap: 4 }}><div className="cl-kv t-small"><span className="mut">Sharpness</span><span>{nn(G, pr.sharp)}%</span></div><Meter pct={pr.sharp} /></div>
      <div className="stack" style={{ gap: 4 }}><div className="cl-kv t-small"><span className="mut">Development this week</span><span>{pr.devLabel}</span></div><Meter pct={pr.dev} /></div>
      <p className="faint t-small">{pr.advice}</p>
      <p className="faint t-micro">Plan intensity: {pr.intensity}. Freshness is the likely XI's average fitness at the toss. Sharpness nudges form; development builds toward rating gains, up to each player's potential.</p>
    </section>);
}
function Programmes({ G, update, toast }) {
  const sp = slotPrompt(G); const C = progs(G); const assist = G.s.settings.assistant;
  const sq = G.teams[G.user].squad.map((id) => G.P(id)).filter(Boolean);
  const rows = sq.filter((p) => C[p.id] || sp.need.includes(p));
  const add = sq.filter((p) => !C[p.id]);
  const set = (id, v) => update(() => { const err = setProgramme(G, id, v || null); if (err) toast(err); else autosave(G); });
  return (
    <section className="stack" style={{ gap: 8 }}>
      <h2 className="t-h3">{T(G, 'Training programmes', 'प्रशिक्षण कार्यक्रम')} · {nn(G, sp.used)}/{nn(G, PROG_SLOTS)}</h2>
      <p className="faint t-small">{T(G, 'Slots used', 'प्रयोग भएका स्लट')} {nn(G, sp.used)}/{nn(G, PROG_SLOTS)}. {assist ? 'The assistant assigns these every week.' : 'Each slot gives one player extra work on top of the team sessions.'}</p>
      {sp.unused && !assist && <p className="t-small crim">{sp.free} {sp.free === 1 ? 'slot is' : 'slots are'} free and {sp.need.map((p) => p.name.split(' ').slice(-1)[0]).slice(0, 4).join(', ')} {sp.need.length === 1 ? 'is' : 'are'} out of form. Try Form recovery.</p>}
      <ul className="mlist">{rows.map((p) => (
        <li key={p.id}><span className="grow"><Link to={`/player/${p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link>{(p.form ?? 0) <= -2 ? <span className="faint t-micro"> · out of form</span> : null}{p.inj ? <span className="faint t-micro"> · injured</span> : null}</span>
          <select className="input cl-sel" aria-label={`Programme for ${p.name}`} disabled={assist} value={C[p.id] || ''} onChange={(e) => set(p.id, e.target.value)}>
            <option value="">None</option>{optionsFor(p).map((n) => <option key={n} value={n}>{n}</option>)}</select></li>))}</ul>
      {!assist && sp.free > 0 && <select className="input cl-sel" aria-label="Add a player to a programme" value="" onChange={(e) => { if (e.target.value) set(e.target.value, optionsFor(G.P(e.target.value))[0]); }}>
        <option value="">{T(G, 'Add a player…', 'खेलाडी थप्नुहोस्…')}</option>{add.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
      <p className="faint t-micro">Pick the exact programme in each row or on the player's page. Effects are modest and bounded.</p>
    </section>);
}
function Workload({ G, rows, onSpare, compact }) {
  if (!rows.length) return <p className="faint t-small">No bowlers in the squad.</p>;
  return (
    <div className="tblwrap"><table className="tbl compact plain cl-wl">
      <thead><tr><th style={{ paddingLeft: 0 }}>Bowler</th><th className="r">Overs</th><th className="r">{compact ? 'Rest' : 'Days rest'}</th><th>Injury risk</th><th className="r">Spare</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.p.id}><td style={{ paddingLeft: 0 }}><Link to={`/player/${r.p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{compact ? r.p.name.split(' ').slice(-1)[0] : r.p.name}</Link></td>
          <td className="r num">{nn(G, r.overs)}</td><td className="r num">{nn(G, r.rest)}</td>
          <td className={r.label === 'High' ? 'crim' : r.label === 'Medium' ? '' : 'faint'}>{r.label} · {nn(G, r.risk)}%{r.label === 'High' && !r.spare ? ' · spare him' : !compact && r.p.age >= 34 ? ` · age ${r.p.age}` : ''}</td>
          <td className="r"><input type="checkbox" checked={r.spare} onChange={() => onSpare(r.p.id)} aria-label={`Spare ${r.p.name} from heavy sessions`} style={{ width: 20, height: 20 }} /></td></tr>))}</tbody>
    </table></div>);
}
function Tasks({ G }) {
  const tasks = G.tasks().slice(0, 3);
  if (!tasks.length) return <p className="faint t-small">Nothing else today.</p>;
  return <ul className="mlist">{tasks.map((t) => <li key={t.key}><span className="grow">{t.text}{t.sub ? <><br /><span className="l2">{t.sub}</span></> : null}</span><Link to={t.to} className="btn btn-sm">Open</Link></li>)}</ul>;
}
function LastWeek({ G }) {
  const L = G.s.club.last; if (!L || L.y !== G.year) return null;
  const k = L.knocks.map((id) => G.P(id).name), g = L.grew.map((id) => G.P(id).name);
  return <p className="faint t-small">Before match {L.n}: {L.by === 'you' ? 'your plan' : "the coaches' plan"} ({L.intensity.toLowerCase()}){k.length ? `, knocks: ${k.join(', ')}` : ', no knocks'}{g.length ? `, improved: ${g.join(', ')}` : ''}.</p>;
}

export default function Week() {
  const { G, update, toast } = useGame(); const narrow = useNarrow(); const [tab, setTab] = useTab(['plan', 'load', 'today'], 'plan');
  const C = G.s.club; const days = C ? planDays(G) : [];
  const title = tn(G, 'Training week');
  if (!C || !days.length || !G.userNext()) {
    const msg = 'No match ahead. Training resumes in the pre-season, before the first fixture.';
    return narrow ? <MScreen top={{ title, sub: '' }}><p className="mut" style={{ paddingTop: 16 }}>{msg}</p></MScreen> : <div style={{ maxWidth: 1220 }}><PageHead title={title} sub={msg} /></div>;
  }
  const pr = projectWeek(G); const rows = workloadRows(G); const assist = G.s.settings.assistant;
  const nMatch = days.filter((d) => d.match).length; const done = C.plan.ok === pr.next.n;
  const set = (t, i, v) => update(() => { setSession(G, t, i, v); autosave(G); });
  const coaches = () => update(() => { coachesPlan(G); autosave(G); toast("The coaches have planned the week."); });
  const confirm = () => update(() => { const p = confirmWeek(G); autosave(G); toast(`Week confirmed: freshness ${p.fresh}%, sharpness ${p.sharp}%.`); });
  const spare = (id) => update(() => { toggleSpare(G, id); autosave(G); });
  const sub = `${days[0].name} ${days[0].date} to ${days[6].name} ${days[6].date} · ${nMatch === 1 ? 'one match' : nMatch === 2 ? 'two matches' : `${nMatch} matches`} · plan each session or let the coaches do it`;
  const btns = <>
    <button type="button" className="btn" onClick={coaches}>{T(G, "Coaches' plan", 'कोचको योजना')}</button>
    <button type="button" className="btn btn-primary" disabled={done} onClick={confirm}>{done ? T(G, 'Week confirmed', 'हप्ता पक्का') : T(G, 'Confirm the week', 'हप्ता पक्का गर्नुहोस्')}</button></>;
  const note = assist ? <p className="t-small mut cl-note">The assistant is on: the coaches plan every week automatically. <Link to="/settings">Settings</Link></p> : null;
  if (narrow) return (
    <MScreen top={{ title, sub: pr.next ? `v ${G.teams[opp(G, pr.next)].name.split(' ')[0]} · ${pr.next.date}` : '' }} label="Training week" tab={tab} onTab={setTab}
      pin={<p className="t-small num cl-kv"><span>Fresh <b className={pr.fresh < 70 ? 'crim' : 'blu'}>{nn(G, pr.fresh)}%</b></span><span>Sharp <b>{nn(G, pr.sharp)}%</b></span><span>Growth <b>{pr.devLabel}</b></span></p>}
      tabs={[['plan', T(G, 'Plan', 'योजना')], ['load', T(G, 'Workload', 'कार्यभार'), rows.filter((r) => r.label === 'High').length || null], ['today', tn(G, 'Today'), G.tasks().length || null, true]]}
      actions={tab === 'plan' ? <div className="row" style={{ gap: 8, width: '100%' }}>{btns}</div> : null}>
      {tab === 'plan' && <div style={{ paddingTop: 12 }} className="stack">{note}<div className="cal">{days.map((d) => <DayCard key={d.key} d={d} G={G} onSet={set} />)}</div><Effect G={G} pr={pr} /><Programmes G={G} update={update} toast={toast} /><LastWeek G={G} /></div>}
      {tab === 'load' && <div style={{ paddingTop: 12 }}><p className="mhead">Bowling workload · last 7 days</p><Workload G={G} rows={rows} onSpare={spare} compact /><p className="faint t-micro" style={{ marginTop: 8 }}>A spared bowler does recovery instead of nets, fielding and match simulation.</p></div>}
      {tab === 'today' && <div style={{ paddingTop: 12 }}><p className="mhead">{T(G, "Today's tasks", 'आजका काम')}</p><Tasks G={G} /></div>}
    </MScreen>);
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title={title} sub={sub}><div className="row" style={{ gap: 8 }}>{btns}</div></PageHead>
      {note}
      <div className="cal" aria-label="Week calendar">{days.map((d) => <DayCard key={d.key} d={d} G={G} onSet={set} />)}</div>
      <div style={{ marginTop: 10 }}><LastWeek G={G} /></div>
      <div style={{ marginTop: 24 }}><Programmes G={G} update={update} toast={toast} /></div>
      <div className="cols" style={{ marginTop: 28, gap: 32 }}>
        <Effect G={G} pr={pr} />
        <section><h2 className="t-h3" style={{ marginBottom: 6 }}>Bowling workload · last 7 days</h2><Workload G={G} rows={rows} onSpare={spare} compact /><p className="faint t-micro" style={{ marginTop: 8 }}>A spared bowler does recovery instead of nets, fielding and match simulation.</p></section>
        <section><h2 className="t-h3" style={{ marginBottom: 6 }}>{T(G, "Today's tasks", 'आजका काम')} · {nn(G, G.tasks().slice(0, 3).length)}</h2><Tasks G={G} /></section>
      </div>
    </div>);
}
