import { useEffect } from 'react';
import CustomerTrackingMapLab from './CustomerTrackingMapLab';
import { getOrderCredential } from '../utils/orderCredentials';

const setNativeInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const installCompactStyles = () => {
  const styleId = 'pollazo-customer-map-compact-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    html.pollazo-customer-map-compact,
    html.pollazo-customer-map-compact body,
    html.pollazo-customer-map-compact #root {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #020617;
    }

    html.pollazo-customer-map-compact #root > div {
      min-height: 100dvh !important;
    }

    html.pollazo-customer-map-compact #root > div > header,
    html.pollazo-customer-map-compact #root > div > main > section:first-child,
    html.pollazo-customer-map-compact #root > div > main > section:nth-child(2) > div:nth-child(2) {
      display: none !important;
    }

    html.pollazo-customer-map-compact #root > div > main {
      width: 100% !important;
      max-width: none !important;
      height: 100dvh !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    html.pollazo-customer-map-compact #root > div > main > section:nth-child(2) {
      display: block !important;
      height: 100dvh !important;
    }

    html.pollazo-customer-map-compact #root > div > main > section:nth-child(2) > div:first-child {
      min-height: 100dvh !important;
      height: 100dvh !important;
      border: 0 !important;
      border-radius: 0 !important;
    }
  `;
  document.head.appendChild(style);
};

export default function CustomerMapBootstrap() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const compact = params.get('compact') === '1';
    const orderCode = String(params.get('orderCode') || '').trim().toUpperCase();
    const credential = getOrderCredential(orderCode);

    if (compact) {
      document.documentElement.classList.add('pollazo-customer-map-compact');
      installCompactStyles();
    }

    if (!orderCode || !credential?.trackingToken) return undefined;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const codeInput = document.querySelector<HTMLInputElement>(
        'input[placeholder="Código PZ-..."]'
      );
      const tokenInput = document.querySelector<HTMLInputElement>(
        'input[placeholder="Token seguro del pedido"]'
      );
      const connectButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
        .find(button => button.textContent?.includes('Ver rastreo real'));

      if (codeInput && tokenInput && connectButton) {
        setNativeInputValue(codeInput, orderCode);
        setNativeInputValue(tokenInput, credential.trackingToken);
        window.setTimeout(() => connectButton.click(), 80);
        window.clearInterval(timer);
      } else if (attempts >= 30) {
        window.clearInterval(timer);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, []);

  return <CustomerTrackingMapLab />;
}
