import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Modal, Role } from '../components/bits.jsx';
import { ovr, fmtL } from '../game/engine.js';
import { COUNTRY_NAMES } from '../game/data.js';
import { AuctionRoom } from '../lib/auction.js';
import { potRange, seasonNo, tname, tshort } from '../lib/util.js';
import { autosave } from '../lib/save.js';

function Lot({ room }) {
  const { G, toast } = useGame(); const a = room.A, c = a.cur; if (!c) return null;
  const p = G.P(c.pid); const st = p.stats[G.year - 1];
  const lastS = st ? `Season ${seasonNo(G.year - 1)}: ${st.r} runs, ${st.w} wkts${st.team ? ` for ${tname(G, st.team)}` : ''}` : p.uncapped ? 'Uncapped' : 'No NPL matches last season';
  const rtmHolder = p.prevTeam && a.kind === 'mega' && G.teams[p.prevTeam].rtm > 0 ? `${tshort(G, p.prevTeam)} hold an RTM card` : '';
  const nb = G.nextBidAmount(); const lead = c.leader;
  const status = c.done ? (lead ? 'Sold to' : 'Unsold') : lead ? (room.count === 1 ? 'Going once…' : room.count >= 2 ? 'Going twice…' : 'Leading bid') : room.count ? 'No bids yet…' : 'Awaiting opening bid';
  const hist = c.hist.slice().reverse().slice(0, 8);
  const roleName = { AR: 'All-rounder', WK: 'Wicketkeeper', BAT: 'Batter', BOWL: 'Bowler' }[p.role];
  return (
    <>
      <div className="board" style={{ padding: '22px 26px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
          <div className="stack" style={{ gap: 4 }}><span className="blbl">Lot {a.i + (c.done ? 0 : 1)} · {c.set} · {roleName}</span><span className="bf" style={{ fontSize: 44, lineHeight: 1 }}>{p.name}</span><span className="blbl" style={{ fontSize: 14 }}>{COUNTRY_NAMES[p.nat] || p.nat} · {p.age} · bat {p.bat} · bowl {p.bowl || '–'} · potential {potRange(p)} · {lastS}</span></div>
          <div className="stack" style={{ gap: 4, textAlign: 'right', marginLeft: 'auto' }}><span className="blbl">Base price</span><span className="bf mid">{fmtL(c.base)}</span><span className="blbl">{rtmHolder}</span></div>
        </div>
        <div style={{ borderTop: '1px solid var(--board-rule)', marginTop: 18, paddingTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div className="stack" style={{ gap: 4 }}><span className="blbl">{c.bid == null ? 'Opening at' : 'Current bid'}</span><span className="bf" style={{ fontSize: 76, lineHeight: 0.9 }}><span key={c.hist.length} className={room.tickCls}>{fmtL(c.bid == null ? c.base : c.bid)}</span></span></div>
          <div className="stack" style={{ gap: 6, textAlign: 'right' }}><span className="blbl">{status}</span><span className="bf" style={{ fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{lead ? <><Dot id={lead} big />{tname(G, lead)}</> : '—'}</span></div>
        </div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        {c.done ? <button type="button" className="btn btn-blue btn-lg" style={{ flex: '1 1 auto' }} onClick={() => room.next()}>{a.lots[a.i] ? 'Next lot' : 'Go to the accelerated round'}</button>
          : <><button type="button" className="btn btn-primary btn-lg" style={{ flex: '2 1 220px', fontSize: 16 }} disabled={!room.canUserBid()} onClick={() => { const e = room.bid(); if (e) toast(e); }}>Bid {fmtL(nb)}</button>
            <button type="button" className="btn btn-lg" style={{ flex: '1 1 120px' }} disabled={c.userPassed} onClick={() => room.pass()}>{c.userPassed ? 'Passed' : 'Pass'}</button></>}
      </div>
      <p className="faint t-small">{p.nat === 'NEP' ? 'Increments: Rs 0.5 L up to Rs 10 L, Rs 1 L to Rs 20 L, Rs 2 L above. Comes out of the domestic purse.' : 'Increments: Rs 1 L up to Rs 20 L, Rs 2 L to Rs 50 L, Rs 5 L above. Overseas lots come out of the overseas purse.'}</p>
      <div><h2 className="sec">Bid history</h2><table className="tbl plain compact"><tbody>
        {hist.map((h, i) => <tr key={i} className={i > 0 ? 'dim' : ''}><td style={{ paddingLeft: 0 }}><Dot id={h[0]} />{tname(G, h[0])}{h[2] ? ' · RTM' : ''}</td><td className="r num">{fmtL(h[1])}</td></tr>)}
        <tr className="dim"><td style={{ paddingLeft: 0 }}>Base price</td><td className="r num">{fmtL(c.base)}</td></tr></tbody></table></div>
    </>
  );
}

function Accelerated({ room }) {
  const { G, update, toast, ui } = useGame(); const nav = useNavigate();
  const pool = Object.values(G.players).filter((p) => !p.team && !p.retired).sort((x, y) => ovr(y) - ovr(x)).slice(0, 40);
  const n = G.slotsNeeded(G.user); const t = G.teams[G.user];
  const finish = () => { update(() => { G.finishAuction(); G.s.phase = 'preseason'; G.aiPreseason(); G.setObjectives(); autosave(G); ui.auc = null; }); nav('/signings'); };
  return (
    <section className="stack" style={{ gap: 16 }}>
      <div className="panel stack" style={{ gap: 8 }}><h2 className="t-h3">Accelerated round</h2>
        <p className="t-small mut">Sign unsold players at their base price. You need {n.nep} more Nepali and {n.os} more overseas to reach the minimum (18 players, 6 overseas). Purses: domestic {fmtL(t.purse)}, overseas {fmtL(t.osPurse)}.</p>
        <div className="row"><button className="btn btn-primary btn-lg" onClick={finish}>Finish auction</button></div>
        <p className="faint t-small">Other franchises fill their squads when you finish. Overseas gaps can still be filled in the pre-season signing window.</p></div>
      <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Player</th><th>Nat</th><th className="r">Age</th><th>Role</th><th className="r">Rating</th><th className="r">Base</th><th /></tr></thead>
        <tbody>{pool.map((p) => <tr key={p.id}><td className="name"><Link to={`/player/${p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link></td><td>{p.nat}</td><td className="r">{p.age}</td><td><Role r={p.role} /></td><td className="r">{ovr(p)}</td><td className="r">{fmtL(p.nat === 'NEP' ? G.basePrice(p) : p.value)}</td>
          <td className="r"><button className="btn btn-sm" onClick={() => update(() => { const e = G.signFA(p.id, G.user); if (e) toast(e); else { room.A.sold.push({ pid: p.id, team: G.user, price: p.salary, set: 'Accelerated' }); toast(`${p.name} signed at ${fmtL(p.salary)}.`); } })}>Sign</button></td></tr>)}</tbody></table></div>
    </section>
  );
}

export default function Auction() {
  const { G, ui, update } = useGame();
  const a = G.s.auction;
  if (G.s.phase === 'auction' && a && (!ui.auc || ui.auc.G !== G)) ui.auc = new AuctionRoom(G, update);
  const room = ui.auc;
  useEffect(() => { if (!room) return undefined; room.onChange = update; room.ensureLot(); update(); return () => room.stop(); }, [room, update]);
  if (G.s.phase !== 'auction' || !a || !room) return <><h1 className="t-h1">Auction</h1><p className="mut" style={{ marginTop: 8 }}>The auction opens in the off-season, after retention.</p></>;
  const ended = !a.lots[a.i] && (!a.cur || a.cur.done) && room.state !== 'done' || room.state === 'end';
  const sl = room.shortlist();
  const ticker = (a.log || []).slice(0, 10);
  const upcoming = a.lots.slice(a.i + (a.cur && !a.cur.done ? 1 : 0)).slice(0, 60);
  const shortRows = sl.filter((id) => { const p = G.P(id); return p && !p.team; });
  return (
    <div style={{ maxWidth: 1220 }}>
      <div className="pagehead" style={{ marginBottom: 20 }}>
        <div className="stack" style={{ gap: 2 }}><h1 className="t-h1">{a.kind === 'mega' ? 'Mega' : 'Mini'} auction {G.year}</h1><p className="mut">{ended ? 'Main auction complete' : `Lot ${Math.min(a.lots.length, a.i + 1)} of ${a.lots.length} · ${(a.lots[a.i] || a.lots[a.i - 1] || {}).set || ''}`} · {a.sold.length} sold, {a.unsold.length} unsold</p></div>
        {!ended && <div className="row" style={{ gap: 8 }}><button type="button" className="btn" onClick={() => room.skip()}>Skip lot</button><button type="button" className="btn" onClick={() => room.jump()}>Jump to my next shortlisted lot</button><button type="button" className="btn btn-ghost" title="Your team bids automatically to fill squad needs" onClick={() => room.simRest()}>Sim rest of auction</button></div>}
      </div>
      <div className="split asplit" style={{ gap: 32 }}>
        {ended ? <Accelerated room={room} /> : <section className="stack" style={{ gap: 20 }}><Lot room={room} /></section>}
        <aside className="stack" style={{ gap: 28 }}>
          <section><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 className="sec">My shortlist</h2><span className="faint t-micro">Max bid set</span></div>
            {shortRows.length ? <table className="tbl plain compact"><tbody>{shortRows.map((id) => { const p = G.P(id); const idx = a.lots.findIndex((l) => l.pid === id); return (
              <tr key={id}><td className="faint" style={{ paddingLeft: 0 }}>{idx + 1}</td><td>{p.name} <Role r={p.role} /></td><td className="r"><input className="input" type="number" step="0.5" min="0" defaultValue={a.maxBid[id] || ''} placeholder="Max" style={{ width: 76, height: 32 }} onChange={(e) => { a.maxBid[id] = +e.target.value || 0; }} aria-label={`Max bid for ${p.name}`} /></td><td className="faint t-micro">{p.prevTeam === G.user && a.kind === 'mega' ? 'RTM' : ''}</td></tr>); })}</tbody></table>
              : <p className="faint t-small">Shortlist players from the lots below. With a max bid set, your team bids for them automatically, including when you skip or jump.</p>}</section>
          <section><h2 className="sec">Sold and unsold</h2><ol className="feed">{ticker.length ? ticker.map((x, i) => { const p = G.P(x.pid); return (
            <li key={i} style={{ display: 'grid', gridTemplateColumns: '56px minmax(0,1fr) auto', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--rule)', fontSize: 14 }}><span className={x.team ? 'up' : 'faint'}>{x.team ? 'Sold' : 'Unsold'}</span><span><span style={{ fontWeight: 500 }}>{p.name}</span> <span className="faint">{x.team ? `to ${tshort(G, x.team)}` : ''}</span></span><span className="num mut">{x.team ? fmtL(x.price) : ''}</span></li>); }) : <li className="faint t-small">Nothing yet.</li>}</ol></section>
        </aside>
      </div>
      <section style={{ marginTop: 32 }}><h2 className="t-h3" style={{ marginBottom: 10 }}>Purses and open slots</h2>
        <div className="tblwrap"><table className="tbl"><thead><tr><th>Team</th><th className="r">Domestic purse</th><th className="r">Overseas purse</th><th className="r">Squad</th><th className="r">Nepali slots open</th><th className="r">Overseas slots open</th><th className="r">RTM cards</th></tr></thead>
          <tbody>{Object.values(G.teams).map((t) => <tr key={t.id} className={t.id === G.user ? 'me' : ''}><td><Dot id={t.id} />{t.name}</td><td className="r">{fmtL(t.purse)}</td><td className="r">{fmtL(t.osPurse)}</td><td className="r">{t.squad.length}</td><td className="r">{Math.max(0, 14 - (t.squad.length - G.osCount(t.id)))}</td><td className="r">{Math.max(0, 8 - G.osCount(t.id))}</td><td className="r">{t.rtm || 0}</td></tr>)}</tbody></table></div>
        <p className="faint t-small" style={{ marginTop: 8 }}>Squads hold 18 to 22 players, of whom 6 to 8 are overseas.</p></section>
      {upcoming.length > 0 && <section style={{ marginTop: 32 }}><h2 className="t-h3" style={{ marginBottom: 10 }}>Upcoming lots</h2>
        <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Lot</th><th>Player</th><th>Nat</th><th className="r">Age</th><th>Role</th><th className="r">Rating</th><th className="r">Potential</th><th className="r">Base</th><th>Set</th><th /></tr></thead>
          <tbody>{upcoming.map((l) => { const p = G.P(l.pid); const on = sl.includes(p.id); const idx = a.lots.indexOf(l); return (
            <tr key={l.pid} className={on ? 'me' : ''}><td className="faint">{idx + 1}</td><td className="name">{p.name}</td><td>{p.nat}</td><td className="r">{p.age}</td><td><Role r={p.role} /></td><td className="r">{ovr(p)}</td><td className="r faint">{potRange(p)}</td><td className="r">{fmtL(G.basePrice(p))}</td><td className="faint t-small">{l.set}</td>
              <td><button className={`btn btn-sm ${on ? 'btn-blue' : ''}`} onClick={() => update(() => { const i = sl.indexOf(p.id); if (i >= 0) sl.splice(i, 1); else sl.push(p.id); })}>{on ? 'Shortlisted' : 'Shortlist'}</button></td></tr>); })}</tbody></table></div></section>}
      {room.rtmAsk && <Modal><p className="faint t-small">Right to Match</p><h2 className="t-h2" style={{ marginTop: 6 }}>{G.P(room.rtmAsk.pid).name} sold to {tname(G, room.rtmAsk.team)} for {fmtL(room.rtmAsk.price)}.</h2>
        <p className="mut" style={{ marginTop: 8 }}>He played for you last season. Use one of your {G.teams[G.user].rtm} RTM card{G.teams[G.user].rtm > 1 ? 's' : ''} to match the price and keep him?</p>
        <div className="acts"><button className="btn btn-primary btn-lg" onClick={() => room.answerRTM(true)}>Use RTM · {fmtL(room.rtmAsk.price)}</button><button className="btn btn-lg" onClick={() => room.answerRTM(false)}>Let him go</button></div></Modal>}
    </div>
  );
}
