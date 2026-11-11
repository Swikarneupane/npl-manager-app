// The national squad: 15 per format from every eligible player (poolOf), with each player's club, recent
// stats from every competition and fitness; then the XI, captain and keeper. Saved in s.wd.squads and
// s.wd.xi; with the assistant on, or before you pick, the assistant's squad (autoSquad) is used.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { Seg } from '../components/bits.jsx';
import { NDot } from '../components/NationBits.jsx';
import { useNarrow, formDisp } from '../lib/util.js';
import { autosave } from '../lib/save.js';
import { poolOf } from '../world/players.js';
import { value } from '../world/squads.js';
import * as CR from '../world/career.js';
import '../styles/career.css';

const FMT_L = { ODI: 'ODI', T20: 'T20I' };
const fitTag = (p) => (p.inj ? <span className="cr-pill c">Injured</span> : p.fit < 75 ? <span className="crim t-small">{Math.round(p.fit)}%</span> : <span className="t-small mut">{Math.round(p.fit ?? 100)}%</span>);
const rs = (st) => `${st.m}m · ${st.r} r${st.w ? ` · ${st.w} w` : ''}`;

function useSquad(code, fmt) {
  const { G, update, toast } = useGame();
  const sel = CR.selection(G, code, fmt); const keys = sel.squad.map(CR.keyOf); const xi = sel.xiPicked.map(CR.keyOf); // keys as they are now; old saves are matched by selection()
  const act = (fn, msg) => update(() => { const e = fn(); if (e) toast(e); else { autosave(G); if (msg) toast(msg); } });
  const toggleSquad = (p) => { const k = CR.keyOf(p); if (keys.includes(k)) act(() => CR.setSquad(G, code, fmt, keys.filter((x) => x !== k))); else if (keys.length >= 15) toast('The squad is full: 15 players. Leave someone out first.'); else act(() => CR.setSquad(G, code, fmt, [...keys, k])); };
  const toggleXI = (p) => { const k = CR.keyOf(p); if (xi.includes(k)) act(() => CR.setXI(G, code, fmt, { xi: xi.filter((x) => x !== k) })); else if (xi.length >= 11) toast('The XI is full. Take someone out first.'); else act(() => CR.setXI(G, code, fmt, { xi: [...xi, k] })); };
  const setCap = (p) => act(() => CR.setXI(G, code, fmt, { xi, cap: CR.keyOf(p) }));
  const setWk = (p) => act(() => CR.setXI(G, code, fmt, { xi, wk: CR.keyOf(p) }));
  const auto = () => act(() => CR.setSquad(G, code, fmt, null), 'The assistant picks the squad and XI again.');
  return { G, sel, keys, xi, toggleSquad, toggleXI, setCap, setWk, auto };
}
function Status({ s, fmt }) {
  const wk = s.sel.xiPicked.some((p) => p.role === 'WK'); const n = s.sel.xiPicked.length;
  return <p className="t-small"><span className={s.keys.length === 15 ? '' : 'crim'}>Squad {s.keys.length}/15</span> · <span className={n === 11 ? '' : 'crim'}>XI {n}/11{n < 11 ? ', the assistant fills the rest' : ''}</span> · Captain {s.sel.cap ? s.sel.cap.name : '—'} · Keeper {s.sel.wk ? s.sel.wk.name : '—'}{!wk && n ? <span className="crim"> · no specialist keeper</span> : null} <span className="faint">· {FMT_L[fmt]}</span></p>;
}
function Desk({ code, fmt, setFmt }) {
  const s = useSquad(code, fmt); const { G, sel } = s; const [all, setAll] = useState(false);
  const pool = poolOf(G, code).slice().sort((a, b) => value(b, fmt) - value(a, fmt)); const inSq = new Set(s.keys);
  const list = all ? pool : pool.filter((p, i) => inSq.has(CR.keyOf(p)) || i < 30); const ro = sel.asst;
  return (
    <div className="wrap" style={{ maxWidth: 1240 }}>
      <div className="cr-head"><div><h1 className="t-h1"><NDot id={code} big />{CR.nationName(G, code)} squad</h1><p className="mut t-small">{pool.length} eligible players · ratings are the game's estimates</p></div>
        <Seg options={CR.FMTS} value={fmt} onChange={setFmt} label="Format" /></div>
      <div className="cr-tool"><Status s={s} fmt={fmt} /><span className="spacer" style={{ flex: '1 1 auto' }} />{!ro && sel.picked && <button type="button" className="btn btn-sm" onClick={s.auto}>Let the assistant pick</button>}</div>
      {ro && <p className="t-small mut" style={{ marginBottom: 10 }}>The assistant picks the squad and XI while “Let the assistant decide” is on in <Link to="/settings">Settings</Link>.</p>}
      {!ro && !sel.picked && <p className="t-small mut" style={{ marginBottom: 10 }}>This is the assistant's squad. Tick players in or out to pick your own.</p>}
      <div className="tblwrap"><table className="tbl compact cr-sq">
        <thead><tr><th className="pick">Squad</th><th className="pick">XI</th><th>Player</th><th>Club</th><th className="r">Age</th><th className="r">Bat</th><th className="r">Bowl</th><th className="r">Form</th><th className="r">Fit</th><th>Last two years</th><th className="r">C</th><th className="r">WK</th></tr></thead>
        <tbody>{list.map((p) => { const k = CR.keyOf(p); const sq = inSq.has(k); const x = s.xi.includes(k); const st = CR.recentStats(G, p);
          return (
            <tr key={k} className={`${x ? 'sel' : ''}${sq ? '' : ' out'}`}>
              <td className="pick"><input type="checkbox" aria-label={`${p.name} in the squad`} checked={sq} disabled={ro} onChange={() => s.toggleSquad(p)} /></td>
              <td className="pick"><input type="checkbox" aria-label={`${p.name} in the XI`} checked={x} disabled={ro || !sq || !!p.inj} onChange={() => s.toggleXI(p)} /></td>
              <td className="name">{G.players[p.id] ? <Link to={`/player/${p.id}`}>{p.name}</Link> : p.name}<span className="cr-pill">{p.role}</span>{p.type ? <span className="faint t-micro"> {p.type}</span> : null}</td>
              <td className="t-small mut">{CR.clubOf(G, p)}</td><td className="r num">{p.age}</td><td className="r num">{p.bat}</td><td className="r num">{p.bowl}</td><td className="r num">{formDisp(p)}</td><td className="r">{fitTag(p)}</td>
              <td className="t-small mut" title={st.comps.join(', ')}>{st.m ? rs(st) : '—'}</td>
              <td className="r"><input type="radio" name="cap" aria-label={`${p.name} captain`} checked={!!sel.cap && CR.keyOf(sel.cap) === k} disabled={ro || !x} onChange={() => s.setCap(p)} /></td>
              <td className="r"><input type="radio" name="wk" aria-label={`${p.name} keeper`} checked={!!sel.wk && CR.keyOf(sel.wk) === k} disabled={ro || !x} onChange={() => s.setWk(p)} /></td>
            </tr>); })}</tbody></table></div>
      {pool.length > list.length && <button type="button" className="linkbtn t-small" style={{ marginTop: 8 }} onClick={() => setAll(true)}>Show all {pool.length} eligible players</button>}
      {!pool.length && <p className="t-small faint">No eligible players in the database yet.</p>}
      <p className="t-micro faint" style={{ marginTop: 12 }}>Recent stats cover every competition in the game, the NPL included. Players called up miss NPL matches within a day of a national fixture.</p>
    </div>
  );
}
function Row({ s, p, mode }) {
  const { G, sel } = s; const k = CR.keyOf(p); const sq = s.keys.includes(k); const x = s.xi.includes(k); const st = CR.recentStats(G, p); const ro = sel.asst;
  const cap = sel.cap && CR.keyOf(sel.cap) === k, wk = sel.wk && CR.keyOf(sel.wk) === k;
  return (
    <div className="cr-prow">
      <input type="checkbox" aria-label={mode === 'xi' ? `${p.name} in the XI` : `${p.name} in the squad`} checked={mode === 'xi' ? x : sq} disabled={ro || (mode === 'xi' && !!p.inj)} onChange={() => (mode === 'xi' ? s.toggleXI(p) : s.toggleSquad(p))} />
      <span className="ell"><b style={{ fontWeight: x ? 600 : 500 }}>{p.name}</b><span className="cr-pill">{p.role}</span>{cap && <span className="cr-pill b">C</span>}{wk && <span className="cr-pill b">WK</span>}</span>
      {fitTag(p)}
      <span className="l2 t-micro faint">{CR.clubOf(G, p)} · bat {p.bat} · bowl {p.bowl} · form {formDisp(p)}{st.m ? ` · ${rs(st)}` : ''}</span>
      {mode === 'xi' && x && !ro && <span className="l2 row" style={{ gap: 6 }}><button type="button" className={`btn btn-sm${cap ? ' btn-primary' : ''}`} onClick={() => s.setCap(p)}>Captain</button><button type="button" className={`btn btn-sm${wk ? ' btn-primary' : ''}`} onClick={() => s.setWk(p)}>Keeper</button></span>}
    </div>
  );
}
function Phone({ code, fmt, setFmt }) {
  const s = useSquad(code, fmt); const { G, sel } = s; const [tab, setTab] = useTab(['xi', 'squad', 'pool'], 'xi');
  const pool = poolOf(G, code).slice().sort((a, b) => value(b, fmt) - value(a, fmt));
  return (
    <MScreen top={{ title: <><NDot id={code} />{CR.nationName(G, code)}</>, sub: `${FMT_L[fmt]} squad` }} pin={<><Seg options={CR.FMTS} value={fmt} onChange={setFmt} label="Format" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr' }} /><Status s={s} fmt={fmt} /></>}
      tabs={[['xi', 'XI', sel.xiPicked.length === 11 ? null : sel.xiPicked.length], ['squad', 'Squad', s.keys.length === 15 ? null : s.keys.length], ['pool', 'All players']]} tab={tab} onTab={setTab} label="National squad"
      actions={!sel.asst && sel.picked ? <button type="button" className="btn" style={{ flex: '1 1 auto' }} onClick={s.auto}>Let the assistant pick</button> : null}>
      {sel.asst && <p className="t-small mut" style={{ paddingTop: 10 }}>The assistant picks while “Let the assistant decide” is on in <Link to="/settings">Settings</Link>.</p>}
      {tab === 'xi' && sel.squad.map((p) => <Row key={CR.keyOf(p)} s={s} p={p} mode="xi" />)}
      {tab === 'squad' && sel.squad.map((p) => <Row key={CR.keyOf(p)} s={s} p={p} mode="squad" />)}
      {tab === 'pool' && pool.slice(0, 60).map((p) => <Row key={CR.keyOf(p)} s={s} p={p} mode="squad" />)}
      {tab === 'pool' && !pool.length && <p className="t-small faint">No eligible players yet.</p>}
    </MScreen>
  );
}

export default function NationSquad() {
  const { G } = useGame(); const narrow = useNarrow(); const [fmt, setFmt] = useTab(['ODI', 'T20'], 'ODI', 'fmt');
  const code = G.s.wd ? CR.userNation(G) : null;
  if (!code) return (
    <div className="wrap" style={{ maxWidth: 720 }}><h1 className="t-h1">No national team</h1><p className="mut" style={{ marginTop: 8 }}>You do not manage a national side. Boards look at your reputation: associates from about 50, Test nations from about 75.</p>
      <div className="row" style={{ marginTop: 16 }}><Link to="/jobs" className="btn btn-primary">Jobs and offers</Link></div></div>);
  return narrow ? <Phone code={code} fmt={fmt} setFmt={setFmt} /> : <Desk code={code} fmt={fmt} setFmt={setFmt} />;
}
