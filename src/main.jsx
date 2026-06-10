import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Best-effort lock to portrait. Works in installed PWA / fullscreen on Android;
// iOS Safari doesn't support it (the manifest + the rotate guard cover that).
try {
  if (window.screen?.orientation?.lock) {
    window.screen.orientation.lock('portrait').catch(() => {});
  }
} catch { /* unsupported - ignore */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
