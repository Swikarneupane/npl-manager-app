import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import '../styles/occasions.css';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { Dot, PageHead } from '../components/bits.jsx';
import { T, tn } from '../lib/i18n.js';
import { seasonNo, tname, tshort } from '../lib/util.js';
import * as O from '../game/occasions.js';

const EV = { 4: 'four', 6: 'six', W: 'out', 1: 'a single', 2: 'two', 3: 'three', dot: 'a dot ball', wd: 'a wide', nb: 'a no-ball' };
const ovs = (b) => `${Math.floor(b / 6)}${b % 6 ? '.' + (b % 6) : ''}`;

// Full screen on the scoreboard: the winning runs, the presentation, who lifts it, Champions; then
// the victory lap. Each stage rises in (.rise; the CSS turns it off for reduced motion).
export default function Trophy() {
  const { G, update, toast } = useGame(); const c = O.ceremony(G); const [q] = useSearchParams();
  // ?stage=1 or 2 opens on the presentation or the lift (once lifted, it opens on Champions)
  const [stage, setStage] = useState(() => (c && c.lift ? 3 : Math.min(2, Math.max(0, +q.get('stage') || 0)))); const [sel, setSel] = useState(() => (c && c.lift ? c.lift.k : null));
  useEffect(() => { if (c && c.won) { O.markSeen(G, 'trophy'); autosave(G); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c || !c.won) {
    const f = c && c.f;
    return (
      <div className="wrap stack" style={{ gap: 16, maxWidth: 720 }}>
        <PageHead title="Trophy ceremony" sub={f ? `${tname(G, c.champ)} won the final: ${f.res.text}.` : 'The final has not been played yet.'} />
        <div className="row" style={{ gap: 8 }}>{f ? <Link to="/review" className="btn btn-primary">{tn(G, 'Season review')}</Link> : <Link to="/playoffs" className="btn">{tn(G, 'Playoffs')}</Link>}</div>
      </div>
    );
  }
  const u = G.user; const f = c.f; const y = c.h ? c.h.year : G.year; const lifted = c.lift || null;
  const lift = (k, note) => update(() => { const out = O.chooseLift(G, k, note); autosave(G); if (out && !note) toast(out); });
  const skip = () => { if (!O.occ(G).lift) lift(sel || 'cap', 'ceremony skipped'); setStage(3); };
  const next = () => { if (stage === 2) { if (!O.occ(G).lift) lift(sel); setStage(3); } else setStage(stage + 1); };
  const labels = [T(G, 'The presentation', 'पुरस्कार वितरण'), T(G, 'Who lifts it', 'कसले उचाल्ने'), T(G, 'Lift the trophy', 'ट्रफी उचाल्नुहोस्')];
  const sc = f.res.sc || []; const chased = !!(sc[1] && sc[1].t === u); const wb = c.winBall; const lifter = (O.occ(G).lift || {}).name || (c.lifters.find((l) => l.k === sel) || c.lifters[0]).name;
  const xi = ((G.teams[u].lastXI && G.teams[u].lastXI.xi) || []).map((id) => G.P(id)).filter(Boolean);
  return (
    <div className="occ-full" role="dialog" aria-modal="true" aria-label="Trophy ceremony">
      <header>
        <span className="t-small dim">{T(G, 'The Final', 'फाइनल')} · Season {seasonNo(y)} · Kirtipur</span>
        <span className="board-f t-small dim wide" style={{ fontSize: 15 }}>{sc.map((x, i) => <span key={i} style={x.t === u ? { color: 'var(--board-ink)' } : undefined}>{i ? ' · ' : ''}{tshort(G, x.t)} {x.r}/{x.w} ({ovs(x.b)})</span>)}</span>
        {stage < 3 ? <button type="button" className="btn btn-ghost btn-sm" onClick={skip}>{T(G, 'Skip ceremony', 'छोड्नुहोस्')}</button> : <Link to="/" className="btn btn-ghost btn-sm">{tn(G, 'Home')}</Link>}
      </header>
      <main>
        <div className="inner stack">
          {stage === 0 && (
            <div className="stack rise" style={{ gap: 18, alignItems: 'center' }} key="s0">
              {wb ? <>
                <p className="board-f gold" style={{ fontSize: 22, margin: 0 }}>{wb.o}</p>
                {chased
                  ? <p className="occ-ball" style={{ margin: 0 }}>{wb.bw} to {wb.bt}, <b className="gold">{EV[wb.ev] || wb.ev}</b>. {tname(G, u)} are champions{c.back2back ? ' again' : ''}.</p>
                  : <p className="occ-ball" style={{ margin: 0 }}>The last ball: {wb.bw} to {wb.bt}, <b className="gold">{EV[wb.ev] || wb.ev}</b>. They defend {sc[0] ? sc[0].r : ''}: {tname(G, u)} are champions{c.back2back ? ' again' : ''}.</p>}
                <p className="dim" style={{ fontStyle: 'italic', maxWidth: 620, margin: 0 }}>“{wb.t}”</p>
              </> : <p className="occ-ball" style={{ margin: 0 }}>{f.res.text}. {tname(G, u)} are champions{c.back2back ? ' again' : ''}.</p>}
              <p className="dim t-small" style={{ margin: 0 }}>{f.res.text}. The dugout empties and Kirtipur is on its feet.</p>
            </div>)}
          {stage === 1 && (
            <div className="stack rise" style={{ gap: 6 }} key="s1">
              <p className="t-small dim" style={{ margin: 0 }}>{labels[0]}</p>
              <ul className="occ-awards">
                {c.pof && <li><span><span className="t-small dim">Player of the final</span><br /><span className="nm">{c.pof.name}</span></span><span className="board-f v gold">{c.pof.fig}</span></li>}
                {c.plat && <li><span><span className="t-small dim">Platinum Cap · most runs</span><br /><span className="nm">{c.plat.name}</span></span><span className="board-f v">{c.plat.v} runs</span></li>}
                {c.gold && <li><span><span className="t-small dim">Golden Cap · most wickets</span><br /><span className="nm">{c.gold.name}</span></span><span className="board-f v">{c.gold.v} wickets</span></li>}
                {c.emerging && <li><span><span className="t-small dim">Emerging player of the season</span><br /><span className="nm">{c.emerging.name}</span></span><span className="board-f v">age {c.emerging.age}</span></li>}
              </ul>
              <p className="t-micro dim" style={{ marginTop: 8 }}>In-game Season {seasonNo(y)} figures.</p>
            </div>)}
          {stage === 2 && (
            <div className="stack rise" style={{ gap: 18 }} key="s2">
              <p style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>{T(G, 'Who lifts the trophy?', 'ट्रफी कसले उचाल्ने?')}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px,100%),1fr))', gap: 12, textAlign: 'left' }}>
                {c.lifters.map((l) => (
                  <button key={l.k} type="button" className={`choice${sel === l.k ? ' on' : ''}`} aria-pressed={sel === l.k} disabled={!!lifted} onClick={() => setSel(l.k)}>
                    <span style={{ fontWeight: 600, fontSize: 17 }}>{l.name}</span><span className="why">{l.why}</span><span className="fx">{l.fx}</span>
                  </button>))}
              </div>
            </div>)}
          {stage === 3 && (
            <div className="stack rise" style={{ gap: 14, alignItems: 'center' }} key="s3">
              <div className="occ-rule" />
              <p className="t-small dim" style={{ margin: 0 }}>{lifter} lifts it</p>
              <p className="board-f occ-champ" style={{ margin: 0 }}>Champions</p>
              <p className="occ-champ-ne" style={{ margin: 0 }}>च्याम्पियन</p>
              <p style={{ fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', margin: 0 }}><Dot id={u} big />{tname(G, u)}{c.back2back ? ' · back-to-back' : ''} · Season {seasonNo(y)}, {y}</p>
              <p className="dim" style={{ fontStyle: 'italic', maxWidth: 600, margin: '6px 0 0' }}>The players form a line behind {lifter}, and the whole ground counts down from five.</p>
              {O.occ(G).lift && <p className="t-micro dim" style={{ margin: 0 }}>{(G.s.log.slice().reverse().find((e) => e.occ === 'trophy') || {}).outcome}</p>}
              <div className="occ-rule" style={{ marginTop: 8 }} />
            </div>)}
          {stage === 4 && (
            <div className="stack rise" style={{ gap: 10, textAlign: 'left' }} key="s4">
              <p style={{ fontSize: 24, fontWeight: 600, margin: 0, textAlign: 'center' }}>{T(G, 'Victory lap', 'विजय परिक्रमा')}</p>
              <p className="t-small dim" style={{ margin: 0, textAlign: 'center' }}>The title-winning XI, with their Season {seasonNo(y)} figures</p>
              <ul className="occ-awards" style={{ marginTop: 6 }}>{xi.map((p) => { const s = p.stats[y] || { r: 0, w: 0, m: 0 }; return (
                <li key={p.id} style={{ padding: '10px 0' }}><span style={{ fontWeight: 600 }}>{p.name}{p.id === G.teams[u].captainId ? ' (c)' : ''}</span><span className="board-f dim" style={{ fontSize: 17 }}>{s.m} m · {s.r} runs · {s.w} wkts</span></li>); })}</ul>
            </div>)}
        </div>
      </main>
      <footer>
        {stage < 3 && <button type="button" className="btn btn-lg btn-gold" disabled={stage === 2 && !sel} onClick={next}>{labels[stage]}</button>}
        {stage >= 3 && <>
          {stage === 3 ? <button type="button" className="btn btn-lg btn-board" onClick={() => setStage(4)}>{T(G, 'Victory lap', 'विजय परिक्रमा')}</button> : <button type="button" className="btn btn-lg btn-board" onClick={() => setStage(3)}>Back</button>}
          <Link to="/review" className="btn btn-lg btn-gold">{tn(G, 'Season review')}</Link>
        </>}
      </footer>
    </div>
  );
}
