// Line icons from the round 2 artboards (24px grid, 1.8 stroke, currentColor).
const P = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>,
  squad: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.6c2.6.2 4.3 1.9 5 4.9" /></>,
  match: <><circle cx="12" cy="12" r="8.5" /><path d="M7.2 6.2c1.7 1.6 2.6 3.6 2.6 5.8s-.9 4.2-2.6 5.8" /><path d="M16.8 6.2c-1.7 1.6-2.6 3.6-2.6 5.8s.9 4.2 2.6 5.8" /></>,
  season: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14h3M8 17h6" /></>,
  more: <path d="M4 7h16M4 12h16M4 17h16" />,
  news: <><rect x="3.5" y="4.5" width="14" height="15" rx="2" /><path d="M17.5 8.5h3v9a2 2 0 0 1-2 2" /><path d="M7 9h7M7 12.5h7M7 16h4" /></>,
  stats: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  history: <><path d="M8 4h8v4a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3" /><path d="M12 12v4M8.5 20h7M10 16h4v4h-4z" /></>,
  auction: <><path d="m14 4 6 6M11 7l6 6M12.5 5.5l-4 4 6 6 4-4z" /><path d="m9 13-5.5 5.5" /><path d="M13 21h8" /></>,
  club: <><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
  back: <path d="m15 6-6 6 6 6" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></>,
};
export function Icon({ name, size = 24, className }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{P[name]}</svg>;
}
