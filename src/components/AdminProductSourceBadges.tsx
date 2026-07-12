import { useEffect, useState } from 'react';
import type { Product } from '../types';

const normalize = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const isCascada = (product: Product) =>
  String(product.id || '').toLowerCase().startsWith('cascada-');

export default function AdminProductSourceBadges() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (window.location.pathname !== '/admin') return undefined;

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/panel-data?panel=admin', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          products?: Product[];
        };
        if (!cancelled && response.ok && payload.ok && Array.isArray(payload.products)) {
          setProducts(payload.products);
        }
      } catch {
        // El panel principal sigue funcionando aunque no se puedan pintar los distintivos.
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (window.location.pathname !== '/admin' || products.length === 0) return undefined;

    const byName = new Map(
      products.map(product => [normalize(product.name), product] as const)
    );

    const decorate = () => {
      const editButtons = Array.from(
        document.querySelectorAll<HTMLButtonElement>('button[aria-label="Editar producto"]')
      );

      editButtons.forEach(button => {
        const card = button.closest<HTMLElement>('div.bg-white');
        if (!card) return;

        const titleCandidates = Array.from(card.querySelectorAll<HTMLElement>('p'));
        const title = titleCandidates.find(element => byName.has(normalize(element.textContent)));
        if (!title) return;

        const product = byName.get(normalize(title.textContent));
        if (!product) return;

        const source = isCascada(product) ? 'cascada' : 'mirador';
        const titleRow = title.parentElement;
        if (!titleRow) return;

        const existing = titleRow.querySelector<HTMLElement>('[data-pollazo-product-source]');
        if (existing?.dataset.pollazoProductSource === source) return;
        existing?.remove();

        const badge = document.createElement('span');
        badge.dataset.pollazoProductSource = source;
        badge.textContent = source === 'cascada' ? 'La Cascada' : 'El Mirador';
        badge.className =
          source === 'cascada'
            ? 'rounded-full border border-red-100 bg-red-50 px-2 py-1 text-[7px] font-black uppercase text-red-600'
            : 'rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[7px] font-black uppercase text-blue-600';
        titleRow.appendChild(badge);

        card.style.borderLeftWidth = '4px';
        card.style.borderLeftColor = source === 'cascada' ? '#ef4444' : '#3b82f6';
      });
    };

    const observer = new MutationObserver(decorate);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    decorate();

    return () => observer.disconnect();
  }, [products]);

  return null;
}
