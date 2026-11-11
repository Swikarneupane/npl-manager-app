// Any competition's season: table(s), fixtures and results with scorecards (fast-sim and engine cards),
// stats leaders from s.wd.st, and how far the stages have gone. Phone: tabs. Desktop: tables and fixtures
// beside the leaders.
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { NDot, ScoreCard, pname } from '../components/NationBits.jsx';
import { useNarrow, fmtNRR } from '../lib/util.js';
import { COMPS } from '../world/comps.js';
import { standings } from '../world/comp.js';
import { teamName } from '../world/state.js';
import { seasonName, userNation } from '../world/career.js';
import { short } from '../world/dates.js';
import '../styles/career.css';

const STAGE = { rr: 'League', events: 'Series events', series: 'Series', super: 'Super Six', ko: 'Knockouts' };
const KO = { SF1: 'Semi-final 1', SF2: 'Semi-final 2', F: 'Final', Q1: 'Qualifier 1', EL: 'Eliminator', Q2: 'Qualifier 2' };
const grpName = (k) => (k === 'all' ? 'Table' : k === 'series' ? 'Series' : k === 'super' ? 'Super Six' : `Group ${k}`);
const stagesOf = (S) => { const def = COMPS[S.comp]; return def ? def.stages : []; };

function Head({ S, m }) {
  const { G } = useGame(); const st = stagesOf(S); const def = COMPS[S.comp] || {};
  return (
    <div className="stack" style={{ gap: 6, marginBottom: m ? 0 : 14 }}>
      {!m && <><p className="t-small faint">{def.kind === 'international' ? 'International' : def.kind || 'Competition'} · {(S.fx[0] && S.fx[0].fmt) === 'T20' ? 'T20' : 'One-day'} · {S.start != null ? `${short(S.start)} – ${short(S.end ?? S.start)} ${S.y}` : S.y}</p>
      <h1 className="t-h1">{seasonName(S)}</h1></>}
      {st.length > 0 && <div className="cr-stages" aria-label="Stages">{st.map((x, k) => <span key={k} className={`cr-stage${S.done || k < S.stage ? ' done' : k === S.stage ? ' on' : ''}`}>{STAGE[x.type] || x.type}{x.type === 'ko' && x.plan ? ` · ${x.plan === 'semis' ? 'semis and final' : x.plan === 'ipl4' ? 'four-team playoffs' : 'final'}` : ''}</span>)}</div>}
      {S.done && S.champ && <p className="gld b6">{teamName(G, S.champ)} won{S.runner ? <span className="mut" style={{ fontWeight: 400 }}> · runners-up {teamName(G, S.runner)}</span> : null}</p>}
    </div>
  );
}
function Tables({ S }) {
  const { G } = useGame(); const me = userNation(G); const keys = Object.keys(S.tables);
  if (!keys.length) return <p className="t-small faint">No table yet.</p>;
  return keys.map((k) => (
    <section key={k} style={{ marginBottom: 18 }}>
      {keys.length > 1 && <h2 className="sec">{grpName(k)}</h2>}
      <div className="tblwrap"><table className="tbl compact">
        <thead><tr><th>#</th><th>Team</th><th className="r">P</th><th className="r">W</th><th className="r">L</th><th className="r">T/NR</th><th className="r">Pts</th><th className="r">NRR</th></tr></thead>
        <tbody>{standings(S.tables[k]).map((r, i) => <tr key={r.id} className={r.id === me ? 'me' : ''}><td className="faint">{i + 1}</td><td className="name"><NDot id={r.id} />{teamName(G, r.id)}</td><td className="r">{r.p}</td><td className="r">{r.w}</td><td className="r">{r.l}</td><td className="r faint">{r.t + r.nr}</td><td className="r b6">{r.pts}</td><td className="r faint">{fmtNRR(r.nrr)}</td></tr>)}</tbody>
      </table></div>
    </section>));
}
function Fixtures({ S }) {
  const { G } = useGame(); const me = userNation(G); const [q] = useSearchParams(); const [open, setOpen] = useState(q.get('fx'));
  const by = {}; for (const f of S.fx) (by[f.stage] ??= []).push(f); const st = stagesOf(S);
  return Object.keys(by).sort((a, b) => a - b).map((k) => (
    <section key={k} style={{ marginBottom: 14 }}>
      <h2 className="sec">{STAGE[(st[k] || {}).type] || 'Matches'} · {by[k].filter((f) => f.res).length} of {by[k].length} played</h2>
      {by[k].slice().sort((a, b) => a.d - b.d).map((f) => { const on = open === f.id; const mine = f.a === me || f.b === me; return (
        <div key={f.id}>
          <button type="button" className={`cr-fx${mine ? ' me' : ''}`} disabled={!f.res} aria-expanded={f.res ? on : undefined} onClick={() => setOpen(on ? null : f.id)}>
            <span className="d">{short(f.d)}</span>
            <span className="t" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}><NDot id={f.a} />{teamName(G, f.a)} <span className="faint">v</span> <NDot id={f.b} />{teamName(G, f.b)}{f.ko && <span className="cr-pill g">{KO[f.ko] || f.ko}</span>}</span>
            <span className="t-small faint">{f.res ? (on ? 'Hide card' : 'Card') : f.fmt === 'T20' ? 'T20' : 'ODI'}</span>
            <span className="r">{f.res ? f.res.text : 'To be played'}</span>
          </button>
          {on && f.res && <div className="cr-card"><ScoreCard card={f.card} res={f.res} /></div>}
        </div>); })}
    </section>));
}
// Leaders from the season's stats: st[pid] = [m, inn, no, r, b, hs, 50s, 100s, balls, rc, w, bestW, bestR, 4s, 6s]
function Leaders({ S }) {
  const { G } = useGame(); const T = (G.s.wd.st && G.s.wd.st[S.id]) || {}; const rows = Object.entries(T);
  if (!rows.length) return <p className="t-small faint">Stats start with the first match.</p>;
  const bat = rows.filter(([, x]) => x[3] > 0).sort((a, b) => b[1][3] - a[1][3]).slice(0, 10);
  const bowl = rows.filter(([, x]) => x[10] > 0).sort((a, b) => b[1][10] - a[1][10] || a[1][9] - b[1][9]).slice(0, 10);
  const avg = (x) => (x[1] - x[2] > 0 ? (x[3] / (x[1] - x[2])).toFixed(1) : '–');
  const Name = ({ id }) => { const p = G.players[id] ? G.players[id] : null; return p ? <Link to={`/player/${id}`}>{p.name}</Link> : <span>{pname(G, id)}</span>; };
  return (
    <div className="cr-leaders">
      <section><h2 className="sec">Most runs</h2><div className="tblwrap"><table className="tbl compact plain"><thead><tr><th style={{ paddingLeft: 0 }}>Batter</th><th className="r">M</th><th className="r">Runs</th><th className="r">HS</th><th className="r">Avg</th><th className="r">SR</th></tr></thead>
        <tbody>{bat.map(([id, x]) => <tr key={id}><td style={{ paddingLeft: 0 }}><Name id={id} /></td><td className="r faint">{x[0]}</td><td className="r b6">{x[3]}</td><td className="r">{x[5]}</td><td className="r faint">{avg(x)}</td><td className="r faint">{x[4] ? ((100 * x[3]) / x[4]).toFixed(0) : '–'}</td></tr>)}</tbody></table></div></section>
      <section><h2 className="sec">Most wickets</h2><div className="tblwrap"><table className="tbl compact plain"><thead><tr><th style={{ paddingLeft: 0 }}>Bowler</th><th className="r">M</th><th className="r">Wkts</th><th className="r">Best</th><th className="r">Econ</th></tr></thead>
        <tbody>{bowl.map(([id, x]) => <tr key={id}><td style={{ paddingLeft: 0 }}><Name id={id} /></td><td className="r faint">{x[0]}</td><td className="r b6">{x[10]}</td><td className="r">{x[11]}/{x[12]}</td><td className="r faint">{x[8] ? (x[9] / (x[8] / 6)).toFixed(2) : '–'}</td></tr>)}</tbody></table></div></section>
    </div>
  );
}

export default function Comp() {
  const { G } = useGame(); const { seasonId } = useParams(); const narrow = useNarrow(); const [tab, setTab] = useTab(['table', 'fixtures', 'stats'], 'table');
  const S = G.s.wd && G.s.wd.seasons[seasonId];
  if (!S) return <><h1 className="t-h1">Competition not found</h1><p className="mut" style={{ marginTop: 8 }}><Link to="/calendar?view=list">Every competition</Link></p></>;
  const played = S.fx.filter((f) => f.res).length;
  if (narrow) return (
    <MScreen top={{ title: seasonName(S), sub: `${played}/${S.fx.length}` }} pin={<Head S={S} m />} tabs={[['table', 'Table'], ['fixtures', 'Fixtures', S.fx.length - played, true], ['stats', 'Stats']]} tab={tab} onTab={setTab} label="Competition">
      <div style={{ paddingTop: 12 }}>{tab === 'table' && <Tables S={S} />}{tab === 'fixtures' && <Fixtures S={S} />}{tab === 'stats' && <Leaders S={S} />}</div>
    </MScreen>);
  return (
    <div className="wrap" style={{ maxWidth: 1240 }}>
      <Head S={S} />
      <div className="cr-split">
        <div><Tables S={S} /><Fixtures S={S} /></div>
        <aside><Leaders S={S} /><p className="t-micro faint" style={{ marginTop: 16 }}>Matches you play are ball by ball; the rest are simulated from the same ratings. Everything after the save started is simulated.</p></aside>
      </div>
    </div>
  );
}
