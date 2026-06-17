import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider, THEME_MIRROR_KEY } from './state/AppContext';
import { AuthProvider } from './auth/AuthProvider';
import './styles/global.css';

// Applique le thème AVANT le rendu pour éviter le flash clair/sombre.
try {
  const saved = localStorage.getItem(THEME_MIRROR_KEY);
  document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');
} catch {
  document.documentElement.setAttribute('data-theme', 'light');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
