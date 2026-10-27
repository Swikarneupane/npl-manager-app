import { useEffect, useRef } from 'react';

// A dismissable sheet: slides up from the bottom on phones, a centred dialog on desktop.
// Closes on Esc, a backdrop tap or Cancel; focus moves in on open and back on close.
export default function Sheet({ title, onClose, children, foot, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const back = document.activeElement;
    const f = ref.current && ref.current.querySelector('button,[href],input,select');
    if (f) f.focus();
    const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); if (back && back.focus) back.focus(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="xsheet-wrap">
      <div className="xsheet-scrim" onClick={onClose} aria-hidden="true" />
      <section className={`xsheet${wide ? ' xwide' : ''}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} ref={ref}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head"><h2 className="t-h2">{title}</h2><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button></div>
        <div className="xsheet-body">{children}</div>
        {foot && <div className="xsheet-foot">{foot}</div>}
      </section>
    </div>
  );
}
