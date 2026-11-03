import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { effectLines } from '../game/game.js';
import { storyList, storyChoices, chainOf, answerStory, sync } from '../game/living.js';
import { useNarrow } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import MScreen from '../components/MScreen.jsx';
import { dueLabel } from '../components/DecisionSheet.jsx';
import '../styles/living.css';

const statusOf = (G, st, n) => (st.status === 'open' ? (n ? dueLabel(G, n) : 'Decide soon') : st.status === 'wait' ? (st.wait && st.wait.y ? `Next part in ${st.wait.y}` : 'Ongoing') : st.fizzled ? 'Fizzled out' : 'Finished');
const headOf = (st) => st.hist[st.hist.length - 1] || { t: chainOf(st.chain).title, text: '' };

function Choices({ G, st, n, pick, setPick }) {
  const list = storyChoices(G, st);
  return (
    <div className="stack" style={{ gap: 10 }} role="radiogroup" aria-label="Choices">
      {list.map((c) => { const core = n ? effectLines(G, n, c.i).filter((e) => e.tone !== 'mut') : []; const lines = [...core.map((e) => ({ tone: e.tone === 'up' ? 'up' : e.tone === 'down' ? 'down' : 'warn', text: e.text })), ...c.x];
        return (
          <button key={c.i} type="button" role="radio" aria-checked={pick === c.i} className={`choice${pick === c.i ? ' on' : ''}`} onClick={() => setPick(c.i)}>
            <span style={{ fontWeight: 600 }}>{c.l}</span>
            <ul className="lv-fx">{lines.length ? lines.map((e, j) => <li key={j} className={e.tone}>{e.text}</li>) : <li>No other effect</li>}{c.later && <li>{c.later}</li>}</ul>
          </button>); })}
    </div>
  );
}
function Outcome({ st }) {
  if (!st.last) return null;
  return (
    <div className="panel stack ev-new lv-out" style={{ gap: 6 }}>
      <p className="faint t-small">{T(null, 'What happens next')}</p>
      <p className="t-small b6">You chose: {st.last.pick}{st.last.auto ? ' (not answered in time)' : ''}</p>
      <p>{st.last.out}</p>{st.last.later && <p className="mut t-small">{st.last.later}</p>}
      {st.status === 'wait' && <p className="t-micro faint">This story has another part to come.</p>}
    </div>
  );
}
function Others({ G, cur }) {
  const list = storyList(G).filter((s) => s.id !== (cur && cur.id) && s.status !== 'done').concat(storyList(G).filter((s) => s.id !== (cur && cur.id) && s.status === 'done').slice(0, 4));
  if (!list.length) return <p className="t-small faint">No other stories yet. They start from what happens at your club.</p>;
  return (
    <ul className="mlist">{list.map((s) => { const n = G.s.inbox.find((x) => x.id === s.newsId); const h = headOf(s);
      return <li key={s.id}><span className="grow"><Link to={`/story/${s.id}`}>{chainOf(s.chain).title}</Link><br /><span className="l2">{h.t} · part {s.hist.length}</span></span><span className={`t-small ${s.status === 'open' ? 'crim' : 'mut'}`}>{statusOf(G, s, n)}</span></li>; })}</ul>
  );
}

export default function Storyline() {
  const { G, update, toast } = useGame(); const { id } = useParams(); const narrow = useNarrow(); const [pick, setPick] = useState(null);
  sync(G);
  const all = storyList(G); const st = id ? G.s.living.stories[id] : all.find((s) => s.status === 'open') || null;
  const n = st && st.status === 'open' ? G.s.inbox.find((x) => x.id === st.newsId && !x.done) : null;
  const confirm = () => { if (pick == null) return; update(() => { answerStory(G, st.id, pick); autosave(G); }); setPick(null); toast('Decision made.'); };
  if (!st) {
    const body = <><p className="mut" style={{ marginBottom: 16 }}>No story needs a decision right now. Stories start from what happens at your club: festivals, call-ups, rival managers, injuries.</p><h2 className="sec">{T(G, 'Stories so far', 'कथाहरू')}</h2><Others G={G} cur={null} /></>;
    return narrow ? <MScreen top={{ title: tn(G, 'Stories'), sub: '' }}><div style={{ paddingTop: 12 }}>{body}</div></MScreen> : <div className="lv-wrap" style={{ maxWidth: 760 }}><h1 className="t-h1" style={{ marginBottom: 10 }}>{tn(G, 'Stories')}</h1>{body}</div>;
  }
  const ch = chainOf(st.chain); const h = headOf(st); const first = st.hist[0];
  const kicker = `Story · part ${st.hist.length}${st.hist.length > 1 ? ` of a chain that started ${first.y === G.year ? `on ${first.d}` : `in ${first.y}`}` : ''}`;
  const quote = n && n.quote;
  const past = (
    <ol className="feed" aria-label="How we got here">{st.hist.map((e, i) => { const now = i === st.hist.length - 1 && st.status === 'open';
      return <li key={i} className={`ev ${now ? 'ev-drs' : 'ev-dot'}`}><span className="ov">{e.y === G.year ? e.d : e.y}</span><span className="tx">{now && <span className="tag">Now</span>}{now ? <b>{e.t}</b> : e.t}{e.pick && <span className="faint"> You chose: {e.pick}.</span>}</span></li>; })}</ol>);
  const decide = n ? <Choices G={G} st={st} n={n} pick={pick} setPick={setPick} /> : null;
  const foot = <p className="faint t-micro">{ch.personal ? 'Story characters are generated players and people.' : 'Real players appear only in cricket matters, with no invented quotes. Managers, officials, pundits and sponsors here are generated characters.'} In your game.</p>;
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'Stories'), sub: n ? dueLabel(G, n) : statusOf(G, st, n) }} actions={n ? <button type="button" className="btn btn-primary" style={{ flex: '1 1 auto' }} disabled={pick == null} onClick={confirm}>{T(G, 'Confirm', 'पुष्टि')}</button> : null}>
      <div style={{ paddingTop: 16 }}>
        <p className="faint t-small">{kicker}</p>
        <h1 className="t-h2" style={{ marginTop: 4 }}>{h.t}</h1>
        {n && n.ne && <p className="ne t-small faint" style={{ marginTop: 2 }}>{n.ne}</p>}
        <p className="t-small mut" style={{ marginTop: 8 }}>{h.text}</p>
        {quote && <p className="pull" style={{ marginTop: 10, fontSize: 15, lineHeight: '23px' }}>“{quote}”</p>}
        {n && <><p className="mhead">{T(G, 'Your call', 'तपाईंको निर्णय')}</p>{decide}</>}
        <div style={{ marginTop: 12 }}><Outcome st={st} /></div>
        {st.hist.length > 1 && <><p className="mhead">How we got here</p>{past}</>}
        <p className="mhead">Other stories</p><Others G={G} cur={st} />
        <div style={{ margin: '12px 0' }}>{foot}</div>
      </div>
    </MScreen>
  );
  return (
    <div className="lv-wrap" style={{ maxWidth: 1180 }}>
      <div className="lv-split">
        <section className="stack" style={{ gap: 22 }}>
          <div className="stack" style={{ gap: 6 }}>
            <p className="faint t-small">{kicker}</p>
            <h1 className="t-h1">{h.t}</h1>
            {n && n.ne && <p className="ne faint">{n.ne}</p>}
            <p className="mut" style={{ fontSize: 16, lineHeight: '26px', maxWidth: 660 }}>{h.text}</p>
            {quote && <p className="pull">“{quote}”</p>}
          </div>
          {past}
          {n && <div><h2 className="sec">{T(G, 'What do you do?', 'तपाईं के गर्नुहुन्छ?')}</h2>{decide}
            <div className="row" style={{ gap: 10, marginTop: 12, alignItems: 'center' }}><button type="button" className="btn btn-primary" disabled={pick == null} onClick={confirm}>{T(G, 'Confirm', 'पुष्टि')}</button><span className="t-micro faint">{dueLabel(G, n)} · unanswered, the cautious choice is taken.</span></div></div>}
          <Outcome st={st} />
        </section>
        <aside className="lv-side">
          <div><h2 className="sec">{T(G, 'Other stories running', 'अन्य कथा')}</h2><Others G={G} cur={st} /></div>
          <div className="panel stack" style={{ gap: 6 }}><h2 className="sec" style={{ margin: 0 }}>How stories work</h2>
            <p className="t-small">Each story is a chain of small events over weeks or seasons. Your choice at each step changes the next one, and no answer is always right.</p>{foot}</div>
        </aside>
      </div>
    </div>
  );
}
