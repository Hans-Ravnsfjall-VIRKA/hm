// Light/dark theme: a single preference persisted in localStorage and applied
// by toggling data-theme on <html>. The matching tokens live in index.css under
// :root and :root[data-theme="dark"]. An inline script in index.html applies the
// saved theme before first paint so dark users don't see a light flash.

const KEY = 'vt-theme';
const DARK_BG = '#14151c'; // matches --bg in the dark token set

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme) {
  const dark = theme === 'dark';
  const root = document.documentElement;
  if (dark) root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? DARK_BG : '#f3f4f9');
}

export function setTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  applyTheme(theme);
}

// --- Accent colour (dark mode only) ---------------------------------------
// Stored as a short id and applied via data-accent on <html>; the matching
// --accent override lives in index.css. The accent only takes visual effect in
// dark mode (the override selectors are scoped to [data-theme="dark"]).
const ACCENT_KEY = 'vt-accent';

export const ACCENTS = [
  { id: 'lime',       name: 'Electric lime', hex: '#C6F432' },
  { id: 'cyan',       name: 'Cyan',          hex: '#2DD4FF' },
  { id: 'coral',      name: 'Coral',         hex: '#FF6B4A' },
  { id: 'violet',     name: 'Violet',        hex: '#A78BFA' },
  { id: 'magenta',    name: 'Magenta',       hex: '#FF2E97' },
  { id: 'amber',      name: 'Amber gold',    hex: '#FFB627' },
  { id: 'mint',       name: 'Mint',          hex: '#34E5B7' },
  { id: 'sky',        name: 'Sky blue',      hex: '#6EA8FF' },
  { id: 'chartreuse', name: 'Chartreuse',    hex: '#D4FF66' },
];
const ACCENT_IDS = ACCENTS.map((a) => a.id);

export function getAccent() {
  try {
    const v = localStorage.getItem(ACCENT_KEY);
    return ACCENT_IDS.includes(v) ? v : 'coral';
  } catch {
    return 'coral';
  }
}

export function applyAccent(accent) {
  document.documentElement.setAttribute('data-accent', accent);
}

export function setAccent(accent) {
  try { localStorage.setItem(ACCENT_KEY, accent); } catch { /* ignore */ }
  applyAccent(accent);
}

// --- Font size -------------------------------------------------------------
// '0' normal (16px root), '1' = +1pt, '2' = +2pt. Applied as the root font
// size so every rem-based size scales together.
const FONT_KEY = 'vt-fontscale';
const FONT_PCT = { '0': '100%', '1': '106.25%', '2': '112.5%' };

export function getFontScale() {
  try {
    const v = localStorage.getItem(FONT_KEY);
    return v === '1' || v === '2' ? v : '0';
  } catch {
    return '0';
  }
}

export function applyFontScale(scale) {
  document.documentElement.style.fontSize = FONT_PCT[scale] || FONT_PCT['0'];
}

export function setFontScale(scale) {
  try { localStorage.setItem(FONT_KEY, scale); } catch { /* ignore */ }
  applyFontScale(scale);
}
