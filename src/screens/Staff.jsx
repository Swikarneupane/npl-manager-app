import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Modal } from '../components/bits.jsx';
import { Icon } from '../components/icons.jsx';
import { fmtL } from '../game/engine.js';
import { COUNTRY_NAMES } from '../game/data.js';
import { STAFF_POSTS } from '../game/game.js';
import { autosave } from '../lib/save.js';
import { useNarrow } from '../lib/util.js';

// What a level does, from the rules in game.js (develop, recordMatch, strengths, injuryLength).
export function staffEffects(post, L) {
  if (!L) return post === 'physio' ? ['Injuries last a match longer', 'No extra fitness recovery after matches'] : post === 'bat' ? ['No extra development for young batters'] : ['No extra development for young bowlers'];
  const dev = Math.round(L / 2);
  if (post === 'bat') return [`Batters under 26 develop faster (+${dev} a season)`, `Out-of-form batters recover form ${L * 10}% quicker`];
  if (post === 'bowl') return [`Bowlers under 26 develop faster (+${dev} a season)`, `Out-of-form bowlers recover form ${L * 10}% quicker`, `Death-over bowling +${(0.4 * L).toFixed(1)}`];
  return [`Injuries ${dev} match${dev > 1 ? 'es' : ''} shorter (at least 1)`, `+${L} fitness after every match`];
}
const shortFx = (post, L) => { const d = Math.round(L / 2); return post === 'physio' ? `Injuries ${d} shorter · +${L} fitness a match` : `+${d} a season for under-26s · form back ${L * 10}% quicker${post === 'bowl' ? ` · death +${(0.4 * L).toFixed(1)}` : ''}`; };
const Dots = ({ L }) => <span className="lvl" role="img" aria-label={`Level ${L} of 5`}>{[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= L ? 'on' : ''} />)}</span>;
const sur = (n) => n.split(' ').slice(-1)[0];
// Best value: the highest level whose wage is within 5% of the club balance (else the cheapest).
const bestIdx = (list, balance) => { let b = -1; list.forEach((c, i) => { if (c.wage <= balance * 0.05 && (b < 0 || c.level > list[b].level)) b = i; }); return b >= 0 ? b : list.reduce((m, c, i) => (c.wage < list[m].wage ? i : m), 0); };

export default function Staff() {
  const { G, update, toast } = useGame(); const narrow = useNarrow(); const t = G.teams[G.user]; const st = G.s.staff[G.user];
  const open = G.staffWindow();
  const vacant = STAFF_POSTS.map(([k]) => k).find((k) => !st[k]);
  const [post, setPost] = useState(vacant || null); const [confirm, setConfirm] = useState(null);
  const label = (k) => STAFF_POSTS.find((x) => x[0] === k)[1];
  const hire = (k, i) => {
    const c = G.staffCandidates(k)[i]; const fee = st[k] ? G.releaseCost(G.user, k) : 0;
    const go = () => update(() => { const e = G.hireStaff(k, i); if (e) toast(e); else { toast(`${c.name} hired as ${label(k).toLowerCase()}.`); autosave(G); setPost(STAFF_POSTS.map(([x]) => x).find((x) => !G.s.staff[G.user][x]) || null); } });
    if (fee) setConfirm({ title: `Replace ${st[k].name}?`, text: `Releasing him mid-contract costs half his remaining wage: ${fmtL(fee)}. ${c.name} then joins on ${fmtL(c.wage)} a season until ${G.year + 1}.`, ok: `Replace · ${fmtL(fee)} fee`, go }); else go();
  };
  const release = (k) => { const fee = G.releaseCost(G.user, k);
    setConfirm({ title: `Release ${st[k].name}?`, text: `${fee ? `This costs half his remaining wage: ${fmtL(fee)}, paid now from the club balance.` : 'His contract is paid up, so there is no fee.'} The post stays vacant until you hire someone.`, ok: fee ? `Release · ${fmtL(fee)}` : 'Release',
      go: () => update(() => { G.releaseStaff(k); autosave(G); setPost(k); }) }); };
  const cands = post ? G.staffCandidates(post) : []; const best = cands.length ? bestIdx(cands, t.balance) : -1;
  const wages = G.staffWages(G.user);
  const closed = !open && <p className="t-small mut panel" style={{ padding: '10px 14px' }}>Staff can be hired, replaced or released in the pre-season and off-season. The next window opens after the season.</p>;
  const candList = post && (
    <section className="stack" style={{ gap: 10 }}>
      <div className="sechead"><h2 className="t-h2">{st[post] ? `Replace your ${label(post).toLowerCase()}` : narrow ? `Hire a ${label(post).toLowerCase()}` : `${label(post)} candidates`}</h2><span className="t-micro faint">{narrow ? `Club balance ${fmtL(t.balance)} · contracts run 2 seasons` : 'New candidates each off-season'}</span></div>
      <ul className="cands">{cands.map((c, i) => (
        <li key={c.name} className="panel">
          <div className="sechead" style={{ margin: 0 }}><span><span className="t-small b6">{c.name}</span> <span className="t-micro faint">{COUNTRY_NAMES[c.nat] || c.nat}</span>{i === best && <span className="ptag b" style={{ marginLeft: 6 }}>Best value</span>}</span><span className="t-small"><b>{fmtL(c.wage)}</b><span className="faint t-micro"> / season</span></span></div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}><Dots L={c.level} /><span className="t-micro mut">{shortFx(post, c.level)}</span></div>
          <button type="button" className={`btn btn-sm${i === best ? ' btn-blue' : ''}`} disabled={!open || t.balance < c.wage} onClick={() => hire(post, i)}>{narrow ? `Hire ${sur(c.name)}` : 'Hire'}</button>
        </li>))}{!cands.length && <li className="faint t-small">No candidates left this off-season.</li>}</ul>
    </section>
  );
  return (
    <div className="staffpg">
      <p className="t-small"><Link to="/club">Club</Link> <span className="faint">/ Backroom staff</span></p>
      <div className="pagehead" style={{ marginTop: 6 }}>
        <div className="stack" style={{ gap: 4 }}><h1 className="t-h1">{narrow ? 'Staff' : 'Backroom staff'}</h1><p className="mut t-small">You are the head coach. Three specialists work under you. Their wages come from the club balance, not the auction purse.</p></div>
        <div className="panel" style={{ padding: '10px 16px' }}><p className="t-micro faint">Staff wages</p><p className="board-f ab-mid">{fmtL(wages)} <span className="t-small faint">a season</span></p></div>
      </div>
      {closed}
      {narrow ? (
        <ul className="panel staff-sm">{STAFF_POSTS.map(([k, l]) => { const x = st[k]; return (
          <li key={k}><span><span className="t-micro faint">{l}</span><br /><span className={`t-small b6${x ? '' : ' crim'}`}>{x ? x.name : 'Vacant'}</span></span>
            {x ? <span className="stack" style={{ alignItems: 'flex-end', gap: 2 }}><Dots L={x.level} /><span className="t-micro faint">{fmtL(x.wage)} / season · to {x.until}</span>
              {open && <span className="row" style={{ gap: 6, alignItems: 'center' }}><button type="button" className="linkbtn t-micro" onClick={() => setPost(k)}>Replace</button><span className="faint t-micro" aria-hidden="true">·</span><button type="button" className="linkbtn t-micro" onClick={() => release(k)}>Release</button></span>}</span>
              : <button type="button" className={`ptag c linkbtn`} onClick={() => setPost(k)}>{post === k ? 'Hire below' : 'Hire'}</button>}</li>); })}</ul>
      ) : (
        <div className="staff-posts">{STAFF_POSTS.map(([k, l]) => { const x = st[k]; return (
          <section key={k} className={`panel stack${post === k ? ' sel' : ''}`} style={{ gap: 10 }}>
            <div className="row" style={{ gap: 10, alignItems: 'center' }}><span className="staff-ic" aria-hidden="true"><Icon name={k === 'physio' ? 'club' : k === 'bat' ? 'squad' : 'match'} size={20} /></span><div><p className="sec" style={{ margin: 0 }}>{l}</p><p className={`t-h3${x ? '' : ' crim'}`}>{x ? x.name : 'Vacant'}</p></div></div>
            {x ? <>
              <div className="sechead" style={{ margin: 0, alignItems: 'center' }}><Dots L={x.level} /><span className="t-small"><b>{fmtL(x.wage)}</b> <span className="faint">a season</span></span></div>
              <ul className="sfx">{staffEffects(k, x.level).map((e) => <li key={e} className="t-small"><span className="blu b6">+</span>{e}</li>)}</ul>
              <p className="t-micro faint">{COUNTRY_NAMES[x.nat] || x.nat} · contract until the end of {x.until}</p>
              <div className="row" style={{ gap: 8 }}><button type="button" className="btn btn-sm" disabled={!open} onClick={() => setPost(k)}>Replace</button><button type="button" className="btn btn-ghost btn-sm" disabled={!open} onClick={() => release(k)}>Release</button></div>
            </> : <>
              <p className="t-small mut">{k === 'physio' ? 'Without a physio, injuries last a match longer and players get no extra fitness back after matches.' : `Without a ${l.toLowerCase()}, young ${k === 'bat' ? 'batters' : 'bowlers'} develop at the normal rate.`}</p>
              <button type="button" className="btn btn-primary btn-sm" disabled={!open} onClick={() => setPost(k)}>See {G.staffCandidates(k).length} candidates</button></>}
          </section>); })}</div>
      )}
      <div className={narrow ? 'stack' : 'staff-low'} style={{ gap: 16, marginTop: 20 }}>
        {candList}
        <section className="panel stack" style={{ gap: 6 }}><p className="t-h3">How staff level works</p><p className="t-small mut">Levels run from 1 to 5. A higher level gives a bigger effect and costs more: Rs 3, 5, 8, 10 and 12 L a season. Contracts run 2 seasons. Staff can be hired or replaced in the pre-season and off-season. Releasing a coach mid-contract costs half the remaining wage.</p>
          <p className="t-micro faint">Coaches add development to players under 26 each off-season, up to their potential. Every club has staff, so rivals get these effects too.</p></section>
      </div>
      {confirm && <Modal><h2 className="t-h2">{confirm.title}</h2><p className="mut" style={{ marginTop: 8 }}>{confirm.text}</p>
        <div className="acts"><button type="button" className="btn btn-primary btn-lg" onClick={() => { confirm.go(); setConfirm(null); }}>{confirm.ok}</button><button type="button" className="btn btn-lg" onClick={() => setConfirm(null)}>Cancel</button></div></Modal>}
    </div>
  );
}
