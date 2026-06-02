import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import FirstRunWelcome from './components/FirstRunWelcome';
import AdminPosLauncher from './components/AdminPosLauncher';
import AdminInventoryLauncher from './components/AdminInventoryLauncher';
import AdminPosReportsLauncher from './components/AdminPosReportsLauncher';
import AdminPosCorrectionsLauncher from './components/AdminPosCorrectionsLauncher';
import AdminPosToolsDock from './components/AdminPosToolsDock';
import './index.css';
import './styles/landing-install-lock.css';
import { installHomeVisualTranslator } from './utils/homeVisualTranslator';

installHomeVisualTranslator();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirstRunWelcome>
      <App />
      <AdminPosLauncher />
      <AdminInventoryLauncher />
      <AdminPosReportsLauncher />
      <AdminPosCorrectionsLauncher />
      <AdminPosToolsDock />
    </FirstRunWelcome>
  </StrictMode>
);
