import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadLocal } from './save.js';

// The game object is a mutable class instance (the engine mutates it ball by ball).
// React re-renders are driven by a version counter: call update() after any mutation.
const Ctx = createContext(null);

export function GameProvider({ children }) {
  const [G, setGState] = useState(() => loadLocal());
  const [version, setVersion] = useState(0);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastOn, setToastOn] = useState(false);
  const [modal, setModal] = useState(null);
  const [prefersDark, setPrefersDark] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const ui = useRef({ live: null, liveSeen: false, offers: {}, trade: {}, fixFilter: 'all', histTab: 'champs', statsYear: null, statsAll: false, auc: null }).current;
  const toastTimer = useRef(null);

  const update = useCallback((fn) => { if (typeof fn === 'function') fn(); setVersion((v) => v + 1); }, []);
  const setG = useCallback((g) => { setGState(g); setVersion((v) => v + 1); }, []);
  const toast = useCallback((msg) => { setToastMsg(msg); setToastOn(true); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToastOn(false), 3200); }, []);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const fn = (e) => setPrefersDark(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const theme = !G || G.s.settings.theme === 'auto' ? (prefersDark ? 'dark' : 'light') : G.s.settings.theme;
  const value = useMemo(() => ({ G, setG, update, ui, toast, modal, setModal, theme, version }), [G, setG, update, ui, toast, modal, theme, version]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className={`toast${toastOn ? ' show' : ''}`} role="status" aria-live="polite">{toastMsg}</div>
    </Ctx.Provider>
  );
}
export const useGame = () => useContext(Ctx);
// Gives a subtree a different game object: the live screens play a national match against the stand-in
// from world/match.js (worldGame), while everything outside still sees the real game.
export function GameScope({ G, children }) {
  const v = useContext(Ctx); const value = useMemo(() => ({ ...v, G }), [v, G]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
