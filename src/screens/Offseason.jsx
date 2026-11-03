import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gradeOfL } from '../game/office.js';
import { useGame } from '../lib/store.jsx';
import { Dot, Role } from '../components/bits.jsx';
import { ovr, fmtL } from '../game/engine.js';
import { potRange, seasonNo, tname } from '../lib/util.js';
import { autosave } from '../lib/save.js';
import { gradeLabel } from './Nepal.jsx';

// The off-season as steps: Retire → Growth → Nepal → Talent → Trades → Retain.
export const OFF_STEPS = [['retire', 'Retirements'], ['growth', 'Growth'], ['nepal', 'Nepal'], ['talent', 'New talent'], ['trades', 'Trades'], ['retain', 'Retention']];
const avg11 = (ps, f) => { const top = ps.map(f).sort((a, b) => b - a).slice(0, 11); return top.length ? Math.round(top.reduce((a, b) => a + b, 0) / top.length) : 0; };

function Steps({ steps, cur }) {
  return <ol className="stepper-steps" aria-label="Off-season steps">{steps.map(([k, l], i) => <li key={k} className={i < cur ? 'done' : i === cur ? 'on' : ''} aria-current={i === cur ? 'step' : undefined}><span className="st-n">{i < cur ? '✓' : i + 1}</span><span className="t-small">{l}</span></li>)}</ol>;
}
function Head({ n, total, name, title, cells }) {
  return (
    <section className="board offboard"><p className="blbl">Step {n} of {total} · {name}</p><p className="bf ob-title">{title}</p>
      <div className="ob-cells">{cells.map(([k, v]) => <div key={k}><p className="blbl">{k}</p><p className="bf ob-v">{v}</p></div>)}</div></section>
  );
}
const Note = ({ children }) => <section className="panel coachnote"><p className="t-small gld b6">Coach's note</p><p className="t-small">{children}</p></section>;

export default function Offseason() {
  const { G, ui, update, toast } = useGame(); const nav = useNavigate(); const s = G.s, t = G.teams[G.user];
  const [allGrowth, setAllGrowth] = useState(false); const [running, setRunning] = useState(false);
  // saves from before the international layer reach the off-season without Nepal's winter: play it now
  useEffect(() => { if (s.phase === 'offseason' && s.nepal.winter !== G.year - 1 && !running) { setRunning(true); G.runIntlWinter().then(() => { autosave(G); setRunning(false); update(); }); } }, [s.phase, s.nepal.winter]); // eslint-disable-line react-hooks/exhaustive-deps
  const steps = OFF_STEPS; const key = s.offStep && steps.some(([k]) => k === s.offStep) ? s.offStep : 'retire'; const cur = steps.findIndex(([k]) => k === key);
  const open = s.phase === 'offseason';
  const setStep = (i) => update(() => { s.offStep = steps[Math.max(0, Math.min(steps.length - 1, i))][0]; autosave(G); window.scrollTo(0, 0); });
  const toRetention = () => { update(() => { s.offStep = 'retain'; G.beginRetention(); autosave(G); }); nav('/retention'); };

  const sq = t.squad.map((id) => G.P(id)).filter((p) => p.prevOvr != null);
  const delta = (p) => ovr(p) - p.prevOvr;
  const coachOf = (p) => { const st = G.s.staff[G.user]; if (!p.coachDev) return null; const bat = p.role !== 'BOWL'; const x = bat ? st.bat : st.bowl; return x ? `grade ${gradeOfL(x.level)} ${bat ? 'batting' : 'bowling'} coach` : null; };
  const why = (p) => { const d = delta(p); const r = []; if (p.age <= 22) r.push('Young'); const c = coachOf(p); if (c) r.push(c); if (p.focus !== 'Balanced' && d > 0) r.push(`${p.focus.toLowerCase()} focus`); if (t.training === 'Intense' && d > 0) r.push('hard training'); if (p.age >= 31 && d < 0) r.push('Age'); if (p.age >= 35) r.push('may retire next year'); if (d === 0 && p.pot <= ovr(p)) r.push('At his ceiling'); if (!r.length) r.push(d > 0 ? 'Regular cricket' : d < 0 ? 'Lost a step' : 'Steady'); return r.join(' · '); };
  const ret = (s.lastRetired || []).map((id) => G.P(id)).filter(Boolean);
  const myRet = ret.filter((p) => p.prevTeam === G.user);
  const np = (s.newPlayers || []).map((id) => G.P(id)).filter((p) => p && !p.team).sort((a, b) => b.pot - a.pot);
  const total = steps.length; let body;

  if (key === 'retire') {
    const hof = (s.hof || []).filter((h) => h.y === G.year - 1);
    const next = t.squad.map((id) => G.P(id)).filter((p) => p.age >= 35).sort((a, b) => b.age - a.age);
    body = <>
      <Head n={cur + 1} total={total} name="Retirements" title={myRet.length ? `${myRet.length} of your players retired` : 'Nobody from your squad retired'} cells={[['League-wide', ret.length], ['From your squad', myRet.length], ['Hall of fame', hof.length]]} />
      <section><h2 className="t-h3" style={{ marginBottom: 6 }}>Retired this off-season</h2><p className="t-micro faint" style={{ marginBottom: 6 }}>Players retire between 35 and 40. The odds rise each year past 35.</p>
        <ul className="olist">{ret.length ? ret.slice().sort((a, b) => (b.prevTeam === G.user) - (a.prevTeam === G.user)).slice(0, 16).map((p) => <li key={p.id}><span><span className="t-small b6">{p.name}</span> <span className="t-micro faint">{p.age}</span><br /><span className="t-micro mut">{p.prevTeam ? <><Dot id={p.prevTeam} />{tname(G, p.prevTeam)}</> : 'Free agent'} · {p.nat === 'NEP' ? 'Nepal' : 'Overseas'}</span></span>{p.prevTeam === G.user && <span className="ptag c">Yours</span>}</li>) : <li className="faint t-small">No retirements.</li>}</ul></section>
      <Note>{myRet.length ? `We lose ${myRet.map((p) => p.name).join(' and ')}. ` : 'The squad is intact. '}{next.length ? `${next.map((p) => `${p.name} (${p.age})`).slice(0, 2).join(' and ')} could be next, so plan for that at the auction.` : 'Nobody in the squad is at retirement age yet.'}</Note>
    </>;
  } else if (key === 'growth') {
    const up = sq.filter((p) => delta(p) > 0).length, down = sq.filter((p) => delta(p) < 0).length;
    const r0 = avg11(sq, (p) => p.prevOvr), r1 = avg11(sq, (p) => ovr(p));
    const list = sq.slice().sort((a, b) => Math.abs(delta(b)) - Math.abs(delta(a)) || delta(b) - delta(a));
    const best = sq.slice().sort((a, b) => delta(b) - delta(a))[0]; const fading = sq.filter((p) => p.age >= 32 && delta(p) < 0).sort((a, b) => delta(a) - delta(b)).slice(0, 2);
    body = <>
      <Head n={cur + 1} total={total} name="Growth" title={r1 > r0 ? 'Your squad got better' : r1 < r0 ? 'Your squad lost a little ground' : 'Your squad held steady'} cells={[['Improved', up], ['Declined', down], ['Team rating', `${r0} → ${r1}`]]} />
      <section><div className="sechead"><h2 className="t-h3">Biggest changes</h2>{list.length > 6 && <button type="button" className="linkbtn t-small" onClick={() => setAllGrowth(!allGrowth)}>{allGrowth ? 'Top 6' : `All ${list.length}`}</button>}</div>
        <ul className="olist">{(allGrowth ? list : list.slice(0, 6)).map((p) => { const d = delta(p); return <li key={p.id}><span><Link to={`/player/${p.id}`} className="t-small b6" style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link> <span className="t-micro faint">{p.age}</span><br /><span className="t-micro mut">{why(p)}</span></span><span className="board-f ob-chg">{p.prevOvr} → {ovr(p)}</span><span className={`ptag ${d > 0 ? 'b' : d < 0 ? 'c' : ''}`}>{d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '–'}</span></li>; })}</ul></section>
      <Note>{best && delta(best) > 0 ? `${best.name} took the biggest step (+${delta(best)}). ` : ''}{fading.length ? `${fading.map((p) => p.name).join(' and ')} ${fading.length > 1 ? 'are' : 'is'} fading, so think about ${fading.length > 1 ? 'them' : 'him'} before retention.` : 'No big declines to worry about.'}</Note>
    </>;
  } else if (key === 'nepal') {
    const N = s.nepal; const res = N.winter === G.year - 1 ? N.results || [] : []; const duty = N.duty || {};
    const mine = Object.entries(duty).map(([id, d]) => ({ p: G.P(id), d })).filter((x) => x.p && x.p.team === G.user).sort((a, b) => b.d.games - a.d.games);
    const tired = mine.filter((x) => x.d.events.length >= 2).length; const first = mine.filter((x) => x.d.firstCap);
    const sum = (r) => (r.fmt === 'ODI' ? `W ${r.w} · L ${r.l}` : `${r.w}–${r.l}`);
    const verdict = (r) => (r.w > r.l ? (r.fmt === 'ODI' ? 'A winning campaign' : 'Nepal win the series') : r.w < r.l ? (r.fmt === 'ODI' ? 'A tough campaign' : `${r.short.replace(/^v /, '')} win the series`) : 'Series drawn');
    body = <>
      <section className="board offboard"><p className="blbl">Step {cur + 1} of {total} · Nepal's winter</p><p className="bf ob-title">{running ? 'Nepal are playing…' : mine.length ? `${mine.length} of your player${mine.length > 1 ? 's' : ''} wore the Nepal shirt` : 'None of your players were picked for Nepal'}</p>
        <p className="blbl">{mine.length ? `They come back more experienced.${tired ? ` ${tired} played more than one series: rest ${tired > 1 ? 'them' : 'him'} early in the season.` : ''}` : 'Strong NPL form and a central contract are the way in.'}</p></section>
      <section><h2 className="t-h3" style={{ marginBottom: 6 }}>Nepal's results</h2>
        <ul className="olist">{res.map((r) => <li key={r.id}><span><span className="t-small b6">{r.name}</span><br /><span className="t-micro faint">{r.month} · {r.fmt}{r.official ? '' : ' · not a full international'}</span><br /><span className="t-micro mut">{verdict(r)}</span></span><span className="board-f ob-chg">{sum(r)}</span><span /></li>)}
          {!res.length && <li className="t-small faint">{running ? 'Simulating…' : 'No international results recorded this winter.'}</li>}</ul>
        <p className="t-micro faint" style={{ marginTop: 6 }}>{res.length && G.winterEvents(G.year - 1).some((e) => e.real) ? 'Real fixtures, results simulated in your game.' : 'Fixtures generated by the game; results simulated.'}</p></section>
      {mine.length > 0 && <section><h2 className="t-h3" style={{ marginBottom: 6 }}>Your players on duty</h2>
        <ul className="olist">{mine.map(({ p, d }) => <li key={p.id}><span><Link to={`/player/${p.id}?tab=nepal`} className="t-small b6" style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link><br /><span className="t-micro mut">{d.games} game{d.games > 1 ? 's' : ''} · {p.role === 'BOWL' ? `${d.w} wkts` : `${d.r} runs${d.w ? ` · ${d.w} wkts` : ''}`}</span>{(d.firstCap || (p.intl && p.intl.grade)) && <><br /><span className="t-micro gld">{d.firstCap ? 'First cap' : `Grade ${gradeLabel(p.intl.grade)} contract`}</span></>}</span><span className={`ptag ${d.dev ? 'b' : ''}`}>{d.dev ? `▲ +${d.dev}` : '–'}</span><span /></li>)}</ul></section>}
      <Note>{first.length ? `${first.map((x) => x.p.name).join(' and ')} ${first.length > 1 ? 'are' : 'is'} now capped and leave${first.length > 1 ? '' : 's'} the uncapped set, so keep ${first.length > 1 ? 'them' : 'him'} if you want ${first.length > 1 ? 'them' : 'him'} cheaply.` : mine.length ? `${mine[0].p.name} got the most game time. Watch his fitness early in the season.` : 'Give your young Nepali players NPL minutes: that is how the selectors notice them.'}</Note>
    </>;
  } else if (key === 'talent') {
    const nep = np.filter((p) => p.nat === 'NEP'), os = np.filter((p) => p.nat !== 'NEP'), gems = np.filter((p) => p.pot >= 80);
    body = <>
      <Head n={cur + 1} total={total} name="New talent" title={`${np.length} new players enter the pool`} cells={[['Nepali', nep.length], ['Overseas', os.length], ['High potential', gems.length]]} />
      <section><h2 className="t-h3" style={{ marginBottom: 6 }}>Best prospects</h2><p className="t-micro faint" style={{ marginBottom: 6 }}>Potential stays a range until scouted. Star a player to put him on your auction shortlist.</p>
        <ul className="olist">{np.slice(0, 14).map((p) => { const on = !!G.slEntry(p.id); return <li key={p.id}><span><Link to={`/player/${p.id}`} className="t-small b6" style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link> {p.pot >= 80 && <span className="ptag g">High potential</span>}<br /><span className="t-micro mut">{p.nat === 'NEP' ? `${p.prov} Province` : p.nat} · {p.age} · <Role r={p.role} /> · rating {ovr(p)} · potential {potRange(p)}</span></span>
          <button type="button" className={`star${on ? ' on' : ''}`} aria-pressed={on} aria-label={on ? `Remove ${p.name} from shortlist` : `Add ${p.name} to shortlist`} onClick={() => update(() => { G.toggleShortlist(p.id); })}>{on ? '★' : '☆'}</button></li>; })}
          {!np.length && <li className="faint t-small">No new players this year.</li>}</ul></section>
      <Note>{gems.length ? `Scouts rate ${gems[0].name} (${gems[0].age}) highly: potential ${potRange(gems[0])}. Worth a shortlist spot.` : np.length ? `${np[0].name} is the pick of a modest crop.` : 'A quiet year for new talent.'}</Note>
    </>;
  } else if (key === 'trades') {
    const tr = ui.trade; const others = Object.values(G.teams).filter((x) => x.id !== G.user); const tt = tr.team || others[0].id;
    const myOpts = t.squad.map((id) => G.P(id)).sort((a, b) => ovr(b) - ovr(a)); const theirOpts = G.teams[tt].squad.map((id) => G.P(id)).sort((a, b) => ovr(b) - ovr(a));
    const propose = () => { const mine = tr.mine && t.squad.includes(tr.mine) ? tr.mine : myOpts[0].id; const theirs = tr.theirs && G.teams[tt].squad.includes(tr.theirs) ? tr.theirs : theirOpts[0].id;
      const r = G.tradeEval(mine, theirs); update(() => { if (r.ok) { G.doTrade(mine, theirs); ui.trade = {}; autosave(G); } }); toast(r.why); };
    const Sel = ({ label, value, opts, onChange }) => <label className="field" style={{ flex: '1 1 220px' }}><span className="lbl">{label}</span><select className="input" style={{ width: '100%', height: 44 }} value={value || ''} onChange={(e) => onChange(e.target.value)}>{opts}</select></label>;
    const needs = G.userNeeds().filter((x) => x.left);
    body = <>
      <Head n={cur + 1} total={total} name="Trades" title="The trade window is open" cells={[['Squad', t.squad.length], ['Overseas', G.osCount(G.user)], ['Squad value', fmtL(t.squad.reduce((a, id) => a + G.P(id).value, 0))]]} />
      <section className="panel stack" style={{ gap: 10 }}><h2 className="t-h3">Propose a trade</h2><p className="t-small mut">Swap one of your players for one of theirs. The other franchise accepts if the deal improves their squad.</p>
        <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
          <Sel label="You give" value={tr.mine} onChange={(v) => update(() => { tr.mine = v; })} opts={myOpts.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role} · {ovr(p)} · {fmtL(p.value)}</option>)} />
          <Sel label="Trade with" value={tt} onChange={(v) => update(() => { tr.team = v; tr.theirs = null; })} opts={others.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)} />
          <Sel label="You get" value={tr.theirs} onChange={(v) => update(() => { tr.theirs = v; })} opts={theirOpts.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role} · {ovr(p)} · {fmtL(p.value)}</option>)} />
          <button className="btn btn-blue" disabled={!open} onClick={propose}>Propose trade</button>
        </div></section>
      <Note>{needs.length ? `We are short of ${needs.map((x) => x.label.toLowerCase()).slice(0, 2).join(' and ')}. A trade now saves money at the auction.` : 'The squad covers every role. Trade only if it is a clear upgrade.'}</Note>
    </>;
  } else {
    body = <>
      <Head n={cur + 1} total={total} name="Retention" title={s.mega ? `Retention before the ${G.year} mega auction` : `Releases before the ${G.year} mini auction`} cells={[['Squad', t.squad.length], ['Domestic purse', fmtL(t.purse)], ['Overseas purse', fmtL(t.osPurse)]]} />
      <p className="t-small mut">{s.mega ? `Keep up to ${s.settings.retain} players. Everyone else goes into the auction, and each empty slot becomes a Right to Match card.` : 'Release the players you do not want. Everyone else stays on their contract.'}</p>
      <Note>{s.mega ? 'Keep the players who would cost more at auction than their retention price.' : 'Releasing frees purse space for the mini auction.'}</Note>
    </>;
  }
  const last = cur === steps.length - 1;
  return (
    <div className="offpg stack" style={{ gap: 14 }}>
      <div><h1 className="t-h1">Off-season</h1><p className="t-small faint">Before Season {seasonNo(G.year)} · {G.year} · Dec {G.year - 1} – Mar {G.year}</p></div>
      <Steps steps={steps} cur={cur} />
      {body}
      <div className="stepbar"><button type="button" className="btn" disabled={cur === 0} onClick={() => setStep(cur - 1)}>Back</button>
        {last ? <button type="button" className="btn btn-primary b6" disabled={!open} onClick={toRetention}>Go to {s.mega ? 'retention' : 'releases'}</button>
          : <button type="button" className="btn btn-primary b6" onClick={() => setStep(cur + 1)}>Next: {steps[cur + 1][1]}</button>}</div>
      {!open && <p className="t-micro faint">The off-season is over. <Link to="/">Home</Link></p>}
    </div>
  );
}
