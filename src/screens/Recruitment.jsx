import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/office.css';
import { useGame } from '../lib/store.jsx';
import { Dot, PageHead } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { fmtL, ovr } from '../game/engine.js';
import { gapsFor, planTargets, setGapPriority, savePlan, planSaved, recruitOpen, tripsLeft, scoutTrip, rivalsNeeds, staffViews } from '../game/office.js';
import { autosave } from '../lib/save.js';
import { useNarrow, tshort } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';

const PR = [['High', 'उच्च'], ['Medium', 'मध्यम'], ['Low', 'न्यून']];
const TAG_CLS = { 'First choice': 'gld', Backup: 'faint', Bargain: 'faint' };
const range = (lp) => (lp[0] === lp[1] ? fmtL(lp[0]) : `Rs ${lp[0]}–${lp[1]} L`);
const pot = (p) => (p.potLo != null && p.potLo !== p.potHi ? `${p.potLo}–${p.potHi}` : String(Math.max(p.pot, 0)));

function Gaps({ G, gaps, budget, onPr, phone }) {
  const seg = (g) => <div className="seg" role="group" aria-label={`Priority for ${g.name}`} style={{ flexWrap: 'nowrap' }}>{PR.map(([l, np]) => <button key={l} type="button" className={g.pr === l ? 'on' : ''} onClick={() => onPr(g.k, l)} style={{ minHeight: 30, padding: '0 9px', fontSize: 12.5 }}>{T(G, l, np)}</button>)}</div>;
  return (
    <div>
      <h2 className="t-h3" style={{ marginBottom: 4 }}>{T(G, 'What the squad needs', 'टोलीलाई के चाहिन्छ')}</h2>
      <p className="mut t-small" style={{ marginBottom: 10 }}>Set a priority for each gap. High priorities get your scouts first and a bigger share of the purse.</p>
      {phone ? <ul className="mlist">{gaps.map((g) => <li key={g.k} style={{ flexWrap: 'wrap' }}><span className="grow">{g.name} <span className="faint t-small">· {g.pool === 'os' ? 'overseas' : 'domestic'}</span><br /><span className="l2">{g.why}</span></span><span className="num t-small b6">{fmtL(budget[g.k])}</span><div style={{ width: '100%' }}>{seg(g)}</div></li>)}</ul>
        : <div className="tblwrap"><table className="tbl"><thead><tr><th>Gap</th><th>Why</th><th>Priority</th><th className="r">Budget</th></tr></thead>
          <tbody>{gaps.map((g) => <tr key={g.k}><td className="name">{g.name}<br /><span className="faint t-micro">{g.pool === 'os' ? 'Overseas purse' : 'Domestic purse'}</span></td><td className="mut t-small" style={{ whiteSpace: 'normal', maxWidth: 300 }}>{g.why}</td><td>{seg(g)}</td><td className="r num">{fmtL(budget[g.k])}</td></tr>)}</tbody></table></div>}
    </div>);
}
function Targets({ G, rows, onTrip }) {
  const left = tripsLeft(G);
  return (
    <div>
      <h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'Targets by gap', 'लक्षित खेलाडी')}</h2>
      <ul className="mlist">{rows.flatMap(({ g, t }) => (t.length ? t : [null]).map((x, i) => x ? (
        <li key={`${g.k}${x.p.id}`}><span className="grow"><b style={{ fontWeight: x.tag === 'First choice' ? 600 : 400 }}>{x.p.name}</b> <span className="role">{x.p.role}</span>{x.p.nat !== 'NEP' && <span className="blu t-small"> {x.p.nat}</span>}{x.p.prevTeam === G.user && <span className="faint t-small"> · ex-{tshort(G, G.user)}</span>}
          <br /><span className="l2">{g.name} · {x.p.age} · rating {ovr(x.p)} · potential {pot(x.p)} · expected {range(x.lp)}{x.d >= 2 ? ` · ${x.d} rivals interested` : ''}</span></span>
          <span className="stack" style={{ alignItems: 'flex-end', gap: 4 }}><span className={`t-small ${TAG_CLS[x.tag]}`}>{x.tag}</span>{!x.p.scouted && left > 0 && <button type="button" className="linkbtn t-micro" onClick={() => onTrip(x.p.id)}>Scout him</button>}</span></li>)
        : <li key={`${g.k}none`} className="dim"><span className="grow t-small">{g.name}: nobody in the pool fits the budget</span></li>))}</ul>
    </div>);
}
function Table({ G, rows, onTrip }) {
  const views = staffViews(G, rows); const rv = rivalsNeeds(G).slice(0, 4); const left = tripsLeft(G);
  const firsts = rows.flatMap((r) => r.t.filter((x) => !x.p.scouted)).slice(0, 2);
  return (
    <>
      <div className="panel stack" style={{ gap: 10 }}>
        <h2 className="sec" style={{ margin: 0 }}>{T(G, 'Around the table', 'बैठकमा')}</h2>
        {views.length ? views.map((v) => <p key={v.who} className="pull" style={{ fontSize: 15, lineHeight: '23px' }}>“{v.q}”<cite>{v.who} (generated staff)</cite></p>) : <p className="t-small mut">No head scout, analyst or assistant to give a view. Hire them in the <Link to="/staff">staff room</Link>.</p>}
      </div>
      <div><h2 className="sec">{T(G, "Rivals' needs", 'प्रतिद्वन्द्वीका आवश्यकता')}</h2>
        <table className="tbl compact plain"><tbody>{rv.map((r) => <tr key={r.tid}><td style={{ paddingLeft: 0 }}><Dot id={r.tid} />{tshort(G, r.tid)}</td><td className="mut t-small" style={{ whiteSpace: 'normal' }}>{r.needs.length ? r.needs.join(', ') : 'Nothing urgent'} · {fmtL(r.purse)}</td></tr>)}</tbody></table>
        <p className="faint t-micro" style={{ marginTop: 6 }}>Rivals chasing the same roles push prices up.</p></div>
      <div className="panel stack" style={{ gap: 8 }}>
        <h2 className="sec" style={{ margin: 0 }}>{T(G, 'Scout before the auction', 'लिलामीअघि स्काउटिङ')}</h2>
        <p className="t-small">{left} scouting trip{left === 1 ? '' : 's'} left this window. A trip narrows a player's potential range.</p>
        {left > 0 && firsts.length > 0 && <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>{firsts.map((x) => <button key={x.p.id} type="button" className="btn btn-sm" onClick={() => onTrip(x.p.id)}>Watch {x.p.name.split(' ').slice(-1)[0]}</button>)}</div>}
      </div>
    </>);
}

export default function Recruitment() {
  const { G, update, toast } = useGame(); const narrow = useNarrow(); const nav = useNavigate();
  const [tab, setTab] = useTab(['gaps', 'targets', 'table'], 'gaps');
  const ver = JSON.stringify(G.s.office.plan) + G.s.shortlist.length + G.teams[G.user].squad.length;
  const gaps = useMemo(() => gapsFor(G), [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => planTargets(G, gaps), [gaps]); // eslint-disable-line react-hooks/exhaustive-deps
  const budget = Object.fromEntries(rows.map((r) => [r.g.k, r.budget])); const count = rows.reduce((a, r) => a + r.t.length, 0);
  const planned = rows.reduce((a, r) => a + r.t.reduce((b, x) => b + x.lp[0], 0), 0);
  const t = G.teams[G.user]; const open = recruitOpen(G); const saved = planSaved(G);
  const onPr = (k, l) => update(() => setGapPriority(G, k, l));
  const onTrip = (pid) => update(() => { const e = scoutTrip(G, pid); if (e) toast(e); else autosave(G); });
  const save = () => update(() => { const n = savePlan(G); autosave(G); toast(`Plan saved: ${n} on the shortlist.`); if (G.s.phase === 'auction') nav('/auction'); });
  const btn = <button type="button" className="btn btn-primary btn-lg" style={narrow ? { flex: '1 1 auto' } : undefined} disabled={!open} onClick={save}>{saved ? 'Save again' : T(G, 'Save plan', 'योजना सुरक्षित')} · {count} on the shortlist</button>;
  const sub = open ? `With your head scout, analyst and assistant · ${saved ? 'plan saved' : 'plan not saved yet'}` : 'The recruitment meeting opens in the off-season, before the auction.';
  const note = <p className="faint t-small" style={{ marginTop: 8 }}>Budget splits the overseas purse ({fmtL(t.osPurse)}) and the domestic purse ({fmtL(t.purse)}) by priority. Expected cost of first picks: <b style={{ color: 'var(--ink)' }}>{fmtL(planned)}</b>.</p>;
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'Recruitment'), sub: '' }} label="Recruitment" tab={tab} onTab={setTab} actions={btn}
      tabs={[['gaps', T(G, 'Gaps', 'खाली ठाउँ'), gaps.length], ['targets', T(G, 'Targets', 'लक्ष्य'), count], ['table', T(G, 'Table', 'बैठक')]]}>
      <div style={{ paddingTop: 12 }} className="stack">
        {!open && <p className="panel t-small mut" style={{ padding: '10px 12px' }}>{sub}</p>}
        {tab === 'gaps' && <><Gaps G={G} gaps={gaps} budget={budget} onPr={onPr} phone />{note}</>}
        {tab === 'targets' && <Targets G={G} rows={rows} onTrip={onTrip} />}
        {tab === 'table' && <Table G={G} rows={rows} onTrip={onTrip} />}
      </div>
    </MScreen>);
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title={T(G, 'Recruitment meeting', 'भर्ती बैठक')} sub={sub}>{btn}</PageHead>
      <div className="split" style={{ gap: 40, gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>
        <section className="stack" style={{ gap: 28 }}><div><Gaps G={G} gaps={gaps} budget={budget} onPr={onPr} />{note}</div><Targets G={G} rows={rows} onTrip={onTrip} /></section>
        <aside className="stack" style={{ gap: 22 }}><Table G={G} rows={rows} onTrip={onTrip} /></aside>
      </div>
    </div>);
}
