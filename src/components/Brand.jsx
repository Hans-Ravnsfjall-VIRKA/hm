import { APP } from '../config';

// An original, geometric trophy glyph. Deliberately NOT the FIFA mark — that
// logo is trademarked. Swap this for the official VIRKA brand asset by
// dropping an SVG/PNG at /public/virka-mark.svg and pointing <BrandMark> at it.
export function TrophyMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="cup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.78 0.16 250)" />
          <stop offset="1" stopColor="oklch(0.62 0.19 250)" />
        </linearGradient>
      </defs>
      <path
        d="M9 5h14v4.2c0 4.6-2.8 8-7 8s-7-3.4-7-8z"
        fill="url(#cup)"
      />
      <path d="M9 6.2H6.4a2.4 2.4 0 0 0 0 4.8H10M23 6.2h2.6a2.4 2.4 0 0 1 0 4.8H22"
        fill="none" stroke="oklch(0.72 0.17 250)" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="14.7" y="16.5" width="2.6" height="5" fill="oklch(0.68 0.18 250)" />
      <path d="M11 27h10l-1.2-4.4a1.4 1.4 0 0 0-1.35-1H13.55a1.4 1.4 0 0 0-1.35 1z"
        fill="oklch(0.7 0.17 250)" />
    </svg>
  );
}

export function BrandLockup({ compact = false }) {
  return (
    <div className="brand">
      <TrophyMark size={compact ? 26 : 30} />
      <div style={{ lineHeight: 1.05 }}>
        <div className="brand-name">{APP.name}</div>
        {!compact && <div className="brand-sub">{APP.tagline}</div>}
      </div>
    </div>
  );
}
