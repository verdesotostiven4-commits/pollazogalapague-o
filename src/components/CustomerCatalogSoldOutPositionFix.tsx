import { useEffect, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import type { Category, Product } from '../types';

type CatalogCategory = 'Todos' | Category;

const ORDERED_CATEGORIES: CatalogCategory[] = [
  'Todos',
  'Pollos',
  'Embutidos',
  'Lácteos y refrigerados',
  'Abarrotes y básicos',
  'Bebidas',
  'Salsas, aliños y aceites',
  'Frutas y verduras',
  'Snacks y dulces',
  'Cuidado personal',
  'Limpieza y hogar',
];

const BESTSELLER_IDS = [
  'pollo-entero',
  'pechuga',
  'cuartos',
  'agua-vivant-625ml',
  'colgate-triple-75ml',
  'leche-tru-1l',
];

const normalizeText = (value: string | null | undefined) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const isCustomerPath = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  return path !== '/admin' && path !== '/repartidor';
};

const buildSuggestedRank = (product: Product) => {
  const categoryRank = ORDERED_CATEGORIES.indexOf(product.category);
  const safeCategoryRank = categoryRank >= 0 ? categoryRank : ORDERED_CATEGORIES.length;
  const bestRank = BESTSELLER_IDS.includes(product.id) ? 0 : 1;

  return {
    categoryRank: safeCategoryRank,
    bestRank,
    name: normalizeText(product.name),
  };
};

const compareSuggested = (a: Product, b: Product) => {
  const rankA = buildSuggestedRank(a);
  const rankB = buildSuggestedRank(b);

  if (rankA.categoryRank !== rankB.categoryRank) return rankA.categoryRank - rankB.categoryRank;
  if (rankA.bestRank !== rankB.bestRank) return rankA.bestRank - rankB.bestRank;
  return rankA.name.localeCompare(rankB.name);
};

const findProductCardWrapper = (heading: HTMLHeadingElement) => {
  let node: HTMLElement | null = heading;

  while (node && node !== document.body) {
    if (node.parentElement?.className.includes('grid') && node.className.includes('w-full')) {
      return node;
    }

    node = node.parentElement;
  }

  return heading.closest('.w-full') as HTMLElement | null;
};

export default function CustomerCatalogSoldOutPositionFix() {
  const { products } = useAdmin();

  const productRankByName = useMemo(() => {
    const sorted = [...products].sort(compareSuggested);
    const map = new Map<string, number>();

    sorted.forEach((product, index) => {
      map.set(normalizeText(product.name), index);
    });

    return map;
  }, [products]);

  useEffect(() => {
    if (!isCustomerPath()) return undefined;

    const applyOrder = () => {
      const searchOverlayOpen = Boolean(document.querySelector('input[value]:focus'));

      if (searchOverlayOpen) return;

      const headings = Array.from(document.querySelectorAll('h3')) as HTMLHeadingElement[];

      headings.forEach(heading => {
        const name = normalizeText(heading.textContent);
        const rank = productRankByName.get(name);
        const wrapper = findProductCardWrapper(heading);

        if (!wrapper || rank === undefined) return;

        wrapper.style.order = String(rank);
      });
    };

    applyOrder();
    const interval = window.setInterval(applyOrder, 700);

    return () => {
      window.clearInterval(interval);
    };
  }, [productRankByName]);

  return null;
}
