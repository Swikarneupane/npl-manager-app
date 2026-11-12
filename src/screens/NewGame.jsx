import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Game, ordinal } from '../game/game.js';
import { TEAMS, HISTORY } from '../game/data.js';
import { Dot, Seg } from '../components/bits.jsx';
import { saveLocal } from '../lib/save.js';
import { downloadSave } from '../lib/cloud.js';
import { CHALLENGES, applyChallenge } from '../game/living.js';
import { ASSOCIATES, NATION_NAME, startCareer, strength } from '../world/career.js';
import { poolOf, registry } from '../world/players.js';
import LevelPicker from '../components/LevelPicker.jsx';
import { setLevel } from '../world/state.js';
import { available, teamsAndLevels } from '../world/club.js';

// Which jobs the career starts with. Associates are open from the start; Test nations come by reputation.
const JOBS = [['club', 'NPL club'], ['nation', 'National team'], ['both', 'Both'], ['abroad', 'Club abroad']];
const JOB_TEXT = { abroad: 'Manage a club in another league, under its own auction, draft or contract rules. The NPL runs without you.', club: 'Run one of the eight NPL franchises.', nation: 'Manage Nepal or another associate nation. The NPL runs without you; clubs may call later.', both: 'An NPL franchise and a national side at once. Players you call up miss NPL matches that clash.' };

const MODES = [['ball', 'Every ball', 'You call each delivery.'], ['over', 'Every over', 'Pause at the end of each over.'], ['key', 'Key moments', 'Plays on, pauses for wickets, DRS and the death overs.'], ['quick', 'Quick sim', 'Straight to the result.']];

// What each difficulty changes, for the New game and Settings screens.
export const DIFF_TEXT = { easy: 'Rival owners bid less, rival sides play 2 below their ratings against you, and the board only sacks you below 20.', normal: 'Everything as rated. The board sacks you below 30 at the end-of-season review.', hard: 'Rival owners bid more, rival sides play 2 above their ratings against you, and the board sacks you below 40.' };

// Associates to choose from, strongest first, with the game's estimate of each side's best XI.
function NationTable({ nations, nation, setNation, vmin, vmax }) {
  return (
    <>
      <h2 className="sec">Choose a national team</h2>
      <div className="tblwrap" style={{ maxHeight: 520, overflowY: 'auto' }}><table className="tbl"><thead><tr><th>Nation</th><th className="r">Players</th><th style={{ width: 150 }}>ODI strength</th></tr></thead>
        <tbody>{nations.map((x) => (
          <tr key={x.c} className={nation === x.c ? 'me' : ''}>
            <td className="name"><label className="chk" style={{ minHeight: 28 }}><input type="radio" name="nation" checked={nation === x.c} onChange={() => setNation(x.c)} /><span>{NATION_NAME[x.c]}</span></label></td>
            <td className="r num">{x.n || '—'}</td>
            <td>{x.v > 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="meter" style={{ flex: '1 1 auto' }}><i style={{ width: `${Math.round(20 + 80 * (x.v - vmin) / (vmax - vmin || 1))}%` }} /></div><span className="num" style={{ width: 22, textAlign: 'right' }}>{Math.round(x.v)}</span></div> : <span className="faint t-small">No players yet</span>}</td>
          </tr>))}</tbody></table></div>
      <p className="faint t-small" style={{ marginTop: 10 }}>Associate members of the ICC. Strength is the game's estimate of the best ODI XI; Test nations open later, from a reputation of about 75.</p>
    </>
  );
}

export default function NewGame() {
  const { setG, toast, ui } = useGame();
  const nav = useNavigate();
  const [team, setTeam] = useState('LL');
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('normal');
  const [lang, setLang] = useState('en');
  const [mode, setMode] = useState('key');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState('');
  const [levels, setLevels] = useState({ Test: 'both', ODI: 'both', T20: 'both' });
  const [job, setJob] = useState('club'); const [nation, setNation] = useState('NEP');
  const preview = useMemo(() => Game.create('LL', {}), []);
  const club = job === 'club' || job === 'both'; const [abroad, setAbroad] = useState('');
  const clubs = useMemo(() => (preview.s.wd ? (registry(preview), teamsAndLevels(preview).filter((x) => x.need <= 60)) : []), [preview]); // eslint-disable-line
  const pickChallenge = (k) => { setChallenge(k); const c = CHALLENGES.find((x) => x.k === k); if (c && c.team) setTeam(c.team); };
    const strs = useMemo(() => TEAMS.map((t) => preview.strength(t.id)), [preview]);
  const mx = Math.max(...strs), mn = Math.min(...strs);
  const h25 = HISTORY[1];
  const t = TEAMS.find((x) => x.id === team); const tt = preview.teams[team];
  const stars = tt.squad.map((id) => preview.P(id)).sort((a, b) => (b.bat + b.bowl) - (a.bat + a.bowl)).slice(0, 4).map((p) => p.name).join(', ');
  // associates by the game's estimate of their best ODI XI (Nepal first)
  const nations = useMemo(() => { if (!preview.s.wd) return []; const list = ASSOCIATES.map((c) => ({ c, n: poolOf(preview, c).length, v: strength(preview, c, 'ODI') })); return list.sort((a, b) => (b.c === 'NEP') - (a.c === 'NEP') || b.v - a.v); }, [preview]);
  const nvMax = Math.max(1, ...nations.map((x) => x.v)); const nvMin = Math.min(...nations.filter((x) => x.v > 0).map((x) => x.v), nvMax);
  const nat = nations.find((x) => x.c === nation);

  const start = () => {
    // pre-season fairness: the AI teams sign their overseas players when you start the season, not before
    const G = Game.create(team, { lang, manager: name || 'Manager', mode, difficulty });
    if (challenge && club) applyChallenge(G, challenge);
    startCareer(G, { club, nation: job === 'club' || job === 'abroad' ? null : nation, abroad: job === 'abroad' ? abroad || (clubs[0] && clubs[0].id) : null });
    Object.entries(levels).forEach(([g, v]) => setLevel(G, g, v));
    ui.live = null; saveLocal(G); setG(G); nav('/');
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
            {job === 'abroad' && <><h2 className="sec">Choose a club abroad</h2>{clubs.length ? <div className="tblwrap" style={{ maxHeight: 520, overflowY: 'auto' }}><table className="tbl"><thead><tr><th>Club</th><th>League</th></tr></thead><tbody>{clubs.map((x) => <tr key={x.id} className={(abroad || clubs[0].id) === x.id ? 'me' : ''}><td className="name"><label className="chk" style={{ minHeight: 28 }}><input type="radio" name="abroad" checked={(abroad || clubs[0].id) === x.id} onChange={() => setAbroad(x.id)} /><span>{x.name}</span></label></td><td className="mut">{x.leagueName}</td></tr>)}</tbody></table></div> : <p className="mut">No league data is loaded yet.</p>}<p className="faint t-small" style={{ marginTop: 10 }}>You start with a club whose league level suits a new manager. The NPL runs without you.</p></>}
            {(job === 'nation' || job === 'both') && <NationTable nations={nations} nation={nation} setNation={setNation} vmin={nvMin} vmax={nvMax} />}
            {club && <>
            <h2 className="sec" style={job !== 'club' ? { marginTop: 32 } : undefined}>Choose a franchise</h2>
            <div className="tblwrap"><table className="tbl"><thead><tr><th>Franchise</th><th>Last season</th><th>Captain</th><th>Head coach</th><th style={{ width: 150 }}>Squad strength</th></tr></thead>
              <tbody>{TEAMS.map((x, i) => {
                const pos = h25.table.findIndex((r) => r[0] === x.id) + 1;
                const note = x.id === h25.champion ? 'Champions' : x.id === h25.runner ? 'Runners-up' : '';
                return (
                  <tr key={x.id} className={team === x.id ? 'me' : ''}>
                    <td className="name"><label className="chk" style={{ minHeight: 28 }}><input type="radio" name="franchise" checked={team === x.id} onChange={() => { setTeam(x.id); if (challenge === 'rescue' && x.id !== 'JB') setChallenge(''); }} /><span style={{ display: 'flex', alignItems: 'center' }}><Dot id={x.id} />{x.name}</span></label></td>
                    <td><span>{ordinal(pos)}</span> <span className="faint">{note}</span></td><td>{x.captain}</td><td className="mut">{x.coach}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="meter" style={{ flex: '1 1 auto' }}><i style={{ width: `${Math.round(20 + 80 * (strs[i] - mn) / (mx - mn || 1))}%` }} /></div><span className="num" style={{ width: 22, textAlign: 'right' }}>{Math.round(strs[i])}</span></div></td>
                  </tr>);
              })}</tbody></table></div>
            <p className="faint t-small" style={{ marginTop: 10 }}>2025 finishes and 2026 captains are from the real league. Squad strength is the game's average rating of the best legal XI.</p>
            </>}
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div className="field"><span className="lbl">Your job</span><Seg options={JOBS} value={job} onChange={setJob} label="Your job" /><p className="faint t-small">{JOB_TEXT[job]} Test nations open from a reputation of about 75.</p></div>
            <div className="field"><label htmlFor="mgr">Manager name</label><input id="mgr" className="input" value={name} placeholder="Your name" onChange={(e) => setName(e.target.value)} /></div>
            <LevelPicker levels={levels} onChange={(g, v) => setLevels((x) => ({ ...x, [g]: v }))} />
            <div className="field"><span className="lbl">Language</span><Seg options={[['en', 'English'], ['np', 'नेपाली'], ['both', 'Both']]} value={lang} onChange={setLang} label="Language" /><p className="faint t-small">Commentary, news and menus.</p></div>
            <div className="field"><span className="lbl">Difficulty</span><Seg options={[['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']]} value={difficulty} onChange={setDifficulty} label="Difficulty" /><p className="faint t-small">{DIFF_TEXT[difficulty]} You can change it later in Settings.</p></div>
            <div className="field"><span className="lbl">Default match control</span>
              <div className="stack" style={{ gap: 8 }}>{MODES.map(([k, l, d]) => (
                <label key={k} className="chk"><input type="radio" name="mode" checked={mode === k} onChange={() => setMode(k)} /><span><b style={{ fontWeight: 600 }}>{l}</b> <span className="faint t-small">{d}</span></span></label>))}</div></div>
            {club && <div className="field"><span className="lbl">Challenge</span>
              <div className="stack" style={{ gap: 8 }}>{[['', 'None', 'A normal career.', ''], ...CHALLENGES.map((c) => [c.k, c.n, c.d, c.tag])].map(([k, l, d, tag]) => (
                <label key={k || 'none'} className="chk"><input type="radio" name="challenge" checked={challenge === k} onChange={() => pickChallenge(k)} /><span><b style={{ fontWeight: 600 }}>{l}</b>{tag && <span className="faint t-small"> · {tag}</span>} <span className="faint t-small">{d}</span></span></label>))}</div>
              {challenge === 'rescue' && team !== 'JB' && <p className="t-small crim">This challenge is with Janakpur Bolts.</p>}</div>}
            {(job === 'nation' || job === 'both') && <div className="panel stack" style={{ gap: 8 }}><p className="t-h3">{NATION_NAME[nation]} · national team</p>
              <p className="t-small mut">{nat && nat.n ? `${nat.n} eligible players in the game's database.` : 'Players come from the game\'s database and the NPL.'} You pick a squad of 15 for each format, the XI, captain and keeper. The board sets objectives for each competition.</p></div>}
            {club && <div className="panel stack" style={{ gap: 8 }}><p className="t-h3" style={{ display: 'flex', alignItems: 'center' }}><Dot id={team} />{t.name}</p>
              <p className="t-small mut">{t.city}, {t.province} Province. Captain {t.captain}, coach {t.coach}. Key players: {stars}. {tt.squad.length} players, {preview.osCount(team)} overseas signed so far: you need 6 to 8 before the first match.</p></div>}
            <button type="button" className="btn btn-primary btn-lg" onClick={start}>{job === 'abroad' ? 'Start with this club' : job === 'club' ? 'Start Season 3' : job === 'nation' ? `Start as ${NATION_NAME[nation]} manager` : `Start Season 3 with ${NATION_NAME[nation]}`}</button>
            <div className="field"><label htmlFor="code">Have a cloud save code?</label><div className="row" style={{ gap: 8 }}><input id="code" className="input" style={{ flex: '1 1 160px', textTransform: 'uppercase' }} value={code} maxLength={8} placeholder="8-character code" onChange={(e) => setCode(e.target.value)} /><button type="button" className="btn" onClick={loadCode} disabled={code.trim().length < 8}>Load career</button></div></div>
          </section>
        </div>
      </main>
    </>
  );
}
