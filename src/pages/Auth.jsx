import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { TrophyMark } from '../components/Brand';
import { APP } from '../config';

export default function Auth() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError(''); setBusy(true);
    try {
      if (mode === 'register') {
        if (form.name.trim().length < 2) throw new Error('Please enter your name.');
        await register({ ...form, name: form.name.trim() });
      } else {
        await login(form);
      }
      navigate('/today');
    } catch (e) {
      setError(prettyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth fade-in">
      <div className="hero">
        <TrophyMark size={64} />
        <h1>{APP.name}</h1>
        <p>{APP.edition} · in-house league at VIRKA</p>
      </div>

      <div className="seg">
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
      </div>

      {mode === 'register' && (
        <div className="field">
          <label>Display name</label>
          <input value={form.name} onChange={set('name')} placeholder="How you'll appear on the board" autoComplete="name" />
        </div>
      )}
      <div className="field">
        <label>Email</label>
        <input type="email" value={form.email} onChange={set('email')} placeholder="you@virka.fo" autoComplete="email" />
      </div>
      <div className="field">
        <label>Password</label>
        <input type="password" value={form.password} onChange={set('password')}
          placeholder="At least 6 characters" autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </div>

      {error && <div className="error">{error}</div>}

      <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }} onClick={submit} disabled={busy}>
        {busy ? 'One moment…' : mode === 'register' ? 'Create account' : 'Sign in'}
      </button>

      <div className="switch">
        {mode === 'register'
          ? <>Already playing? <button onClick={() => setMode('login')}>Sign in</button></>
          : <>New here? <button onClick={() => setMode('register')}>Register</button></>}
      </div>
    </div>
  );
}

function prettyError(e) {
  const c = e?.code || '';
  if (c.includes('email-already-in-use')) return 'That email is already registered. Try signing in.';
  if (c.includes('invalid-email')) return 'That email address looks off.';
  if (c.includes('weak-password')) return 'Password needs at least 6 characters.';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found'))
    return 'Email or password is incorrect.';
  if (c.includes('network')) return 'Network problem. Check your connection.';
  return e?.message || 'Something went wrong.';
}
