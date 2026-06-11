import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BackIcon } from '../components/icons';
import { getTheme, setTheme } from '../lib/theme';

export default function Profile() {
  const { user, updateName, resetPassword, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.displayName || '');
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [theme, setThemeState] = useState(getTheme());

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    setThemeState(nextTheme);
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
            <div className="setting-title">Myrkur háttur</div>
            <div className="setting-sub">Brúka myrkan ham í appini.</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Myrkur háttur"
            className={`switch ${theme === 'dark' ? 'on' : ''}`}
            onClick={toggleTheme}
          >
            <span className="switch-knob" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="panel">
        <button className="btn btn-block" onClick={changePassword}>Broyt loyniorð</button>
        {notice && <div className="notice">{notice}</div>}
        <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }}
          onClick={() => logout().then(() => navigate("/"))}>Rita út</button>
      </div>
    </>
  );
}
