import { Link } from 'react-router-dom';
import { nn } from '../lib/util.js';

// Shared by the Home news portal and the News page.
export const KINDS = { match: 'Result', injury: 'Injury · Physio', board: 'Board', league: 'League', event: 'Decision', signing: 'Signing', intl: 'International' };
const OLD_SIGNING = /^(Overseas signings|TRADE:)/;
export const kindOf = (n) => (n.kind === 'league' && OLD_SIGNING.test(n.text) ? 'signing' : n.kind);
export const isPending = (n) => !!(n.choices && !n.done);
// Your club: everything the game only writes about the user's team, plus flagged items (trades).
export const isClub = (n) => !!n.club || ['match', 'injury', 'board', 'event'].includes(n.kind);
// Unread items plus decisions still waiting, for the More badge and the News tile.
export const unreadCount = (G) => G.s.inbox.filter((n) => !n.read || isPending(n)).length;

export const FILTERS = [
  ['all', 'All', () => true],
  ['club', 'Your club', isClub],
  ['match', 'Results', (n) => n.kind === 'match'],
  ['injury', 'Injuries', (n) => n.kind === 'injury'],
  ['signing', 'Signings', (n) => kindOf(n) === 'signing'],
  ['board', 'Board', (n) => n.kind === 'board'],
  ['intl', 'International', (n) => n.kind === 'intl'],
];

// The in-game "today" is the stamp on the newest item.
export function today(G) { const n = G.s.inbox.find((x) => x.d); return n ? { y: n.y, d: n.d, dt: n.dt } : null; }
const DAY = 86400000;
// Today, Yesterday, This week, or Earlier, relative to the newest item.
export function ageOf(G, n, now = today(G)) {
  if (!now || !n.d || n.y !== now.y) return 'Earlier';
  if (n.d === now.d) return 'Today';
  if (n.dt != null && now.dt != null) { const days = Math.round((now.dt - n.dt) / DAY); if (days === 1) return 'Yesterday'; if (days <= 7) return 'This week'; }
  return 'Earlier';
}

function title(G, n) {
  const lang = G.s.lang;
  if (lang === 'np' && n.ne) return <span className="ne">{nn(G, n.ne)}</span>;
  return <>{n.text}{(lang === 'both' || n.kind === 'intl') && n.ne && <span className="ne nrow-ne">{nn(G, n.ne)}</span>}</>;
}

// One row: unread dot, kind, title, and a muted second line.
export function NewsRow({ G, n, sub, to = n.fix ? `/scorecard/${n.fix}` : null, children }) {
  const body = (
    <>
      <span className={`nrow-dot${n.read ? '' : ' on'}`} aria-hidden="true" />
      <span className="nrow-body">
        <span className="t-micro faint">{n.kind === 'intl' && n.sub ? <span className={`ptag ${n.sub === 'First cap' || n.sub === 'Dropped' || n.sub === 'Called away' ? 'c' : n.sub === 'Milestone' ? 'g' : 'b'}`} style={{ marginRight: 6 }}>{n.sub}</span> : (KINDS[kindOf(n)] || 'News')}{isClub(n) && n.kind !== 'match' && n.kind !== 'event' && <span className="ntag">{n.kind === 'intl' ? 'Your player' : 'Your club'}</span>}</span>
        <span className={`nrow-ttl${n.read ? '' : ' unread'}`}>{title(G, n)}</span>
        {sub && <span className="t-micro mut">{sub}</span>}
        {n.tags && n.tags.length > 0 && <span className="row" style={{ gap: 4, marginTop: 4 }}>{n.tags.map((x) => <span key={x} className={`ptag ${/−/.test(x) ? 'c' : 'b'}`}>{x}</span>)}</span>}
        {children}
      </span>
    </>
  );
  return to ? <Link to={to} className="nrow">{body}</Link> : <div className="nrow">{body}</div>;
}
