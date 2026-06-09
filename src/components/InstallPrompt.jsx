import { useState, useEffect } from 'react';
import { ShareIosIcon, DotsIcon, PlusSquareIcon } from './icons';

const DISMISS_KEY = 'vt_a2hs_dismissed';

function isStandalone() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true;
}

// Shown on the login screen when the app is opened in a browser (not yet added
// to the home screen). Gives platform-specific Faroese guidance.
export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState('other');
  const [deferred, setDeferred] = useState(null);

  useEffect(() => {
    if (isStandalone()) return undefined;
    try { if (localStorage.getItem(DISMISS_KEY) === '1') return undefined; } catch { /* ignore */ }

    const ua = navigator.userAgent || '';
    const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && 'ontouchend' in document);
    const android = /android/i.test(ua);
    setPlatform(ios ? 'ios' : android ? 'android' : 'other');

    if (window.__bip) setDeferred(window.__bip);
    const onBIP = (e) => { e.preventDefault(); setDeferred(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', onBIP);

    if (ios || android) setShow(true);
    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  };

  async function androidInstall() {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setDeferred(null);
    dismiss();
  }

  return (
    <div className="a2hs">
      <button className="a2hs-x" onClick={dismiss} aria-label="Lat aftur">×</button>
      <div className="a2hs-h">Legg appina á heimaskíggjan</div>
      <p className="a2hs-p">Far skjótari inn: legg Tippikapping sum eitt forrit á heimaskíggjan og opna beinleiðis haðan.</p>

      {platform === 'ios' && (
        <ol className="a2hs-steps">
          <li><ShareIosIcon /> Trýst á <b>Deil</b>-knappin (firkanturin við pílinum) niðast í Safari.</li>
          <li><PlusSquareIcon /> Skrolla niður og vel <b>«Legg á heimaskíggja»</b> / <b>«Add to Home Screen»</b>.</li>
          <li>Trýst <b>«Legg afturat»</b> ovast til høgru.</li>
        </ol>
      )}

      {platform === 'android' && (
        deferred ? (
          <button className="btn btn-primary btn-block" onClick={androidInstall}>Legg á heimaskíggjan</button>
        ) : (
          <ol className="a2hs-steps">
            <li><DotsIcon /> Trýst á <b>valmyndina</b> (tríggir prikkar) ovast í Chrome.</li>
            <li><PlusSquareIcon /> Vel <b>«Legg á heimaskíggja»</b> / <b>«Install app»</b>.</li>
            <li>Vátta við at trýsta <b>«Legg afturat»</b>.</li>
          </ol>
        )
      )}

      {platform === 'other' && (
        <p className="a2hs-p" style={{ margin: 0 }}>
          Opna síðuna á telefonini fyri at leggja hana á heimaskíggjan.
        </p>
      )}
    </div>
  );
}
