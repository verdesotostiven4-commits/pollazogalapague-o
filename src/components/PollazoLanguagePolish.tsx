import { useEffect } from 'react';
import type { LanguageCode } from '../types';

const STORAGE_KEY = 'pollazo_language';
const SKIP_SELECTOR = 'script, style, textarea, input, select, [contenteditable="true"], .maplibregl-map, .maplibregl-map *';

type Entry = Partial<Record<LanguageCode, string>> & { es: string };

const entries: Entry[] = [
  { es: 'Únete al Club', en: 'Join the Club', pt: 'Entre no Clube', fr: 'Rejoindre le Club', de: 'Dem Club beitreten', it: 'Unisciti al Club', zh: '加入俱乐部', ja: 'クラブに参加', nl: 'Word lid van de club', ru: 'Вступить в клуб' },
  { es: 'Acumula puntos y gana premios', en: 'Earn points and win prizes', pt: 'Acumule pontos e ganhe prêmios', fr: 'Gagnez des points et des prix', de: 'Punkte sammeln und Preise gewinnen', it: 'Accumula punti e vinci premi', zh: '累积分数并赢取奖品', ja: 'ポイントを貯めて賞品を獲得', nl: 'Spaar punten en win prijzen', ru: 'Копите баллы и выигрывайте призы' },
  { es: 'Confirmar dirección', en: 'Confirm address', pt: 'Confirmar endereço', fr: 'Confirmer l’adresse', de: 'Adresse bestätigen', it: 'Conferma indirizzo', zh: '确认地址', ja: '住所を確認', nl: 'Adres bevestigen', ru: 'Подтвердить адрес' },
  { es: 'Marca tu punto exacto', en: 'Mark your exact point', pt: 'Marque seu ponto exato', fr: 'Marquez votre point exact', de: 'Genauen Punkt markieren', it: 'Segna il punto esatto', zh: '标记准确位置', ja: '正確な場所を指定', nl: 'Markeer je exacte punt', ru: 'Отметьте точную точку' },
  { es: 'Punto dentro de zona', en: 'Point inside zone', pt: 'Ponto dentro da zona', fr: 'Point dans la zone', de: 'Punkt im Liefergebiet', it: 'Punto nella zona', zh: '位置在配送区内', ja: '配送エリア内', nl: 'Punt binnen zone', ru: 'Точка в зоне доставки' },
  { es: 'Mueve el mapa', en: 'Move the map', pt: 'Mova o mapa', fr: 'Déplacez la carte', de: 'Karte bewegen', it: 'Sposta la mappa', zh: '移动地图', ja: '地図を動かす', nl: 'Verplaats de kaart', ru: 'Переместите карту' },
  { es: 'Cargando mapa...', en: 'Loading map...', pt: 'Carregando mapa...', fr: 'Chargement de la carte...', de: 'Karte wird geladen...', it: 'Caricamento mappa...', zh: '正在加载地图...', ja: '地図を読み込み中...', nl: 'Kaart laden...', ru: 'Загрузка карты...' },
  { es: 'Guardar como', en: 'Save as', pt: 'Salvar como', fr: 'Enregistrer comme', de: 'Speichern als', it: 'Salva come', zh: '保存为', ja: '保存名', nl: 'Opslaan als', ru: 'Сохранить как' },
  { es: 'Referencia', en: 'Reference', pt: 'Referência', fr: 'Référence', de: 'Referenz', it: 'Riferimento', zh: '参考说明', ja: '目印', nl: 'Referentie', ru: 'Ориентир' },
  { es: 'Casa', en: 'Home', pt: 'Casa', fr: 'Maison', de: 'Zuhause', it: 'Casa', zh: '家', ja: '自宅', nl: 'Thuis', ru: 'Дом' },
  { es: 'Trabajo', en: 'Work', pt: 'Trabalho', fr: 'Travail', de: 'Arbeit', it: 'Lavoro', zh: '工作', ja: '職場', nl: 'Werk', ru: 'Работа' },
  { es: 'Otro', en: 'Other', pt: 'Outro', fr: 'Autre', de: 'Andere', it: 'Altro', zh: '其他', ja: 'その他', nl: 'Anders', ru: 'Другое' },
  { es: 'Confirmar punto', en: 'Confirm point', pt: 'Confirmar ponto', fr: 'Confirmer le point', de: 'Punkt bestätigen', it: 'Conferma punto', zh: '确认位置', ja: '地点を確認', nl: 'Punt bevestigen', ru: 'Подтвердить точку' },
  { es: 'Ver canasta', en: 'View basket', pt: 'Ver cesta', fr: 'Voir le panier', de: 'Warenkorb ansehen', it: 'Vedi carrello', zh: '查看购物篮', ja: 'かごを見る', nl: 'Bekijk mandje', ru: 'Посмотреть корзину' },
  { es: 'Canasta', en: 'Basket', pt: 'Cesta', fr: 'Panier', de: 'Warenkorb', it: 'Carrello', zh: '购物篮', ja: 'かご', nl: 'Mandje', ru: 'Корзина' },
  { es: 'Pedido', en: 'Order', pt: 'Pedido', fr: 'Commande', de: 'Bestellung', it: 'Ordine', zh: '订单', ja: '注文', nl: 'Bestelling', ru: 'Заказ' },
  { es: 'Resultados globales', en: 'Global results', pt: 'Resultados globais', fr: 'Résultats globaux', de: 'Globale Ergebnisse', it: 'Risultati globali', zh: '全局结果', ja: '検索結果', nl: 'Algemene resultaten', ru: 'Общие результаты' },
  { es: 'Agotado por ahora', en: 'Sold out for now', pt: 'Esgotado por enquanto', fr: 'Épuisé pour le moment', de: 'Derzeit ausverkauft', it: 'Esaurito per ora', zh: '暂时售罄', ja: '現在売り切れ', nl: 'Voorlopig uitverkocht', ru: 'Пока нет в наличии' },
  { es: 'Mis pedidos', en: 'My orders', pt: 'Meus pedidos', fr: 'Mes commandes', de: 'Meine Bestellungen', it: 'I miei ordini', zh: '我的订单', ja: '注文履歴', nl: 'Mijn bestellingen', ru: 'Мои заказы' },
  { es: 'Historial Pollazo', en: 'Pollazo history', pt: 'Histórico Pollazo', fr: 'Historique Pollazo', de: 'Pollazo-Verlauf', it: 'Storico Pollazo', zh: 'Pollazo 历史', ja: 'Pollazo履歴', nl: 'Pollazo geschiedenis', ru: 'История Pollazo' },
  { es: 'Centro de ayuda', en: 'Help center', pt: 'Central de ajuda', fr: 'Centre d’aide', de: 'Hilfezentrum', it: 'Centro assistenza', zh: '帮助中心', ja: 'ヘルプセンター', nl: 'Helpcentrum', ru: 'Центр помощи' },
  { es: 'Galería', en: 'Gallery', pt: 'Galeria', fr: 'Galerie', de: 'Galerie', it: 'Galleria', zh: '图库', ja: 'ギャラリー', nl: 'Galerij', ru: 'Галерея' },
  { es: 'Cuidado personal', en: 'Personal care', pt: 'Cuidados pessoais', fr: 'Soins personnels', de: 'Körperpflege', it: 'Cura personale', zh: '个人护理', ja: 'パーソナルケア', nl: 'Persoonlijke verzorging', ru: 'Личная гигиена' },
  { es: 'Términos y condiciones', en: 'Terms and conditions', pt: 'Termos e condições', fr: 'Conditions générales', de: 'Allgemeine Geschäftsbedingungen', it: 'Termini e condizioni', zh: '条款和条件', ja: '利用規約', nl: 'Voorwaarden', ru: 'Условия использования' },
  { es: 'Rastreo Pollazo', en: 'Pollazo tracking', pt: 'Rastreamento Pollazo', fr: 'Suivi Pollazo', de: 'Pollazo-Verfolgung', it: 'Tracciamento Pollazo', zh: 'Pollazo 追踪', ja: 'Pollazo追跡', nl: 'Pollazo tracking', ru: 'Отслеживание Pollazo' },
  { es: 'Estado actual', en: 'Current status', pt: 'Status atual', fr: 'Statut actuel', de: 'Aktueller Status', it: 'Stato attuale', zh: '当前状态', ja: '現在の状態', nl: 'Huidige status', ru: 'Текущий статус' },
  { es: 'Progreso', en: 'Progress', pt: 'Progresso', fr: 'Progression', de: 'Fortschritt', it: 'Progresso', zh: '进度', ja: '進行状況', nl: 'Voortgang', ru: 'Прогресс' },
  { es: 'Tiempo', en: 'Time', pt: 'Tempo', fr: 'Temps', de: 'Zeit', it: 'Tempo', zh: '时间', ja: '時間', nl: 'Tijd', ru: 'Время' },
  { es: 'Pago', en: 'Payment', pt: 'Pagamento', fr: 'Paiement', de: 'Zahlung', it: 'Pagamento', zh: '付款', ja: '支払い', nl: 'Betaling', ru: 'Оплата' },
  { es: 'Entendido', en: 'Got it', pt: 'Entendi', fr: 'Compris', de: 'Verstanden', it: 'Capito', zh: '明白', ja: '了解', nl: 'Begrepen', ru: 'Понятно' },
  { es: 'Transparencia en tiempo real', en: 'Real-time transparency', pt: 'Transparência em tempo real', fr: 'Transparence en temps réel', de: 'Transparenz in Echtzeit', it: 'Trasparenza in tempo reale', zh: '实时透明', ja: 'リアルタイムの透明性', nl: 'Realtime transparantie', ru: 'Прозрачность в реальном времени' },
];

const synonymSearch: Record<string, string> = {
  water: 'agua', água: 'agua', agua: 'agua', eau: 'agua', wasser: 'agua', acqua: 'agua', 水: 'agua', '水 ': 'agua', вода: 'agua',
  chicken: 'pollo', frango: 'pollo', poulet: 'pollo', huhn: 'pollo', pollo: 'pollo', 鸡肉: 'pollo', 鶏肉: 'pollo', курица: 'pollo', kip: 'pollo',
  milk: 'leche', leite: 'leche', lait: 'leche', milch: 'leche', latte: 'leche', 牛奶: 'leche', 牛乳: 'leche', молоко: 'leche',
  rice: 'arroz', arroz: 'arroz', riz: 'arroz', reis: 'arroz', riso: 'arroz', 大米: 'arroz', 米: 'arroz', рис: 'arroz',
  tuna: 'atun', atún: 'atun', thon: 'atun', tonno: 'atun', 金枪鱼: 'atun', ツナ: 'atun', тунец: 'atun',
};

const reverse = new Map<string, Entry>();
entries.forEach(entry => {
  Object.values(entry).forEach(value => {
    if (value) reverse.set(value.trim().toLowerCase(), entry);
  });
});

const language = () => {
  const raw = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
  return raw || 'es';
};

const translateExact = (value: string, lang: LanguageCode) => {
  const trimmed = value.trim();
  const entry = reverse.get(trimmed.toLowerCase());
  if (!entry) return value;
  return entry[lang] || entry.en || entry.es || value;
};

const polishTextNodes = () => {
  const lang = language();
  if (lang === 'es') return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      const text = node.nodeValue || '';
      if (!text.trim() || text.trim().length > 80) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }

  nodes.forEach(textNode => {
    const current = textNode.nodeValue || '';
    const translated = translateExact(current, lang);
    if (translated !== current.trim()) {
      textNode.nodeValue = current.replace(current.trim(), translated);
    }
  });
};

const polishPlaceholders = () => {
  const lang = language();
  const placeholders: Record<string, Entry> = {
    '¿Qué buscas hoy?': { es: '¿Qué buscas hoy?', en: 'What are you looking for?', pt: 'O que você procura?', fr: 'Que cherchez-vous ?', de: 'Was suchst du?', it: 'Cosa cerchi?', zh: '你想找什么？', ja: '何を探していますか？', nl: 'Wat zoek je?', ru: 'Что ищете?' },
    'Ej: casa blanca, portón negro, junto a la farmacia...': { es: 'Ej: casa blanca, portón negro, junto a la farmacia...', en: 'Ex: white house, black gate, next to the pharmacy...', pt: 'Ex: casa branca, portão preto, perto da farmácia...', fr: 'Ex : maison blanche, portail noir, près de la pharmacie...', de: 'z. B. weißes Haus, schwarzes Tor, neben der Apotheke...', it: 'Es: casa bianca, cancello nero, vicino alla farmacia...', zh: '例：白色房子、黑色大门、药店旁边...', ja: '例：白い家、黒い門、薬局の近く...', nl: 'Bijv: wit huis, zwarte poort, naast de apotheek...', ru: 'Напр.: белый дом, черные ворота, рядом с аптекой...' },
  };

  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach(input => {
    const entry = placeholders[input.placeholder];
    if (entry) input.placeholder = entry[lang] || entry.en || entry.es;
  });
};

const convertCatalogSearchSynonym = () => {
  const input = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="text"]')).find(element =>
    element.placeholder.includes('buscas') || element.placeholder.includes('looking') || element.placeholder.includes('找') || element.value.trim().length > 0
  );

  if (!input || input.dataset.pollazoSynonymLock === '1') return;

  const raw = input.value.trim();
  const key = raw.toLowerCase();
  const mapped = synonymSearch[key];

  if (!mapped || mapped === raw) return;

  input.dataset.pollazoSynonymLock = '1';
  input.value = mapped;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  window.setTimeout(() => {
    delete input.dataset.pollazoSynonymLock;
  }, 120);
};

export default function PollazoLanguagePolish() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let frame = 0;
    const run = () => {
      frame = 0;
      polishTextNodes();
      polishPlaceholders();
      convertCatalogSearchSynonym();
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(run);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    schedule();
    window.addEventListener('click', schedule, true);
    window.addEventListener('input', schedule, true);
    window.addEventListener('storage', schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('click', schedule, true);
      window.removeEventListener('input', schedule, true);
      window.removeEventListener('storage', schedule);
    };
  }, []);

  return null;
}
