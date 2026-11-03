import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { fmtL } from '../game/engine.js';
import { Dot } from './bits.jsx';

const PHASES = { preseason: 'Pre-season', league: 'League', playoffs: 'Playoffs', seasonEnd: 'Season over', offseason: 'Off-season', retention: 'Retention', auction: 'Auction' };

// The phone header strip. With no props it shows the team, the phase and both purses; a screen
// can replace the left, middle or right part (MSquad shows "Squad · 17 players").
export function MTop({ title, sub, right, dflt }) {
  const { G } = useGame(); const t = G.teams[G.user]; const ph = G.s.phase;
  const played = ph === 'league' ? G.s.fixtures.filter((f) => f.stage === 'L' && f.res).length : null;
  return (
    <header className={`m-top${dflt ? ' dflt' : ''}`}>
      <span className="team">{title || <><Dot id={G.user} />{t.name}</>}</span>
      {sub !== undefined ? <span className="faint t-small">{sub}</span> : <span className="phase" style={{ fontSize: 12, padding: '2px 8px' }}><b>{PHASES[ph] || ph}</b>{played != null ? ` · ${played}/28` : ''}</span>}
      <span className="purse">{right || <>Dom <b>{fmtL(t.purse)}</b><br />OS <b>{fmtL(t.osPurse)}</b></>}</span>
    </header>
  );
}

// Phone tabs kept in the URL (?tab=), so the session restores them and Back works as expected.
export function useTab(keys, def, param = 'tab') {
  const [q, setQ] = useSearchParams();
  const tab = keys.includes(q.get(param)) ? q.get(param) : def;
  const set = (k) => { const n = new URLSearchParams(q); if (k === def) n.delete(param); else n.set(param, k); setQ(n, { replace: true }); };
  return [tab, set];
}

// Four layers on every phone screen: a pinned context strip, tabs, a scrolling body and, where
// there is a primary action, a pinned action bar at thumb height. The bottom bar is the Shell's.
// tabs: [[key, label, badge?, quiet?]]. top: false hides the header strip (the live match).
export default function MScreen({ top, pin, pinRaw, tabs, tab, onTab, label, actions, children }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0; }, [tab]);
  return (
    <div className="mscreen">
      {top === false ? null : <MTop {...(top || {})} />}
      {pinRaw}
      {pin && <div className="m-pin">{pin}</div>}
      {tabs && (
        <div className="tabs" role="tablist" aria-label={label}>
          {tabs.map(([k, l, badge, quiet]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => onTab(k)}>
              {l}{badge != null && badge !== '' && badge !== 0 && <span className={`badge${quiet ? ' q' : ''}`}>{badge}</span>}
            </button>))}
        </div>)}
      <div className="m-scroll" ref={ref} role={tabs ? 'tabpanel' : undefined}>{children}</div>
      {actions && <div className="m-actions">{actions}</div>}
    </div>
  );
}
