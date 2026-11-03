import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { tn } from '../lib/i18n.js';
import { MORE_MAIN, DEPTH_GROUPS } from '../lib/nav.js';
import { unreadCount } from './news.jsx';

// Where the Auction tile goes in each phase; null means the tile is disabled.
export function auctionLink(G) {
  const ph = G.s.phase;
  if (ph === 'auction') return { to: '/auction', sub: 'Live now' };
  if (ph === 'retention') return { to: '/retention', sub: G.s.mega ? 'Retention' : 'Releases' };
  return { to: null, sub: ph === 'offseason' ? 'Opens after the off-season' : 'Opens after season' };
}

// Phone-only sheet behind the More tab: History, Club, World, Nepal and Settings first, then the
// depth screens by group. Text only. The Shell owns open/close and history; this handles Esc and focus.
export default function MoreSheet({ onClose }) {
  const { G } = useGame(); const nav = useNavigate(); const ref = useRef(null);
  useEffect(() => {
    const first = ref.current && ref.current.querySelector('a[href],button:not([disabled])');
    if (first) first.focus();
    const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  const unread = unreadCount(G);
  // replace: the sheet pushed a history entry when it opened; the destination takes its place
  const go = (to) => (e) => { e.preventDefault(); nav(to, { replace: true }); };
  return (
    <>
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="more-title" ref={ref}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head"><h2 className="t-h2" id="more-title">{tn(G, 'More')}</h2><button type="button" className="btn btn-ghost" onClick={onClose}>Close</button></div>
        <ul className="mlist">
          {MORE_MAIN.map(([to, label, sub]) => <li key={to}><a href={to} onClick={go(to)} className="grow more-a"><span className="b6">{tn(G, label)}</span><br /><span className="l2">{sub}</span></a></li>)}
        </ul>
        {DEPTH_GROUPS.map(([g, links]) => (
          <div key={g}><p className="mhead">{g}</p>
            <div className="more-chips">{links.map(([to, label]) => <a key={to} href={to} onClick={go(to)} className="chip">{tn(G, label)}{to === '/news' && unread > 0 && <span className="badge">{unread}</span>}</a>)}</div></div>))}
      </section>
    </>
  );
}
