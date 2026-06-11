import { useState } from 'react';
import { ChevronIcon } from './icons';

// An Apple-style grouped disclosure: a tappable header row with a chevron that
// rotates open, revealing its content below. Used to keep participants' tips
// and the match events as two separate, independently-openable dropdowns.
export default function Disclosure({ title, meta, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`disclosure ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="disclosure-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="disclosure-title">{title}</span>
        {meta != null && <span className="disclosure-meta">{meta}</span>}
        <ChevronIcon className="disclosure-chevron" width={18} height={18} />
      </button>
      {open && <div className="disclosure-body">{children}</div>}
    </div>
  );
}

// Whether a match has events worth showing in a dropdown.
export function hasMatchEvents(match) {
  return (match.live || match.finished) && Array.isArray(match.events) && match.events.length > 0;
}
