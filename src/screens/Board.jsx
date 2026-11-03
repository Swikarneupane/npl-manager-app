import { useState } from 'react';
import '../styles/office.css';
import { useGame } from '../lib/store.jsx';
import { PageHead, Meter } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { fmtL } from '../game/engine.js';
import { PILLARS } from '../game/depth.js';
import { FACILITIES, facility, approvalOdds, putRequests, negotiate, closeMeeting, chairLine, pillarScore } from '../game/office.js';
import { autosave } from '../lib/save.js';
import { useNarrow, boardMood, seasonNo } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';

const ST_CLS = { Exceeded: 'blu', Met: 'blu', Behind: 'crim' };
const ST_NP = { Exceeded: 'अपेक्षाभन्दा राम्रो', Met: 'पूरा', Behind: 'पछाडि' };

function Pillars({ G }) {
  const P = G.s.pillars || {};
  return (
    <div className="panel stack" style={{ gap: 10 }}>
      <h2 className="sec" style={{ margin: 0 }}>{T(G, 'What the board judges you on', 'बोर्डले के हेर्छ')}</h2>
      {PILLARS.map(([k, l]) => { const v = Math.round(P[k] ?? 60); return (
        <div key={k} className={`stack${v < 45 ? ' meter-c' : ''}`} style={{ gap: 4 }}><div style={{ display: 'flex', justifyContent: 'space-between' }} className="t-small"><span className="mut">{l}</span><span className={`num ${v < 45 ? 'crim' : ''}`}>{v}</span></div><Meter pct={v} blue={v >= 45} /></div>); })}
      <p className="faint t-micro">Weighted score {pillarScore(G)}. Above 60 lifts confidence at each review; below 60 lowers it. Checked mid-season too.</p>
    </div>);
}
function Review({ G, m }) {
  const list = m ? m.review : (G.s.office.obj && G.s.office.obj.y === G.year ? [{ txt: G.teams[G.user].objective.txt, req: 'Required' }, ...G.s.office.obj.list] : [{ txt: (G.teams[G.user].objective || {}).txt || 'Set at the start of the season', req: 'Required' }]);
  return (
    <div>
      <h2 className="t-h3" style={{ marginBottom: 8 }}>{m ? '1 · Objectives reviewed' : 'This season\'s objectives'}</h2>
      <ul className="mlist">{list.map((o, i) => <li key={i}><span className="grow">{o.txt}<br /><span className="l2">{o.note || o.req}{o.note && o.req === 'Bonus' ? ' · bonus' : ''}</span></span>{o.st && <span className={`t-small ${ST_CLS[o.st]}`} style={{ fontWeight: o.st === 'Exceeded' ? 600 : 400 }}>{T(G, o.st, ST_NP[o.st])}</span>}</li>)}</ul>
    </div>);
}
function Requests({ G, m, picks, setPicks, onPut }) {
  const asked = m && m.reqDone;
  return (
    <div>
      <h2 className="t-h3" style={{ marginBottom: 4 }}>2 · {T(G, 'Your requests', 'तपाईंका माग')}</h2>
      <p className="mut t-small" style={{ marginBottom: 10 }}>{asked ? 'The board has answered.' : 'Choose up to two. The more you ask for, the less likely each is approved. Approved upgrades are paid from the club balance.'}</p>
      {asked ? <ul className="mlist">{m.asked.length ? m.asked.map((a) => { const f = FACILITIES.find((x) => x[0] === a.k); return <li key={a.k}><span className="grow">{f[1]}<br /><span className="l2">{f[2]}</span></span><span className={`t-small ${a.ok ? 'blu' : 'crim'}`}>{a.ok ? 'Approved' : 'Turned down'} · {a.odds}%</span></li>; }) : <li><span className="grow t-small mut">You asked for nothing this year.</span></li>}</ul> : <>
        <div className="of-cards">{FACILITIES.map(([k, name, what, cost, annual]) => { const have = facility(G, k); const on = picks.includes(k); const odds = approvalOdds(G, k, picks);
          return (
            <button key={k} type="button" className={`choice${on ? ' on' : ''}`} aria-pressed={on} disabled={have || (!on && picks.length >= 2)} onClick={() => setPicks(on ? picks.filter((x) => x !== k) : picks.concat([k]))}>
              <span style={{ fontWeight: 600 }}>{name}{have ? ' · built' : ''}</span><span className="fx">{what}</span>
              <span className="fx">{fmtL(cost)}{annual ? ' a year' : ''} · {have ? 'already approved' : <>approval <span className={odds >= 70 ? 'blu' : odds < 50 ? 'crim' : ''}>{odds}%</span></>}</span>
            </button>); })}</div>
        <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: 14 }} disabled={!m || m.done} onClick={onPut}>{picks.length ? T(G, 'Put requests to the board', 'बोर्डसमक्ष माग राख्नुहोस्') : 'Ask for nothing this year'}</button></>}
    </div>);
}
function Next({ G, m, onNeg, onClose }) {
  if (!m) return null;
  return (
    <div>
      <h2 className="sec">{T(G, `Season ${seasonNo(m.nextY)} objectives offered`, `सिजन ${seasonNo(m.nextY)} का लक्ष्य`)}</h2>
      <ul className="mlist">
        <li style={{ padding: '8px 0' }}><span className="grow t-small">{m.ease ? 'One step easier than your squad strength suggests' : 'League target set by squad strength when the season starts'}<br /><span className="l2">Last season: {m.nextMain.txt}</span></span><span className="faint t-small">Required</span></li>
        {m.next.map((o) => <li key={o.k} style={{ padding: '8px 0' }}><span className="grow t-small">{o.txt}</span><span className="faint t-small">{o.req}</span></li>)}
      </ul>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn-sm" disabled={!!m.negotiated || m.done} onClick={onNeg}>{m.negotiated === 'won' ? 'Objectives eased' : m.negotiated === 'lost' ? 'The board said no' : T(G, 'Negotiate objectives', 'लक्ष्यमा छलफल')}</button>
        {!m.done && <button type="button" className="btn btn-sm btn-blue" onClick={onClose}>Accept and close the meeting</button>}
      </div>
      {!m.negotiated && <p className="faint t-micro" style={{ marginTop: 6 }}>Asking for easier targets can work when confidence is high. If they refuse, confidence −3.</p>}
    </div>);
}

export default function Board() {
  const { G, update, toast } = useGame(); const narrow = useNarrow(); const t = G.teams[G.user];
  const raw = G.s.office.meeting; const m = raw && !['league', 'playoffs'].includes(G.s.phase) && raw.y >= G.year - 1 ? raw : null;
  const [picks, setPicks] = useState([]); const [tab, setTab] = useTab(['review', 'requests', 'next'], 'review');
  const put = () => update(() => { const e = putRequests(G, picks); if (e) toast(e); else { setPicks([]); autosave(G); } });
  const neg = () => update(() => { const e = negotiate(G); if (e) toast(e); autosave(G); });
  const close = () => update(() => { if (!m.reqDone) putRequests(G, []); closeMeeting(G); autosave(G); toast('Meeting closed.'); });
  const title = m ? T(G, 'End-of-season board meeting', 'सिजन अन्त्यको बोर्ड बैठक') : tn(G, 'Board');
  const sub = `Chairman and 4 board members (generated) · confidence ${t.board} · mood: ${boardMood(t.board).toLowerCase()}`;
  const chair = <div className="stack" style={{ gap: 6 }}><h2 className="sec" style={{ margin: 0 }}>The chairman</h2><p className="pull" style={{ fontSize: 15, lineHeight: '23px' }}>“{chairLine(G)}”<cite>Club chairman (generated)</cite></p></div>;
  const noMeet = !m && <p className="panel t-small mut" style={{ padding: '10px 14px' }}>The board meets after the final. Until then they check in after your 7th and 14th league games.</p>;
  if (narrow) return (
    <MScreen top={{ title, sub: '', right: <>Confidence<br /><b>{t.board}</b></> }} label="Board" tab={tab} onTab={setTab}
      tabs={[['review', T(G, 'Review', 'समीक्षा')], ['requests', T(G, 'Requests', 'माग'), m && !m.reqDone ? '!' : null], ['next', T(G, 'Next season', 'अर्को सिजन')]]}>
      <div style={{ paddingTop: 12 }} className="stack">
        {tab === 'review' && <>{noMeet}<Review G={G} m={m} /><Pillars G={G} />{chair}</>}
        {tab === 'requests' && (m ? <Requests G={G} m={m} picks={picks} setPicks={setPicks} onPut={put} /> : noMeet)}
        {tab === 'next' && (m ? <Next G={G} m={m} onNeg={neg} onClose={close} /> : noMeet)}
      </div>
    </MScreen>);
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title={title} sub={sub} />
      <div className="split" style={{ gap: 40, gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)' }}>
        <section className="stack" style={{ gap: 30 }}>{noMeet}<Review G={G} m={m} />{m && <Requests G={G} m={m} picks={picks} setPicks={setPicks} onPut={put} />}</section>
        <aside className="stack" style={{ gap: 24 }}><Pillars G={G} />{chair}<Next G={G} m={m} onNeg={neg} onClose={close} /></aside>
      </div>
    </div>);
}
