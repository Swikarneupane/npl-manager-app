import { useGame } from '../lib/store.jsx';
import { tname, tshort } from '../lib/util.js';

export const Dot = ({ id, big }) => <i className={`dot t-${String(id).toLowerCase()}`} style={big ? { width: 12, height: 12 } : undefined} />;
export function Team({ id, short }) { const { G } = useGame(); return <>{<Dot id={id} />}{short ? tshort(G, id) : tname(G, id)}</>; }
export const Role = ({ r }) => <span className="role">{r}</span>;
export function Seg({ options, value, onChange, disabled, label, style }) {
  return (
    <div className="seg" role="group" aria-label={label} style={style}>
      {options.map(([k, l]) => (
        <button key={k} type="button" className={String(value) === String(k) ? 'on' : ''} disabled={disabled} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  );
}
export const Meter = ({ pct, blue }) => <div className={`meter${blue ? ' blue' : ''}`}><i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
export function PageHead({ title, sub, children, style }) {
  return (
    <div className="pagehead" style={style}>
      <div className="stack" style={{ gap: 4 }}><h1 className="t-h1">{title}</h1>{sub && <p className="mut">{sub}</p>}</div>
      {children}
    </div>
  );
}
export function Modal({ children }) { return <div className="scrim" style={{ position: 'fixed' }}><div className="modal" role="dialog" aria-modal="true">{children}</div></div>; }
export const Ovs = ({ balls }) => <>{Math.floor(balls / 6)}{balls % 6 ? `.${balls % 6}` : ''}</>;
