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
import PollazoPlusModalLayerFix from './components/PollazoPlusModalLayerFix';
import CartTextPolish from './components/CartTextPolish';
import CartAvailabilityToast from './components/CartAvailabilityToast';
import CartSmartScrollBridge from './components/CartSmartScrollBridge';
import CatalogCartBarPolish from './components/CatalogCartBarPolish';
import CatalogCompactVisualBridge from './components/CatalogCompactVisualBridge';
import SalesMarketingBridge from './components/SalesMarketingBridge';
import CartCompleteOrderSuggestions from './components/CartCompleteOrderSuggestions';
import OrdersDetailProductToggle from './components/OrdersDetailProductToggle';
import PlusNonMemberSavingsGuard from './components/PlusNonMemberSavingsGuard';
import ErrorRetryGuard from './components/ErrorRetryGuard';
import SecurePanelGate from './components/SecurePanelGate';
import './index.css';
import './styles/homeHeroRestore.css';
import './styles/landing-install-lock.css';
import { installHomeVisualTranslator } from './utils/homeVisualTranslator';

const installLegacyTrackingModalGuard = () => {
  if (typeof document === 'undefined') return;

  const styleId = 'pollazo-legacy-tracking-modal-guard';

  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @supports selector(:has(*)) {
        div.fixed.inset-0:has(> button[aria-label="Cerrar estado"]) {
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }

        body:not(:has(nav[aria-label="Navegación principal"] button:first-child[aria-current="page")) button[aria-label="Abrir rastreo de pedido"],
        body:has(button[aria-label="Cerrar rastreo"]) button[aria-label="Abrir rastreo de pedido"] {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      }

      button[aria-label="Cerrar rastreo"] {
        background: linear-gradient(
          to bottom,
          rgba(67, 20, 7, 0.12),
          rgba(67, 20, 7, 0.06),
          rgba(67, 20, 7, 0.11)
        ) !important;
        -webkit-backdrop-filter: blur(1px) !important;
        backdrop-filter: blur(1px) !important;
      }
    `;

    document.head.appendChild(style);
  }

  let redirecting = false;

  const readLegacyOrderCode = (modal: Element) => {
    const title = modal.querySelector('h2');
    const rawCode = String(title?.textContent || '')
      .trim()
      .toUpperCase();

    if (!rawCode || rawCode === 'PEDIDO') return '';

    return rawCode.slice(0, 80);
  };

  const closeLegacyModal = (modal: Element) => {
    const closeButtons = Array.from(
      modal.querySelectorAll<HTMLButtonElement>('button[aria-label="Cerrar estado"], button[aria-label="Cerrar"]')
    );

    closeButtons.forEach(button => {
      try {
        button.click();
      } catch {
        // Cierre opcional.
      }
    });
  };

  const openUnifiedTracking = (orderCode: string) => {
    try {
      sessionStorage.setItem('pollazo_tracking_order_code', orderCode);
    } catch {
      // sessionStorage opcional.
    }

    const params = new URLSearchParams(window.location.search);
    params.set('tracking', '1');
    params.set('orderCode', orderCode);

    window.setTimeout(() => {
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      window.dispatchEvent(new CustomEvent('pollazo:open-tracking', { detail: { orderCode } }));
    }, 60);
  };

  const handleLegacyTrackingModal = () => {
    if (redirecting) return;

    const legacyBackdrop = document.querySelector('div.fixed.inset-0 > button[aria-label="Cerrar estado"]');
    const legacyModal = legacyBackdrop?.parentElement;

    if (!legacyModal || legacyModal.getAttribute('data-pollazo-unified-tracking') === '1') {
      return;
    }

    const orderCode = readLegacyOrderCode(legacyModal);

    if (!orderCode) return;

    redirecting = true;
    legacyModal.setAttribute('data-pollazo-unified-tracking', '1');
    closeLegacyModal(legacyModal);
    openUnifiedTracking(orderCode);

    window.setTimeout(() => {
      redirecting = false;
    }, 1500);
  };

  const observer = new MutationObserver(handleLegacyTrackingModal);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  handleLegacyTrackingModal();
};

const installTrackingButtonHomeOnlyGuard = () => {
  if (typeof document === 'undefined') return;

  const updateTrackingButtonVisibility = () => {
    const nav = document.querySelector('nav[aria-label="Navegación principal"]');
    const navButtons = nav
      ? Array.from(nav.querySelectorAll<HTMLButtonElement>('button'))
      : [];

    const activeButton = nav?.querySelector<HTMLButtonElement>('button[aria-current="page"]') || null;
    const homeButton = navButtons[0] || null;
    const isHome = Boolean(homeButton && activeButton && activeButton === homeButton);
    const isTrackingOpen = Boolean(document.querySelector('button[aria-label="Cerrar rastreo"]'));

    const trackingButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label="Abrir rastreo de pedido"]')
    );

    trackingButtons.forEach(button => {
      const shouldShow = isHome && !isTrackingOpen;

      button.style.setProperty('display', shouldShow ? 'flex' : 'none', 'important');
      button.style.setProperty('opacity', shouldShow ? '1' : '0', 'important');
      button.style.setProperty('pointer-events', shouldShow ? 'auto' : 'none', 'important');
      button.style.setProperty('visibility', shouldShow ? 'visible' : 'hidden', 'important');
    });
  };

  const observer = new MutationObserver(updateTrackingButtonVisibility);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['aria-current', 'class', 'style'],
    childList: true,
    subtree: true,
  });

  window.addEventListener('click', () => window.setTimeout(updateTrackingButtonVisibility, 0), true);
  window.addEventListener('popstate', updateTrackingButtonVisibility);
  window.addEventListener('pollazo:open-tracking', updateTrackingButtonVisibility as EventListener);

  window.setTimeout(updateTrackingButtonVisibility, 0);
  window.setTimeout(updateTrackingButtonVisibility, 250);
  window.setTimeout(updateTrackingButtonVisibility, 900);
};

installHomeVisualTranslator();
installLegacyTrackingModalGuard();
installTrackingButtonHomeOnlyGuard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirstRunWelcome>
      <SecurePanelGate>
        <App />
        <LegalModalNoAutoScroll />
        <InfoHelpCenterMount />
        <InfoScreenVisualPolish />
        <PollazoPlusModalLayerFix />
        <CartTextPolish />
        <CartAvailabilityToast />
        <CartSmartScrollBridge />
        <CatalogCartBarPolish />
        <CatalogCompactVisualBridge />
        <SalesMarketingBridge />
        <CartCompleteOrderSuggestions />
        <OrdersDetailProductToggle />
        <PlusNonMemberSavingsGuard />
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
      </SecurePanelGate>
    </FirstRunWelcome>
  </StrictMode>
);
