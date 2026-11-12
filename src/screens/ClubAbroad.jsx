// Your club abroad: team, squad, recruitment and money in one place (tabs on the phone, a tab row on the desktop).
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { Meter, Seg } from '../components/bits.jsx';
import { useNarrow, boardMood } from '../lib/util.js';
import { autosave } from '../lib/save.js';
import * as CR from '../world/career.js';
import * as ST from '../world/state.js';
import * as K from '../world/club.js';
import * as RC from '../world/recruit.js';
import { label as dayLabel, short } from '../world/dates.js';
import ClubAbroadSquad from './ClubAbroadSquad.jsx';
import ClubAbroadRecruit from './ClubAbroadRecruit.jsx';
import ClubAbroadMoney from './ClubAbroadMoney.jsx';
import '../styles/clubabroad.css';

function Team({ j }) {
  const { G, update, toast } = useGame(); const code = j.comp; const S = K.nextSeason(G, code) || K.leagueSeasons(G, code).slice(-1)[0];
  const nx = ST.nextUserFixture(G); const f = nx && nx[1]; const opp = f && (f.a === j.team ? f.b : f.a);
  const table = S ? ST.tableOf(S, Object.keys(S.tables)[0]) : []; const last = S ? S.fx.filter((x) => x.res && (x.a === j.team || x.b === j.team)).slice(-5).reverse() : [];
  const quick = () => update(() => { const r = CR.assistantPlays(G, nx[0], nx[1]); autosave(G); toast(`${r.text}.`); });
  return (
    <div className="ca-grid">
      <div className="stack" style={{ gap: 16 }}>
        <section className="panel stack" style={{ gap: 8, padding: '14px 16px' }}>
          <p className="t-micro faint">Next fixture</p>
          {f ? <><p className="t-h3">{ST.teamName(G, f.a)} v {ST.teamName(G, f.b)}</p><p className="t-small mut">{CR.seasonName(nx[0])} · {dayLabel(f.d)}{f.ko ? ` · ${f.ko}` : ''} · {opp && ST.teamName(G, opp)}</p>
            <div className="ca-row"><Link to="/match" className="btn btn-primary">Play live</Link><button type="button" className="btn btn-ghost" onClick={quick}>{G.s.settings.assistant ? 'Let the assistant play' : 'Quick sim'}</button><Link to="/clubabroad?tab=squad" className="btn btn-ghost">Pick XI</Link></div></>
            : <p className="t-small mut">No fixture to play right now. The next season opens with recruitment.</p>}
        </section>
        <section><h2 className="t-h3" style={{ marginBottom: 8 }}>Last results</h2>
          {last.length ? <ul className="mlist">{last.map((x) => <li key={x.id}><span className="grow t-small">{ST.teamName(G, x.a)} v {ST.teamName(G, x.b)}<br /><span className="l2">{x.res.text}</span></span><span className={`t-small b6 ${x.res.w === j.team ? 'blu' : 'crim'}`}>{x.res.w === j.team ? 'W' : x.res.l === j.team ? 'L' : '–'}</span></li>)}</ul> : <p className="t-small faint">No results yet.</p>}</section>
      </div>
      <div className="stack" style={{ gap: 16 }}>
        <section className="panel stack" style={{ gap: 8, padding: '14px 16px' }}>
          <div className="sechead" style={{ margin: 0 }}><span className="t-small b6">Board confidence</span><span className="t-small mut num">{j.board} · {boardMood(j.board)}</span></div><Meter pct={j.board} blue />
          {j.obj.length ? j.obj.map((o) => <div key={o.sid} className="t-small">{o.t} <span className="faint">{o.done === true ? '· met' : o.done === false ? '· missed' : ''}</span></div>) : <p className="t-small faint">The board sets objectives when the season is on the calendar.</p>}
          <p className="t-micro faint">A missed objective with confidence under {CR.sackLine(G)} ends the job.</p>
        </section>
        {table.length > 0 && <section><h2 className="t-h3" style={{ marginBottom: 8 }}>Table</h2><div className="tblwrap"><table className="tbl"><thead><tr><th>Team</th><th className="r">P</th><th className="r">W</th><th className="r">Pts</th></tr></thead>
          <tbody>{table.map((r) => <tr key={r.id} className={r.id === j.team ? 'me' : ''}><td className="name">{ST.teamName(G, r.id)}</td><td className="r num">{r.p}</td><td className="r num">{r.w}</td><td className="r num">{r.pts}</td></tr>)}</tbody></table></div></section>}
      </div>
    </div>
  );
}

export default function ClubAbroad() {
  const { G } = useGame(); const narrow = useNarrow(); const [tab, setTab] = useTab(['team', 'squad', 'recruit', 'money'], 'team');
  if (!G.s.wd) return <p className="mut">Clubs abroad start with the world.</p>;
  CR.ensure(G); const j = K.abroadJob(G);
  if (!j) return <div className="wrap"><h1 className="t-h1">No club abroad</h1><p className="mut" style={{ marginTop: 8 }}>You manage no club outside the NPL. Take a job from <Link to="/jobs">Jobs</Link>.</p></div>;
  RC.sync(G); const ev = K.clubEvent(G); const tabs = [['team', 'Team'], ['squad', 'Squad'], ['recruit', 'Recruit', ev && ev.day <= G.s.wd.day ? '!' : ''], ['money', 'Money']];
  const body = <>{tab === 'team' && <Team j={j} />}{tab === 'squad' && <ClubAbroadSquad j={j} />}{tab === 'recruit' && <ClubAbroadRecruit j={j} />}{tab === 'money' && <ClubAbroadMoney j={j} />}</>;
  const name = ST.teamName(G, j.team); const lg = (K.available().find((m) => m.code === j.comp) || {}).name || j.comp;
  if (narrow) return <MScreen top={{ title: name, sub: lg, right: <>Board <b>{j.board}</b></> }} tabs={tabs} tab={tab} onTab={setTab} label="Club"><div style={{ paddingTop: 12 }}>{body}</div></MScreen>;
  return (
    <div className="wrap" style={{ maxWidth: 1180 }}>
      <div className="ca-head"><div><h1 className="t-h1">{name}</h1><p className="mut t-small">{lg} · since {j.since} · {RC.rulesOf(j.comp).recruit} league · {short(G.s.wd.day)}</p></div><Link to="/jobs" className="t-small">Jobs</Link></div>
      <div className="ca-tab"><Seg options={tabs.map(([k, l, b]) => [k, b ? `${l} •` : l])} value={tab} onChange={setTab} label="Club sections" /></div>
      {body}
    </div>
  );
}
