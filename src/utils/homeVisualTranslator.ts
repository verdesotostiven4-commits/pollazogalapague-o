import type { LanguageCode } from '../types';

type Localized = Partial<Record<LanguageCode, string>> & { es: string; en?: string };

const LANGUAGE_STORAGE_KEY = 'pollazo_language';
const SUPPORTED: LanguageCode[] = ['es', 'en', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'nl', 'ru'];

const pick = (entry: Localized, language: LanguageCode) => entry[language] || entry.en || entry.es;

const HOME_TEXTS: Localized[] = [
  { es: '¡Buenos días!', en: 'Good morning!', pt: 'Bom dia!', fr: 'Bonjour !', de: 'Guten Morgen!', it: 'Buongiorno!', zh: '早上好！', ja: 'おはようございます！', nl: 'Goedemorgen!', ru: 'Доброе утро!' },
  { es: '¿Qué compraremos para el desayuno? ☕', en: 'What should we get for breakfast? ☕', pt: 'O que vamos comprar para o café da manhã? ☕', fr: 'Que prenons-nous pour le petit-déjeuner ? ☕', de: 'Was kaufen wir fürs Frühstück? ☕', it: 'Cosa prendiamo per colazione? ☕', zh: '早餐买点什么？☕', ja: '朝食に何を買いましょうか？☕', nl: 'Wat halen we voor ontbijt? ☕', ru: 'Что купим на завтрак? ☕' },
  { es: '¡Buenas tardes!', en: 'Good afternoon!', pt: 'Boa tarde!', fr: 'Bon après-midi !', de: 'Guten Nachmittag!', it: 'Buon pomeriggio!', zh: '下午好！', ja: 'こんにちは！', nl: 'Goedemiddag!', ru: 'Добрый день!' },
  { es: '¿Un pollito para el asado hoy? 🍗', en: 'Chicken for today’s grill? 🍗', pt: 'Um franguinho para o churrasco hoje? 🍗', fr: 'Un poulet pour le barbecue aujourd’hui ? 🍗', de: 'Hähnchen für den Grill heute? 🍗', it: 'Pollo per la grigliata di oggi? 🍗', zh: '今天来点烤鸡吗？🍗', ja: '今日はチキンでグリルにしますか？🍗', nl: 'Kip voor de grill vandaag? 🍗', ru: 'Курица для гриля сегодня? 🍗' },
  { es: '¡Buenas noches!', en: 'Good evening!', pt: 'Boa noite!', fr: 'Bonsoir !', de: 'Guten Abend!', it: 'Buonasera!', zh: '晚上好！', ja: 'こんばんは！', nl: 'Goedenavond!', ru: 'Добрый вечер!' },
  { es: '¿Cenamos algo rico del Pollazo? 🌙', en: 'Shall we have something tasty from Pollazo? 🌙', pt: 'Vamos jantar algo gostoso do Pollazo? 🌙', fr: 'On mange quelque chose de bon du Pollazo ? 🌙', de: 'Etwas Leckeres von Pollazo zum Abendessen? 🌙', it: 'Ceniamo qualcosa di buono dal Pollazo? 🌙', zh: '晚餐来点 Pollazo 美食吗？🌙', ja: 'Pollazo の美味しいもので夕食にしますか？🌙', nl: 'Iets lekkers van Pollazo vanavond? 🌙', ru: 'Поужинаем чем-нибудь вкусным от Pollazo? 🌙' },
  { es: 'Pollo Fresco', en: 'Fresh Chicken', pt: 'Frango fresco', fr: 'Poulet frais', de: 'Frisches Hähnchen', it: 'Pollo fresco', zh: '新鲜鸡肉', ja: '新鮮なチキン', nl: 'Verse kip', ru: 'Свежая курица' },
  { es: 'Directo a tu casa', en: 'Delivered to your door', pt: 'Direto para sua casa', fr: 'Livré chez vous', de: 'Direkt zu dir nach Hause', it: 'Diretto a casa tua', zh: '送到你家门口', ja: 'ご自宅までお届け', nl: 'Direct bij jou thuis', ru: 'Прямо к вам домой' },
  { es: 'Comprar', en: 'Shop', pt: 'Comprar', fr: 'Acheter', de: 'Kaufen', it: 'Compra', zh: '购买', ja: '購入', nl: 'Kopen', ru: 'Купить' },
  { es: 'Bienvenido de nuevo,', en: 'Welcome back,', pt: 'Bem-vindo de volta,', fr: 'Bon retour,', de: 'Willkommen zurück,', it: 'Bentornato,', zh: '欢迎回来，', ja: 'おかえりなさい、', nl: 'Welkom terug,', ru: 'С возвращением,' },
  { es: 'Hola,', en: 'Hi,', pt: 'Olá,', fr: 'Salut,', de: 'Hallo,', it: 'Ciao,', zh: '你好，', ja: 'こんにちは、', nl: 'Hoi,', ru: 'Привет,' },
  { es: 'Desliza para ver categorías', en: 'Swipe to see categories', pt: 'Deslize para ver categorias', fr: 'Glissez pour voir les catégories', de: 'Wische zu den Kategorien', it: 'Scorri per vedere le categorie', zh: '滑动查看分类', ja: 'スワイプしてカテゴリを見る', nl: 'Veeg voor categorieën', ru: 'Листайте категории' },
  { es: 'Compra rápido', en: 'Quick shopping', pt: 'Compra rápida', fr: 'Achat rapide', de: 'Schnell einkaufen', it: 'Acquisto rapido', zh: '快速购买', ja: 'クイック購入', nl: 'Snel kopen', ru: 'Быстрая покупка' },
  { es: 'Elige tu categoría', en: 'Choose your category', pt: 'Escolha sua categoria', fr: 'Choisissez votre catégorie', de: 'Kategorie auswählen', it: 'Scegli la categoria', zh: '选择分类', ja: 'カテゴリを選択', nl: 'Kies je categorie', ru: 'Выберите категорию' },
  { es: 'Explorar', en: 'Explore', pt: 'Explorar', fr: 'Explorer', de: 'Entdecken', it: 'Esplora', zh: '浏览', ja: '探す', nl: 'Verkennen', ru: 'Обзор' },
  { es: 'Ver todo', en: 'View all', pt: 'Ver tudo', fr: 'Voir tout', de: 'Alles ansehen', it: 'Vedi tutto', zh: '查看全部', ja: 'すべて見る', nl: 'Alles bekijken', ru: 'Смотреть все' },
  { es: 'Pollos', en: 'Chicken', pt: 'Frangos', fr: 'Poulets', de: 'Hähnchen', it: 'Polli', zh: '鸡肉', ja: 'チキン', nl: 'Kip', ru: 'Курица' },
  { es: 'Embutidos', en: 'Sausages', pt: 'Embutidos', fr: 'Charcuterie', de: 'Wurstwaren', it: 'Insaccati', zh: '香肠熟食', ja: 'ソーセージ類', nl: 'Vleeswaren', ru: 'Колбасы' },
  { es: 'Bebidas', en: 'Drinks', pt: 'Bebidas', fr: 'Boissons', de: 'Getränke', it: 'Bevande', zh: '饮料', ja: '飲み物', nl: 'Dranken', ru: 'Напитки' },
  { es: 'Lácteos', en: 'Dairy', pt: 'Laticínios', fr: 'Produits laitiers', de: 'Milchprodukte', it: 'Latticini', zh: '乳制品', ja: '乳製品', nl: 'Zuivel', ru: 'Молочные' },
  { es: 'Abarrotes', en: 'Groceries', pt: 'Mercearia', fr: 'Épicerie', de: 'Lebensmittel', it: 'Alimentari', zh: '杂货', ja: '食料品', nl: 'Kruidenierswaren', ru: 'Продукты' },
  { es: 'Snacks', en: 'Snacks', pt: 'Snacks', fr: 'Snacks', de: 'Snacks', it: 'Snack', zh: '零食', ja: 'スナック', nl: 'Snacks', ru: 'Снеки' },
  { es: 'Ofertas del día', en: 'Today’s offers', pt: 'Ofertas do dia', fr: 'Offres du jour', de: 'Angebote des Tages', it: 'Offerte del giorno', zh: '今日优惠', ja: '本日のおすすめ', nl: 'Aanbiedingen vandaag', ru: 'Предложения дня' },
  { es: 'Precios frescos y disponibilidad diaria', en: 'Fresh prices and daily availability', pt: 'Preços frescos e disponibilidade diária', fr: 'Prix frais et disponibilité du jour', de: 'Frische Preise und tägliche Verfügbarkeit', it: 'Prezzi freschi e disponibilità giornaliera', zh: '每日新鲜价格和库存', ja: '毎日の新鮮価格と在庫', nl: 'Verse prijzen en dagelijkse voorraad', ru: 'Свежие цены и наличие каждый день' },
  { es: 'Consulta pollos y básicos antes de pedir.', en: 'Check chicken and essentials before ordering.', pt: 'Consulte frangos e básicos antes de pedir.', fr: 'Vérifiez poulet et essentiels avant de commander.', de: 'Prüfe Hähnchen und Basics vor der Bestellung.', it: 'Controlla pollo e prodotti base prima di ordinare.', zh: '下单前查看鸡肉和基本商品。', ja: '注文前にチキンと日用品を確認できます。', nl: 'Bekijk kip en basisproducten voor je bestelt.', ru: 'Проверьте курицу и основные товары перед заказом.' },
  { es: 'Los más pedidos', en: 'Most ordered', pt: 'Mais pedidos', fr: 'Les plus commandés', de: 'Meistbestellt', it: 'I più ordinati', zh: '最常购买', ja: '人気商品', nl: 'Meest besteld', ru: 'Чаще всего заказывают' },
  { es: 'Confianza Pollazo', en: 'Pollazo trust', pt: 'Confiança Pollazo', fr: 'Confiance Pollazo', de: 'Pollazo Vertrauen', it: 'Fiducia Pollazo', zh: 'Pollazo 信任', ja: 'Pollazo の安心', nl: 'Pollazo vertrouwen', ru: 'Доверие Pollazo' },
  { es: 'Comprar aquí es fácil', en: 'Shopping here is easy', pt: 'Comprar aqui é fácil', fr: 'Acheter ici est facile', de: 'Hier einkaufen ist einfach', it: 'Comprare qui è facile', zh: '在这里购物很简单', ja: 'ここでの購入は簡単です', nl: 'Hier kopen is makkelijk', ru: 'Покупать здесь легко' },
  { es: 'Fresco diario', en: 'Fresh daily', pt: 'Fresco todo dia', fr: 'Frais chaque jour', de: 'Täglich frisch', it: 'Fresco ogni giorno', zh: '每日新鲜', ja: '毎日新鮮', nl: 'Dagelijks vers', ru: 'Свежо каждый день' },
  { es: 'Pollo y básicos para tu casa.', en: 'Chicken and essentials for home.', pt: 'Frango e básicos para sua casa.', fr: 'Poulet et essentiels pour la maison.', de: 'Hähnchen und Basics für Zuhause.', it: 'Pollo e prodotti base per casa.', zh: '鸡肉和家庭必需品。', ja: 'チキンと家庭用品。', nl: 'Kip en essentials voor thuis.', ru: 'Курица и товары для дома.' },
  { es: 'Delivery', en: 'Delivery', pt: 'Entrega', fr: 'Livraison', de: 'Lieferung', it: 'Consegna', zh: '配送', ja: '配送', nl: 'Bezorging', ru: 'Доставка' },
  { es: 'Entrega en Puerto Ayora.', en: 'Delivery in Puerto Ayora.', pt: 'Entrega em Puerto Ayora.', fr: 'Livraison à Puerto Ayora.', de: 'Lieferung in Puerto Ayora.', it: 'Consegna a Puerto Ayora.', zh: 'Puerto Ayora 配送。', ja: 'Puerto Ayora 内で配送。', nl: 'Bezorging in Puerto Ayora.', ru: 'Доставка в Puerto Ayora.' },
  { es: 'Atención fácil', en: 'Easy support', pt: 'Atendimento fácil', fr: 'Aide facile', de: 'Einfache Hilfe', it: 'Assistenza facile', zh: '便捷客服', ja: 'かんたんサポート', nl: 'Makkelijke hulp', ru: 'Простая поддержка' },
  { es: 'Te ayudamos por WhatsApp.', en: 'We help you by WhatsApp.', pt: 'Ajudamos pelo WhatsApp.', fr: 'Nous vous aidons par WhatsApp.', de: 'Wir helfen per WhatsApp.', it: 'Ti aiutiamo su WhatsApp.', zh: '通过 WhatsApp 帮助你。', ja: 'WhatsAppでサポートします。', nl: 'We helpen via WhatsApp.', ru: 'Поможем через WhatsApp.' },
  { es: 'Garantía', en: 'Guarantee', pt: 'Garantia', fr: 'Garantie', de: 'Garantie', it: 'Garanzia', zh: '保障', ja: '保証', nl: 'Garantie', ru: 'Гарантия' },
  { es: 'Rastrear', en: 'Track', pt: 'Rastrear', fr: 'Suivre', de: 'Verfolgen', it: 'Traccia', zh: '追踪', ja: '追跡', nl: 'Volgen', ru: 'Отследить' },
  { es: 'Abrir rastreo de pedido', en: 'Open order tracking', pt: 'Abrir rastreamento do pedido', fr: 'Ouvrir le suivi de commande', de: 'Bestellverfolgung öffnen', it: 'Apri tracciamento ordine', zh: '打开订单追踪', ja: '注文追跡を開く', nl: 'Bestelling volgen openen', ru: 'Открыть отслеживание заказа' },
];

let installed = false;
let currentLanguage: LanguageCode = 'es';
let raf = 0;

function getStoredLanguage(): LanguageCode {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    return value && SUPPORTED.includes(value) ? value : 'es';
  } catch {
    return 'es';
  }
}

function buildLookup(language: LanguageCode) {
  const lookup = new Map<string, string>();

  HOME_TEXTS.forEach(entry => {
    const target = pick(entry, language);
    Object.values(entry).forEach(value => {
      if (value && value !== target) lookup.set(value, target);
    });
  });

  return lookup;
}

function shouldSkip(node: Node) {
  const parent = node.parentElement;
  if (!parent) return true;
  const tag = parent.tagName.toLowerCase();
  return ['script', 'style', 'noscript', 'textarea', 'svg', 'path'].includes(tag);
}

function applyVisualTranslations() {
  if (typeof document === 'undefined') return;

  currentLanguage = getStoredLanguage();
  const lookup = buildLookup(currentLanguage);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!shouldSkip(node)) nodes.push(node);
  }

  nodes.forEach(node => {
    const current = node.nodeValue || '';
    const trimmed = current.trim();
    if (!trimmed) return;

    const translated = lookup.get(trimmed);
    if (!translated || translated === trimmed) return;

    const leading = current.match(/^\s*/)?.[0] || '';
    const trailing = current.match(/\s*$/)?.[0] || '';
    node.nodeValue = `${leading}${translated}${trailing}`;
  });

  document.querySelectorAll<HTMLElement>('[aria-label], [title]').forEach(element => {
    (['aria-label', 'title'] as const).forEach(attribute => {
      const current = element.getAttribute(attribute) || '';
      const translated = lookup.get(current.trim());
      if (translated && translated !== current) element.setAttribute(attribute, translated);
    });
  });
}

function scheduleApply() {
  if (typeof window === 'undefined') return;
  window.cancelAnimationFrame(raf);
  raf = window.requestAnimationFrame(applyVisualTranslations);
}

export function installHomeVisualTranslator() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  currentLanguage = getStoredLanguage();

  scheduleApply();

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['aria-label', 'title'],
  });

  window.addEventListener('focus', scheduleApply);
  window.addEventListener('storage', scheduleApply);
  window.setInterval(() => {
    const nextLanguage = getStoredLanguage();
    if (nextLanguage !== currentLanguage) scheduleApply();
  }, 600);
}
