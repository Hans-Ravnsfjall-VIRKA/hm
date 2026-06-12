import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { applyTheme, getTheme, applyAccent, getAccent, applyFontScale, getFontScale } from './lib/theme';

applyTheme(getTheme());
applyAccent(getAccent());
applyFontScale(getFontScale());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
