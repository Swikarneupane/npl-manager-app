import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/occasions.css';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { Dot, PageHead } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { T, tn } from '../lib/i18n.js';
import { nn, seasonNo, tname, tshort, useNarrow } from '../lib/util.js';
import { matchPath } from '../lib/flow.js';
import { lastMeeting } from '../game/depth.js';
import * as O from '../game/occasions.js';

// Three cards for a decision: the label and what it does. Shared with playoff week.
export function ChoiceGrid({ task, onPick }) {
  return (
    <div className="occ-choices" role="group" aria-label={task.title}>
      {task.opts.map((o) => (
        <button key={o.k} type="button" className="choice" onClick={() => onPick(o.k)}>
          <span className="l">{o.l}</span><span className="fx">{o.fx}</span>
        </button>))}
    </div>
  );
}
// One task row: day, title, the line under it, then either the outcome or the choices.
export function TaskRow({ G, task, day, onPick }) {
  const c = O.fwChoice(G, task.id);
  return (
    <li className="occ-task">
      <div className="hd">
        {day != null && <span className={`board-f day${c ? ' faint' : ''}`}>{day}</span>}
        <span className="grow"><b style={{ fontWeight: 600 }}>{T(G, task.title, task.ne)}</b><br /><span className="l2">{task.sub}</span></span>
        {c && <span className="blu t-small" style={{ textAlign: 'right', maxWidth: 260 }}>Done · {c.pick}{c.auto ? ' (assistant)' : ''}</span>}
      </div>
      {c ? <p className="t-micro faint" style={{ margin: '4px 0 0', paddingLeft: day != null ? 72 : 0 }}>{c.outcome}</p> : <div style={{ paddingLeft: day != null ? 72 : 0 }}><ChoiceGrid task={task} onPick={onPick} /></div>}
    </li>
  );
}

function useFinal() {
  const { G, update, toast } = useGame(); const nav = useNavigate();
  const ctx = O.poStatus(G); const fin = ctx.P && ctx.P.F; const opp = fin ? (fin.home === G.user ? fin.away : fin.home) : null;
  const pick = (id, k) => update(() => { const out = O.chooseFw(G, id, k); autosave(G); if (out) toast(out); });
  const go = () => { update(() => { const n = O.autoFw(G); if (n) toast(`The assistant chose the other ${n}.`); autosave(G); }); nav(matchPath(G, fin, false)); };
  const assist = () => update(() => { O.autoFw(G); autosave(G); });
  return { G, ctx, fin, opp, pick, go, assist };
}

function NotInFinal() {
  const { G } = useGame(); const { st } = O.poStatus(G);
  const msg = st === 'champion' || st === 'runner' ? 'The final has been played.' : st === 'wait' ? 'You are in the final. Your opponent is decided in Qualifier 2.' : ['Q1', 'EL', 'Q2'].includes(st) ? 'Win your playoff match to reach the final.' : 'Your side is not in the final this season.';
  return (
    <div className="wrap stack" style={{ gap: 16, maxWidth: 720 }}>
      <PageHead title={tn(G, 'Final week')} sub={msg} />
      <div className="row" style={{ gap: 8 }}>
        <Link to="/playoffs" className="btn">{tn(G, 'Playoffs')}</Link>
        {st === 'champion' && <Link to="/trophy" className="btn btn-primary">Trophy ceremony</Link>}
        {G.s.phase === 'seasonEnd' && <Link to="/review" className="btn">{tn(G, 'Season review')}</Link>}
      </div>
    </div>
  );
}

function Hero({ G, fin, opp, compact }) {
  const lm = lastMeeting(G, G.user, opp); const days = O.countdown(G); const rematch = lm && / final$/.test(lm);
  return (
    <section className="board occasion occ-hero" style={{ padding: compact ? '14px 16px' : '28px 32px', borderRadius: compact ? 0 : 12 }} aria-label="The final">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: compact ? 10 : 20 }}>
        <div className="stack" style={{ gap: 8, minWidth: 0 }}>
          <span className="blbl" style={{ color: 'var(--gold)', fontSize: 14 }}>{T(G, 'The Final', 'फाइनल')} · Season {seasonNo(G.year)}{rematch ? ` · a rematch (${lm})` : ''}</span>
          <span className="bf title"><span style={{ display: 'flex', alignItems: 'center' }}><Dot id={G.user} big />{compact ? tshort(G, G.user) : tname(G, G.user)}</span><span className="v">v</span><span style={{ display: 'flex', alignItems: 'center' }}><Dot id={opp} big />{compact ? tshort(G, opp) : tname(G, opp)}</span></span>
          <span className="blbl" style={{ fontSize: 14 }}>{fin.date} · 7:15 pm · TU International Cricket Ground, Kirtipur{!compact && lm && !rematch ? ` · ${lm}` : ''}</span>
        </div>
        <div className="stack" style={{ textAlign: 'right', gap: 2 }}>
          <span className="blbl">{T(G, 'Toss in', 'टस')}</span>
          <span className="bf" style={{ fontSize: compact ? 30 : 44, lineHeight: 1 }}>{days ? `${nn(G, days)}d` : 'Today'}</span>
        </div>
      </div>
    </section>
  );
}

function Tasks({ G, pick }) {
  const tasks = O.fwTasks(G); const names = O.dayNames(G);
  return <ul className="mlist">{tasks.map((t) => <TaskRow key={t.id} G={G} task={t} day={names[t.day]} onPick={(k) => pick(t.id, k)} />)}</ul>;
}
function Road({ G, opp }) {
  return (
    <div className="cols" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px,100%),1fr))', gap: 24 }}>
      {[G.user, opp].map((tid) => { const r = O.roadTo(G, tid); return (
        <div key={tid}>
          <p style={{ display: 'flex', alignItems: 'center', fontWeight: 600, margin: '0 0 6px' }}><Dot id={tid} />{tshort(G, tid)} · {r.pos}{['th', 'st', 'nd', 'rd'][r.pos] || 'th'} in league</p>
          <ul className="mlist">{r.rows.map((x, i) => <li key={i} style={{ padding: '7px 0', minHeight: 0 }}><span className="grow">{x.l}</span><span className={`t-small ${x.cls}`}>{x.r}</span></li>)}</ul>
        </div>); })}
    </div>
  );
}
function Pundits({ G }) {
  const P = O.pundits(G);
  return (
    <div>
      <h2 className="sec">Pundits' picks</h2>
      <table className="tbl compact plain occ-pundits"><tbody>{P.map((p) => (
        <tr key={p.role}><td style={{ paddingLeft: 0 }}>{p.role}{p.name && <><br /><span className="t-micro faint">{p.name}</span></>}</td><td>{p.pick ? <><Dot id={p.pick} />{tshort(G, p.pick)}</> : <span className="mut">Toss-up</span>}</td><td className="mut t-small">{p.why}</td></tr>))}</tbody></table>
      <p className="faint t-micro" style={{ marginTop: 6 }}>Pundits are generated characters. The model's odds come from both XIs.</p>
    </div>
  );
}
function Fans({ G }) {
  return (
    <div>
      <h2 className="sec">From the stands</h2>
      <ul className="mlist">{O.fanPosts(G).map((f, i) => <li key={i} style={{ padding: '8px 0' }}><span className={`grow t-small${f.ne ? ' ne' : ''}`}>{f.t}<br /><span className="l2" style={f.ne ? { fontFamily: 'var(--f-ui)' } : undefined}>{f.by}</span></span></li>)}</ul>
      <p className="faint t-micro" style={{ marginTop: 6 }}>Fan messages are generated.</p>
    </div>
  );
}
function Stakes({ G }) {
  const s = O.stakes(G);
  return (
    <div className="panel stack occasion" style={{ gap: 6 }}>
      <h2 className="sec" style={{ margin: 0 }}>What's at stake</h2>
      <p className="t-small"><b className="gld">Win:</b> Rs 1 cr prize money · board confidence +{s.board.win} · reputation +{s.rep.win} · your name and the XI on the honours board</p>
      <p className="t-small"><b>Lose:</b> Rs {s.prize.runner} L as runners-up · board {s.board.lose >= 0 ? '+' : ''}{s.board.lose} · reputation +{s.rep.lose}</p>
      {G.s.history.length && G.s.history[G.s.history.length - 1].champion === G.user && <p className="t-small gld">Back-to-back titles are on.</p>}
    </div>
  );
}

function FinalDesktop() {
  const { G, fin, opp, pick, go, assist } = useFinal(); const left = O.fwLeft(G);
  return (
    <div style={{ maxWidth: 1220 }}>
      <Hero G={G} fin={fin} opp={opp} />
      <div className="split" style={{ marginTop: 30, gap: 40, gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)' }}>
        <section className="stack" style={{ gap: 30 }}>
          <div>
            <div className="sechead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h2 className="t-h3">{tn(G, 'Final week')}</h2>
              <span className="row" style={{ gap: 8 }}>{left > 0 && <button type="button" className="btn btn-sm btn-ghost" onClick={assist}>Let the assistant decide {left}</button>}<button type="button" className="btn btn-primary" onClick={go}>{T(G, 'Go to the final', 'फाइनलमा जानुहोस्')}</button></span>
            </div>
            <Tasks G={G} pick={pick} />
          </div>
          <div><h2 className="t-h3" style={{ marginBottom: 8 }}>Road to the final</h2><Road G={G} opp={opp} /></div>
        </section>
        <aside className="stack" style={{ gap: 26 }}><Pundits G={G} /><Fans G={G} /><Stakes G={G} /></aside>
      </div>
    </div>
  );
}
function FinalMobile() {
  const { G, fin, opp, pick, go } = useFinal(); const [tab, setTab] = useTab(['tasks', 'road', 'buzz'], 'tasks'); const left = O.fwLeft(G);
  return (
    <MScreen top={{ title: tn(G, 'Final week'), sub: `v ${tshort(G, opp)} · ${fin.date}` }} pinRaw={<Hero G={G} fin={fin} opp={opp} compact />}
      label="Final week" tab={tab} onTab={setTab} tabs={[['tasks', T(G, 'Tasks', 'काम'), left || null], ['road', T(G, 'Road', 'यात्रा')], ['buzz', T(G, 'Buzz', 'चर्चा')]]}
      actions={<button type="button" className="btn btn-primary btn-lg" style={{ flex: '1 1 auto' }} onClick={go}>{T(G, 'Go to the final', 'फाइनलमा जानुहोस्')}{left > 0 && <span className="sub">{left} left: the assistant picks</span>}</button>}>
      {tab === 'tasks' && <><Tasks G={G} pick={pick} /><div style={{ marginTop: 16 }}><Stakes G={G} /></div></>}
      {tab === 'road' && <div style={{ paddingTop: 12 }}><Road G={G} opp={opp} /></div>}
      {tab === 'buzz' && <div className="stack" style={{ gap: 20, paddingTop: 12 }}><Pundits G={G} /><Fans G={G} /></div>}
    </MScreen>
  );
}

export default function FinalWeek() {
  const { G } = useGame(); const narrow = useNarrow(); const { st } = O.poStatus(G);
  useEffect(() => { if (st === 'final') O.markSeen(G, 'final'); }, [G, st]);
  if (st !== 'final') return <NotInFinal />;
  return narrow ? <FinalMobile /> : <FinalDesktop />;
}
