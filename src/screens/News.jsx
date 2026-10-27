import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { Icon } from '../components/icons.jsx';
import { FILTERS, NewsRow, ageOf, isPending, today } from '../components/news.jsx';
import { tr } from '../lib/util.js';

const PAGE = 20;
const GROUPS = ['Today', 'Yesterday', 'This week', 'Earlier'];

// The choices of an open decision, answered in place until decisions get their own sheet.
export function Choices({ n }) {
  const { G, update } = useGame();
  return <div className="row" style={{ gap: 8, marginTop: 10 }}>{n.choices.map((c, i) => <button key={i} type="button" className={`btn btn-sm${i === 0 ? ' btn-primary' : ''}`} onClick={() => update(() => { G.applyEvent(n, i); n.read = true; autosave(G); })}>{c.l}</button>)}</div>;
}

export default function News() {
  const { G, update } = useGame(); const nav = useNavigate(); const s = G.s;
  const [q, setQ] = useState(''); const [flt, setFlt] = useState('all'); const [limit, setLimit] = useState(PAGE);
  // leaving the page marks what was shown as read, as the old Home inbox did
  useEffect(() => () => { s.inbox.forEach((n) => { if (!isPending(n)) n.read = true; }); }, [s]);

  const test = FILTERS.find(([k]) => k === flt)[2]; const needle = q.trim().toLowerCase();
  const match = (n) => test(n) && (!needle || [n.text, n.detail, n.ne].some((x) => x && x.toLowerCase().includes(needle)));
  const pending = s.inbox.filter((n) => isPending(n) && match(n));
  const rest = s.inbox.filter((n) => !isPending(n) && match(n));
  const shown = rest.slice(0, limit); const now = today(G);
  const groups = GROUPS.map((g) => [g, shown.filter((n) => ageOf(G, n, now) === g)]).filter(([, l]) => l.length);
  const unread = s.inbox.some((n) => !n.read && !isPending(n));

  return (
    <div className="news">
      <div className="sechead" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 4, alignItems: 'center' }}><button type="button" className="btn btn-ghost iconbtn" aria-label="Back to Home" onClick={() => nav('/')}><Icon name="back" size={20} /></button><h1 className="t-h2">{tr(G, 'News')}</h1></div>
        <button type="button" className="btn btn-ghost btn-sm" disabled={!unread} onClick={() => update(() => { s.inbox.forEach((n) => { if (!isPending(n)) n.read = true; }); })}>Mark all read</button>
      </div>
      <label className="search"><Icon name="search" size={18} /><input type="search" className="input" placeholder="Search news, players, teams" aria-label="Search news" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} /></label>
      <div className="chips" role="group" aria-label="Filter news">{FILTERS.map(([k, l]) => <button key={k} type="button" className={`chip${flt === k ? ' on' : ''}`} aria-pressed={flt === k} onClick={() => { setFlt(k); setLimit(PAGE); }}>{l}</button>)}</div>

      {pending.length > 0 && <section className="nsec"><h2 className="sec">Needs you · {pending.length}</h2>
        <div className="stack" style={{ gap: 8 }}>{pending.map((n) => (
          <div key={n.id} className="panel need"><p className="t-micro crim">Decision{n.d ? ` · ${n.d}` : ''}</p><p className="t-small" style={{ marginTop: 2 }}>{n.text}</p><Choices n={n} /></div>))}</div></section>}

      {groups.map(([g, list]) => (
        <section key={g} className="nsec"><h2 className="sec">{g}</h2>
          {list.map((n) => <NewsRow key={n.id} G={G} n={n} sub={n.picked ? `You chose: ${n.picked}` : n.detail} />)}
        </section>))}
      {!pending.length && !shown.length && <p className="faint t-small" style={{ marginTop: 16 }}>{needle || flt !== 'all' ? 'No news matches.' : 'Nothing yet.'}</p>}
      {rest.length > limit && <button type="button" className="btn" style={{ width: '100%', marginTop: 16 }} onClick={() => setLimit(limit + PAGE)}>Show older news</button>}
    </div>
  );
}
