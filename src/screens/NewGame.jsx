import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Game, ordinal } from '../game/game.js';
import { TEAMS, HISTORY } from '../game/data.js';
import { Dot, Seg } from '../components/bits.jsx';
import { saveLocal } from '../lib/save.js';
import { downloadSave } from '../lib/cloud.js';

const MODES = [['ball', 'Every ball', 'You call each delivery.'], ['over', 'Every over', 'Pause at the end of each over.'], ['key', 'Key moments', 'Plays on, pauses for wickets, DRS and the death overs.'], ['quick', 'Quick sim', 'Straight to the result.']];

export default function NewGame() {
  const { setG, toast, ui } = useGame();
  const nav = useNavigate();
  const [team, setTeam] = useState('LL');
  const [name, setName] = useState('');
  const [lang, setLang] = useState('en');
  const [mode, setMode] = useState('key');
  const [code, setCode] = useState('');
  const preview = useMemo(() => Game.create('LL', {}), []);
  const strs = useMemo(() => TEAMS.map((t) => preview.strength(t.id)), [preview]);
  const mx = Math.max(...strs), mn = Math.min(...strs);
  const h25 = HISTORY[1];
  const t = TEAMS.find((x) => x.id === team); const tt = preview.teams[team];
  const stars = tt.squad.map((id) => preview.P(id)).sort((a, b) => (b.bat + b.bowl) - (a.bat + a.bowl)).slice(0, 4).map((p) => p.name).join(', ');

  const start = () => {
    const G = Game.create(team, { lang, manager: name || 'Manager', mode });
    G.aiPreseason(); ui.live = null; saveLocal(G); setG(G); nav('/');
  };
  const loadCode = async () => {
    try { const s = await downloadSave(code); const G = new Game(s); ui.live = null; saveLocal(G); setG(G); nav('/'); toast('Career loaded from the cloud.'); }
    catch (e) { toast(e.message); }
  };
  return (
    <>
      <header className="top"><span className="brand">NPL Manager</span><span className="faint t-small">Nepal Premier League · Season 3 · 2026</span></header>
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 32px 64px' }} className="ngmain">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36, maxWidth: 680 }}>
          <h1 className="t-h1">New game</h1>
          <p className="mut" style={{ fontSize: 16, lineHeight: '25px' }}>Take charge of one of eight franchises at TU International Cricket Ground, Kirtipur. Build a squad within the purse, pick the XI, and call it ball by ball.</p>
        </div>
        <div className="split" style={{ gap: 40 }}>
          <section>
            <h2 className="sec">Choose a franchise</h2>
            <div className="tblwrap"><table className="tbl"><thead><tr><th>Franchise</th><th>Last season</th><th>Captain</th><th>Head coach</th><th style={{ width: 150 }}>Squad strength</th></tr></thead>
              <tbody>{TEAMS.map((x, i) => {
                const pos = h25.table.findIndex((r) => r[0] === x.id) + 1;
                const note = x.id === h25.champion ? 'Champions' : x.id === h25.runner ? 'Runners-up' : '';
                return (
                  <tr key={x.id} className={team === x.id ? 'me' : ''}>
                    <td className="name"><label className="chk" style={{ minHeight: 28 }}><input type="radio" name="franchise" checked={team === x.id} onChange={() => setTeam(x.id)} /><span style={{ display: 'flex', alignItems: 'center' }}><Dot id={x.id} />{x.name}</span></label></td>
                    <td><span>{ordinal(pos)}</span> <span className="faint">{note}</span></td><td>{x.captain}</td><td className="mut">{x.coach}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="meter" style={{ flex: '1 1 auto' }}><i style={{ width: `${Math.round(20 + 80 * (strs[i] - mn) / (mx - mn || 1))}%` }} /></div><span className="num" style={{ width: 22, textAlign: 'right' }}>{Math.round(strs[i])}</span></div></td>
                  </tr>);
              })}</tbody></table></div>
            <p className="faint t-small" style={{ marginTop: 10 }}>2025 finishes and 2026 captains are from the real league. Squad strength is the game's average rating of the best legal XI.</p>
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div className="field"><label htmlFor="mgr">Manager name</label><input id="mgr" className="input" value={name} placeholder="Your name" onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><span className="lbl">Language</span><Seg options={[['en', 'English'], ['np', 'नेपाली'], ['both', 'Both']]} value={lang} onChange={setLang} label="Language" /><p className="faint t-small">Commentary, news and menus.</p></div>
            <div className="field"><span className="lbl">Default match control</span>
              <div className="stack" style={{ gap: 8 }}>{MODES.map(([k, l, d]) => (
                <label key={k} className="chk"><input type="radio" name="mode" checked={mode === k} onChange={() => setMode(k)} /><span><b style={{ fontWeight: 600 }}>{l}</b> <span className="faint t-small">{d}</span></span></label>))}</div></div>
            <div className="panel stack" style={{ gap: 8 }}><p className="t-h3" style={{ display: 'flex', alignItems: 'center' }}><Dot id={team} />{t.name}</p>
              <p className="t-small mut">{t.city}, {t.province} Province. Captain {t.captain}, coach {t.coach}. Key players: {stars}. {tt.squad.length} players, {preview.osCount(team)} overseas signed so far: you need 6 to 8 before the first match.</p></div>
            <button type="button" className="btn btn-primary btn-lg" onClick={start}>Start Season 3</button>
            <div className="field"><label htmlFor="code">Have a cloud save code?</label><div className="row" style={{ gap: 8 }}><input id="code" className="input" style={{ flex: '1 1 160px', textTransform: 'uppercase' }} value={code} maxLength={8} placeholder="8-character code" onChange={(e) => setCode(e.target.value)} /><button type="button" className="btn" onClick={loadCode} disabled={code.trim().length < 8}>Load career</button></div></div>
          </section>
        </div>
      </main>
    </>
  );
}
