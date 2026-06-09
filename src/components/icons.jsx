// Minimal stroke icons, sized via CSS. Stroke uses currentColor so the tab
// bar's active/inactive colour drives them.
const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const TodayIcon = (p) => (
  <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" {...s} /><path d="M12 7v5l3 2" {...s} /></svg>
);
export const FixturesIcon = (p) => (
  <svg viewBox="0 0 24 24" {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="3" {...s} /><path d="M3.5 9h17M8 4.5v3M16 4.5v3" {...s} /></svg>
);
export const PredictIcon = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M12 3.5 14.4 9l5.6.5-4.3 3.7 1.4 5.6L12 16l-5.1 2.8 1.4-5.6L4 9.5 9.6 9z" {...s} /></svg>
);
export const BoardIcon = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M6 20V11M12 20V5M18 20v-6" {...s} /></svg>
);
export const RulesIcon = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M6 3.5h9l3.5 3.5v13.5H6z" {...s} /><path d="M14.5 3.5V7.5H18.5M8.5 12h7M8.5 16h7" {...s} /></svg>
);
export const PlusIcon = (p) => (<svg viewBox="0 0 24 24" {...p}><path d="M12 6v12M6 12h12" {...s} /></svg>);
export const MinusIcon = (p) => (<svg viewBox="0 0 24 24" {...p}><path d="M6 12h12" {...s} /></svg>);
export const ChevronIcon = (p) => (<svg viewBox="0 0 24 24" {...p}><path d="m9 6 6 6-6 6" {...s} /></svg>);
export const BackIcon = (p) => (<svg viewBox="0 0 24 24" {...p}><path d="m15 6-6 6 6 6" {...s} /></svg>);
export const LogoutIcon = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M15 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9M14 12h7m0 0-3-3m3 3-3 3" {...s} /></svg>
);

// Icons used in the "Add to Home Screen" guide.
export const ShareIosIcon = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M12 3v12M8.5 6.5 12 3l3.5 3.5" {...s} /><path d="M6 11v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8" {...s} /></svg>
);
export const DotsIcon = (p) => (
  <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" /></svg>
);
export const PlusSquareIcon = (p) => (
  <svg viewBox="0 0 24 24" {...p}><rect x="4" y="4" width="16" height="16" rx="4" {...s} /><path d="M12 8.5v7M8.5 12h7" {...s} /></svg>
);
