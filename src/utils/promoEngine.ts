import type { Product } from '../types';

export type PromotionKind = 'today_deal' | 'plus_only' | 'combo' | 'clearance' | 'featured';

export type PromotionRule = {
  id: string;
  productId: string;
  title: string;
  label: string;
  kind: PromotionKind;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  normalPrice?: number | null;
  promoPrice?: number | null;
  plusOnly?: boolean;
  priority?: number;
};

export type ProductPromotionView = {
  product: Product;
  promotion: PromotionRule;
  showPromoPrice: boolean;
  normalPrice?: number | null;
  promoPrice?: number | null;
};

const nowIsInsideWindow = (promotion: PromotionRule, now = new Date()) => {
  const nowTime = now.getTime();

  if (promotion.startsAt) {
    const start = new Date(promotion.startsAt).getTime();
    if (Number.isFinite(start) && nowTime < start) return false;
  }

  if (promotion.endsAt) {
    const end = new Date(promotion.endsAt).getTime();
    if (Number.isFinite(end) && nowTime > end) return false;
  }

  return true;
};

const toMoney = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return Number(value.toFixed(2));
};

export const getActivePromotions = (promotions: PromotionRule[], now = new Date()) => {
  return promotions
    .filter(promotion => promotion.active && nowIsInsideWindow(promotion, now))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
};

export const getPromotionForProduct = (
  product: Product,
  promotions: PromotionRule[],
  now = new Date()
) => {
  return getActivePromotions(promotions, now).find(promotion => promotion.productId === product.id) || null;
};

export const buildPromotionViews = (
  products: Product[],
  promotions: PromotionRule[],
  options?: {
    includePlusOnly?: boolean;
    applyPromoPrices?: boolean;
    maxItems?: number;
  }
): ProductPromotionView[] => {
  const includePlusOnly = options?.includePlusOnly ?? true;
  const applyPromoPrices = options?.applyPromoPrices ?? false;
  const maxItems = options?.maxItems ?? 12;

  return getActivePromotions(promotions)
    .map(promotion => {
      if (promotion.plusOnly && !includePlusOnly) return null;

      const product = products.find(item => item.id === promotion.productId);
      if (!product || product.available === false) return null;
      if (product.is_variable) return null;

      const normalPrice = toMoney(promotion.normalPrice);
      const promoPrice = toMoney(promotion.promoPrice);

      return {
        product,
        promotion,
        normalPrice,
        promoPrice,
        showPromoPrice: Boolean(applyPromoPrices && normalPrice && promoPrice && promoPrice < normalPrice),
      };
    })
    .filter(Boolean)
    .slice(0, maxItems) as ProductPromotionView[];
};

// Fase 1: promociones visuales/controladas. Vacío por defecto para no inventar descuentos.
// Más adelante esto debe venir de Supabase/Admin.
export const DEFAULT_PROMOTIONS: PromotionRule[] = [];
