import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BackIcon } from '../components/icons';
import { getTheme, setTheme, ACCENTS, getAccent, setAccent, getFontScale, setFontScale } from '../lib/theme';

/* global __APP_VERSION__, __APP_VERSION_NAME__ */
const VERSION = typeof __APP_VERSION_NAME__ !== 'undefined' ? String(__APP_VERSION_NAME__) : '1.0.0';
const BUILD = typeof __APP_VERSION__ !== 'undefined' ? String(__APP_VERSION__) : 'dev';

// The build stamp is the epoch millisecond it was built; show it as a readable
// date-time so it doubles as a "which build is live" check.
function buildLabel(stamp) {
  const n = Number(stamp);
  if (!Number.isFinite(n)) return stamp;
  const d = new Date(n);
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Profile() {
  const { user, updateName, resetPassword, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.displayName || '');
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [theme, setThemeState] = useState(getTheme());
  const [accent, setAccentState] = useState(getAccent());
  const [fontScale, setFontScaleState] = useState(getFontScale());

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    setThemeState(nextTheme);
  }

  function pickAccent(id) {
    setAccent(id);
    setAccentState(id);
  }

  function pickFontScale(s) {
    setFontScale(s);
    setFontScaleState(s);
  }

  async function save() {
    const clean = name.trim();
    if (clean.length < 2) { setError('Skriva eitt navn við í minsta lagi 2 bókstavum.'); return; }
    setError(''); setNotice(''); setStatus('saving');
    try {
      await updateName(clean);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('idle');
      setError('Fekk ikki goymt. Royn aftur.');
    }
  }

  async function changePassword() {
    setError(''); setNotice('');
    try {
      await resetPassword(user.email);
      setNotice('Vit hava sent tær ein teldupost við einum leinki, har tú kanst endurstilla loyniorðið.');
    } catch {
      setError('Fekk ikki sent teldupost. Royn aftur.');
    }
  }

  const dirty = name.trim() !== (user?.displayName || '');

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}><BackIcon width={20} height={20} /> Aftur</button>

      <div className="page-head">
        <h1>Vangamynd</h1>
        <p>Stýr navni og kontu.</p>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>Navn</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Navn verður víst í yvirliti" autoComplete="name" />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary btn-block" onClick={save} disabled={status === 'saving' || !dirty}>
          {status === 'saving' ? 'Goymi…' : status === 'saved' ? 'Goymt ✓' : 'Goym navn'}
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Teldupostur</label>
          <input value={user?.email || ''} readOnly disabled />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="setting-row">
          <div>
            <div className="setting-title">Dark mode</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Dark mode"
            className={`switch ${theme === 'dark' ? 'on' : ''}`}
            onClick={toggleTheme}
          >
            <span className="switch-knob" aria-hidden="true" />
          </button>
        </div>

        {theme === 'dark' && (
          <div className="setting-stack">
            <div className="setting-title">Litur</div>
            <div className="accent-grid">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`accent-dot ${accent === a.id ? 'sel' : ''}`}
                  style={{ '--dot': a.hex }}
                  onClick={() => pickAccent(a.id)}
                  aria-label={a.name}
                  aria-pressed={accent === a.id}
                  title={a.name}
                />
              ))}
            </div>
          </div>
        )}

        <div className="setting-stack">
          <div className="setting-title">Skriftstødd</div>
          <div className="seg" role="group" aria-label="Skriftstødd">
            {['0', '1', '2'].map((s, i) => (
              <button
                key={s}
                type="button"
                className={`seg-btn ${fontScale === s ? 'sel' : ''}`}
                onClick={() => pickFontScale(s)}
                aria-pressed={fontScale === s}
              >
                <span style={{ fontSize: `${13 + i * 3}px`, lineHeight: 1, fontWeight: 700 }}>A</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <button className="btn btn-block" onClick={changePassword}>Broyt loyniorð</button>
        {notice && <div className="notice">{notice}</div>}
        <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }}
          onClick={() => logout().then(() => navigate("/"))}>Rita út</button>
      </div>

      <p className="app-version">Útgáva {VERSION} · bygd {buildLabel(BUILD)}</p>
    </>
  );
}
