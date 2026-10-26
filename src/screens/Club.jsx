import { useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Meter, PageHead } from '../components/bits.jsx';
import { fmtL } from '../game/engine.js';
import { ordinal } from '../game/game.js';
import { boardMood, seasonNo, tname, tshort, tr } from '../lib/util.js';
import { autosave } from '../lib/save.js';

const attendance = (t, price) => Math.min(15000, Math.round((6000 + t.fans * 110) * Math.pow(500 / price, 0.85)));

export default function Club() {
  const { G, ui, update, setG } = useGame(); const nav = useNavigate(); const s = G.s, t = G.teams[G.user];
  const L0 = t.ledger || { gate: 0, sponsor: 0, central: 0, prize: 0, wages: 0, staff: 0 };
  const net = Object.values(L0).reduce((a, b) => a + b, 0);
  const price = t.ticket, att = attendance(t, price), gate = att * price / 1e5 * 0.3;
  const fanEff = price < 400 ? 'Rises slowly' : price > 900 ? 'Falls slowly' : 'Steady';
  const fm = t.fans >= 75 ? 'Passionate' : t.fans >= 60 ? 'Warm' : t.fans >= 45 ? 'Lukewarm' : 'Cool';
  const st = G.standings();
  const mc = s.manager.career.filter((x) => x.team === G.user); const bestFin = mc.slice().sort((a, b) => a.pos - b.pos)[0];
  const R = ({ k, v }) => <tr><td style={{ paddingLeft: 0 }}>{k}</td><td className="r">{v}</td></tr>;
  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHead title={tr(G, 'Club')} sub="Finance, fans and the board" />
      {s.sacked && <section className="panel stack" style={{ gap: 10, marginBottom: 28, borderColor: 'var(--crimson)' }}><h2 className="t-h2">You have been dismissed.</h2><p className="mut">The {t.name} board has ended your contract. Board confidence fell to {t.board}.</p>
        <table className="tbl plain compact"><tbody><R k={`Your time at ${tshort(G, G.user)}`} v={`${mc.length} season${mc.length === 1 ? '' : 's'}`} />{bestFin && <R k="Best finish" v={`${bestFin.champ ? 'Champions' : bestFin.runner ? 'Runners-up' : ordinal(bestFin.pos)}, ${bestFin.year}`} />}</tbody></table>
        <div className="row"><button className="btn btn-lg" onClick={() => setG(null)}>Start a new game</button></div></section>}
      <div className="cols">
        <section className="panel stack" style={{ gap: 10 }}><h2 className="sec" style={{ margin: 0 }}>Balance</h2><p className="t-display">{fmtL(t.balance)}</p>
          <table className="tbl plain compact"><tbody><tr><td style={{ paddingLeft: 0 }} colSpan={2} className="faint">Season {seasonNo(G.year)} so far</td></tr>
            <R k="Gate receipts" v={fmtL(L0.gate)} /><R k="Sponsorship" v={fmtL(L0.sponsor)} /><R k="Central pool" v={fmtL(L0.central)} /><R k="Prize money" v={fmtL(L0.prize)} />
            <R k="Wages" v={`− ${fmtL(-L0.wages)}`} /><R k="Staff and operations" v={`− ${fmtL(-L0.staff)}`} /><R k={<b>Net</b>} v={<b>{net < 0 ? '− ' : ''}{fmtL(Math.abs(net))}</b>} /></tbody></table>
          <p className="faint t-small">Prize money is paid after the final: Rs 1 cr to the champions, Rs 50 L to the runners-up.</p></section>
        <section className="stack" style={{ gap: 20 }}>
          <div className="panel stack" style={{ gap: 10 }}><h2 className="sec" style={{ margin: 0 }}>Ticket price</h2><p className="t-display" style={{ fontSize: 36 }}>Rs {price}</p>
            <input type="range" min="200" max="1500" step="50" value={price} onChange={(e) => update(() => { t.ticket = +e.target.value; })} aria-label="Ticket price" />
            <div style={{ display: 'flex', justifyContent: 'space-between' }} className="faint t-micro"><span>Rs 200</span><span>Rs 1,500</span></div>
            <table className="tbl plain compact"><tbody><R k="Projected crowd" v={att.toLocaleString()} /><R k="Gate per home match" v={fmtL(gate)} /><R k="Effect on fan support" v={fanEff} /></tbody></table></div>
          <div className="panel stack" style={{ gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }} className="t-small"><span className="mut">Board confidence</span><span className="num">{t.board} · {boardMood(t.board)}</span></div><Meter pct={t.board} blue />
            <p className="faint t-micro">Objective: {(t.objective || {}).txt || '—'}. Below 30 at the end-of-season review and you are dismissed.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} className="t-small"><span className="mut">Fan support</span><span className="num">{Math.round(t.fans)} · {fm}</span></div><Meter pct={t.fans} />
            <p className="faint t-micro">Rises with wins and fair ticket prices.</p></div>
        </section>
      </div>
      <section style={{ marginTop: 28 }}><h2 className="t-h3" style={{ marginBottom: 10 }}>Job offers</h2>
        {(s.offers || []).length ? <table className="tbl plain compact"><tbody>{s.offers.map((id) => { const o = G.teams[id]; return (
          <tr key={id}><td style={{ paddingLeft: 0 }}><Dot id={id} />{o.name}</td><td className="mut t-small">Finished {ordinal(st.findIndex((x) => x.id === id) + 1)} · purse {fmtL(o.purse)} · {o.persona.toLowerCase()} owners</td>
            <td className="r"><button className="btn btn-sm" onClick={() => { update(() => { G.takeJob(id); ui.live = null; autosave(G); }); nav('/'); }}>Take the job</button></td></tr>); })}</tbody></table>
          : <p className="faint">No offers right now. Win, and they will come.</p>}</section>
      <section style={{ marginTop: 28 }}><h2 className="t-h3" style={{ marginBottom: 10 }}>Your career</h2><table className="tbl plain compact"><tbody>
        {s.manager.career.length ? s.manager.career.slice().reverse().map((c) => <tr key={c.year}><td style={{ paddingLeft: 0 }}>{seasonNo(c.year)} · {c.year}</td><td><Dot id={c.team} />{tname(G, c.team)}</td><td>{c.champ ? <b className="gld">Champions</b> : c.runner ? 'Runners-up' : ordinal(c.pos)}</td></tr>) : <tr><td className="faint" style={{ paddingLeft: 0 }}>First season in charge.</td></tr>}</tbody></table></section>
    </div>
  );
}
