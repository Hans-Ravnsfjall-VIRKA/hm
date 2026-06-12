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
