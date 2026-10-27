import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Ovs } from '../components/bits.jsx';
import { Icon } from '../components/icons.jsx';
import { stageName, tname, tshort } from '../lib/util.js';

const sr = (r, b) => (b ? Math.round((100 * r) / b) : '–');
const ov = (balls) => `${Math.floor(balls / 6)}${balls % 6 ? `.${balls % 6}` : ''}`;

function Innings({ G, c, other }) {
  return (
    <>
      <section className="panel flush"><div className="tblscroll"><table className="tbl compact plain sc-tbl"><thead><tr><th>Batter</th><th className="r">R</th><th className="r">B</th><th className="r wide">4s</th><th className="r wide">6s</th><th className="r">SR</th></tr></thead>
        <tbody>{c.bat.map((b, i) => <tr key={i}><td className="wrapcell"><span className="t-small b6">{b[0]}</span><br /><span className="t-micro faint">{b[5]}</span></td><td className="r board-f sc-r">{b[1]}</td><td className="r t-micro faint">{b[2]}</td><td className="r wide t-micro faint">{b[3]}</td><td className="r wide t-micro faint">{b[4]}</td><td className="r t-micro faint">{sr(b[1], b[2])}</td></tr>)}
          <tr><td className="t-small">Extras</td><td className="r t-small">{c.ex}</td><td colSpan={4} /></tr>
          <tr><td className="t-small b6">Total</td><td className="r board-f sc-r">{c.r}/{c.w}</td><td colSpan={4} className="t-micro faint"><Ovs balls={c.b} /> ov · RR {c.b ? (c.r / (c.b / 6)).toFixed(2) : '0.00'}</td></tr></tbody></table></div>
        {c.fow.length > 0 && <p className="t-micro faint" style={{ padding: '6px 10px' }}>Fall of wickets: {c.fow.join(', ')}</p>}</section>
      <section className="panel flush"><div className="tblscroll"><table className="tbl compact plain sc-tbl"><thead><tr><th>{tshort(G, other)} bowling</th><th className="r">O</th><th className="r">R</th><th className="r">W</th><th className="r">Econ</th><th className="r wide">Extras</th></tr></thead>
        <tbody>{c.bowl.map((b, i) => <tr key={i}><td className="t-small">{b[0]}</td><td className="r t-small">{ov(b[1])}</td><td className="r t-small">{b[2]}</td><td className="r board-f sc-r">{b[3]}</td><td className="r t-micro faint">{b[1] ? (b[2] / (b[1] / 6)).toFixed(2) : '–'}</td><td className="r wide t-micro faint">{b[4]}</td></tr>)}</tbody></table></div></section>
    </>
  );
}

// Top two batters and bowlers on each side.
function Summary({ G, card }) {
  return (
    <div className="two-col">{card.map((c, i) => { const other = card[1 - i];
      const bats = c.bat.slice().sort((a, b) => b[1] - a[1]).slice(0, 2); const bowls = other ? other.bowl.slice().sort((a, b) => b[3] - a[3] || a[2] - b[2]).slice(0, 2) : [];
      return (
        <section key={i} className="panel stack" style={{ gap: 6 }}><p className="t-small b6 row" style={{ gap: 6, alignItems: 'center' }}><Dot id={c.t} />{tname(G, c.t)} · {c.r}/{c.w} (<Ovs balls={c.b} />)</p>
          <p className="t-micro faint">Top batters</p>{bats.map((b) => <p key={b[0]} className="sechead t-small" style={{ margin: 0 }}><span>{b[0]}</span><span className="b6">{b[1]}{b[5] === 'not out' ? '*' : ''} ({b[2]})</span></p>)}
          {other && <><p className="t-micro faint">Took the wickets for {tshort(G, other.t)}</p>{bowls.map((b) => <p key={b[0]} className="sechead t-small" style={{ margin: 0 }}><span>{b[0]}</span><span className="b6">{b[3]}/{b[2]} ({ov(b[1])})</span></p>)}</>}
        </section>); })}</div>
  );
}

export default function Scorecard() {
  const { G, ui } = useGame(); const { n } = useParams(); const [q, setQ] = useSearchParams();
  const f = G.s.fixtures.find((x) => String(x.n) === String(n));
  let card, res;
  if (f && f.card) { card = f.card; res = f.res; } else if (f && ui.live && ui.live.f === f) { card = G.compactCard(ui.live.m); res = ui.live.m.result; }
  if (!f || !card) return <p>No scorecard for that match yet.</p>;
  const mom = res && res.mom ? G.P(res.mom) : null;
  // "Lumbini Lions won by 4 wickets (4 balls left)" → headline and margin
  const text = res ? res.text.replace(/\.$/, '') : 'In progress'; const m = /^(.*?) \((\d+) balls? left\)$/.exec(text);
  const head = (m ? m[1] : text).replace(/^(\S+)( \S+)? won/, (all, a) => `${a} won`); const extra = m ? `with ${m[2]} ball${m[2] === '1' ? '' : 's'} to spare` : res && res.winner ? '' : '';
  const momLine = mom ? (() => { for (const c of card) { const b = c.bat.find((x) => x[0] === mom.name); const w = card.flatMap((x) => x.bowl).find((x) => x[0] === mom.name); const bits = []; if (b) bits.push(`${b[1]}${b[5] === 'not out' ? '*' : ''} off ${b[2]}`); if (w && w[3]) bits.push(`${w[3]}/${w[2]}`); if (bits.length) return bits.join(', '); } return ''; })() : '';
  const tabs = card.map((c, i) => [String(i), `${tshort(G, c.t)} ${c.r}/${c.w}`]).concat([['sum', 'Summary']]);
  const tab = tabs.some(([k]) => k === q.get('inn')) ? q.get('inn') : String(card.length - 1 >= 0 ? (card.length > 1 ? 1 : 0) : 0);
  return (
    <div className="scorepg stack" style={{ gap: 14 }}>
      <div className="sechead" style={{ alignItems: 'center' }}>
        <Link to="/season?tab=results" className="t-small row" style={{ gap: 4, alignItems: 'center' }}><Icon name="back" size={18} />Results</Link>
        <span className="t-micro faint">{f.date} · Kirtipur</span>
      </div>
      <h1 className="t-h3">Scorecard · {stageName(f)}</h1>
      <section className="board scboard">
        <p className="bf sc-head">{head}</p>{extra && <p className="blbl">{extra}</p>}
        <div className="sc-sides">{card.map((c, i) => <div key={i}><p className="blbl row" style={{ gap: 6, alignItems: 'center' }}><Dot id={c.t} />{tshort(G, c.t)}</p><p className="bf sc-score">{c.r}/{c.w} <span>{ov(c.b)}</span></p></div>)}</div>
        {mom && <p className="blbl">Player of the match: <b>{mom.name}</b>{momLine ? `, ${momLine}` : ''}</p>}
      </section>
      <div className="tabs" role="tablist" aria-label="Innings" style={{ gridTemplateColumns: `repeat(${tabs.length},minmax(0,1fr))`, margin: 0, maxWidth: 560 }}>
        {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setQ({ inn: k }, { replace: true })}>{l}</button>)}
      </div>
      {tab === 'sum' ? <Summary G={G} card={card} /> : <Innings G={G} c={card[+tab]} other={card[1 - +tab] ? card[1 - +tab].t : (card[+tab].t === f.home ? f.away : f.home)} />}
    </div>
  );
}
