// Small pieces shared by the world screens: a nation's dot, and a scorecard that reads both the fast
// sim's compact card and the engine's (which also has dismissals, extras and the fall of wickets).
import { useGame } from '../lib/store.jsx';
import { wp } from '../world/players.js';
import { teamName } from '../world/state.js';
import { userNation } from '../world/career.js';

// NPL franchises keep their colours; nations use blue for yours, a quiet grey for the rest.
export function NDot({ id, big }) {
  const { G } = useGame(); const npl = G.teams[id]; const mine = id && id === userNation(G);
  return <i className={`dot${npl ? ` t-${String(id).toLowerCase()}` : ''}`} style={{ ...(npl ? {} : { background: mine ? 'var(--blue)' : 'var(--rule-strong)' }), ...(big ? { width: 12, height: 12 } : {}) }} />;
}
export const pname = (G, id) => { const p = wp(G, id); return p ? p.name : id; };
const ov = (b) => `${Math.floor(b / 6)}${b % 6 ? `.${b % 6}` : ''}`;
export function ScoreCard({ card, res }) {
  const { G } = useGame(); if (!card || !card.length) return <p className="t-small faint">No scorecard for this match.</p>;
  return (
    <div className="stack" style={{ gap: 10 }}>
      {card.map((inn, k) => (
        <div key={k}>
          <h3 style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span><NDot id={inn.t} />{teamName(G, inn.t)}</span><span className="num">{inn.r}/{inn.w} <span className="faint" style={{ fontWeight: 400 }}>({ov(inn.b)} ov)</span></span></h3>
          <div className="tblwrap"><table className="tbl compact plain">
            <thead><tr><th style={{ paddingLeft: 0 }}>Batter</th><th className="r">R</th><th className="r">B</th><th className="r">4s</th><th className="r">6s</th><th className="r">SR</th></tr></thead>
            <tbody>{inn.bat.map(([id, r, b, f4, s6, how, txt]) => <tr key={id}><td style={{ paddingLeft: 0 }}>{pname(G, id)} <span className="faint t-micro">{txt || (how === 'out' ? 'out' : 'not out')}</span></td><td className="r b6">{r}</td><td className="r">{b}</td><td className="r faint">{f4}</td><td className="r faint">{s6}</td><td className="r faint">{b ? ((100 * r) / b).toFixed(1) : '–'}</td></tr>)}
              {inn.ex != null && <tr><td style={{ paddingLeft: 0 }} className="faint">Extras</td><td className="r">{inn.ex}</td><td colSpan={4} /></tr>}</tbody></table></div>
          <div className="tblwrap" style={{ marginTop: 6 }}><table className="tbl compact plain">
            <thead><tr><th style={{ paddingLeft: 0 }}>Bowler</th><th className="r">O</th><th className="r">R</th><th className="r">W</th><th className="r">Econ</th></tr></thead>
            <tbody>{inn.bowl.map(([id, balls, r, w]) => <tr key={id}><td style={{ paddingLeft: 0 }}>{pname(G, id)}</td><td className="r">{ov(balls)}</td><td className="r">{r}</td><td className="r b6">{w}</td><td className="r faint">{balls ? (r / (balls / 6)).toFixed(2) : '–'}</td></tr>)}</tbody></table></div>
          {inn.fow && inn.fow.length > 0 && <p className="t-micro mut" style={{ marginTop: 6 }}><span className="faint">FoW</span> {inn.fow.map((x) => x.split(' (')[0]).join(', ')}</p>}
        </div>))}
      {res && <p className="t-small"><b>{res.text}.</b>{res.pom ? <span className="mut"> Player of the match: {pname(G, res.pom)}.</span> : null}{res.live ? <span className="faint"> Played ball by ball.</span> : <span className="faint"> Simulated.</span>}</p>}
    </div>
  );
}
