import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/office.css';
import { useGame } from '../lib/store.jsx';
import { Modal, PageHead } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { fmtL } from '../game/engine.js';
import { STAFF_POSTS } from '../game/game.js';
import { gradeOfL, candGrade, candBio, staffEffect, STAFF_DOES, opinionLabel, staffBudget, interview, interviewsLeft, POST_NP, adviceQuality } from '../game/office.js';
import { autosave } from '../lib/save.js';
import { useNarrow } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';

// Kept for older screens that import it: the effect lines for a post at a level.
export function staffEffects(post, L) { return [staffEffect(post, L)]; }
const label = (k) => STAFF_POSTS.find((x) => x[0] === k)[1];
const sur = (n) => n.split(' ').slice(-1)[0];

function useStaff() {
  const { G, update, toast } = useGame(); const st = G.s.staff[G.user]; const open = G.staffWindow();
  const vacant = STAFF_POSTS.map(([k]) => k).filter((k) => !st[k]);
  const [post, setPost] = useState(vacant[0] || null); const [confirm, setConfirm] = useState(null);
  const hire = (k, i) => {
    const c = G.staffCandidates(k)[i]; const fee = st[k] ? G.releaseCost(G.user, k) : 0;
    const go = () => update(() => { const e = G.hireStaff(k, i); if (e) toast(e); else { toast(`${c.name} hired as ${label(k).toLowerCase()}.`); autosave(G); setPost(STAFF_POSTS.map(([x]) => x).find((x) => !G.s.staff[G.user][x]) || null); } });
    if (fee) setConfirm({ title: `Replace ${st[k].name}?`, text: `Releasing him mid-contract costs half his remaining wage: ${fmtL(fee)}. ${c.name} then joins on ${fmtL(c.wage)} a season until ${G.year + 1}.`, ok: `Replace · ${fmtL(fee)} fee`, go }); else go();
  };
  const release = (k) => { const fee = G.releaseCost(G.user, k);
    setConfirm({ title: `Release ${st[k].name}?`, text: `${fee ? `This costs half his remaining wage: ${fmtL(fee)}, paid now from the club balance.` : 'His contract is paid up, so there is no fee.'} The other staff notice. The post stays vacant until you hire someone.`, ok: fee ? `Release · ${fmtL(fee)}` : 'Release',
      go: () => update(() => { G.releaseStaff(k); autosave(G); setPost(k); }) }); };
  const iv = (k, i) => update(() => { const e = interview(G, k, i); if (e) toast(e); else autosave(G); });
  return { G, st, open, vacant, post, setPost, hire, release, iv, confirm, setConfirm };
}

function Candidates({ S, phone }) {
  const { G, post, open, hire, iv, st } = S; if (!post) return null; const t = G.teams[G.user];
  const cands = G.staffCandidates(post); const room = staffBudget(G) - G.staffWages(G.user) + (st[post] ? st[post].wage : 0);
  return (
    <section>
      <h2 className="t-h3" style={{ marginBottom: 4 }}>{st[post] ? `Replace your ${label(post).toLowerCase()}` : `Hire a ${label(post).toLowerCase()}`}</h2>
      <p className="mut t-small" style={{ marginBottom: 10 }}>{STAFF_DOES[post]}. Compare candidates and call one in for interview: an interview shows his real grade. {interviewsLeft(G)} interview{interviewsLeft(G) === 1 ? '' : 's'} left this window.</p>
      <div className={phone ? 'stack' : 'of-cands'} style={{ gap: 12 }}>
        {cands.map((c, i) => (
          <div key={c.name} className="panel stack" style={{ gap: 6 }}>
            <p style={{ fontWeight: 600 }}>{c.name} <span className="faint t-small">· grade {candGrade(c)}</span></p>
            <p className="t-small mut">{candBio(c)}{c.iv ? ` · good at ${c.spec.toLowerCase()}` : ''}</p>
            <p className="t-small">Wage {fmtL(c.wage)} · {c.iv ? staffEffect(post, c.level) : 'effect shown after interview'}</p>
            {c.wage > room && <p className="t-micro crim">Over the staff budget by {fmtL(c.wage - room)}</p>}
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className={`btn btn-sm${c.iv ? ' btn-blue' : ''}`} disabled={!open || c.iv || interviewsLeft(G) <= 0} onClick={() => iv(post, i)}>{c.iv ? 'Interviewed' : 'Call for interview'}</button>
              <button type="button" className="btn btn-sm" disabled={!open || t.balance < c.wage} onClick={() => hire(post, i)}>{phone ? `Hire ${sur(c.name)}` : 'Hire'}</button>
            </div>
          </div>))}
        {!cands.length && <p className="faint t-small">No candidates left this window.</p>}
      </div>
    </section>);
}

function Advice({ G }) {
  const list = G.s.inbox.filter((n) => n.kind === 'staff').slice(0, 5); const fresh = list.filter((n) => !n.read).length;
  return (
    <div>
      <h2 className="sec">{T(G, 'Staff advice', 'कर्मचारीको सल्लाह')}{fresh ? ` · ${fresh} new` : ''}</h2>
      {list.length ? <ul className="mlist">{list.map((n) => (
        <li key={n.id} style={{ alignItems: 'flex-start' }}><span className="grow"><span className="t-micro faint">{n.cat || 'Staff'}</span><br /><span className="t-small" style={{ fontWeight: 500 }}>{n.title || n.text}</span>{n.sum && <><br /><span className="l2">{n.sum}</span></>}
          {n.choices && <><br /><span className={`t-micro ${n.done ? 'faint' : 'gld'}`}>{n.done ? `You chose: ${n.picked}` : 'Answer in the inbox'}</span></>}</span></li>))}</ul>
        : <p className="faint t-small">Advice arrives in the inbox during the season. Better assistants and analysts give sharper advice.</p>}
      <p className="faint t-micro" style={{ marginTop: 6 }}>Advice quality {Math.round(adviceQuality(G) * 100)}% · from your assistant manager and analyst.</p>
    </div>);
}

function GradeNote({ G }) {
  return (
    <div className="panel stack" style={{ gap: 8 }}>
      <h2 className="sec" style={{ margin: 0 }}>What staff grade does</h2>
      <p className="t-small">Grades run from D to A. A-grade coaches develop players about twice as fast as C-grade in their speciality. Analysts sharpen matchup advice; physios cut injury time; the head scout narrows potential faster; the mental-skills coach adds composure.</p>
      <p className="faint t-micro">Staff opinions change with results, budgets and whether you take their advice. Contracts run 2 seasons; releasing someone costs half the wage still owed. Every club has staff, so rivals get these effects too.</p>
    </div>);
}

export default function Staff() {
  const S = useStaff(); const { G, st, open, vacant, setPost, release, confirm, setConfirm } = S; const narrow = useNarrow();
  const [tab, setTab] = useTab(['staff', 'hire', 'advice'], 'staff');
  const wages = G.staffWages(G.user), budget = staffBudget(G); const left = Math.round((budget - wages) * 10) / 10;
  const n = STAFF_POSTS.length - vacant.length;
  const sub = `${n} staff · ${vacant.length ? `${vacant.length} vacanc${vacant.length > 1 ? 'ies' : 'y'}` : 'no vacancies'} · all staff are generated characters`;
  const closed = !open && <p className="t-small mut panel" style={{ padding: '10px 14px', marginBottom: 16 }}>Staff can be hired, replaced or released in the pre-season and off-season. The next window opens after the season.</p>;
  const modal = confirm && <Modal><h2 className="t-h2">{confirm.title}</h2><p className="mut" style={{ marginTop: 8 }}>{confirm.text}</p>
    <div className="acts"><button type="button" className="btn btn-primary btn-lg" onClick={() => { confirm.go(); setConfirm(null); }}>{confirm.ok}</button><button type="button" className="btn btn-lg" onClick={() => setConfirm(null)}>Cancel</button></div></Modal>;
  const budgetTxt = left >= 0 ? `${fmtL(left)} left of ${fmtL(budget)}` : `${fmtL(-left)} over ${fmtL(budget)}`;
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'Staff'), sub: `${n} of 9`, right: <>Budget<br /><b className={left < 0 ? 'crim' : ''}>{budgetTxt.split(' of ')[0]}</b></> }} label="Staff" tab={tab} onTab={setTab}
      tabs={[['staff', T(G, 'Staff', 'कर्मचारी'), vacant.length || null], ['hire', T(G, 'Hire', 'भर्ना')], ['advice', T(G, 'Advice', 'सल्लाह'), G.s.inbox.filter((x) => x.kind === 'staff' && !x.read).length || null]]}>
      {closed && <div style={{ paddingTop: 12 }}>{closed}</div>}
      {tab === 'staff' && <ul className="mlist">{STAFF_POSTS.map(([k, l]) => { const x = st[k]; const op = x ? opinionLabel(x) : null; return (
        <li key={k} className={x ? '' : 'dim'}><span className="grow"><span className="t-micro faint">{T(G, l, POST_NP[k])}</span><br /><span className={`t-small${x ? '' : ' crim'}`} style={{ fontWeight: 500 }}>{x ? x.name : 'Vacant'}</span>
          {x && <><br /><span className="l2">{x.spec} · {fmtL(x.wage)} · to {x.until} · <span className={op[1]}>{op[0]}</span></span></>}</span>
          {x ? <span className="stack" style={{ alignItems: 'flex-end', gap: 4 }}><span className="of-grade">{gradeOfL(x.level)}</span>{open && <button type="button" className="linkbtn t-micro" onClick={() => release(k)}>Release</button>}</span>
            : <button type="button" className="btn btn-sm" onClick={() => { setPost(k); setTab('hire'); }}>Hire</button>}</li>); })}</ul>}
      {tab === 'hire' && <div style={{ paddingTop: 12 }} className="stack">
        <select className="input" style={{ height: 44 }} value={S.post || ''} onChange={(e) => setPost(e.target.value)} aria-label="Post">{STAFF_POSTS.map(([k, l]) => <option key={k} value={k}>{l}{st[k] ? '' : ' · vacant'}</option>)}</select>
        <Candidates S={S} phone /></div>}
      {tab === 'advice' && <div style={{ paddingTop: 12 }} className="stack" ><Advice G={G} /><GradeNote G={G} /></div>}
      {modal}
    </MScreen>);
  return (
    <div style={{ maxWidth: 1220 }}>
      <p className="t-small"><Link to="/club">{tn(G, 'Club')}</Link> <span className="faint">/ {T(G, 'Staff room', 'कर्मचारी कक्ष')}</span></p>
      <PageHead title={T(G, 'Staff room', 'कर्मचारी कक्ष')} sub={sub}>
        <div className="panel" style={{ padding: '10px 16px' }}><p className="t-micro faint">Staff budget</p><p className={`t-small b6 ${left < 0 ? 'crim' : ''}`}>{budgetTxt}</p></div>
      </PageHead>
      {closed}
      <div className="split" style={{ gap: 40, gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>
        <section className="stack" style={{ gap: 30 }}>
          <div className="tblwrap"><table className="tbl">
            <thead><tr><th>Role</th><th>Name</th><th className="c">Grade</th><th>Good at</th><th className="r">Wage</th><th>Contract</th><th>Thinks of you</th></tr></thead>
            <tbody>{STAFF_POSTS.map(([k, l]) => { const x = st[k]; if (!x) return (
              <tr key={k} className="dim"><td className="mut">{l}</td><td className="crim">Vacant</td><td /><td className="t-small" style={{ whiteSpace: 'normal' }}>{STAFF_DOES[k].split(';')[0]}</td><td /><td /><td><button type="button" className="btn btn-sm" disabled={!open} onClick={() => setPost(k)}>Candidates</button></td></tr>);
              const op = opinionLabel(x); return (
              <tr key={k} className={S.post === k ? 'me' : ''}><td className="mut">{l}</td><td className="name">{x.name}{open && <><br /><button type="button" className="linkbtn t-micro" onClick={() => setPost(k)}>Replace</button> <span className="faint t-micro">·</span> <button type="button" className="linkbtn t-micro" onClick={() => release(k)}>Release</button></>}</td><td className="c"><b>{gradeOfL(x.level)}</b></td><td className="t-small" style={{ whiteSpace: 'normal' }}>{x.spec}</td><td className="r num">{fmtL(x.wage)}</td><td className="num">{x.until}</td><td className={`t-small ${op[1]}`} style={{ whiteSpace: 'normal' }}>{op[0]}</td></tr>); })}</tbody>
          </table></div>
          <Candidates S={S} />
        </section>
        <aside className="stack" style={{ gap: 22 }}><Advice G={G} /><GradeNote G={G} /></aside>
      </div>
      {modal}
    </div>);
}
