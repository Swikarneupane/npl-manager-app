import '../styles/matchday.css';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Meter } from '../components/bits.jsx';
import MScreen from '../components/MScreen.jsx';
import { tshort, userNextFixture, useNarrow } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { autosave } from '../lib/save.js';
import { afterMatchRoute } from '../lib/flow.js';
import * as MD from '../game/matchday.js';

// Which conference: one already open, a scheduled pre-match one, or the one after the last match.
function current(G) {
  const nf = userNextFixture(G); const lf = MD.lastUserFixture(G);
  const open = G.s.press && G.s.press.y === G.year ? G.s.press : null;
  if (open && !open.done) return { p: open, f: G.s.fixtures.find((x) => x.n === open.n) };
  if (lf && MD.pressAfter(G, lf)) return { p: MD.pressFor(G, lf, 'post'), f: lf };
  if (nf && MD.pressBefore(G, nf)) return { p: MD.pressFor(G, nf, 'pre'), f: nf };
  if (open) return { p: open, f: G.s.fixtures.find((x) => x.n === open.n) };
  return null;
}

export default function Press() {
  const { G, update } = useGame(); const nav = useNavigate(); const narrow = useNarrow();
  const c = current(G);
  if (!c) return <div className="wrap"><h1 className="t-h1">{tn(G, 'Press conference')}</h1><p className="mut" style={{ marginTop: 8 }}>No press conference is scheduled. They come every few matches and before each playoff.</p><Link to="/" className="btn" style={{ marginTop: 16 }}>Home</Link></div>;
  const { p, f } = c; const q = p.qs[p.i]; const base = MD.pressBase(G, p.opp);
  const answer = (i) => update(() => { MD.answerPress(G, i, false); autosave(G); });
  const assistant = () => update(() => { MD.autoPress(G); autosave(G); });
  const leave = () => nav(p.when === 'post' ? afterMatchRoute(G, f) : '/prematch');
  const last = p.log.length ? p.log[p.log.length - 1].room : null;
  const meters = MD.PRESS_FX.map(([k, l]) => { const d = p.fx[k]; return { k, l, v: base[k], d }; });
  const main = (
    <section className="stack" style={{ gap: 22 }}>
      <div className="stack" style={{ gap: 4 }}><p className="faint t-small">{p.when === 'post' ? 'Post-match' : 'Pre-match'} press conference · Kirtipur media room{q ? ` · question ${p.i + 1} of ${p.qs.length}` : ''}</p>
        <div style={{ maxWidth: 240 }}><Meter pct={(p.i / p.qs.length) * 100} /></div></div>
      {q ? <>
        <div className="stack" style={{ gap: 6 }}><p className="faint t-small">{q.who}</p><p className="md-big-q">“{q.text}”</p></div>
        <div className="stack" style={{ gap: 10 }}>{q.answers.map((a, i) => <button key={a.tone} type="button" className="choice" onClick={() => answer(i)}><span style={{ fontWeight: 600 }}>{a.tone}</span><span style={{ color: 'var(--ink-2)' }}>“{a.said}”</span><span className="fx">{a.sum}</span></button>)}
          <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={assistant}>Send the assistant instead</button></div>
        {last && <p className="t-small mut ev-new" style={{ fontStyle: 'italic' }}>{last}</p>}
      </> : <div className="stack" style={{ gap: 10 }}>
        <h1 className="t-h2">That's all, thank you.</h1><p className="mut">The headlines are written. {p.when === 'post' ? 'The effects are in.' : 'Effects apply before the toss.'}</p>
        <ul className="mlist">{p.log.map((l, i) => <li key={i}><span className="grow">{l.q}<br /><span className="l2">You: {l.tone} · {l.room}</span></span></li>)}</ul>
        <div className="row" style={{ gap: 8 }}><button type="button" className="btn btn-primary" onClick={leave}>{p.when === 'post' ? T(G, 'Continue', 'अगाडि') : 'Back to the build-up'}</button></div>
      </div>}
    </section>);
  const side = (
    <aside className="stack" style={{ gap: 20 }}>
      <div className="panel stack" style={{ gap: 12 }}><h2 className="sec" style={{ margin: 0 }}>What your answers have moved</h2>
        {meters.map((m) => <div key={m.k} className="stack" style={{ gap: 4 }}><div style={{ display: 'flex', justifyContent: 'space-between' }} className="t-small"><span className="mut">{m.l}</span><span className={m.d > 0 ? 'up t-small' : m.d < 0 ? 'down t-small' : 'faint t-small'}>{m.d === 0 ? 'no change' : m.d > 0 ? `+${m.d}` : m.d} · {m.v}</span></div><Meter pct={m.v} blue /></div>)}</div>
      <div className="stack" style={{ gap: 6 }}><h2 className="sec" style={{ margin: 0 }}>Across town</h2>
        <p className="pull" style={{ fontSize: 15, lineHeight: '23px' }}>“We know how to play them. Nothing they say changes that.”<cite>{MD.rivalManager(G, p.opp)}, {G.teams[p.opp].name} manager (generated), this morning</cite></p></div>
    </aside>);
  if (narrow) return <MScreen top={{ title: tn(G, 'Press conference'), sub: '', right: <>v {tshort(G, p.opp)}</> }}><div style={{ paddingTop: 14 }} className="stack">{main}<div style={{ marginTop: 20 }}>{side}</div></div></MScreen>;
  return <div style={{ maxWidth: 1180 }}><div className="md-split press">{main}{side}</div></div>;
}
