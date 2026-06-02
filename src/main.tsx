import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import FirstRunWelcome from './components/FirstRunWelcome';
import AdminPosSmartLauncher from './components/AdminPosSmartLauncher';
import AdminInventoryLauncher from './components/AdminInventoryLauncher';
import AdminPosReportsLauncher from './components/AdminPosReportsLauncher';
import AdminPosCorrectionsLauncher from './components/AdminPosCorrectionsLauncher';
import AdminCatalogMasterLauncher from './components/AdminCatalogMasterLauncher';
import AdminCatalogMenuBridge from './components/AdminCatalogMenuBridge';
import CustomerCatalogVisibilityFilter from './components/CustomerCatalogVisibilityFilter';
import CustomerCatalogSoldOutPositionFix from './components/CustomerCatalogSoldOutPositionFix';
import AdminPosToolEventBridge from './components/AdminPosToolEventBridge';
import AdminPosToolsDock from './components/AdminPosToolsDock';
import './index.css';
import './styles/landing-install-lock.css';
import { installHomeVisualTranslator } from './utils/homeVisualTranslator';

installHomeVisualTranslator();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirstRunWelcome>
      <App />
      <CustomerCatalogVisibilityFilter />
      <CustomerCatalogSoldOutPositionFix />
      <AdminPosSmartLauncher />
      <AdminInventoryLauncher />
      <AdminPosReportsLauncher />
      <AdminPosCorrectionsLauncher />
      <AdminCatalogMasterLauncher />
      <AdminCatalogMenuBridge />
      <AdminPosToolEventBridge />
      <AdminPosToolsDock />
    </FirstRunWelcome>
  </StrictMode>
);
