import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import '../styles/club.css';
import { useGame } from '../lib/store.jsx';
import { PageHead } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { useNarrow, nn } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { autosave } from '../lib/save.js';
import { hierarchy, groups, drifting, roomMood, promiseList, promiseText, talkOptions, talkOpener, talkContext, holdTalk, canTalk } from '../game/club.js';

const sur = (p) => p.name.split(' ').slice(-1)[0];
const names = (list, full) => list.map((p) => (full ? p.name : sur(p))).join(full ? ' · ' : ', ');

function Hierarchy({ G, H, phone }) {
  const cap = G.teams[G.user].captainId;
  const rows = [['Team leaders', 'टोली नेता', H.leaders, 'Their mood spreads to everyone', true], ['Influential', 'प्रभावशाली', H.influential, 'Speak up in team meetings', true], ['Others', 'अन्य', H.others, '', false], ['Newcomers', 'नयाँ', H.newcomers, "Follow the leaders' lead", true]];
  if (phone) return <ul className="mlist">{rows.filter((r) => r[2].length).map(([en, np, list, note]) => <li key={en}><span className="grow"><span style={{ fontWeight: 500 }}>{T(G, en, np)}</span><br /><span className="l2">{list.map((p) => `${p.name}${p.id === cap ? ' (c)' : ''}`).join(', ')}</span>{note ? <><br /><span className="l2 faint">{note}</span></> : null}</span></li>)}</ul>;
  return (
    <div className="tblwrap"><table className="tbl"><tbody>{rows.map(([en, np, list, note, full]) => (
      <tr key={en}><td className="mut" style={{ width: 150 }}>{T(G, en, np)}</td>
        <td className="cl-wrap">{list.length ? list.map((p, i) => <span key={p.id}>{i ? (full ? ' · ' : ', ') : ''}{full ? <b>{p.name}</b> : sur(p)}{p.id === cap ? ' (captain)' : ''}</span>) : <span className="faint">None</span>}</td>
        <td className="faint t-small cl-wrap">{note}</td></tr>))}</tbody></table></div>);
}
function Groups({ G, gs, drift }) {
  return (<>
    <div className="cl-groups">{gs.map((g) => (
      <div key={g.key} className="panel stack" style={{ gap: 6 }}><p style={{ fontWeight: 600 }}>{g.name} <span className="faint t-micro num">· mood {nn(G, g.avg)}</span></p><p className="t-small mut">{names(g.list)}</p><p className="t-micro faint">{g.note}</p></div>))}</div>
    {drift.slice(0, 3).map((d) => <p key={d.p.id} className="t-small" style={{ marginTop: 10 }}><span className="crim">{d.p.name}</span> <span className="mut">is drifting from the {d.group.toLowerCase()} {d.why}.{d.follow ? ` If it goes on, ${d.follow.name} may follow.` : ''}</span></p>)}
  </>);
}
function Promises({ G, list }) {
  if (!list.length) return <p className="faint t-small">No promises made. Contract talks and one-to-ones can add them.</p>;
  const cls = { kept: 'blu', broken: 'crim', risk: 'crim', open: 'faint' };
  return <ul className="mlist">{list.map((x, i) => {
    const pr = x.pr; const text = pr ? promiseText(pr, x.p) : x.log.text;
    const l2 = pr ? (pr.kind === 'role' ? `Made ${pr.made || pr.y} · played ${nn(G, x.pl)} of ${nn(G, x.av)} available · needs ${Math.round(x.need * 100)}% by season end` : pr.kind === 'start' || pr.kind === 'debut' ? `Made ${pr.made || ''} · ${pr.matchesLeft != null ? `${pr.matchesLeft} match${pr.matchesLeft === 1 ? '' : 'es'} left` : ''}` : `Made ${pr.made || pr.y}`) : `${x.log.y}${x.log.note ? ` · ${x.log.note}` : ''}`;
    return <li key={pr ? pr.id : `l${i}`}><span className="grow">{text.includes(x.p.name) ? text : `${x.p.name} · ${text}`}<br /><span className="l2">{l2}</span></span><span className={`${cls[x.status]} t-small`}>{x.text}</span></li>; })}</ul>;
}
function Happiness({ G, sq, onPick, sel }) {
  return <ul className="mlist">{sq.map((p) => { const h = Math.round(p.happy ?? 70); return (
    <li key={p.id} style={{ padding: '8px 0' }}><button type="button" className={`grow cl-pick${sel === p.id ? ' on' : ''}`} onClick={() => onPick(p.id)}><span>{p.name}</span><br /><span className="l2">{p.happyWhy || 'Settled'}</span></button>
      <span className={`gauge${h >= 75 ? ' high' : h < 50 ? ' low' : ''}`} style={{ width: 120 }}><span className="meter"><i style={{ width: `${h}%` }} /></span><span className="num">{nn(G, h)}</span></span></li>); })}</ul>;
}
function OneToOne({ G, p, onTalk, last }) {
  if (!p) return null;
  const ok = canTalk(G, p.id); const opts = talkOptions(G, p); const open = talkOpener(G, p);
  return (
    <div className="panel stack" style={{ gap: 12 }}>
      <h2 className="sec" style={{ margin: 0 }}>{T(G, 'One-to-one', 'एक्लै कुरा')} · {p.name}</h2>
      {open ? <p className="pull" style={{ fontSize: 15, lineHeight: '23px' }}>{open}</p> : <p className="t-small mut">{talkContext(G, p)}. A cricket conversation: role, form, selection and development.</p>}
      {ok ? <div className="stack" style={{ gap: 8 }}>{opts.map((o) => (
        <button key={o.k} type="button" className="choice" style={{ padding: '10px 12px' }} onClick={() => onTalk(p.id, o.k)}><span style={{ fontWeight: 600, fontSize: 14 }}>{o.label}</span><span className="fx">{o.fx}</span></button>))}</div>
        : <p className="faint t-small">You have spoken with him since the last match.</p>}
      {last && last.pid === p.id && <p className="t-small rise" style={{ fontStyle: 'italic' }}>{last.reply}</p>}
    </div>);
}
function TalkLog({ G }) {
  const L = G.s.club.talks.filter((e) => e.y >= G.year - 1).slice(0, 6); if (!L.length) return null;
  return <div><h2 className="sec">Recent talks</h2><ul className="mlist">{L.map((e, i) => <li key={i}><span className="grow">{e.name} · {e.label}<br /><span className="l2">{e.reply}</span></span><span className="faint t-micro">{e.d}</span></li>)}</ul></div>;
}

export default function Dressing() {
  const { G, update } = useGame(); const narrow = useNarrow(); const [q] = useSearchParams();
  const [tab, setTab] = useTab(['room', 'mood', 'promises', 'talk'], q.get('talk') ? 'talk' : 'room');
  const t = G.teams[G.user]; const sq = t.squad.map((id) => G.P(id)).filter(Boolean).sort((a, b) => (a.happy ?? 70) - (b.happy ?? 70));
  const [sel, setSel] = useState(() => (q.get('talk') && t.squad.includes(q.get('talk')) ? q.get('talk') : sq[0] && sq[0].id));
  const [last, setLast] = useState(null);
  if (!G.s.club) return <PageHead title={tn(G, 'Dressing room')} />;
  const H = hierarchy(G), gs = groups(G), drift = drifting(G), mood = roomMood(G), plist = promiseList(G);
  const lastRes = t.form && t.form.length ? (t.form[t.form.length - 1] === 'W' ? 'after the win' : t.form[t.form.length - 1] === 'L' ? 'after the defeat' : '') : '';
  const sub = <>Mood <b style={{ color: 'var(--ink)' }}>{mood.label}</b>{lastRes ? ` ${lastRes}` : ''} · unity {nn(G, mood.unity)} · {mood.unhappy ? `${mood.unhappy} unhappy player${mood.unhappy > 1 ? 's' : ''}` : 'nobody unhappy'}</>;
  const talk = (pid, k) => update(() => { const e = holdTalk(G, pid, k); if (e) setLast(e); autosave(G); });
  const pick = (id) => { setSel(id); setLast(null); if (narrow) setTab('talk'); };
  const P = G.P(sel);
  const risk = plist.filter((x) => x.status === 'risk').length;
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'Dressing room'), sub: `Unity ${nn(G, mood.unity)}` }} pin={<p className="t-small">{sub}</p>} label="Dressing room" tab={tab} onTab={setTab}
      tabs={[['room', T(G, 'Room', 'कोठा')], ['mood', T(G, 'Mood', 'मनोबल'), mood.unhappy || null], ['promises', T(G, 'Promises', 'वाचा'), risk || null], ['talk', T(G, 'Talk', 'कुरा')]]}>
      {tab === 'room' && <><p className="mhead">Who leads, who follows</p><Hierarchy G={G} H={H} phone /><p className="mhead">Social groups</p><Groups G={G} gs={gs} drift={drift} /></>}
      {tab === 'mood' && <><p className="mhead">Happiness · tap to talk</p><Happiness G={G} sq={sq} onPick={pick} sel={sel} /></>}
      {tab === 'promises' && <><p className="mhead">Promises</p><Promises G={G} list={plist} /></>}
      {tab === 'talk' && <div style={{ paddingTop: 12 }} className="stack"><label className="faint t-micro" htmlFor="talkp">Player</label>
        <select id="talkp" className="input" style={{ height: 44 }} value={sel} onChange={(e) => pick(e.target.value)}>{sq.map((p) => <option key={p.id} value={p.id}>{p.name} · {Math.round(p.happy ?? 70)}</option>)}</select>
        <OneToOne G={G} p={P} onTalk={talk} last={last} /><TalkLog G={G} /></div>}
    </MScreen>);
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title={tn(G, 'Dressing room')} sub={sub} />
      <div className="split" style={{ gap: 40, gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)' }}>
        <section className="stack" style={{ gap: 30 }}>
          <div><h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'Who leads, who follows', 'को अगाडि, को पछाडि')}</h2><Hierarchy G={G} H={H} /></div>
          <div><h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'Social groups', 'समूह')}</h2><Groups G={G} gs={gs} drift={drift} /></div>
          <div><h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'Promises', 'वाचा')}</h2><Promises G={G} list={plist} /><p className="faint t-micro" style={{ marginTop: 6 }}>Role promises are judged at season end on the matches he was available for: rotation 30%, regular 60%, key player 85%. <Link to="/squad">Team sheet</Link></p></div>
        </section>
        <aside className="stack" style={{ gap: 24 }}>
          <OneToOne G={G} p={P} onTalk={talk} last={last} />
          <div><h2 className="sec">{T(G, 'Happiness', 'खुसी')} · pick a player to talk</h2><Happiness G={G} sq={sq} onPick={pick} sel={sel} /></div>
          <TalkLog G={G} />
        </aside>
      </div>
    </div>);
}
