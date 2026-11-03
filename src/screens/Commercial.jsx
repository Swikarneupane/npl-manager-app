import '../styles/office.css';
import { useGame } from '../lib/store.jsx';
import { PageHead, Meter } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { fmtL } from '../game/engine.js';
import { condText, acceptSponsor, declineSponsor, eventsFor, runEvent, MERCH, PRICE_TIERS, merchPrice, segShares, bestSeller } from '../game/office.js';
import { autosave } from '../lib/save.js';
import { useNarrow, nn } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';

function Offers({ G, act, phone }) {
  const S = G.s.office.sp; const live = S.deals.filter((d) => d.y >= G.year);
  return (
    <div>
      <h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'New offers', 'नयाँ प्रस्ताव')}</h2>
      {S.offers.length ? (phone ? <ul className="mlist">{S.offers.map((o) => <li key={o.id} style={{ alignItems: 'flex-start' }}><span className="grow"><b style={{ fontWeight: 600 }}>{o.name}</b> <span className="faint t-small">· {o.slot}</span><br /><span className="l2">{fmtL(o.fee)} a season · {condText(G, o)}</span></span>
          <span className="stack" style={{ gap: 4 }}><button type="button" className="btn btn-sm" onClick={() => act(() => acceptSponsor(G, o.id))}>Sign</button><button type="button" className="linkbtn t-micro" onClick={() => act(() => declineSponsor(G, o.id))}>Decline</button></span></li>)}</ul>
        : <div className="tblwrap"><table className="tbl"><thead><tr><th>Sponsor</th><th>Slot</th><th className="r">Per season</th><th>Strings attached</th><th /></tr></thead>
          <tbody>{S.offers.map((o) => <tr key={o.id}><td className="name">{o.name}</td><td>{o.slot}</td><td className="r num">{fmtL(o.fee)}</td><td className="t-small" style={{ whiteSpace: 'normal' }}>{condText(G, o)}</td>
            <td className="r" style={{ whiteSpace: 'nowrap' }}><button type="button" className="btn btn-sm" onClick={() => act(() => acceptSponsor(G, o.id))}>Sign</button> <button type="button" className="btn btn-sm btn-ghost" onClick={() => act(() => declineSponsor(G, o.id))}>Decline</button></td></tr>)}</tbody></table></div>)
        : <p className="faint t-small">No offers on the table. New ones arrive after the final.</p>}
      <p className="faint t-small" style={{ marginTop: 8 }}>Conditions tie money to results and selection. Miss one and the sponsor takes part of the fee back. Brand names are generated.</p>
      {live.length > 0 && <><p className="mhead">Signed deals</p><ul className="mlist">{live.map((d) => <li key={d.id} style={{ padding: '8px 0' }}><span className="grow t-small">{d.name} · {d.slot} · {fmtL(d.fee)}<br /><span className="l2">{condText(G, d)}{d.status === 'live' && d.cond.of ? ` · ${d.got} of ${d.seen} so far` : ''}</span></span>
        <span className={`t-small ${d.status === 'done' ? (d.met ? 'blu' : 'crim') : 'mut'}`}>{d.status === 'done' ? (d.met ? 'Met' : 'Missed') : d.y > G.year || !d.paid ? 'Next season' : 'Live'}</span></li>)}</ul></>}
    </div>);
}
function Community({ G, act }) {
  return (
    <div>
      <h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'Community and events', 'समुदाय र कार्यक्रम')}</h2>
      <ul className="mlist">{eventsFor(G).map((e) => <li key={e.k}><span className="grow">{e.name}<br /><span className="l2">{e.sub}</span></span>
        {e.open ? <button type="button" className="btn btn-sm" onClick={() => act(() => runEvent(G, e.k))}>Plan</button> : <span className="faint t-micro" style={{ maxWidth: 110, textAlign: 'right' }}>{e.why}</span>}</li>)}</ul>
    </div>);
}
function Merch({ G, update }) {
  const M = G.s.office.merch; const last = M.last; const cur = M.y === G.year ? M.sold : {};
  return (
    <div>
      <h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'Merchandise', 'सामग्री बिक्री')}</h2>
      <table className="tbl compact plain"><thead><tr><th style={{ paddingLeft: 0 }}>Item</th><th>Price</th><th className="r">This season</th><th className="r">Last season</th></tr></thead>
        <tbody>{MERCH.map(([k, name]) => <tr key={k}><td style={{ paddingLeft: 0 }}>{name}</td>
          <td><select className="input" style={{ height: 32, fontSize: 13 }} value={M.tier[k] || 'std'} aria-label={`${name} price`} onChange={(e) => update(() => { M.tier[k] = e.target.value; })}>{PRICE_TIERS.map(([tk, tl]) => <option key={tk} value={tk}>{tl} · Rs {(Math.round(MERCH.find((m) => m[0] === k)[2] * PRICE_TIERS.find((x) => x[0] === tk)[2] / 50) * 50).toLocaleString()}</option>)}</select></td>
          <td className="r num">{(cur[k] || 0).toLocaleString()}</td><td className="r num mut">{last && last.sold[k] ? last.sold[k].toLocaleString() : '—'}</td></tr>)}</tbody></table>
      <p className="faint t-micro" style={{ marginTop: 6 }}>Best seller: {M.y === G.year ? bestSeller(G) : last ? last.best : '—'}. Sales follow fans and results; dearer prices sell fewer. Current price of a shirt: Rs {merchPrice(G, 'shirt').toLocaleString()}.</p>
    </div>);
}
function Fans({ G }) {
  const t = G.teams[G.user]; const segs = segShares(G).map(([k, l, v]) => [k, k === 'locals' ? `${t.province} Province locals` : l, v]);
  return (
    <div className="panel stack" style={{ gap: 10 }}>
      <h2 className="sec" style={{ margin: 0 }}>{T(G, 'Who your fans are', 'तपाईंका समर्थक')}</h2>
      {segs.map(([k, l, v]) => <div key={k} className="stack" style={{ gap: 4 }}><div style={{ display: 'flex', justifyContent: 'space-between' }} className="t-small"><span className="mut">{l}</span><span className="num">{nn(G, v)}%</span></div><Meter pct={v} blue /></div>)}
      <p className="faint t-micro">Locals love home-grown players and Dashain visits; abroad fans follow stars; students respond to ticket prices and school clinics.</p>
    </div>);
}
function Feed({ G }) {
  const F = G.s.office.feed;
  return (
    <div>
      <h2 className="sec">{T(G, 'Fan feed', 'समर्थकको आवाज')}</h2>
      {F.length ? <ul className="mlist">{F.slice(0, 6).map((x, i) => <li key={i} style={{ padding: '8px 0' }}><span className="grow t-small">{x.ne ? <><span className="ne">“{x.ne}”</span><br /><span className="l2">“{x.en}” · {x.who} · {x.likes.toLocaleString()} likes</span></> : <>“{x.en}”<br /><span className="l2">{x.who} · {x.likes.toLocaleString()} likes</span></>}</span></li>)}</ul>
        : <p className="faint t-small">The feed fills up once the matches start. Fans are generated.</p>}
      <p className="faint t-micro" style={{ marginTop: 6 }}>Sentiment: {nn(G, G.s.office.sent)}% positive this week.</p>
    </div>);
}

export default function Commercial() {
  const { G, update, toast } = useGame(); const narrow = useNarrow();
  const [tab, setTab] = useTab(['sponsors', 'community', 'fans'], 'sponsors');
  const act = (fn) => update(() => { const e = fn(); if (e) toast(e); else autosave(G); });
  const S = G.s.office.sp; const sub = `${S.offers.length ? `${S.offers.length} offer${S.offers.length > 1 ? 's' : ''} on the table` : 'No new offers'} · fan support ${Math.round(G.teams[G.user].fans)} · brand names are generated`;
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'Sponsors and fans'), sub: '', right: <>Sentiment<br /><b>{nn(G, G.s.office.sent)}%</b></> }} label="Sponsors and fans" tab={tab} onTab={setTab}
      tabs={[['sponsors', T(G, 'Sponsors', 'प्रायोजक'), S.offers.length || null], ['community', T(G, 'Community', 'समुदाय')], ['fans', T(G, 'Fans', 'समर्थक')]]}>
      <div style={{ paddingTop: 12 }} className="stack">
        {tab === 'sponsors' && <><Offers G={G} act={act} phone /><Merch G={G} update={update} /></>}
        {tab === 'community' && <Community G={G} act={act} />}
        {tab === 'fans' && <><Fans G={G} /><Feed G={G} /></>}
      </div>
    </MScreen>);
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title={tn(G, 'Sponsors and fans')} sub={sub} />
      <div className="split" style={{ gap: 40, gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>
        <section className="stack" style={{ gap: 30 }}><Offers G={G} act={act} /><Community G={G} act={act} /><Merch G={G} update={update} /></section>
        <aside className="stack" style={{ gap: 24 }}><Fans G={G} /><Feed G={G} /></aside>
      </div>
    </div>);
}
