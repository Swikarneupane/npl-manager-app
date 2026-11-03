import { useEffect, useState } from 'react';
import { useGame } from '../lib/store.jsx';
import { Modal, Seg } from '../components/bits.jsx';
import { Game } from '../game/game.js';
import { seasonNo, tr } from '../lib/util.js';
import { clearLocal, exportFile, isSave, saveLocal } from '../lib/save.js';
import { cloudStatus, downloadSave, uploadSave } from '../lib/cloud.js';
import { isNativeApp } from '../lib/platform.js';
import { DIFF_TEXT } from './NewGame.jsx';

export default function Settings() {
  const { G, setG, update, toast, ui, setModal } = useGame(); const S = G.s.settings;
  const [cloud, setCloud] = useState(null); const [code, setCode] = useState(''); const [myCode, setMyCode] = useState(G.s.cloudCode || ''); const [busy, setBusy] = useState(false);
  useEffect(() => { let on = true; cloudStatus().then((v) => on && setCloud(v)); return () => { on = false; }; }, []);
  const set = (k, v) => update(() => { S[k] = v; });
  const Chk = ({ k, l }) => <label className="chk"><input type="checkbox" checked={!!S[k]} onChange={(e) => set(k, e.target.checked)} /><span>{l}</span></label>;
  const load = (s) => { const g = new Game(s); ui.live = null; ui.auc = null; saveLocal(g); setG(g); };
  const importFile = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const s = JSON.parse(r.result); if (!isSave(s)) throw new Error(); load(s); toast('Save file loaded.'); } catch { toast('That file is not an NPL Manager save.'); } }; r.readAsText(f); };
  const upload = async () => { setBusy(true); try { const c = await uploadSave(G.s); G.s.cloudCode = c; saveLocal(G); setMyCode(c); toast('Uploaded. Use the code on any device.'); } catch (e) { toast(e.message); } setBusy(false); };
  const download = async () => { setBusy(true); try { const s = await downloadSave(code); load(s); toast('Career loaded from the cloud.'); } catch (e) { toast(e.message); } setBusy(false); };
  const confirmNew = () => setModal(<Modal><h2 className="t-h2">Start a new game?</h2><p className="mut" style={{ marginTop: 8 }}>Your current career will be replaced. Export a save file or upload to the cloud first if you want to keep it.</p>
    <div className="acts"><button className="btn btn-primary btn-lg" onClick={() => { setModal(null); clearLocal(); ui.live = null; ui.auc = null; setG(null); }}>Start new game</button><button className="btn btn-lg" onClick={() => setModal(null)}>Cancel</button></div></Modal>);
  return (
    <div style={{ maxWidth: 760 }} className="stack">
      <h1 className="t-h1" style={{ marginBottom: 24 }}>{tr(G, 'Settings')}</h1>
      <section className="stack" style={{ gap: 20 }}><h2 className="t-h3">Language <span className="ne faint">भाषा</span></h2>
        <Seg options={[['en', 'English'], ['np', 'नेपाली'], ['both', 'Both']]} value={G.s.lang} onChange={(v) => update(() => { G.s.lang = v; })} label="Language" />
        <div className="field"><span className="lbl">Numerals in Nepali text</span><Seg options={[['0', '0 1 2 3'], ['1', '० १ २ ३']]} value={S.nepNum ? '1' : '0'} onChange={(v) => set('nepNum', v === '1')} label="Numerals" /></div></section>
      <hr className="hr" />
      <section className="stack" style={{ gap: 20 }}><h2 className="t-h3">Appearance</h2><Seg options={[['light', 'Day'], ['dark', 'Floodlights'], ['auto', 'Match my device']]} value={S.theme} onChange={(v) => set('theme', v)} label="Theme" /></section>
      <hr className="hr" />
      <section className="stack" style={{ gap: 20 }}><h2 className="t-h3">Matches</h2>
        <div className="field"><span className="lbl">Default control mode</span><Seg options={[['ball', 'Every ball'], ['over', 'Every over'], ['key', 'Key moments'], ['quick', 'Quick sim']]} value={S.mode} onChange={(v) => set('mode', v)} label="Default control mode" /></div>
        <div className="field"><span className="lbl">Default playback speed</span><Seg options={[['0.5', '0.5×'], ['1', '1×'], ['2', '2×'], ['4', '4×']]} value={String(S.speed)} onChange={(v) => set('speed', +v)} label="Speed" /></div>
        <Chk k="pauseDRS" l="Always pause for DRS decisions" /><Chk k="animate" l="Animate commentary ball by ball" /></section>
      <hr className="hr" />
      <section className="stack" style={{ gap: 12 }}><h2 className="t-h3">Pace of the season</h2>
        <Seg options={[['0', 'I run everything'], ['1', 'Let the assistant decide']]} value={S.assistant ? '1' : '0'} onChange={(v) => set('assistant', v === '1')} label="Pace of the season" />
        <p className="faint t-small">{S.assistant ? 'The assistant handles matchday build-ups, press conferences, the training week and routine club business, and answers storylines with the cautious choice. With quick sim, a season takes about an hour.' : 'You make every call: build-ups, press, training, the dressing room and the office. A season takes four to six hours.'}</p></section>
      <hr className="hr" />
      <section className="stack" style={{ gap: 12 }}><h2 className="t-h3">Difficulty</h2>
        <Seg options={[['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']]} value={S.difficulty || 'normal'} onChange={(v) => set('difficulty', v)} label="Difficulty" />
        <p className="faint t-small">{DIFF_TEXT[S.difficulty || 'normal']} Changes apply from the next bid, ball and board review.</p></section>
      <hr className="hr" />
      <section className="stack" style={{ gap: 12 }}><h2 className="t-h3">League rules</h2>
        <div className="field"><label htmlFor="mega">Mega auction cycle</label><select id="mega" className="input" style={{ width: 'auto', height: 44 }} value={S.megaEvery} onChange={(e) => update(() => { const n = +e.target.value; const prev = S.nextMega - S.megaEvery; S.megaEvery = n; S.nextMega = Math.max(G.year + 1, prev + n); })}>{[2, 3, 4, 5].map((n) => <option key={n} value={n}>Every {n} seasons{n === 3 ? ' (default)' : ''}</option>)}</select></div>
        <p className="faint t-small">Next mega auction: before Season {seasonNo(S.nextMega)} ({S.nextMega}). Mini auctions in between.</p></section>
      <hr className="hr" />
      <section className="stack" style={{ gap: 12 }}><h2 className="t-h3">Save</h2>
        <p className="faint t-small">Last saved {G.s.savedAt ? new Date(G.s.savedAt).toLocaleString() : 'never'} · {isNativeApp ? 'saved to a file on this device' : 'saves in this browser'}. The game also saves when you close it and reopens where you left off.</p>
        <div className="row" style={{ gap: 10 }}><button className="btn" onClick={() => toast(saveLocal(G) ? 'Game saved.' : 'Could not save in this browser. Export a save file instead.')}>Save now</button><button className="btn" onClick={async () => { try { const msg = await exportFile(G); if (msg) toast(msg); } catch (e) { toast(`Export failed: ${e.message}`); } }}>Export save file</button>
          <label className="btn" style={{ cursor: 'pointer' }}>Import save file<input type="file" accept=".json,application/json" onChange={importFile} style={{ display: 'none' }} /></label></div>
        <Chk k="autosave" l="Autosave after every match" /></section>
      <hr className="hr" />
      <section className="stack" style={{ gap: 12 }}><h2 className="t-h3">Cloud save</h2>
        {cloud === false ? <p className="faint t-small">Cloud saves are not set up for this build. Your career is saved on this device.</p> : cloud === null ? <p className="faint t-small">Checking…</p> : <>
          <p className="t-small mut">Upload your career to get an 8-character code. Enter the code on any device to continue there. Codes last 90 days.</p>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}><button className="btn btn-blue" disabled={busy} onClick={upload}>Upload career</button>{myCode && <span className="board-f" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '.08em' }}>{myCode}</span>}</div>
          <div className="row" style={{ gap: 8 }}><input className="input" style={{ flex: '1 1 160px', maxWidth: 220, textTransform: 'uppercase' }} maxLength={8} value={code} placeholder="Enter a code" onChange={(e) => setCode(e.target.value)} aria-label="Cloud save code" /><button className="btn" disabled={busy || code.trim().length < 8} onClick={download}>Load from code</button></div></>}
      </section>
      <div className="row" style={{ marginTop: 24 }}><button className="btn btn-ghost" onClick={confirmNew}>Start a new game</button></div>
    </div>
  );
}
