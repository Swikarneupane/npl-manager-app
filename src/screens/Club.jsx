import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Meter, PageHead } from '../components/bits.jsx';
import { fmtL } from '../game/engine.js';
import { ordinal, STAFF_POSTS } from '../game/game.js';
import { boardMood, seasonNo, tname, tshort, tr } from '../lib/util.js';
import { autosave } from '../lib/save.js';
import { gradeOfL } from '../game/office.js';
import '../styles/office.css';

const attendance = (t, price) => Math.min(15000, Math.round((6000 + t.fans * 110) * Math.pow(500 / price, 0.85)));

export default function Club() {
  const { G, ui, update, setG } = useGame(); const nav = useNavigate(); const s = G.s, t = G.teams[G.user];
  const L0 = t.ledger || { gate: 0, sponsor: 0, central: 0, prize: 0, wages: 0, staff: 0 };
  const net = ['gate', 'sponsor', 'central', 'prize', 'wages', 'staff', 'merch', 'bonus', 'community', 'facilities'].reduce((a, k) => a + (L0[k] || 0), 0);
  const price = t.ticket, att = attendance(t, price), gate = att * price / 1e5 * 0.3;
  const fanEff = price < 400 ? 'Rises slowly' : price > 900 ? 'Falls slowly' : 'Steady';
  const fm = t.fans >= 75 ? 'Passionate' : t.fans >= 60 ? 'Warm' : t.fans >= 45 ? 'Lukewarm' : 'Cool';
  const st = G.standings();
  const mc = s.manager.career.filter((x) => x.team === G.user); const bestFin = mc.slice().sort((a, b) => a.pos - b.pos)[0];
  const vacant = STAFF_POSTS.filter(([k]) => !G.s.staff[G.user][k]);
  const R = ({ k, v }) => <tr><td style={{ paddingLeft: 0 }}>{k}</td><td className="r">{v}</td></tr>;
  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHead title={tr(G, 'Club')} sub={t.name} />
      {s.sacked && <section className="panel stack" style={{ gap: 10, marginBottom: 28, borderColor: 'var(--crimson)' }}><h2 className="t-h2">You have been dismissed.</h2><p className="mut">The {t.name} board has ended your contract. Board confidence fell to {t.board}.</p>
        <table className="tbl plain compact"><tbody><R k={`Your time at ${tshort(G, G.user)}`} v={`${mc.length} season${mc.length === 1 ? '' : 's'}`} />{bestFin && <R k="Best finish" v={`${bestFin.champ ? 'Champions' : bestFin.runner ? 'Runners-up' : ordinal(bestFin.pos)}, ${bestFin.year}`} />}</tbody></table>
        <div className="row"><button className="btn btn-lg" onClick={() => setG(null)}>Start a new game</button></div></section>}
      <div className="clubgrid">
        <section className="board cboard"><p className="blbl">Club balance</p><p className="bf cb-v">{fmtL(t.balance)}</p><p className="blbl">{net >= 0 ? '+' : '−'} {fmtL(Math.abs(net))} this season so far</p></section>
        <div className="two">
          <section className="panel stack" style={{ gap: 4 }}><p className="t-micro faint">Board confidence</p><p className="board-f cb-n">{t.board}</p><Meter pct={t.board} blue /><p className="t-micro mut">{boardMood(t.board)} · {((t.objective || {}).txt || '—').replace(/^\w/, (x) => x.toLowerCase())}</p></section>
          <section className="panel stack" style={{ gap: 4 }}><p className="t-micro faint">Fan support</p><p className="board-f cb-n">{Math.round(t.fans)}</p><Meter pct={t.fans} blue /><p className="t-micro mut">{fm} · {fanEff.toLowerCase()}</p></section>
        </div>
        <Link to="/staff" className="panel staff-link" style={{ marginTop: 0 }}><span><span className="t-small b6">Staff room</span><br />{vacant.length ? <span className="t-micro crim">{vacant.slice(0, 2).map((x) => x[1]).join(' and ')}{vacant.length > 2 ? ` and ${vacant.length - 2} more` : ''} vacant</span> : <span className="t-micro faint">{STAFF_POSTS.slice(0, 4).map(([k, l]) => `${l} ${gradeOfL(G.s.staff[G.user][k].level)}`).join(' · ')}</span>}</span><span className="t-micro faint">{STAFF_POSTS.length - vacant.length} of {STAFF_POSTS.length} hired · {fmtL(G.staffWages(G.user))}</span><span aria-hidden="true">›</span></Link>
        <div className="of-links">{[['/board', 'Board meeting', 'Objectives, pillars, requests'], ['/commercial', 'Sponsors and fans', 'Deals, events, merchandise'], ['/recruitment', 'Recruitment meeting', 'Gaps and auction targets'], ['/contract/list', 'Contract talks', 'Deals that end this window']].map(([to, l, d]) => <Link key={to} to={to} className="panel staff-link" style={{ marginTop: 0 }}><span><span className="t-small b6">{l}</span><br /><span className="t-micro faint">{d}</span></span><span aria-hidden="true">›</span></Link>)}</div>
        <section className="panel stack" style={{ gap: 10 }}><div className="sechead" style={{ margin: 0, alignItems: 'center' }}><h2 className="t-h3">Ticket price</h2><span className="board-f cb-n">Rs {price}</span></div>
          <input type="range" min="200" max="1500" step="50" value={price} onChange={(e) => update(() => { t.ticket = +e.target.value; })} aria-label="Ticket price" />
          <div className="three"><div><p className="t-micro faint">Crowd</p><p className="t-small">{att.toLocaleString()}</p></div><div><p className="t-micro faint">Gate / match</p><p className="t-small">{fmtL(gate)}</p></div><div><p className="t-micro faint">Fans</p><p className="t-small">{fanEff}</p></div></div></section>
        <section className="panel"><div className="sechead" style={{ margin: 0 }}><h2 className="t-h3">This season's money</h2><span className="t-micro faint">Season {seasonNo(G.year)}</span></div>
          <ul className="rules">{[['Gate receipts', L0.gate], ['Sponsorship', L0.sponsor], ['Central pool', L0.central], ['Prize money', L0.prize], ['Merchandise', L0.merch || 0], ['Player wages', L0.wages], ['Contract bonuses', L0.bonus || 0], ['Community', L0.community || 0], ['Facilities', L0.facilities || 0], [L0.staffFees ? `Staff wages (incl. ${fmtL(L0.staffFees)} release fees)` : 'Staff wages', L0.staff]].filter(([k, v]) => v || !['Prize money', 'Merchandise', 'Contract bonuses', 'Community', 'Facilities'].includes(k)).map(([k, v]) => <li key={k}><span className="t-small">{k}</span><span className={`t-small ${v < 0 ? '' : 'b6'}`}>{v < 0 ? '−' : '+'} {fmtL(Math.abs(v))}</span></li>)}
            <li><span className="t-small b6">Net</span><span className="t-small b6">{net < 0 ? '−' : '+'} {fmtL(Math.abs(net))}</span></li></ul>
          <p className="t-micro faint" style={{ marginTop: 6 }}>Prize money after the final: Rs 1 cr champions, Rs 50 L runners-up.</p></section>
      </div>
      <section className="panel" style={{ marginTop: 16 }}><div className="sechead" style={{ margin: 0 }}><h2 className="t-h3">Job offers</h2><span className="t-micro faint">Reputation {s.manager.rep}</span></div>
        {(s.offers || []).length ? <table className="tbl plain compact"><tbody>{s.offers.map((id) => { const o = G.teams[id]; return (
          <tr key={id}><td style={{ paddingLeft: 0 }}><Dot id={id} />{o.name}</td><td className="mut t-small">Finished {ordinal(st.findIndex((x) => x.id === id) + 1)} · purse {fmtL(o.purse)} · {o.persona.toLowerCase()} owners</td>
            <td className="r"><button className="btn btn-sm" onClick={() => { update(() => { G.takeJob(id); ui.live = null; autosave(G); }); nav('/'); }}>Take the job</button></td></tr>); })}</tbody></table>
          : <p className="t-small mut">No offers right now. Win, and they will come.</p>}</section>
      <section style={{ marginTop: 28 }}><h2 className="t-h3" style={{ marginBottom: 10 }}>Your career</h2><table className="tbl plain compact"><tbody>
        {s.manager.career.length ? s.manager.career.slice().reverse().map((c) => <tr key={c.year}><td style={{ paddingLeft: 0 }}>{seasonNo(c.year)} · {c.year}</td><td><Dot id={c.team} />{tname(G, c.team)}</td><td>{c.champ ? <b className="gld">Champions</b> : c.runner ? 'Runners-up' : ordinal(c.pos)}</td></tr>) : <tr><td className="faint" style={{ paddingLeft: 0 }}>First season in charge.</td></tr>}</tbody></table></section>
    </div>
  );
}
