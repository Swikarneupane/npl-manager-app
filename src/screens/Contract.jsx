import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import '../styles/office.css';
import { useGame } from '../lib/store.jsx';
import { PageHead } from '../components/bits.jsx';
import MScreen from '../components/MScreen.jsx';
import { fmtL, ovr } from '../game/engine.js';
import { ROLES, MAX_DEALS, openTalk, talkOf, signChance, makeOffer, walkAway, wageRoom, relAmount, expiring, talkWindow, dealsLeft, dealSeason } from '../game/office.js';
import { autosave } from '../lib/save.js';
import { useNarrow, seasonNo } from '../lib/util.js';
import { T } from '../lib/i18n.js';

const ROLE_NP = { Rotation: 'रोटेसन', Regular: 'नियमित', 'Key player': 'मुख्य खेलाडी' };
const roleWord = (p) => (p.role === 'WK' ? 'wicketkeeper' : p.role === 'BAT' ? 'batter' : p.role === 'AR' ? 'all-rounder' : 'bowler');
const clsOf = (c) => (c >= 70 ? 'blu' : c < 40 ? 'crim' : '');

// Every player whose deal ends this window, with the state of his talks.
function List({ G }) {
  const ex = expiring(G); const open = talkWindow(G);
  return (
    <div style={{ maxWidth: 900 }}>
      <PageHead title={T(G, 'Contract talks', 'अनुबन्ध वार्ता')} sub={open ? `${ex.length} contract${ex.length === 1 ? '' : 's'} end after Season ${seasonNo(dealSeason(G))} · ${dealsLeft(G)} of ${MAX_DEALS} new deals left this window` : 'Talks open late in the season and run until retention.'} />
      {ex.length ? <ul className="mlist">{ex.map((p) => { const t = talkOf(G, p.id); return (
        <li key={p.id}><span className="grow"><Link to={`/contract/${p.id}`} style={{ fontWeight: 600 }}>{p.name}</Link> <span className="role">{p.role}</span><br /><span className="l2">{p.age} · rating {ovr(p)} · {fmtL(p.salary)} now · deal ends {p.contractTo}</span></span>
          <span className={`t-small ${t && t.status === 'signed' ? 'blu' : t && t.status !== 'open' ? 'crim' : 'mut'}`}>{t ? { open: `Round ${t.round} of 3`, signed: 'Signed', stalled: 'Stalled', walked: 'Leaving' }[t.status] : 'Not started'}</span></li>); })}</ul>
        : <p className="faint">No contracts end this window.</p>}
    </div>);
}

export default function Contract() {
  const { G, update, toast } = useGame(); const { id } = useParams(); const nav = useNavigate(); const narrow = useNarrow();
  const p = G.P(id); const mine = p && p.team === G.user;
  const ex = mine && expiring(G).includes(p) && talkWindow(G);
  const t0 = mine ? (talkOf(G, id) || (ex ? openTalk(G, id) : null)) : null; const ask = t0 ? t0.ask : null;
  const [o, setO] = useState(() => ({ wage: ask ? Math.max(1, Math.round(ask.wage * 0.8)) : Math.max(2, Math.round((p && p.salary) || 2)), yrs: ask ? ask.yrs : 2, role: ask ? ask.role : 'Regular', po: true, pom: false, rel: false }));
  if (!p || !mine) return <List G={G} />;
  const talk = t0; if (!talk) return <List G={G} />;
  const room = wageRoom(G, p); const max = Math.max(room, talk.ask.wage); const min = Math.max(1, Math.round(talk.ask.wage * 0.4));
  const chance = signChance(G, p, talk, o); const over = o.wage > room; const done = talk.status !== 'open';
  const set = (k, v) => setO((x) => ({ ...x, [k]: v }));
  const offer = () => update(() => { const r = makeOffer(G, p.id, o); if (r.err) toast(r.err); else { autosave(G); if (r.signed) toast(`${p.name} signs.`); } });
  const walk = () => update(() => { walkAway(G, p.id); autosave(G); nav('/contract/list'); });
  const sq = G.teams[G.user].squad.map((x) => G.P(x)).filter((x) => (x.nat === 'NEP') === (p.nat === 'NEP') && x.id !== p.id).sort((a, b) => b.salary - a.salary)[0];
  const reply = talk.reply || (talk.ask.role === 'Key player' ? 'Make us an offer. He knows what he means to this side.' : 'Make us an offer. He wants to stay, at the right price.');
  const wants = [[`${talk.ask.role === 'Rotation' ? 'Any role' : talk.ask.role === 'Key player' ? 'A key role' : 'A regular place, not rotation'}`, talk.ask.role === 'Rotation' ? 'Nice to have' : 'Must have', talk.ask.role !== 'Rotation'],
    [`Around ${fmtL(talk.ask.wage)} a season`, 'Important'], [`${talk.ask.yrs} season${talk.ask.yrs > 1 ? 's' : ''}`, 'Important'], ...(talk.ask.rel ? [['A release clause', 'Nice to have']] : [])];
  const context = [...talk.rivals.map((tid) => `${G.teams[tid].name} have asked his agent about him`), sq ? `Highest ${p.nat === 'NEP' ? 'Nepali' : 'overseas'} wage in your squad: ${sq.name}, ${fmtL(sq.salary)}` : null,
    `Wage room for him: ${fmtL(room)}`, 'If unsigned, he enters the auction pool at the next retention'].filter(Boolean);
  const status = talk.status === 'signed' ? `Signed: ${fmtL(p.salary)} a season until ${p.contractTo}` : talk.status === 'stalled' ? 'Three offers turned down. Walk away, and he enters the auction pool.' : talk.status === 'walked' ? 'You walked away. He leaves when his contract ends.' : null;
  const lastC = talk.offers.length ? talk.offers[talk.offers.length - 1].c : null;
  const segs = (arr, k, fmt) => <div className="seg" role="group" aria-label={k} style={narrow ? { display: 'grid', gridTemplateColumns: `repeat(${arr.length},minmax(0,1fr))` } : undefined}>{arr.map((v) => <button key={v} type="button" className={o[k] === v ? 'on' : ''} disabled={done} onClick={() => set(k, v)} style={narrow ? { minHeight: 40, padding: '0 4px' } : undefined}>{fmt ? fmt(v) : v}</button>)}</div>;
  const extras = <>
    <label className="chk"><input type="checkbox" checked={o.po} disabled={done} onChange={() => set('po', !o.po)} /> Playoff bonus · Rs 1 L per playoff win</label>
    {!narrow && <label className="chk"><input type="checkbox" checked={o.pom} disabled={done} onChange={() => set('pom', !o.pom)} /> Player of the match bonus · Rs 50,000 each</label>}
    <label className="chk"><input type="checkbox" checked={o.rel} disabled={done} onChange={() => set('rel', !o.rel)} /> Release clause · {fmtL(relAmount(o.wage))}{narrow ? '' : ' (other teams can buy him out at the next auction)'}</label></>;
  const buttons = <>
    <button type="button" className="btn btn-primary btn-lg" style={narrow ? { flex: '1 1 auto' } : undefined} disabled={done || over} onClick={offer}>{over ? 'Over wage room' : T(G, 'Make offer', 'प्रस्ताव')}</button>
    <button type="button" className="btn btn-lg btn-ghost" disabled={talk.status === 'signed' || talk.status === 'walked'} onClick={walk}>{T(G, 'Walk away', 'वार्ता छाड्नुहोस्')}</button></>;
  const meter = <>
    <div style={{ display: 'flex', justifyContent: 'space-between' }} className="t-small"><span className="mut">Chance he signs</span><span className={clsOf(chance)} style={{ fontWeight: 600 }}>{chance}%</span></div>
    <div className="meter blue"><i style={{ width: `${chance}%` }} /></div></>;
  if (narrow) return (
    <MScreen top={{ title: `Contract: ${p.name}`, sub: '', right: <>Round <b>{Math.min(3, talk.round + (done ? 0 : 1))}</b> of 3<br />wage room {fmtL(room)}</> }}
      pin={<div className="stack" style={{ gap: 6 }}>{meter}<p className="t-small" style={{ fontStyle: 'italic' }}>“{reply}”</p><p className="faint t-micro">Agent {talk.agent} (generated) · wants {talk.ask.role === 'Key player' ? 'a key role' : talk.ask.role === 'Regular' ? 'a regular place' : 'a deal'} and about {fmtL(talk.ask.wage)}</p></div>}
      actions={buttons}>
      <div style={{ paddingTop: 14 }}>
        {status && <p className={`t-small panel ${talk.status === 'signed' ? 'blu' : 'crim'}`} style={{ padding: '10px 12px', marginBottom: 10 }}>{status}</p>}
        <div className="field"><span className="lbl">Wage per season</span>
          <div style={{ display: 'grid', gridTemplateColumns: '52px minmax(0,1fr) 52px', alignItems: 'center', gap: 8 }}>
            <button type="button" className="btn" style={{ minHeight: 48, fontSize: 20 }} disabled={done} onClick={() => set('wage', Math.max(min, o.wage - (o.wage > 10 ? 1 : 0.5)))} aria-label="Lower wage">−</button>
            <span className={`board-f ${over ? 'crim' : ''}`} style={{ fontSize: 34, fontWeight: 600, textAlign: 'center' }}>{fmtL(o.wage)}</span>
            <button type="button" className="btn" style={{ minHeight: 48, fontSize: 20 }} disabled={done} onClick={() => set('wage', Math.min(max, o.wage + (o.wage >= 10 ? 1 : 0.5)))} aria-label="Raise wage">+</button></div></div>
        <p className="mhead">Length</p>{segs([1, 2, 3, 4], 'yrs', (v) => `${v} yr`)}
        <p className="mhead">Promised role</p>{segs(ROLES, 'role', (v) => T(G, v, ROLE_NP[v]))}
        <p className="mhead">Extras</p><div className="stack" style={{ gap: 10 }}>{extras}</div>
        <p className="mhead">Context</p><ul className="mlist">{context.map((c) => <li key={c} style={{ padding: '6px 0', minHeight: 0 }}><span className="grow t-small">{c}</span></li>)}</ul>
      </div>
    </MScreen>);
  return (
    <div style={{ maxWidth: 1180 }}>
      <p className="t-small"><Link to="/contract/list">Contract talks</Link> <span className="faint">/ {p.name}</span></p>
      <div className="pagehead" style={{ marginTop: 10 }}>
        <div className="stack" style={{ gap: 4 }}><h1 className="t-h1">{T(G, `New contract: ${p.name}`, `नयाँ अनुबन्ध: ${p.name}`)}</h1>
          <p className="mut">{p.age} · {roleWord(p)} · rating {ovr(p)} · current deal {fmtL(p.salary)}, ends after Season {seasonNo(p.contractTo)}</p></div>
        <p className="t-small mut">Round {Math.min(3, talk.round + (done ? 0 : 1))} of 3 · agent: {talk.agent} (generated)</p>
      </div>
      <div className="split" style={{ gap: 44, gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)' }}>
        <section className="stack" style={{ gap: 24 }}>
          {status && <p className={`panel t-small ${talk.status === 'signed' ? 'blu' : 'crim'}`} style={{ padding: '10px 14px' }}>{status}</p>}
          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><label htmlFor="wage">Wage per season</label><span className={`board-f ${over ? 'crim' : ''}`} style={{ fontSize: 26, fontWeight: 600 }}>{fmtL(o.wage)}</span></div>
            <input id="wage" type="range" min={min} max={max} step={o.wage >= 10 ? 1 : 0.5} value={o.wage} disabled={done} onChange={(e) => set('wage', +e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }} className="faint t-micro"><span>{fmtL(min)}</span><span>Agent asks {fmtL(talk.ask.wage)}</span><span>{fmtL(max)}</span></div>
          </div>
          <div className="field"><span className="lbl">Length</span>{segs([1, 2, 3, 4], 'yrs', (v) => `${v} season${v > 1 ? 's' : ''}`)}</div>
          <div className="field"><span className="lbl">Promised role</span>{segs(ROLES, 'role', (v) => T(G, v, ROLE_NP[v]))}<p className="faint t-small">A promise is tracked in the dressing room. Break it and his happiness falls fast.</p></div>
          <div className="field"><span className="lbl">Extras</span>{extras}</div>
          <div className="row" style={{ gap: 10 }}>{buttons}</div>
          {talk.offers.length > 0 && <div><h2 className="sec">Offers so far</h2><ul className="mlist">{talk.offers.map((x, i) => <li key={i} style={{ padding: '8px 0' }}><span className="grow t-small">Round {i + 1}: {fmtL(x.wage)}, {x.yrs} season{x.yrs > 1 ? 's' : ''}, {x.role.toLowerCase()}</span><span className={`t-small ${x.ok ? 'blu' : 'mut'}`}>{x.ok ? 'Accepted' : `Turned down · ${x.c}%`}</span></li>)}</ul></div>}
        </section>
        <aside className="stack" style={{ gap: 22 }}>
          <div className="panel stack" style={{ gap: 10 }}><h2 className="sec" style={{ margin: 0 }}>Agent's reading</h2>{meter}
            {lastC != null && <p className="faint t-micro">Last offer read at {lastC}%.</p>}
            <p className="pull" style={{ fontSize: 15, lineHeight: '23px' }}>“{reply}”<cite>{talk.agent}, agent (generated)</cite></p></div>
          <div><h2 className="sec">What he wants</h2><ul className="mlist">{wants.map(([w, k, must]) => <li key={w} style={{ padding: '8px 0' }}><span className="grow t-small">{w}</span><span className={`t-small ${must ? 'crim' : 'mut'}`}>{k}</span></li>)}</ul></div>
          <div><h2 className="sec">Context</h2><ul className="mlist">{context.map((c) => <li key={c} style={{ padding: '8px 0' }}><span className="grow t-small">{c}</span></li>)}</ul></div>
        </aside>
      </div>
    </div>);
}
