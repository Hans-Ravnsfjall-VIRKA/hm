import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { VirkaLogo, WcLogo } from '../components/Brand';
import { APP } from '../config';

export default function Auth() {
  const { register, login, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError(''); setNotice(''); setBusy(true);
    try {
      if (mode === 'register') {
        if (form.name.trim().length < 2) throw new Error('Skriva navn títt.');
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

  async function forgot() {
    setError(''); setNotice('');
    if (!form.email.trim()) { setError('Skriva teldupostin tín fyrst, so sendi eg ein recovery-leinki.'); return; }
    try {
      await resetPassword(form.email.trim());
      setNotice('Vit hava sent tær ein teldupost við einum leinki, har tú kanst endurstilla loyniorðið.');
    } catch (e) {
      setError(prettyError(e));
    }
  }

  return (
    <div className="auth fade-in">
      <div className="topmark"><VirkaLogo /></div>

      <div className="hero">
        <WcLogo />
        <h1>{APP.name}</h1>
        <p>{APP.edition} · innanhýsis kapping hjá VIRKA</p>
      </div>

      <div className="seg">
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Stovna brúkara</button>
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Rita inn</button>
      </div>

      {mode === 'register' && (
        <div className="field">
          <label>Navn</label>
          <input value={form.name} onChange={set('name')} placeholder="Soleiðis sæst tú á støðuni" autoComplete="name" />
        </div>
      )}
      <div className="field">
        <label>Teldupostur</label>
        <input type="email" value={form.email} onChange={set('email')} placeholder="tu@virka.fo" autoComplete="email" />
      </div>
      <div className="field">
        <label>Loyniorð</label>
        <input type="password" value={form.password} onChange={set('password')}
          placeholder="Í minsta lagi 6 tekin" autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </div>

      {mode === 'login' && (
        <div className="forgot"><button onClick={forgot}>Gloymt loyniorð?</button></div>
      )}

      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }} onClick={submit} disabled={busy}>
        {busy ? 'Ein løta…' : mode === 'register' ? 'Stovna brúkara' : 'Rita inn'}
      </button>

      <div className="switch">
        {mode === 'register'
          ? <>Hevur longu brúkara? <button onClick={() => setMode('login')}>Rita inn</button></>
          : <>Nýggjur her? <button onClick={() => setMode('register')}>Stovna brúkara</button></>}
      </div>
    </div>
  );
}

function prettyError(e) {
  const c = e?.code || '';
  if (c.includes('email-already-in-use')) return 'Hesin teldupostur er longu skrásettur. Royn at rita inn.';
  if (c.includes('invalid-email')) return 'Telduposturin sær skeivur út.';
  if (c.includes('weak-password')) return 'Loyniorðið má hava í minsta lagi 6 tekin.';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found'))
    return 'Teldupostur ella loyniorð er skeivt.';
  if (c.includes('network')) return 'Trupulleiki við sambandinum. Kanna netsambandið.';
  return e?.message || 'Okkurt fór skeivt.';
}
