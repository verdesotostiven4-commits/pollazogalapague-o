import type { Category, LanguageCode, Product } from '../types';

type ProductText = {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  badge: string;
  unit: string;
  searchText: string;
};

type UiParams = Record<string, string | number>;

const normalize = (text?: string | null) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const applyParams = (text: string, params?: UiParams) => {
  if (!params) return text;

  return Object.entries(params).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    text
  );
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const translateByPhrase = (text: string, lang: LanguageCode) => {
  if (lang === 'es' || !text) return text;

  const dictionary = PHRASE_TRANSLATIONS[lang] || PHRASE_TRANSLATIONS.en;
  const entries = Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length);

  return entries.reduce((current, [spanish, translated]) => {
    return current.replace(new RegExp(escapeRegExp(spanish), 'gi'), translated);
  }, text);
};

const CATEGORY_TRANSLATIONS: Record<string, Partial<Record<LanguageCode, string>>> = {
  Todos: {
    en: 'All', pt: 'Todos', fr: 'Tous', de: 'Alle', it: 'Tutti', zh: '全部', ja: 'すべて', nl: 'Alles', ru: 'Все',
  },
  Pollos: {
    en: 'Chicken', pt: 'Frango', fr: 'Poulet', de: 'Hähnchen', it: 'Pollo', zh: '鸡肉', ja: '鶏肉', nl: 'Kip', ru: 'Курица',
  },
  Embutidos: {
    en: 'Sausages', pt: 'Embutidos', fr: 'Charcuterie', de: 'Wurstwaren', it: 'Salumi', zh: '香肠熟食', ja: 'ソーセージ類', nl: 'Vleeswaren', ru: 'Колбасы',
  },
  'Lácteos y refrigerados': {
    en: 'Dairy', pt: 'Laticínios', fr: 'Produits laitiers', de: 'Milchprodukte', it: 'Latticini', zh: '乳制品', ja: '乳製品', nl: 'Zuivel', ru: 'Молочные продукты',
  },
  'Abarrotes y básicos': {
    en: 'Groceries', pt: 'Mercearia', fr: 'Épicerie', de: 'Lebensmittel', it: 'Alimentari', zh: '杂货', ja: '食料品', nl: 'Kruidenierswaren', ru: 'Бакалея',
  },
  'Salsas, aliños y aceites': {
    en: 'Sauces & oils', pt: 'Molhos e óleos', fr: 'Sauces et huiles', de: 'Saucen und Öle', it: 'Salse e oli', zh: '酱料和油', ja: 'ソースと油', nl: 'Sauzen en olie', ru: 'Соусы и масла',
  },
  Bebidas: {
    en: 'Drinks', pt: 'Bebidas', fr: 'Boissons', de: 'Getränke', it: 'Bevande', zh: '饮料', ja: '飲み物', nl: 'Dranken', ru: 'Напитки',
  },
  'Frutas y verduras': {
    en: 'Fruit & vegetables', pt: 'Frutas e verduras', fr: 'Fruits et légumes', de: 'Obst und Gemüse', it: 'Frutta e verdura', zh: '水果蔬菜', ja: '果物と野菜', nl: 'Groente en fruit', ru: 'Фрукты и овощи',
  },
  'Snacks y dulces': {
    en: 'Snacks & sweets', pt: 'Snacks e doces', fr: 'Snacks et sucreries', de: 'Snacks und Süßes', it: 'Snack e dolci', zh: '零食甜点', ja: 'スナックと菓子', nl: 'Snacks en snoep', ru: 'Снэки и сладости',
  },
  'Cuidado personal': {
    en: 'Personal care', pt: 'Cuidados pessoais', fr: 'Soins personnels', de: 'Körperpflege', it: 'Cura personale', zh: '个人护理', ja: 'パーソナルケア', nl: 'Persoonlijke verzorging', ru: 'Личная гигиена',
  },
  'Limpieza y hogar': {
    en: 'Home cleaning', pt: 'Limpeza', fr: 'Nettoyage', de: 'Haushalt', it: 'Pulizia casa', zh: '家居清洁', ja: '家庭用清掃', nl: 'Schoonmaak', ru: 'Уборка дома',
  },
};

const SUBCATEGORY_TRANSLATIONS: Record<string, Partial<Record<LanguageCode, string>>> = {
  'Pollo Entero': { en: 'Whole chicken', pt: 'Frango inteiro', fr: 'Poulet entier', de: 'Ganzes Hähnchen', it: 'Pollo intero', zh: '整鸡', ja: '丸鶏', nl: 'Hele kip', ru: 'Целая курица' },
  Menudencia: { en: 'Giblets', pt: 'Miúdos', fr: 'Abats', de: 'Innereien', it: 'Frattaglie', zh: '鸡杂', ja: '内臓', nl: 'Orgaanvlees', ru: 'Потроха' },
  'Presas Especiales': { en: 'Chicken cuts', pt: 'Cortes de frango', fr: 'Morceaux de poulet', de: 'Hähnchenteile', it: 'Tagli di pollo', zh: '鸡肉部位', ja: '鶏肉カット', nl: 'Kipdelen', ru: 'Куски курицы' },
  Leches: { en: 'Milk', pt: 'Leites', fr: 'Laits', de: 'Milch', it: 'Latte', zh: '牛奶', ja: '牛乳', nl: 'Melk', ru: 'Молоко' },
  Yogures: { en: 'Yogurts', pt: 'Iogurtes', fr: 'Yaourts', de: 'Joghurts', it: 'Yogurt', zh: '酸奶', ja: 'ヨーグルト', nl: 'Yoghurt', ru: 'Йогурты' },
  'Bebidas Lácteas': { en: 'Dairy drinks', pt: 'Bebidas lácteas', fr: 'Boissons lactées', de: 'Milchgetränke', it: 'Bevande al latte', zh: '乳饮料', ja: '乳飲料', nl: 'Zuiveldranken', ru: 'Молочные напитки' },
  Quesos: { en: 'Cheese', pt: 'Queijos', fr: 'Fromages', de: 'Käse', it: 'Formaggi', zh: '奶酪', ja: 'チーズ', nl: 'Kaas', ru: 'Сыр' },
  Mantequillas: { en: 'Butter', pt: 'Manteigas', fr: 'Beurres', de: 'Butter', it: 'Burro', zh: '黄油', ja: 'バター', nl: 'Boter', ru: 'Масло' },
  Refrigerados: { en: 'Chilled items', pt: 'Refrigerados', fr: 'Réfrigérés', de: 'Gekühlt', it: 'Refrigerati', zh: '冷藏食品', ja: '冷蔵品', nl: 'Gekoeld', ru: 'Охлажденные' },
  Arroz: { en: 'Rice', pt: 'Arroz', fr: 'Riz', de: 'Reis', it: 'Riso', zh: '大米', ja: '米', nl: 'Rijst', ru: 'Рис' },
  'Pastas y Sopas': { en: 'Pasta & soups', pt: 'Massas e sopas', fr: 'Pâtes et soupes', de: 'Nudeln und Suppen', it: 'Pasta e zuppe', zh: '面食和汤', ja: 'パスタとスープ', nl: 'Pasta en soepen', ru: 'Паста и супы' },
  'Enlatados del Mar': { en: 'Canned seafood', pt: 'Enlatados do mar', fr: 'Conserves de mer', de: 'Fischkonserven', it: 'Conserve di mare', zh: '海鲜罐头', ja: '魚介缶詰', nl: 'Visconserven', ru: 'Морские консервы' },
  Harinas: { en: 'Flours', pt: 'Farinhas', fr: 'Farines', de: 'Mehl', it: 'Farine', zh: '面粉', ja: '粉類', nl: 'Meel', ru: 'Мука' },
  'Granos y Menestras': { en: 'Grains & legumes', pt: 'Grãos e leguminosas', fr: 'Graines et légumineuses', de: 'Getreide und Hülsenfrüchte', it: 'Cereali e legumi', zh: '谷物和豆类', ja: '穀物と豆類', nl: 'Granen en peulvruchten', ru: 'Крупы и бобовые' },
  Endulzantes: { en: 'Sweeteners', pt: 'Adoçantes', fr: 'Édulcorants', de: 'Süßungsmittel', it: 'Dolcificanti', zh: '甜味剂', ja: '甘味料', nl: 'Zoetstoffen', ru: 'Подсластители' },
  'Básicos de Despensa': { en: 'Pantry basics', pt: 'Básicos de despensa', fr: 'Bases du garde-manger', de: 'Vorratskammer', it: 'Dispensa base', zh: '厨房基础食品', ja: '常備食品', nl: 'Voorraadkast', ru: 'Базовые продукты' },
  Aceites: { en: 'Oils', pt: 'Óleos', fr: 'Huiles', de: 'Öle', it: 'Oli', zh: '食用油', ja: '油', nl: 'Oliën', ru: 'Масла' },
  'Salsas y Aderezos': { en: 'Sauces & dressings', pt: 'Molhos', fr: 'Sauces', de: 'Saucen', it: 'Salse', zh: '酱料', ja: 'ソース', nl: 'Sauzen', ru: 'Соусы' },
  Sazonadores: { en: 'Seasonings', pt: 'Temperos', fr: 'Assaisonnements', de: 'Gewürze', it: 'Condimenti', zh: '调味料', ja: '調味料', nl: 'Kruiden', ru: 'Приправы' },
  'Aguas Minerales': { en: 'Water', pt: 'Águas', fr: 'Eaux', de: 'Wasser', it: 'Acque', zh: '饮用水', ja: '水', nl: 'Water', ru: 'Вода' },
  Gaseosas: { en: 'Sodas', pt: 'Refrigerantes', fr: 'Sodas', de: 'Softdrinks', it: 'Bibite', zh: '汽水', ja: '炭酸飲料', nl: 'Frisdrank', ru: 'Газировка' },
  'Jugos y Refrescos': { en: 'Juices & refreshments', pt: 'Sucos e refrescos', fr: 'Jus et boissons', de: 'Säfte', it: 'Succhi', zh: '果汁和饮品', ja: 'ジュース', nl: 'Sappen', ru: 'Соки' },
  General: { en: 'General', pt: 'Geral', fr: 'Général', de: 'Allgemein', it: 'Generale', zh: '通用', ja: '一般', nl: 'Algemeen', ru: 'Общее' },
};

const PHRASE_TRANSLATIONS: Record<Exclude<LanguageCode, 'es'>, Record<string, string>> = {
  en: {
    'pollo entero': 'whole chicken', 'alas de pollo': 'chicken wings', 'cuartos de pollo': 'chicken quarters', pechuga: 'chicken breast', menudencia: 'giblets', pollo: 'chicken',
    'chorizo parrillero': 'grill chorizo', tocino: 'bacon', salchichas: 'sausages', 'perros calientes': 'hot dogs',
    leche: 'milk', queso: 'cheese', yogurt: 'yogurt', mora: 'blackberry', durazno: 'peach', frutilla: 'strawberry', coco: 'coconut', canela: 'cinnamon', naranjilla: 'naranjilla', avena: 'oat drink', crema: 'cream', mantequilla: 'butter', condensada: 'condensed',
    azúcar: 'sugar', azucar: 'sugar', blanca: 'white', arroz: 'rice', lenteja: 'lentils', garbanzo: 'chickpeas', huevos: 'eggs', huevo: 'egg', harina: 'flour', atún: 'tuna', atun: 'tuna', sardina: 'sardines', polvo: 'powder', café: 'coffee', cafe: 'coffee',
    fresco: 'fresh', fresca: 'fresh', frescos: 'fresh', sabor: 'flavor', por: 'by', libra: 'pound', cubeta: 'tray', dólar: 'dollar', dolar: 'dollar', presentación: 'pack', individual: 'single', litro: 'liter', litros: 'liters',
  },
  pt: { pollo: 'frango', pechuga: 'peito', alas: 'asas', cuartos: 'quartos', leche: 'leite', queso: 'queijo', yogurt: 'iogurte', arroz: 'arroz', huevos: 'ovos', azúcar: 'açúcar', atún: 'atum', sardina: 'sardinha', fresco: 'fresco', fresca: 'fresca' },
  fr: { pollo: 'poulet', pechuga: 'blanc de poulet', alas: 'ailes', cuartos: 'morceaux', leche: 'lait', queso: 'fromage', yogurt: 'yaourt', arroz: 'riz', huevos: 'œufs', azúcar: 'sucre', atún: 'thon', sardina: 'sardines', fresco: 'frais', fresca: 'fraîche' },
  de: { pollo: 'Hähnchen', pechuga: 'Hähnchenbrust', alas: 'Flügel', cuartos: 'Hähnchenteile', leche: 'Milch', queso: 'Käse', yogurt: 'Joghurt', arroz: 'Reis', huevos: 'Eier', azúcar: 'Zucker', atún: 'Thunfisch', sardina: 'Sardinen', fresco: 'frisch', fresca: 'frisch' },
  it: { pollo: 'pollo', pechuga: 'petto di pollo', alas: 'ali', cuartos: 'quarti', leche: 'latte', queso: 'formaggio', yogurt: 'yogurt', arroz: 'riso', huevos: 'uova', azúcar: 'zucchero', atún: 'tonno', sardina: 'sardine', fresco: 'fresco', fresca: 'fresca' },
  zh: { 'pollo entero': '整鸡', 'alas de pollo': '鸡翅', 'cuartos de pollo': '鸡腿块', pechuga: '鸡胸肉', menudencia: '鸡杂', pollo: '鸡肉', chorizo: '香肠', tocino: '培根', salchichas: '热狗香肠', leche: '牛奶', queso: '奶酪', yogurt: '酸奶', mora: '黑莓', durazno: '桃子', frutilla: '草莓', coco: '椰子', canela: '肉桂', avena: '燕麦饮品', crema: '奶油', mantequilla: '黄油', condensada: '炼乳', azúcar: '糖', azucar: '糖', arroz: '大米', lenteja: '扁豆', garbanzo: '鹰嘴豆', huevos: '鸡蛋', harina: '面粉', atún: '金枪鱼', atun: '金枪鱼', sardina: '沙丁鱼', fresco: '新鲜', fresca: '新鲜', sabor: '口味' },
  ja: { pollo: '鶏肉', pechuga: '鶏むね肉', alas: '手羽', cuartos: '鶏肉カット', leche: '牛乳', queso: 'チーズ', yogurt: 'ヨーグルト', arroz: '米', huevos: '卵', azúcar: '砂糖', atún: 'ツナ', sardina: 'イワシ', fresco: '新鮮' },
  nl: { pollo: 'kip', pechuga: 'kipfilet', alas: 'vleugels', cuartos: 'kipdelen', leche: 'melk', queso: 'kaas', yogurt: 'yoghurt', arroz: 'rijst', huevos: 'eieren', azúcar: 'suiker', atún: 'tonijn', sardina: 'sardines', fresco: 'vers' },
  ru: { pollo: 'курица', pechuga: 'куриная грудка', alas: 'крылья', cuartos: 'части курицы', leche: 'молоко', queso: 'сыр', yogurt: 'йогурт', arroz: 'рис', huevos: 'яйца', azúcar: 'сахар', atún: 'тунец', sardina: 'сардины', fresco: 'свежий' },
};

const UI: Record<string, Partial<Record<LanguageCode, string>>> = {
  'catalog.searchPlaceholder': { es: '¿Qué buscas hoy?', en: 'What are you looking for?', zh: '今天想找什么？', pt: 'O que você procura?', fr: 'Que cherchez-vous ?', de: 'Was suchst du?', it: 'Cosa cerchi?', ja: '何をお探しですか？', nl: 'Wat zoek je?', ru: 'Что ищете?' },
  'catalog.sortAria': { es: 'Ordenar catálogo', en: 'Sort catalog', zh: '排序目录' },
  'catalog.sortTitle': { es: 'Ordenar productos', en: 'Sort products', zh: '商品排序' },
  'catalog.currentSort': { es: 'Actual: {sort}', en: 'Current: {sort}', zh: '当前：{sort}' },
  'catalog.resultsTitle': { es: 'Resultados globales', en: 'Global results', zh: '全部结果' },
  'catalog.noResults': { es: 'No encontramos “{query}”', en: 'We could not find “{query}”', zh: '没有找到“{query}”' },
  'catalog.tryAnother': { es: 'Intenta buscar con otra palabra.', en: 'Try searching with another word.', zh: '请换个关键词搜索。' },
  'catalog.all': { es: 'Todos', en: 'All', zh: '全部', pt: 'Todos', fr: 'Tous', de: 'Alle', it: 'Tutti', ja: 'すべて', nl: 'Alles', ru: 'Все' },
  'catalog.items': { es: '{count} ítems', en: '{count} items', zh: '{count} 个商品' },
  'catalog.emptyTitle': { es: 'Sin productos aquí', en: 'No products here', zh: '这里没有商品' },
  'catalog.emptyText': { es: 'Prueba otra subcategoría o vuelve a “Todos”.', en: 'Try another subcategory or go back to “All”.', zh: '试试其他分类或返回“全部”。' },
  'catalog.subtotalPartial': { es: 'Subtotal parcial', en: 'Partial subtotal', zh: '部分小计' },
  'catalog.subtotalChosen': { es: 'Subtotal elegido', en: 'Chosen subtotal', zh: '已选小计' },
  'catalog.orderTotal': { es: 'Total del pedido', en: 'Order total', zh: '订单总额' },
  'catalog.viewBasket': { es: 'Ver canasta', en: 'View basket', zh: '查看购物篮' },
  'sort.sugeridos.label': { es: 'Sugeridos', en: 'Suggested', zh: '推荐' },
  'sort.sugeridos.description': { es: 'Orden recomendado', en: 'Recommended order', zh: '推荐排序' },
  'sort.mas-pedidos.label': { es: 'Más pedidos', en: 'Most ordered', zh: '热销' },
  'sort.mas-pedidos.description': { es: 'Productos populares', en: 'Popular products', zh: '热门商品' },
  'sort.precio-bajo.label': { es: 'Menor precio', en: 'Lowest price', zh: '价格最低' },
  'sort.precio-bajo.description': { es: 'De barato a caro', en: 'Low to high', zh: '从低到高' },
  'sort.precio-alto.label': { es: 'Mayor precio', en: 'Highest price', zh: '价格最高' },
  'sort.precio-alto.description': { es: 'De caro a barato', en: 'High to low', zh: '从高到低' },
  'sort.disponibles.label': { es: 'Disponibles', en: 'Available', zh: '有货' },
  'sort.disponibles.description': { es: 'Agotados al final', en: 'Sold out at the end', zh: '缺货排最后' },
  'product.soldOut': { es: 'Agotado', en: 'Sold out', zh: '售罄', pt: 'Esgotado', fr: 'Épuisé', de: 'Ausverkauft', it: 'Esaurito', ja: '売り切れ', nl: 'Uitverkocht', ru: 'Нет в наличии' },
  'product.noStock': { es: 'Sin stock', en: 'No stock', zh: '无库存' },
  'product.byValue': { es: 'Por valor', en: 'By amount', zh: '按金额' },
  'product.consult': { es: 'A consultar', en: 'Ask price', zh: '咨询价格' },
  'product.consultShort': { es: 'Consultar', en: 'Ask', zh: '咨询' },
  'product.defaultDescription': { es: 'Producto disponible para agregar al carrito.', en: 'Product available to add to cart.', zh: '可加入购物车的商品。' },
  'product.chooseValue': { es: 'Elige el valor', en: 'Choose amount', zh: '选择金额' },
  'product.minimum': { es: 'Mínimo {min}', en: 'Minimum {min}', zh: '最低 {min}' },
  'product.added': { es: 'Agregado', en: 'Added', zh: '已添加' },
  'product.choose': { es: 'Elegir', en: 'Choose', zh: '选择' },
  'product.add': { es: 'Agregar', en: 'Add', zh: '添加' },
  'product.variableKicker': { es: 'Compra por valor', en: 'Buy by amount', zh: '按金额购买' },
  'product.variableTitle': { es: '¿De cuánto quieres comprar?', en: 'How much do you want to buy?', zh: '你想买多少钱？' },
  'product.range': { es: 'Mínimo {min} · Máximo {max}', en: 'Min {min} · Max {max}', zh: '最低 {min} · 最高 {max}' },
  'product.rangeError': { es: 'El valor permitido para este producto es entre {min} y {max}.', en: 'The allowed amount for this product is between {min} and {max}.', zh: '该商品允许金额为 {min} 到 {max}。' },
  'product.addToCart': { es: 'Agregar al carrito 🚀', en: 'Add to cart 🚀', zh: '加入购物车 🚀' },
};

export function productUi(key: string, language: LanguageCode, params?: UiParams) {
  const text = UI[key]?.[language] || UI[key]?.es || UI[key]?.en || key;
  return applyParams(text, params);
}

export function translateCategoryLabel(category: Category | 'Todos' | string, language: LanguageCode) {
  return CATEGORY_TRANSLATIONS[category]?.[language] || category;
}

export function translateCategoryShort(category: Category | 'Todos' | string, language: LanguageCode) {
  const translated = translateCategoryLabel(category, language);
  if (language === 'es') return translated;
  if (translated.length <= 13) return translated;
  return translated.split(/\s|&/)[0] || translated;
}

export function translateSubcategoryLabel(subcategory: string | null | undefined, language: LanguageCode) {
  if (!subcategory) return '';
  return SUBCATEGORY_TRANSLATIONS[subcategory]?.[language] || translateByPhrase(subcategory, language);
}

export function getProductDisplay(product: Product, language: LanguageCode): ProductText {
  const translatedName = translateByPhrase(product.name, language);
  const category = translateCategoryLabel(product.category, language);
  const subcategory = translateSubcategoryLabel(product.subcategory || null, language);
  const description = product.description
    ? translateByPhrase(product.description, language)
    : productUi('product.defaultDescription', language);
  const badge = product.badge ? translateByPhrase(product.badge, language) : '';
  const unit = product.unit ? translateByPhrase(product.unit, language) : '';

  return {
    name: translatedName,
    description,
    category,
    subcategory,
    badge,
    unit,
    searchText: [
      product.name,
      translatedName,
      product.category,
      category,
      product.subcategory,
      subcategory,
      product.description,
      description,
      badge,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

export { normalize as normalizeProductText };
