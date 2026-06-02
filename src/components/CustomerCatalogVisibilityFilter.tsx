import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type ProductVisibilityRow = {
  id: string;
  name: string;
  show_in_app?: boolean | null;
};

const normalizeText = (value: string | null | undefined) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const isAdminPath = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.toLowerCase() === '/admin';
};

const findProductCardFromHeading = (heading: HTMLElement) => {
  let node: HTMLElement | null = heading;

  while (node && node !== document.body) {
    if (
      node.classList.contains('group') &&
      node.className.includes('rounded') &&
      node.querySelector('button')
    ) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
};

export default function CustomerCatalogVisibilityFilter() {
  const hiddenNamesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isAdminPath() || !isSupabaseConfigured) return;

    let cancelled = false;

    const loadHiddenProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, show_in_app')
        .eq('show_in_app', false);

      if (cancelled) return;

      if (error) {
        console.warn('No pude cargar visibilidad de catálogo cliente:', error);
        hiddenNamesRef.current = new Set();
        return;
      }

      hiddenNamesRef.current = new Set(
        ((data || []) as ProductVisibilityRow[])
          .map(product => normalizeText(product.name))
          .filter(Boolean)
      );
    };

    const applyVisibility = () => {
      const hiddenNames = hiddenNamesRef.current;
      const headings = Array.from(document.querySelectorAll('h3')) as HTMLElement[];

      headings.forEach(heading => {
        const name = normalizeText(heading.textContent);
        const card = findProductCardFromHeading(heading);
        if (!card) return;

        const shouldHide = hiddenNames.has(name);
        card.style.display = shouldHide ? 'none' : '';
        card.dataset.pollazoHiddenFromApp = shouldHide ? 'true' : 'false';
      });
    };

    loadHiddenProducts().then(applyVisibility);

    const interval = window.setInterval(applyVisibility, 500);
    const reloadInterval = window.setInterval(() => {
      loadHiddenProducts().then(applyVisibility);
    }, 7000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearInterval(reloadInterval);
    };
  }, []);

  return null;
}
