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
import OnlineOrderStockSyncBridge from './components/OnlineOrderStockSyncBridge';
import AdminPosToolEventBridge from './components/AdminPosToolEventBridge';
import AdminPosToolsDock from './components/AdminPosToolsDock';
import LegalModalNoAutoScroll from './components/LegalModalNoAutoScroll';
import InfoHelpCenterMount from './components/InfoHelpCenterMount';
import InfoScreenVisualPolish from './components/InfoScreenVisualPolish';
import CartTextPolish from './components/CartTextPolish';
import CartAvailabilityToast from './components/CartAvailabilityToast';
import ErrorRetryGuard from './components/ErrorRetryGuard';
import './index.css';
import './styles/landing-install-lock.css';
import { installHomeVisualTranslator } from './utils/homeVisualTranslator';

installHomeVisualTranslator();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirstRunWelcome>
      <App />
      <LegalModalNoAutoScroll />
      <InfoHelpCenterMount />
      <InfoScreenVisualPolish />
      <CartTextPolish />
      <CartAvailabilityToast />
      <ErrorRetryGuard />
      <CustomerCatalogVisibilityFilter />
      <OnlineOrderStockSyncBridge />
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
