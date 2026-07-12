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

export default function CustomerMapBootstrap() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const compact = params.get('compact') === '1';
    const orderCode = String(params.get('orderCode') || '').trim().toUpperCase();
    const credential = getOrderCredential(orderCode);

    if (compact) {
      document.documentElement.classList.add('pollazo-customer-map-compact');
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
