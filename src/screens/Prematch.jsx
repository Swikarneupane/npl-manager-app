import '../styles/matchday.css';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { tname, tshort, userNextFixture, useNarrow, stageName, nn } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { autosave } from '../lib/save.js';
import { simUntilUser } from '../lib/flow.js';
import * as MD from '../game/matchday.js';

const NP_STEPS = ['विपक्षी', 'अवस्था', 'छनोट', 'योजना', 'टिम टक'];
const KEYS = ['opp', 'pitch', 'xi', 'plan', 'talk'];
const sur = (p) => p.name.split(' ').slice(-1)[0];

// Sell-out, a generated preview line and the fans' poll (from the model's win chance).
function pulse(G, f) {
  const home = G.teams[f.home]; const demand = 6000 + home.fans * 110; const att = Math.min(15000, Math.round(demand * Math.pow(500 / home.ticket, 0.85)));
  const opp = f.home === G.user ? f.away : f.home; const a = G.lineup(G.user), b = G.lineup(opp);
  const pw = G.winChance(G.teamStrength(a.xi, a.order), G.teamStrength(b.xi, b.order));
  const fan = Math.round(Math.max(20, Math.min(80, pw * 100 + (G.teams[G.user].fans - 50) / 5)));
  const myBat = a.order.map((id) => G.P(id)).sort((x, y) => y.bat - x.bat)[0]; const theirBowl = b.xi.map((id) => G.P(id)).sort((x, y) => y.bowl - x.bowl)[0];
  return { sold: att >= 15000, att, fan, preview: myBat && theirBowl ? `${myBat.name} against ${theirBowl.name}: the duel that decides the night.` : null };
}

function Opposition({ f }) {
  const { G, update } = useGame(); const p = MD.prepFor(G, f); const r = MD.oppReport(G, f); const cards = MD.matchupCards(G, f);
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div><p className="faint t-small">Analyst's report · {r.sn}</p><h2 className="t-h2" style={{ marginTop: 4 }}>{r.head}</h2><p className="mut" style={{ marginTop: 6, maxWidth: 680 }}>{r.body}</p></div>
      <div><h3 className="sec">{T(G, 'Danger players', 'खतरनाक खेलाडी')}</h3>
        <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Player</th><th>Role</th><th className="r">Season</th><th>Threat</th><th>How to handle him</th></tr></thead>
          <tbody>{r.rows.map(({ p: pl, line, threat, how }) => <tr key={pl.id}><td className="name"><Link to={`/player/${pl.id}`}>{pl.name}</Link></td><td><span className="role">{pl.role}</span></td><td className="r num">{line}</td><td className={threat === 'High' ? 'crim' : ''}>{threat}</td><td className="mut">{how}</td></tr>)}</tbody></table></div></div>
      <div><h3 className="sec">Matchups to target · tap to add to your plan (up to {MD.MAX_TICKS})</h3>
        <div className="md-cards">{cards.map((c) => { const on = p.mu.some((x) => x.k === c.k); return (
          <button key={c.k} type="button" className={`choice${on ? ' on' : ''}`} aria-pressed={on} onClick={() => update(() => { if (!MD.toggleMatchup(G, f, c)) return; })}>
            <span style={{ fontWeight: 600 }}>{c.title}</span><span className="fx">{c.stat}</span><span className="fx">{on ? <span className="up">In your plan · a small edge in the match</span> : p.mu.length >= MD.MAX_TICKS ? 'Plan is full' : 'Tap to add'}</span></button>); })}</div></div>
    </div>);
}

function Conditions({ f }) {
  const { G } = useGame(); const c = MD.conditions(G, f);
  const rows = [['Pitch', c.surface], ['Dew', c.dew], ['Rain', c.rain], ['Toss this season', c.toss], ['Par score', `${c.par} · ${c.parNote}`]];
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div><p className="faint t-small">Groundsman's note · in-game</p><h2 className="t-h2" style={{ marginTop: 4 }}>{c.head}</h2></div>
      <table className="tbl plain"><tbody>{rows.map(([k, v]) => <tr key={k}><td style={{ paddingLeft: 0 }} className="mut">{k}</td><td>{v}</td></tr>)}</tbody></table>
      <div className="panel stack" style={{ gap: 6 }}><p style={{ fontWeight: 600 }}>Assistant: {c.adv.charAt(0).toLowerCase() + c.adv.slice(1)}</p><p className="mut t-small">{c.why}</p></div>
    </div>);
}

function Selection({ f }) {
  const { G, update } = useGame(); const p = MD.prepFor(G, f); const s = MD.selection(G, f);
  const cap = s.lu.captain, wk = s.lu.keeper; const subs = p.subs || [];
  const bench = s.bench.filter((x) => G.available(x));
  const toggle = (id) => update(() => { p.subs = subs.includes(id) ? subs.filter((x) => x !== id) : subs.length < 5 ? subs.concat([id]) : subs; });
  return (
    <div className="stack" style={{ gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}><h2 className="t-h2">XI and Impact Player list</h2><Link to="/squad" className="btn btn-sm">Edit XI in Squad</Link></div>
      <div className="cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px,100%),1fr))', gap: 28 }}>
        <div><h3 className="sec">Playing XI · {11 - s.os} Nepali, {s.os} overseas{s.rules.every((r) => r.ok) ? '' : ' · check the rules'}</h3>
          <ol className="t-small" style={{ margin: 0, paddingLeft: 20, lineHeight: '26px' }}>{s.xi.map((pl) => <li key={pl.id}>{pl.name}{pl.id === cap ? ' (c)' : ''}{pl.id === wk ? ' (wk)' : ''}{pl.fit < 90 && <span className="crim"> · fitness {Math.round(pl.fit)}%</span>}</li>)}</ol></div>
        <div><h3 className="sec">Impact Player substitutes · {subs.length} of 5</h3>
          <ul className="mlist">{bench.map((pl) => { const on = subs.includes(pl.id); return (
            <li key={pl.id} style={{ padding: '6px 0' }}><label className="grow" style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" style={{ flex: "none" }} checked={on} disabled={!on && subs.length >= 5} onChange={() => toggle(pl.id)} /><span>{pl.name} <span className="role">{pl.role}</span></span></label><span className="faint t-small">{MD.subNote(G, pl, s.lu)}</span></li>); })}
            {!bench.length && <li className="faint t-small">No fit players on the bench.</li>}</ul></div>
      </div>
      {s.alerts.map((a) => <div key={a.k} className="panel" style={{ padding: '12px 16px' }}><p className="t-small">{a.text} <span className="mut">{a.sub}</span></p></div>)}
      {s.chat && <div className="panel stack" style={{ padding: '12px 16px', gap: 8 }}><p className="t-small"><b>{s.chat.text}</b> <span className="mut">{s.chat.sub}</span></p>
        {p.chat ? <p className="t-small blu">{p.chat.see ? 'You saw him before the game.' : 'You told him not now.'}</p>
          : <div className="row" style={{ gap: 8 }}><button type="button" className="btn btn-sm" onClick={() => update(() => { MD.resolveChat(G, f, true); autosave(G); })}>See him before the game</button><button type="button" className="btn btn-sm btn-ghost" onClick={() => update(() => { MD.resolveChat(G, f, false); autosave(G); })}>Not now</button></div>}</div>}
    </div>);
}

function Plan({ f }) {
  const { G, update } = useGame(); const p = MD.prepFor(G, f); const iss = !p.cap ? MD.captainIssue(G, f) : null; const capP = G.P(G.lineup(G.user).captain);
  const sel = (side, k, list) => <select className="input" aria-label={`${k} ${side}`} value={p.plan[side][k]} disabled={!!p.done} onChange={(e) => update(() => { p.plan[side][k] = e.target.value; })}>{list.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
  const ans = (how) => update(() => { MD.answerCaptain(G, f, how); autosave(G); });
  const trust = G.teams[G.user].capTrust ?? 60;
  return (
    <div className="stack" style={{ gap: 18 }}>
      <h2 className="t-h2">{T(G, 'Game plan by phase', 'चरणअनुसार योजना')}</h2>
      <div className="tblwrap md-plan"><table className="tbl"><thead><tr><th>Phase</th><th>When batting</th><th>When bowling</th></tr></thead>
        <tbody>{MD.PHASES.map(([k, l, o]) => <tr key={k}><td className="name">{l} · {o}</td><td>{sel('bat', k, MD.BAT_PLAN)}</td><td>{sel('bowl', k, MD.BOWL_PLAN)}</td></tr>)}</tbody></table></div>
      <p className="mut t-small">These become the in-match defaults for intent and field. Change them live and your change holds for the rest of that phase; key moments can override them for an over.</p>
      {capP && <div className="panel stack" style={{ gap: 6 }}><p style={{ fontWeight: 600 }}>Captain's view</p>
        {iss ? <>{iss.real ? <p className="t-small">{capP.name} would rather {iss.why}. <span className="faint">Trust in you {trust}</span></p>
          : <p className="pull" style={{ fontSize: 15, lineHeight: '23px' }}>“I'd rather {iss.why}.”<cite>{capP.name} · trust in you {trust}</cite></p>}
          <div className="row" style={{ gap: 8 }}><button type="button" className="btn btn-sm" onClick={() => ans('agree')}>Agree</button><button type="button" className="btn btn-sm" onClick={() => ans('overrule')}>Overrule</button><button type="button" className="btn btn-sm" onClick={() => ans('compromise')}>{iss.compLabel}</button></div>
          <p className="faint t-micro">Agreeing builds his trust; overruling costs it, more so with a strong leader.</p></>
          : <p className="t-small mut">{p.cap ? `${p.cap.how === 'agree' ? 'You agreed with him' : p.cap.how === 'overrule' ? 'You overruled him' : 'You met him halfway'} · trust ${p.cap.d > 0 ? '+' : ''}${p.cap.d}, now ${trust}.` : `${capP.name} is happy with the plan · trust ${trust}.`}</p>}</div>}
    </div>);
}

function Talk({ f, compact }) {
  const { G, update } = useGame(); const p = MD.prepFor(G, f); const tones = MD.talkPreview(G, f); const words = MD.wordCandidates(G, f);
  return (
    <div className="stack" style={{ gap: 22 }}>
      <div><h2 className="t-h2">{T(G, 'Team talk', 'टिम टक')}</h2><p className="mut" style={{ marginTop: 4 }}>Dressing room mood: <b style={{ color: 'var(--ink)' }}>{MD.dressingMood(G)}</b>.{f.stage === 'F' ? ' Final week sets the final-day talk; this one only sets the words.' : ''}</p></div>
      <div><h3 className="sec">Tone</h3><div className="md-cards tones">{tones.map((t) => <button key={t.k} type="button" className={`choice${p.talk.tone === t.k ? ' on' : ''}`} aria-pressed={p.talk.tone === t.k} onClick={() => update(() => { p.talk.tone = t.k; })}>
        <span style={{ fontWeight: 600 }}>{t.l}</span>{!compact && <span className="fx">“{t.line}”</span>}<span className="fx">{t.fx}</span></button>)}</div></div>
      {words.length > 0 && <div><h3 className="sec">A word with</h3><ul className="mlist">{words.map((w) => { const pl = G.P(w.pid); return (
        <li key={w.pid}><span className="grow"><b style={{ fontWeight: 600 }}>{pl.name}</b> <span className="faint t-small">{w.why}</span></span>
          <select className="input md-sel" aria-label={`Word with ${pl.name}`} value={p.talk.words[w.pid] || 'none'} onChange={(e) => update(() => { p.talk.words[w.pid] = e.target.value; })}>{w.opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></li>); })}</ul></div>}
      <p className="faint t-small">Reactions show as body language in the commentary when the players walk out.</p>
    </div>);
}

const STEP_C = [Opposition, Conditions, Selection, Plan, Talk];

export default function Prematch() {
  const { G, update, toast } = useGame(); const nav = useNavigate(); const narrow = useNarrow();
  const f = userNextFixture(G); const [mtab, setMtab] = useTab(KEYS, 'opp');
  if (!f || !(G.s.phase === 'league' || G.s.phase === 'playoffs')) return <div className="wrap"><h1 className="t-h1">No match to prepare</h1><p className="mut" style={{ marginTop: 8 }}>The build-up opens before your next match.</p></div>;
  const p = MD.prepFor(G, f); const opp = f.home === G.user ? f.away : f.home;
  const step = narrow ? KEYS.indexOf(mtab) + 1 : p.step;
  const go = (n) => update(() => { p.step = n; if (!p.seen.includes(n)) p.seen.push(n); if (narrow) setMtab(KEYS[n - 1]); });
  const before = G.s.fixtures.filter((x) => !x.res && x.n < f.n).length;
  const toMatch = async () => { if (before) { toast('Simulating other matches…'); await simUntilUser(G); } autosave(G); update(); nav('/match'); };
  const finish = () => { MD.finishPrep(G, f); toMatch(); };
  const assist = () => { MD.autoPrep(G, f); toast('The assistant has done the rest.'); toMatch(); };
  const next = () => (step < 5 ? go(step + 1) : finish());
  const nextLabel = step < 5 ? `Next: ${MD.STEPS[step]}` : T(G, 'Go to the toss', 'टसतर्फ');
  const ready = MD.readiness(G, f); const pu = pulse(G, f); const pressPre = MD.pressBefore(G, f) && !G.s.settings.assistant;
  const Step = STEP_C[step - 1];
  const st = G.standings(); const pos = (id) => st.findIndex((x) => x.id === id) + 1;
  if (narrow) return (
    <MScreen top={{ title: <><Dot id={f.home} /><span style={{ margin: '0 6px 0 2px' }}>v</span><Dot id={f.away} />{tshort(G, opp)}</>, sub: '', right: <><b>{f.date} {f.night ? '7:15' : '3:00'}</b><br />{stageName(f)}</> }} label="Build-up steps"
      tabs={KEYS.map((k, i) => [k, T(G, ['Opposition', 'Pitch', 'XI', 'Plan', 'Talk'][i], NP_STEPS[i]), p.seen.includes(i + 1) ? '✓' : null, true])} tab={mtab} onTab={(k) => go(KEYS.indexOf(k) + 1)}
      actions={<><button type="button" className="btn btn-primary" style={{ flex: '1 1 auto' }} onClick={next}>{nextLabel}</button><button type="button" className="btn btn-ghost" onClick={assist}>{T(G, "Assistant decides", "सहायकले गर्छन्")}</button></>}>
      <div style={{ paddingTop: 14 }}><Step f={f} compact /></div>
      <div className="stack" style={{ gap: 6, marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--rule)' }}>
        <p className="mhead" style={{ marginTop: 0 }}>Tonight's pulse</p>
        <p className="t-small">{pu.sold ? <b>Sold out</b> : <><b>{nn(G, pu.att.toLocaleString('en-US'))}</b> expected</>} · fans' poll {pu.fan}% back {tshort(G, G.user)}</p>
        {pressPre && <Link to="/press" className="t-small">Pre-match press conference · 3 questions</Link>}
      </div>
    </MScreen>);
  return (
    <div style={{ maxWidth: 1220 }}>
      <div className="pagehead" style={{ marginBottom: 14 }}>
        <div className="stack" style={{ gap: 4 }}><p className="faint t-small">{f.date} {f.night ? '7:15 pm' : '3:00 pm'} · {stageName(f)} · TU International Cricket Ground, Kirtipur</p>
          <h1 className="t-h1" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px' }}><span style={{ display: 'flex', alignItems: 'center' }}><Dot id={f.home} />{tname(G, f.home)}</span><span className="faint" style={{ fontWeight: 400 }}>v</span><span style={{ display: 'flex', alignItems: 'center' }}><Dot id={f.away} />{tname(G, f.away)}</span></h1></div>
        {f.stage === 'L' && <p className="mut t-small">{pos(f.home)}{['th', 'st', 'nd', 'rd'][pos(f.home)] || 'th'} v {pos(f.away)}{['th', 'st', 'nd', 'rd'][pos(f.away)] || 'th'} · {tn(G, 'Matchday')}</p>}
      </div>
      <ol className="steps" aria-label="Build-up steps">{MD.STEPS.map((l, i) => { const n = i + 1, on = step === n, done = p.seen.includes(n) && !on; return <li key={l}><button type="button" className={on ? 'on' : done ? 'done' : ''} aria-current={on ? 'step' : undefined} onClick={() => go(n)}><span className="n">{n}</span>{T(G, l, NP_STEPS[i])}</button></li>; })}</ol>
      <div className="md-split">
        <section><Step f={f} /></section>
        <aside className="stack" style={{ gap: 20 }}>
          <div className="panel stack" style={{ gap: 10 }}><h2 className="sec" style={{ margin: 0 }}>Ready for the toss?</h2>
            <ul className="mlist">{ready.map((r) => <li key={r.n} style={{ minHeight: 36, padding: '6px 0' }}><span className="grow">{r.label}</span><span className={`t-small ${r.done ? 'blu' : 'faint'}`}>{r.done ? 'Done' : 'Assistant'}</span></li>)}
              {pressPre && <li style={{ minHeight: 36, padding: '6px 0' }}><span className="grow">Press conference</span><span className="t-small faint">{MD.pressOf(G, f) && MD.pressOf(G, f).done ? 'Done' : 'After the match if skipped'}</span></li>}</ul>
            <button type="button" className="btn btn-primary btn-lg" onClick={next}>{nextLabel}</button>
            <button type="button" className="btn btn-ghost" onClick={assist}>Let the assistant do the rest</button></div>
          <div className="stack" style={{ gap: 8 }}><h2 className="sec" style={{ margin: 0 }}>Tonight's pulse</h2>
            <p className="t-small">{pu.sold ? <><b>Sold out</b> · 15,000 at Kirtipur</> : <><b>{pu.att.toLocaleString('en-US')}</b> expected at Kirtipur</>}</p>
            {pu.preview && <p className="t-small mut">“{pu.preview}” <span className="faint">· match preview, in-game</span></p>}
            <p className="t-small mut">Fans' poll: {pu.fan}% back {tshort(G, G.user)}</p></div>
          {pressPre && <Link to="/press" className="t-small">Pre-match press conference · 3 questions</Link>}
        </aside>
      </div>
    </div>);
}
