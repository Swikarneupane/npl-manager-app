import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { tr } from '../lib/util.js';
import { unreadCount } from './news.jsx';
import { Icon } from './icons.jsx';

// Where the Auction tile goes in each phase; null means the tile is disabled.
export function auctionLink(G) {
  const ph = G.s.phase;
  if (ph === 'auction') return { to: '/auction', sub: 'Live now' };
  if (ph === 'retention') return { to: '/retention', sub: G.s.mega ? 'Retention' : 'Releases' };
  return { to: null, sub: ph === 'offseason' ? 'Opens after the off-season' : 'Opens after season' };
}

// Phone-only sheet behind the More tab. The Shell owns open/close and history; this renders the
// tiles and handles Esc and focus.
export default function MoreSheet({ onClose }) {
  const { G } = useGame(); const nav = useNavigate(); const ref = useRef(null);
  useEffect(() => {
    const first = ref.current && ref.current.querySelector('a[href],button:not([disabled])');
    if (first) first.focus();
    const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  const unread = unreadCount(G); const auc = auctionLink(G);
  const tiles = [
    ['news', '/news', 'News', unread ? `${unread} unread` : 'All read', true],
    ['stats', '/stats', 'Stats', 'Cap races'],
    ['history', '/history', 'History', 'Records'],
    ['auction', auc.to, 'Auction', auc.sub],
    ['club', '/club', 'Club', 'Board · money'],
    ['settings', '/settings', 'Settings', 'Saves · language'],
  ];
  // replace: the sheet pushed a history entry when it opened; the destination takes its place
  const go = (to) => (e) => { e.preventDefault(); nav(to, { replace: true }); };
  return (
    <>
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="more-title" ref={ref}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head"><h2 className="t-h2" id="more-title">More</h2><button type="button" className="btn btn-ghost" onClick={onClose}>Close</button></div>
        <div className="sheet-tiles">
          {tiles.map(([icon, to, label, sub, hot]) => to
            ? <a key={icon} href={to} onClick={go(to)} className="tile"><span className={hot ? 'crim' : 'blu'}><Icon name={icon} size={26} /></span><span className="t-small tile-l">{tr(G, label)}</span><span className="t-micro faint">{sub}</span></a>
            : <span key={icon} className="tile off" aria-disabled="true"><span className="blu"><Icon name={icon} size={26} /></span><span className="t-small tile-l">{tr(G, label)}</span><span className="t-micro faint">{sub}</span></span>)}
        </div>
      </section>
    </>
  );
}
