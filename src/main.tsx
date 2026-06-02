import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import FirstRunWelcome from './components/FirstRunWelcome';
import './index.css';
import './styles/landing-install-lock.css';
import { installHomeVisualTranslator } from './utils/homeVisualTranslator';

installHomeVisualTranslator();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirstRunWelcome>
      <App />
    </FirstRunWelcome>
  </StrictMode>
);
