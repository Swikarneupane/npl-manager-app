import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/occasions.css';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { PageHead } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { T, tn } from '../lib/i18n.js';
import { nn, seasonNo, useNarrow } from '../lib/util.js';
import { startOffseason } from '../lib/flow.js';
import * as O from '../game/occasions.js';

const delta = (d) => (d == null || d === 0 ? null : <span className={d > 0 ? 'up' : 'down'} style={{ fontSize: '0.6em' }}> {d > 0 ? '+' : '−'}{Math.abs(d)}</span>);

function Tiles({ G, r }) {
  return (
    <div className="occ-tiles">
      <div className="panel stack" style={{ gap: 2 }}><span className="faint t-small">{T(G, 'Finish', 'स्थान')}</span><span className={`board-f bf${r.champ ? ' gld' : ''}`}>{T(G, r.finish, r.finishNe)}</span></div>
      <div className="panel stack" style={{ gap: 2 }}><span className="faint t-small">{T(G, 'Record', 'नतिजा')}</span><span className="board-f bf">{nn(G, r.record)}</span></div>
      <div className="panel stack" style={{ gap: 2 }}><span className="faint t-small">{T(G, 'Board', 'बोर्ड')}</span><span className="board-f bf">{nn(G, r.board)}{delta(r.boardD)}</span></div>
      <div className="panel stack" style={{ gap: 2 }}><span className="faint t-small">{T(G, 'Fans', 'समर्थक')}</span><span className="board-f bf">{nn(G, r.fans)}{delta(r.fansD)}</span></div>
      {r.rep != null && <div className="panel stack" style={{ gap: 2 }}><span className="faint t-small">Your reputation</span><span className="board-f bf">{O.repLabel(r.rep)}{delta(r.repD)}</span></div>}
    </div>
  );
}
function Moments({ r }) {
  if (!r.moments.length) return <p className="faint t-small">No matches were played.</p>;
  return (
    <ol className="feed">{r.moments.map((m, i) => (
      <li key={i} className={`ev ${m.cls}`}><span className="ov">{m.ov}</span><span className="tx"><b>{m.head}</b>{m.sub ? ` ${m.sub}` : ''}{m.chose && <span className="ne" style={{ fontFamily: 'var(--f-ui)' }}>{m.chose}</span>}</span></li>))}</ol>
  );
}
function Awards({ r }) {
  return <ul className="mlist">{r.awards.map(([k, v]) => <li key={k} style={{ padding: '8px 0' }}><span className="grow">{k}</span><span className="t-small" style={{ textAlign: 'right' }}>{v}</span></li>)}</ul>;
}
function Verdict({ r }) {
  return (
    <div className="panel stack" style={{ gap: 8 }}>
      <h2 className="sec" style={{ margin: 0 }}>Board's verdict</h2>
      <p className="t-small" style={{ margin: 0 }}>{r.verdict || 'No board review was recorded for this season.'}</p>
      {r.pillars && <ul className="mlist">{O.PILLARS.map(([k, l]) => { const v = r.pillars[k]; const d = r.pillarsStart ? Math.round((v - r.pillarsStart[k]) * 10) / 10 : null; return (
        <li key={k} style={{ padding: '6px 0', minHeight: 0 }}><span className="grow t-small">{l}</span><span className="board-f">{Math.round(v)}</span>{d ? <span className={`t-micro ${d > 0 ? 'up' : 'down'}`} style={{ width: 36, textAlign: 'right' }}>{d > 0 ? '+' : '−'}{Math.abs(d)}</span> : <span style={{ width: 36 }} />}</li>); })}</ul>}
    </div>
  );
}
function Carried({ G }) {
  const c = O.carried(G);
  return <ul className="mlist">{c.length ? c.map((x, i) => <li key={i} style={{ padding: '8px 0' }}><span className="grow t-small">{x}</span></li>) : <li><span className="grow t-small faint">Nothing left open.</span></li>}</ul>;
}
function Honours({ r }) { return r.honours.length ? <ul className="mlist">{r.honours.map((x, i) => <li key={i} style={{ padding: '7px 0', minHeight: 0 }}><span className="grow t-small">{x}</span></li>)}</ul> : <p className="t-small faint">No new entries this season.</p>; }

function useReview() {
  const { G, update, toast } = useGame(); const nav = useNavigate(); const [busy, setBusy] = useState(false);
  const r = O.reviewFor(G);
  const onward = async () => { setBusy(true); toast('Nepal play their winter internationals…'); await startOffseason(G); autosave(G); setBusy(false); update(); nav('/offseason'); };
  const act = G.s.phase !== 'seasonEnd' ? null : G.s.sacked ? { to: '/', l: 'Your next club' } : { on: onward, l: T(G, 'On to the off-season', 'अफ-सिजनतर्फ') };
  return { G, r, act, busy };
}
const Act = ({ act, busy, lg }) => (!act ? null : act.to ? <Link to={act.to} className={`btn btn-primary${lg ? ' btn-lg' : ''}`} style={lg ? { flex: '1 1 auto' } : undefined}>{act.l}</Link> : <button type="button" className={`btn btn-primary${lg ? ' btn-lg' : ''}`} style={lg ? { flex: '1 1 auto' } : undefined} disabled={busy} onClick={act.on}>{busy ? 'Simulating…' : act.l}</button>);

function Empty({ G }) {
  return <div className="wrap" style={{ maxWidth: 720 }}><PageHead title={tn(G, 'Season review')} sub="The review is written when your first season ends, after the final." /><Link to="/" className="btn">{tn(G, 'Home')}</Link></div>;
}

function ReviewDesktop({ G, r, act, busy }) {
  return (
    <div style={{ maxWidth: 1180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <div className="stack" style={{ gap: 8, maxWidth: 760 }}>
          <p className="gld t-small" style={{ fontWeight: 600, margin: 0 }}>{T(G, `Season ${seasonNo(r.y)} in review`, 'सिजन समीक्षा')}</p>
          <h1 className="occ-review-h1">{r.head}</h1>
          <p className="mut" style={{ fontSize: 16, lineHeight: '26px', margin: 0 }}>{r.story} {r.decisions ? `${r.decisions} decisions logged; the ones that mattered are below.` : ''}</p>
        </div>
        <Act act={act} busy={busy} />
      </div>
      <div style={{ margin: '32px 0 40px' }}><Tiles G={G} r={r} /></div>
      <div className="split" style={{ gap: 48, gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>
        <section><h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'The season in eight moments', 'आठ क्षणमा सिजन')}</h2><Moments r={r} /></section>
        <aside className="stack" style={{ gap: 26 }}>
          <div><h2 className="sec">Awards</h2><Awards r={r} /></div>
          <div><h2 className="sec">Honours board additions</h2><Honours r={r} /></div>
          <Verdict r={r} />
          <div><h2 className="sec">Carried into next season</h2><Carried G={G} /></div>
        </aside>
      </div>
    </div>
  );
}
function ReviewMobile({ G, r, act, busy }) {
  const [tab, setTab] = useTab(['moments', 'awards', 'board', 'next'], 'moments');
  return (
    <MScreen top={{ title: tn(G, 'Season review'), sub: `Season ${seasonNo(r.y)} · ${r.finish}` }}
      pin={<div className="stack" style={{ gap: 4 }}><p className="t-small b6" style={{ margin: 0 }}>{r.head}</p><p className="t-micro mut" style={{ margin: 0 }}>{r.story}</p></div>}
      label="Season review" tab={tab} onTab={setTab} tabs={[['moments', T(G, 'Moments', 'क्षण')], ['awards', T(G, 'Awards', 'पुरस्कार')], ['board', tn(G, 'Board')], ['next', T(G, 'Next', 'अर्को')]]}
      actions={act ? <Act act={act} busy={busy} lg /> : null}>
      {tab === 'moments' && <><div style={{ paddingTop: 12 }}><Tiles G={G} r={r} /></div><p className="mhead">{T(G, 'The season in eight moments', 'आठ क्षणमा सिजन')}</p><Moments r={r} /></>}
      {tab === 'awards' && <><p className="mhead">Awards</p><Awards r={r} /><p className="mhead">Honours board additions</p><Honours r={r} /></>}
      {tab === 'board' && <div style={{ paddingTop: 12 }}><Verdict r={r} /></div>}
      {tab === 'next' && <><p className="mhead">Carried into next season</p><Carried G={G} /></>}
    </MScreen>
  );
}

export default function SeasonReview() {
  const narrow = useNarrow(); const x = useReview();
  useEffect(() => { if (x.r) { O.markSeen(x.G, 'review'); autosave(x.G); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!x.r) return <Empty G={x.G} />;
  return narrow ? <ReviewMobile {...x} /> : <ReviewDesktop {...x} />;
}
