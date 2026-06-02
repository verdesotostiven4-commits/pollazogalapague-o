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
type LangText = Partial<Record<LanguageCode, string>>;

const normalize = (text?: string | null) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const compactNormalize = (text?: string | null) =>
  normalize(text).replace(/[^a-z0-9]+/g, ' ').trim();

const applyParams = (text: string, params?: UiParams) => {
  if (!params) return text;

  return Object.entries(params).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    text
  );
};

const isCjkLanguage = (language: LanguageCode) => language === 'zh' || language === 'ja';

const pick = (entry: LangText | undefined, language: LanguageCode, fallback: string) => {
  return entry?.[language] || entry?.en || entry?.es || fallback;
};

const CATEGORY_TRANSLATIONS: Record<string, LangText> = {
  Todos: { es: 'Todos', en: 'All', pt: 'Todos', fr: 'Tous', de: 'Alle', it: 'Tutti', zh: '全部', ja: 'すべて', nl: 'Alles', ru: 'Все' },
  Pollos: { es: 'Pollos', en: 'Chicken', pt: 'Frango', fr: 'Poulet', de: 'Hähnchen', it: 'Pollo', zh: '鸡肉', ja: '鶏肉', nl: 'Kip', ru: 'Курица' },
  Embutidos: { es: 'Embutidos', en: 'Sausages', pt: 'Embutidos', fr: 'Charcuterie', de: 'Wurstwaren', it: 'Salumi', zh: '香肠熟食', ja: 'ソーセージ類', nl: 'Vleeswaren', ru: 'Колбасы' },
  'Lácteos y refrigerados': { es: 'Lácteos', en: 'Dairy', pt: 'Laticínios', fr: 'Produits laitiers', de: 'Milchprodukte', it: 'Latticini', zh: '乳制品', ja: '乳製品', nl: 'Zuivel', ru: 'Молочные продукты' },
  'Abarrotes y básicos': { es: 'Abarrotes', en: 'Groceries', pt: 'Mercearia', fr: 'Épicerie', de: 'Lebensmittel', it: 'Alimentari', zh: '杂货', ja: '食料品', nl: 'Kruidenierswaren', ru: 'Бакалея' },
  'Salsas, aliños y aceites': { es: 'Salsas', en: 'Sauces & oils', pt: 'Molhos e óleos', fr: 'Sauces et huiles', de: 'Saucen & Öle', it: 'Salse e oli', zh: '酱料和油', ja: 'ソースと油', nl: 'Sauzen en olie', ru: 'Соусы и масла' },
  Bebidas: { es: 'Bebidas', en: 'Drinks', pt: 'Bebidas', fr: 'Boissons', de: 'Getränke', it: 'Bevande', zh: '饮料', ja: '飲み物', nl: 'Dranken', ru: 'Напитки' },
  'Frutas y verduras': { es: 'Frutas', en: 'Fruit & vegetables', pt: 'Frutas e verduras', fr: 'Fruits et légumes', de: 'Obst & Gemüse', it: 'Frutta e verdura', zh: '水果蔬菜', ja: '果物と野菜', nl: 'Groente en fruit', ru: 'Фрукты и овощи' },
  'Snacks y dulces': { es: 'Snacks', en: 'Snacks & sweets', pt: 'Snacks e doces', fr: 'Snacks et sucreries', de: 'Snacks & Süßes', it: 'Snack e dolci', zh: '零食甜点', ja: 'スナックと菓子', nl: 'Snacks en snoep', ru: 'Снэки и сладости' },
  'Cuidado personal': { es: 'Personal', en: 'Personal care', pt: 'Cuidados pessoais', fr: 'Soins personnels', de: 'Körperpflege', it: 'Cura personale', zh: '个人护理', ja: 'パーソナルケア', nl: 'Persoonlijke verzorging', ru: 'Личная гигиена' },
  'Limpieza y hogar': { es: 'Limpieza', en: 'Home cleaning', pt: 'Limpeza', fr: 'Nettoyage', de: 'Haushalt', it: 'Pulizia casa', zh: '家居清洁', ja: '家庭用清掃', nl: 'Schoonmaak', ru: 'Уборка дома' },
};

const SUBCATEGORY_TRANSLATIONS: Record<string, LangText> = {
  'Pollo Entero': { es: 'Pollo Entero', en: 'Whole chicken', pt: 'Frango inteiro', fr: 'Poulet entier', de: 'Ganzes Hähnchen', it: 'Pollo intero', zh: '整鸡', ja: '丸鶏', nl: 'Hele kip', ru: 'Целая курица' },
  Menudencia: { es: 'Menudencia', en: 'Giblets', pt: 'Miúdos', fr: 'Abats', de: 'Innereien', it: 'Frattaglie', zh: '鸡杂', ja: '鶏もつ', nl: 'Orgaanvlees', ru: 'Потроха' },
  'Presas Especiales': { es: 'Presas Especiales', en: 'Chicken cuts', pt: 'Cortes de frango', fr: 'Morceaux de poulet', de: 'Hähnchenteile', it: 'Tagli di pollo', zh: '鸡肉部位', ja: '鶏肉カット', nl: 'Kipdelen', ru: 'Куски курицы' },
  Leches: { es: 'Leches', en: 'Milk', pt: 'Leites', fr: 'Laits', de: 'Milch', it: 'Latte', zh: '牛奶', ja: '牛乳', nl: 'Melk', ru: 'Молоко' },
  Yogures: { es: 'Yogures', en: 'Yogurts', pt: 'Iogurtes', fr: 'Yaourts', de: 'Joghurts', it: 'Yogurt', zh: '酸奶', ja: 'ヨーグルト', nl: 'Yoghurt', ru: 'Йогурты' },
  'Bebidas Lácteas': { es: 'Bebidas Lácteas', en: 'Dairy drinks', pt: 'Bebidas lácteas', fr: 'Boissons lactées', de: 'Milchgetränke', it: 'Bevande al latte', zh: '乳饮料', ja: '乳飲料', nl: 'Zuiveldranken', ru: 'Молочные напитки' },
  Quesos: { es: 'Quesos', en: 'Cheese', pt: 'Queijos', fr: 'Fromages', de: 'Käse', it: 'Formaggi', zh: '奶酪', ja: 'チーズ', nl: 'Kaas', ru: 'Сыр' },
  Mantequillas: { es: 'Mantequillas', en: 'Butter', pt: 'Manteigas', fr: 'Beurres', de: 'Butter', it: 'Burro', zh: '黄油', ja: 'バター', nl: 'Boter', ru: 'Масло' },
  Refrigerados: { es: 'Refrigerados', en: 'Chilled items', pt: 'Refrigerados', fr: 'Réfrigérés', de: 'Gekühlt', it: 'Refrigerati', zh: '冷藏食品', ja: '冷蔵品', nl: 'Gekoeld', ru: 'Охлажденные' },
  Arroz: { es: 'Arroz', en: 'Rice', pt: 'Arroz', fr: 'Riz', de: 'Reis', it: 'Riso', zh: '大米', ja: '米', nl: 'Rijst', ru: 'Рис' },
  'Pastas y Sopas': { es: 'Pastas y Sopas', en: 'Pasta & soups', pt: 'Massas e sopas', fr: 'Pâtes et soupes', de: 'Nudeln und Suppen', it: 'Pasta e zuppe', zh: '面食和汤', ja: 'パスタとスープ', nl: 'Pasta en soepen', ru: 'Паста и супы' },
  'Enlatados del Mar': { es: 'Enlatados del Mar', en: 'Canned seafood', pt: 'Enlatados do mar', fr: 'Conserves de mer', de: 'Fischkonserven', it: 'Conserve di mare', zh: '海鲜罐头', ja: '魚介缶詰', nl: 'Visconserven', ru: 'Морские консервы' },
  Harinas: { es: 'Harinas', en: 'Flours', pt: 'Farinhas', fr: 'Farines', de: 'Mehl', it: 'Farine', zh: '面粉', ja: '粉類', nl: 'Meel', ru: 'Мука' },
  'Granos y Menestras': { es: 'Granos y Menestras', en: 'Grains & legumes', pt: 'Grãos e leguminosas', fr: 'Graines et légumineuses', de: 'Getreide & Hülsenfrüchte', it: 'Cereali e legumi', zh: '谷物和豆类', ja: '穀物と豆類', nl: 'Granen en peulvruchten', ru: 'Крупы и бобовые' },
  Endulzantes: { es: 'Endulzantes', en: 'Sweeteners', pt: 'Adoçantes', fr: 'Édulcorants', de: 'Süßungsmittel', it: 'Dolcificanti', zh: '甜味剂', ja: '甘味料', nl: 'Zoetstoffen', ru: 'Подсластители' },
  'Básicos de Despensa': { es: 'Básicos de Despensa', en: 'Pantry basics', pt: 'Básicos de despensa', fr: 'Bases du garde-manger', de: 'Vorratskammer', it: 'Dispensa base', zh: '厨房基础食品', ja: '常備食品', nl: 'Voorraadkast', ru: 'Базовые продукты' },
  Aceites: { es: 'Aceites', en: 'Oils', pt: 'Óleos', fr: 'Huiles', de: 'Öle', it: 'Oli', zh: '食用油', ja: '油', nl: 'Oliën', ru: 'Масла' },
  Achiotes: { es: 'Achiotes', en: 'Annatto', pt: 'Urucum', fr: 'Roucou', de: 'Annatto', it: 'Annatto', zh: '胭脂树调料', ja: 'アチョーテ', nl: 'Annatto', ru: 'Аннато' },
  'Salsas y Aderezos': { es: 'Salsas y Aderezos', en: 'Sauces & dressings', pt: 'Molhos', fr: 'Sauces', de: 'Saucen', it: 'Salse', zh: '酱料', ja: 'ソース', nl: 'Sauzen', ru: 'Соусы' },
  Sazonadores: { es: 'Sazonadores', en: 'Seasonings', pt: 'Temperos', fr: 'Assaisonnements', de: 'Gewürze', it: 'Condimenti', zh: '调味料', ja: '調味料', nl: 'Kruiden', ru: 'Приправы' },
  'Vinagres y Esencias': { es: 'Vinagres y Esencias', en: 'Vinegars & essences', zh: '醋和调味精华', ja: '酢とエッセンス' },
  'Aguas Minerales': { es: 'Aguas Minerales', en: 'Water', pt: 'Águas', fr: 'Eaux', de: 'Wasser', it: 'Acque', zh: '饮用水', ja: '水', nl: 'Water', ru: 'Вода' },
  Licores: { es: 'Licores', en: 'Liquors', zh: '酒类', ja: '酒類' },
  'Energizantes e Hidratantes': { es: 'Energizantes', en: 'Energy & hydration', zh: '能量饮料', ja: 'エナジー飲料' },
  Gaseosas: { es: 'Gaseosas', en: 'Sodas', pt: 'Refrigerantes', fr: 'Sodas', de: 'Softdrinks', it: 'Bibite', zh: '汽水', ja: '炭酸飲料', nl: 'Frisdrank', ru: 'Газировка' },
  'Jugos y Refrescos': { es: 'Jugos y Refrescos', en: 'Juices & refreshments', pt: 'Sucos e refrescos', fr: 'Jus et boissons', de: 'Säfte', it: 'Succhi', zh: '果汁和饮品', ja: 'ジュース', nl: 'Sappen', ru: 'Соки' },
  'Frutas Frescas': { es: 'Frutas Frescas', en: 'Fresh fruit', zh: '新鲜水果', ja: '新鮮な果物' },
  'Vegetales y Hortalizas': { es: 'Vegetales', en: 'Vegetables', zh: '蔬菜', ja: '野菜' },
  'Hojas y Hierbas': { es: 'Hojas y Hierbas', en: 'Leaves & herbs', zh: '叶菜和香草', ja: '葉物とハーブ' },
  Galletas: { es: 'Galletas', en: 'Cookies', zh: '饼干', ja: 'クッキー' },
  'Snacks Salados': { es: 'Snacks Salados', en: 'Savory snacks', zh: '咸味零食', ja: '塩味スナック' },
  Chocolates: { es: 'Chocolates', en: 'Chocolates', zh: '巧克力', ja: 'チョコレート' },
  'Golosinas y Postres': { es: 'Golosinas y Postres', en: 'Sweets & desserts', zh: '糖果甜点', ja: '菓子とデザート' },
  'Cuidado Femenino': { es: 'Cuidado Femenino', en: 'Feminine care', zh: '女性护理', ja: '女性ケア' },
  'Cuidado Bucal': { es: 'Cuidado Bucal', en: 'Oral care', zh: '口腔护理', ja: 'オーラルケア' },
  'Cuidado Capilar': { es: 'Cuidado Capilar', en: 'Hair care', zh: '头发护理', ja: 'ヘアケア' },
  'Higiene Personal': { es: 'Higiene Personal', en: 'Personal hygiene', zh: '个人卫生', ja: '衛生用品' },
  'Cuidado de Ropa': { es: 'Cuidado de Ropa', en: 'Laundry care', zh: '衣物护理', ja: '洗濯用品' },
  'Limpieza de Superficies': { es: 'Limpieza de Superficies', en: 'Surface cleaning', zh: '表面清洁', ja: '表面清掃' },
  Papelería: { es: 'Papelería', en: 'Paper goods', zh: '纸制品', ja: '紙用品' },
  'Artículos del Hogar': { es: 'Artículos del Hogar', en: 'Home items', zh: '家居用品', ja: '家庭用品' },
  General: { es: 'General', en: 'General', pt: 'Geral', fr: 'Général', de: 'Allgemein', it: 'Generale', zh: '通用', ja: '一般', nl: 'Algemeen', ru: 'Общее' },
};

const UI: Record<string, LangText> = {
  'common.close': { es: 'Cerrar', en: 'Close', zh: '关闭', ja: '閉じる' },
  'catalog.searchPlaceholder': { es: '¿Qué buscas hoy?', en: 'What are you looking for?', zh: '今天想找什么？', ja: '何をお探しですか？', pt: 'O que você procura?', fr: 'Que cherchez-vous ?', de: 'Was suchst du?', it: 'Cosa cerchi?', nl: 'Wat zoek je?', ru: 'Что ищете?' },
  'catalog.sortAria': { es: 'Ordenar catálogo', en: 'Sort catalog', zh: '排序目录', ja: 'カタログを並べ替え' },
  'catalog.sortTitle': { es: 'Ordenar productos', en: 'Sort products', zh: '商品排序', ja: '商品を並べ替え' },
  'catalog.currentSort': { es: 'Actual: {sort}', en: 'Current: {sort}', zh: '当前：{sort}', ja: '現在：{sort}' },
  'catalog.resultsTitle': { es: 'Resultados globales', en: 'Global results', zh: '全部结果', ja: '検索結果' },
  'catalog.noResults': { es: 'No encontramos “{query}”', en: 'We could not find “{query}”', zh: '没有找到“{query}”', ja: '「{query}」は見つかりません' },
  'catalog.tryAnother': { es: 'Intenta buscar con otra palabra.', en: 'Try searching with another word.', zh: '请换个关键词搜索。', ja: '別の言葉で検索してください。' },
  'catalog.all': { es: 'Todos', en: 'All', zh: '全部', ja: 'すべて', pt: 'Todos', fr: 'Tous', de: 'Alle', it: 'Tutti', nl: 'Alles', ru: 'Все' },
  'catalog.items': { es: '{count} ítems', en: '{count} items', zh: '{count} 个商品', ja: '{count}点' },
  'catalog.emptyTitle': { es: 'Sin productos aquí', en: 'No products here', zh: '这里没有商品', ja: '商品がありません' },
  'catalog.emptyText': { es: 'Prueba otra subcategoría o vuelve a “Todos”.', en: 'Try another subcategory or go back to “All”.', zh: '试试其他分类或返回“全部”。', ja: '別の分類を選ぶか「すべて」に戻ってください。' },
  'catalog.subtotalPartial': { es: 'Subtotal parcial', en: 'Partial subtotal', zh: '部分小计', ja: '一部小計' },
  'catalog.subtotalChosen': { es: 'Subtotal elegido', en: 'Chosen subtotal', zh: '已选小计', ja: '選択した小計' },
  'catalog.orderTotal': { es: 'Total del pedido', en: 'Order total', zh: '订单总额', ja: '注文合計' },
  'catalog.viewBasket': { es: 'Ver canasta', en: 'View basket', zh: '查看购物篮', ja: 'カゴを見る' },
  'sort.sugeridos.label': { es: 'Sugeridos', en: 'Suggested', zh: '推荐', ja: 'おすすめ' },
  'sort.sugeridos.description': { es: 'Orden recomendado', en: 'Recommended order', zh: '推荐排序', ja: 'おすすめ順' },
  'sort.mas-pedidos.label': { es: 'Más pedidos', en: 'Most ordered', zh: '热销', ja: '人気順' },
  'sort.mas-pedidos.description': { es: 'Productos populares', en: 'Popular products', zh: '热门商品', ja: '人気商品' },
  'sort.precio-bajo.label': { es: 'Menor precio', en: 'Lowest price', zh: '价格最低', ja: '安い順' },
  'sort.precio-bajo.description': { es: 'De barato a caro', en: 'Low to high', zh: '从低到高', ja: '価格が低い順' },
  'sort.precio-alto.label': { es: 'Mayor precio', en: 'Highest price', zh: '价格最高', ja: '高い順' },
  'sort.precio-alto.description': { es: 'De caro a barato', en: 'High to low', zh: '从高到低', ja: '価格が高い順' },
  'sort.disponibles.label': { es: 'Disponibles', en: 'Available', zh: '有货', ja: '在庫あり' },
  'sort.disponibles.description': { es: 'Agotados al final', en: 'Sold out at the end', zh: '缺货排最后', ja: '売り切れは最後' },
  'product.soldOut': { es: 'Agotado', en: 'Sold out', zh: '售罄', ja: '売り切れ', pt: 'Esgotado', fr: 'Épuisé', de: 'Ausverkauft', it: 'Esaurito', nl: 'Uitverkocht', ru: 'Нет в наличии' },
  'product.noStock': { es: 'Sin stock', en: 'No stock', zh: '无库存', ja: '在庫なし' },
  'product.byValue': { es: 'Por valor', en: 'By amount', zh: '按金额', ja: '金額指定' },
  'product.consult': { es: 'A consultar', en: 'Ask price', zh: '咨询价格', ja: '価格確認' },
  'product.consultShort': { es: 'Consultar', en: 'Ask', zh: '咨询', ja: '確認' },
  'product.defaultDescription': { es: 'Producto disponible para agregar al carrito.', en: 'Product available to add to cart.', zh: '可加入购物车的商品。', ja: 'カートに追加できる商品です。' },
  'product.chooseValue': { es: 'Elige el valor', en: 'Choose amount', zh: '选择金额', ja: '金額を選択' },
  'product.minimum': { es: 'Mínimo {min}', en: 'Minimum {min}', zh: '最低 {min}', ja: '最低 {min}' },
  'product.added': { es: 'Agregado', en: 'Added', zh: '已添加', ja: '追加済み' },
  'product.choose': { es: 'Elegir', en: 'Choose', zh: '选择', ja: '選ぶ' },
  'product.add': { es: 'Agregar', en: 'Add', zh: '添加', ja: '追加' },
  'product.variableKicker': { es: 'Compra por valor', en: 'Buy by amount', zh: '按金额购买', ja: '金額指定購入' },
  'product.variableTitle': { es: '¿De cuánto quieres comprar?', en: 'How much do you want to buy?', zh: '你想买多少钱？', ja: 'いくら分買いますか？' },
  'product.range': { es: 'Mínimo {min} · Máximo {max}', en: 'Min {min} · Max {max}', zh: '最低 {min} · 最高 {max}', ja: '最低 {min} · 最高 {max}' },
  'product.rangeError': { es: 'El valor permitido para este producto es entre {min} y {max}.', en: 'The allowed amount for this product is between {min} and {max}.', zh: '该商品允许金额为 {min} 到 {max}。', ja: 'この商品の金額は {min} から {max} までです。' },
  'product.addToCart': { es: 'Agregar al carrito 🚀', en: 'Add to cart 🚀', zh: '加入购物车 🚀', ja: 'カートに追加 🚀' },
};

const PRODUCT_RULES: Array<{ test: (product: Product, text: string) => boolean; values: LangText }> = [
  { test: (p, text) => p.id.includes('pollo-entero') || text.includes('pollo entero'), values: { es: 'Pollo entero', en: 'Whole chicken', pt: 'Frango inteiro', fr: 'Poulet entier', de: 'Ganzes Hähnchen', it: 'Pollo intero', zh: '整鸡', ja: '丸鶏', nl: 'Hele kip', ru: 'Целая курица' } },
  { test: (p, text) => p.id.includes('pechuga') || text.includes('pechuga'), values: { es: 'Pechuga de pollo', en: 'Chicken breast', pt: 'Peito de frango', fr: 'Blanc de poulet', de: 'Hähnchenbrust', it: 'Petto di pollo', zh: '鸡胸肉', ja: '鶏むね肉', nl: 'Kipfilet', ru: 'Куриная грудка' } },
  { test: (p, text) => p.id.includes('alas') || text.includes('alas'), values: { es: 'Alas de pollo', en: 'Chicken wings', pt: 'Asas de frango', fr: 'Ailes de poulet', de: 'Hähnchenflügel', it: 'Ali di pollo', zh: '鸡翅', ja: '手羽先', nl: 'Kippenvleugels', ru: 'Куриные крылья' } },
  { test: (p, text) => p.id.includes('cuartos') || text.includes('cuartos'), values: { es: 'Cuartos de pollo', en: 'Chicken quarters', pt: 'Quartos de frango', fr: 'Quarts de poulet', de: 'Hähnchenviertel', it: 'Quarti di pollo', zh: '鸡腿块', ja: '鶏もも肉カット', nl: 'Kipkwarten', ru: 'Куриные четверти' } },
  { test: (p, text) => p.id.includes('menudencia') || text.includes('menudencia'), values: { es: 'Menudencia de pollo', en: 'Chicken giblets', pt: 'Miúdos de frango', fr: 'Abats de poulet', de: 'Hähncheninnereien', it: 'Frattaglie di pollo', zh: '鸡杂', ja: '鶏もつ', nl: 'Kippenorganen', ru: 'Куриные потроха' } },
  { test: (_p, text) => text.includes('chorizo parrillero'), values: { es: 'Chorizo parrillero 1 kg', en: 'Grill chorizo 1 kg', pt: 'Chouriço para grelha 1 kg', fr: 'Chorizo à griller 1 kg', de: 'Grill-Chorizo 1 kg', it: 'Chorizo da griglia 1 kg', zh: '烤香肠 1 kg', ja: 'グリル用チョリソー 1 kg', nl: 'Grillchorizo 1 kg', ru: 'Чоризо для гриля 1 кг' } },
  { test: (_p, text) => text.includes('tocino'), values: { es: 'Tocino', en: 'Bacon', pt: 'Bacon', fr: 'Bacon', de: 'Speck', it: 'Pancetta', zh: '培根', ja: 'ベーコン', nl: 'Bacon', ru: 'Бекон' } },
  { test: (_p, text) => text.includes('salchicha'), values: { es: 'Salchichas', en: 'Sausages', pt: 'Salsichas', fr: 'Saucisses', de: 'Würstchen', it: 'Würstel', zh: '香肠', ja: 'ソーセージ', nl: 'Worstjes', ru: 'Сосиски' } },
  { test: (_p, text) => text.includes('agua vivant'), values: { es: 'Agua Vivant', en: 'Vivant water', pt: 'Água Vivant', fr: 'Eau Vivant', de: 'Vivant Wasser', it: 'Acqua Vivant', zh: 'Vivant 饮用水', ja: 'Vivant ウォーター', nl: 'Vivant water', ru: 'Вода Vivant' } },
  { test: (_p, text) => text.includes('agua dasani'), values: { es: 'Agua Dasani', en: 'Dasani water', pt: 'Água Dasani', fr: 'Eau Dasani', de: 'Dasani Wasser', it: 'Acqua Dasani', zh: 'Dasani 饮用水', ja: 'Dasani ウォーター', nl: 'Dasani water', ru: 'Вода Dasani' } },
  { test: (_p, text) => text.includes('leche'), values: { es: 'Leche', en: 'Milk', pt: 'Leite', fr: 'Lait', de: 'Milch', it: 'Latte', zh: '牛奶', ja: '牛乳', nl: 'Melk', ru: 'Молоко' } },
  { test: (_p, text) => text.includes('queso fresco'), values: { es: 'Queso fresco', en: 'Fresh cheese', pt: 'Queijo fresco', fr: 'Fromage frais', de: 'Frischkäse', it: 'Formaggio fresco', zh: '新鲜奶酪', ja: 'フレッシュチーズ', nl: 'Verse kaas', ru: 'Свежий сыр' } },
  { test: (_p, text) => text.includes('yogurt') || text.includes('yogur'), values: { es: 'Yogurt', en: 'Yogurt', pt: 'Iogurte', fr: 'Yaourt', de: 'Joghurt', it: 'Yogurt', zh: '酸奶', ja: 'ヨーグルト', nl: 'Yoghurt', ru: 'Йогурт' } },
  { test: (_p, text) => text.includes('mantequilla'), values: { es: 'Mantequilla', en: 'Butter', pt: 'Manteiga', fr: 'Beurre', de: 'Butter', it: 'Burro', zh: '黄油', ja: 'バター', nl: 'Boter', ru: 'Масло' } },
  { test: (_p, text) => text.includes('arroz'), values: { es: 'Arroz', en: 'Rice', pt: 'Arroz', fr: 'Riz', de: 'Reis', it: 'Riso', zh: '大米', ja: '米', nl: 'Rijst', ru: 'Рис' } },
  { test: (_p, text) => text.includes('atun') || text.includes('atún'), values: { es: 'Atún', en: 'Tuna', pt: 'Atum', fr: 'Thon', de: 'Thunfisch', it: 'Tonno', zh: '金枪鱼', ja: 'ツナ', nl: 'Tonijn', ru: 'Тунец' } },
  { test: (_p, text) => text.includes('sardina'), values: { es: 'Sardina', en: 'Sardines', pt: 'Sardinha', fr: 'Sardines', de: 'Sardinen', it: 'Sardine', zh: '沙丁鱼', ja: 'イワシ', nl: 'Sardines', ru: 'Сардины' } },
  { test: (_p, text) => text.includes('azucar') || text.includes('azúcar'), values: { es: 'Azúcar', en: 'Sugar', pt: 'Açúcar', fr: 'Sucre', de: 'Zucker', it: 'Zucchero', zh: '糖', ja: '砂糖', nl: 'Suiker', ru: 'Сахар' } },
  { test: (_p, text) => text.includes('huevo'), values: { es: 'Huevos', en: 'Eggs', pt: 'Ovos', fr: 'Œufs', de: 'Eier', it: 'Uova', zh: '鸡蛋', ja: '卵', nl: 'Eieren', ru: 'Яйца' } },
  { test: (_p, text) => text.includes('harina'), values: { es: 'Harina', en: 'Flour', pt: 'Farinha', fr: 'Farine', de: 'Mehl', it: 'Farina', zh: '面粉', ja: '小麦粉', nl: 'Meel', ru: 'Мука' } },
  { test: (_p, text) => text.includes('colgate') || text.includes('pasta dental'), values: { es: 'Pasta dental', en: 'Toothpaste', pt: 'Pasta de dente', fr: 'Dentifrice', de: 'Zahnpasta', it: 'Dentifricio', zh: '牙膏', ja: '歯みがき粉', nl: 'Tandpasta', ru: 'Зубная паста' } },
];

const BRAND_WORDS = [
  'vivant', 'dasani', 'tru', 'girasol', 'colgate', 'plumrose', 'galamix', 'oreo', 'nutella', 'coca cola', 'sprite', 'fanta', 'inca kola', 'maggi', 'deja', 'suavitel', 'clorox', 'fabuloso',
];

const preservePackText = (original: string) => {
  const matches = original.match(/\b\d+(?:[.,]\d+)?\s?(?:kg|g|gr|ml|l|lt|litros?|unidades?)\b/gi);
  return matches ? ` ${matches.join(' ')}` : '';
};

const preserveBrandText = (original: string) => {
  const lower = normalize(original);
  const found = BRAND_WORDS.find(brand => lower.includes(brand));
  if (!found) return '';

  const words = original.split(/\s+/);
  const brandParts = found.split(' ');

  if (brandParts.length === 1) {
    return words.find(word => normalize(word).includes(found)) || '';
  }

  return found
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

function getRuleTranslation(product: Product, language: LanguageCode) {
  const text = compactNormalize(`${product.id} ${product.name}`);
  const rule = PRODUCT_RULES.find(current => current.test(product, text));

  if (!rule) return null;

  const base = pick(rule.values, language, product.name);
  const brand = preserveBrandText(product.name);
  const pack = preservePackText(product.name);

  if (brand && !normalize(base).includes(normalize(brand))) {
    return `${brand} ${base}${pack}`.replace(/\s+/g, ' ').trim();
  }

  if (pack && !normalize(base).includes(normalize(pack))) {
    return `${base}${pack}`.replace(/\s+/g, ' ').trim();
  }

  return base;
}

const PHRASE_TRANSLATIONS: Partial<Record<LanguageCode, Record<string, string>>> = {
  en: {
    pollo: 'chicken', pechuga: 'chicken breast', alas: 'wings', cuartos: 'quarters', menudencia: 'giblets', leche: 'milk', queso: 'cheese', yogurt: 'yogurt', arroz: 'rice', huevos: 'eggs', azucar: 'sugar', azúcar: 'sugar', atun: 'tuna', atún: 'tuna', sardina: 'sardines', harina: 'flour', fresco: 'fresh', fresca: 'fresh', sabor: 'flavor', coco: 'coconut', mora: 'blackberry', frutilla: 'strawberry', durazno: 'peach', agua: 'water', mantequilla: 'butter',
  },
  pt: { pollo: 'frango', pechuga: 'peito de frango', alas: 'asas', cuartos: 'quartos', leche: 'leite', queso: 'queijo', yogurt: 'iogurte', arroz: 'arroz', huevos: 'ovos', azucar: 'açúcar', azúcar: 'açúcar', atun: 'atum', atún: 'atum', sardina: 'sardinha', fresco: 'fresco', fresca: 'fresca' },
  fr: { pollo: 'poulet', pechuga: 'blanc de poulet', alas: 'ailes', cuartos: 'morceaux', leche: 'lait', queso: 'fromage', yogurt: 'yaourt', arroz: 'riz', huevos: 'œufs', azucar: 'sucre', azúcar: 'sucre', atun: 'thon', atún: 'thon', sardina: 'sardines', fresco: 'frais', fresca: 'fraîche' },
  de: { pollo: 'Hähnchen', pechuga: 'Hähnchenbrust', alas: 'Flügel', cuartos: 'Hähnchenteile', leche: 'Milch', queso: 'Käse', yogurt: 'Joghurt', arroz: 'Reis', huevos: 'Eier', azucar: 'Zucker', azúcar: 'Zucker', atun: 'Thunfisch', atún: 'Thunfisch', sardina: 'Sardinen', fresco: 'frisch', fresca: 'frisch' },
  it: { pollo: 'pollo', pechuga: 'petto di pollo', alas: 'ali', cuartos: 'quarti', leche: 'latte', queso: 'formaggio', yogurt: 'yogurt', arroz: 'riso', huevos: 'uova', azucar: 'zucchero', azúcar: 'zucchero', atun: 'tonno', atún: 'tonno', sardina: 'sardine', fresco: 'fresco', fresca: 'fresca' },
  nl: { pollo: 'kip', pechuga: 'kipfilet', alas: 'vleugels', cuartos: 'kipdelen', leche: 'melk', queso: 'kaas', yogurt: 'yoghurt', arroz: 'rijst', huevos: 'eieren', azucar: 'suiker', azúcar: 'suiker', atun: 'tonijn', atún: 'tonijn', sardina: 'sardines', fresco: 'vers' },
  ru: { pollo: 'курица', pechuga: 'куриная грудка', alas: 'крылья', cuartos: 'части курицы', leche: 'молоко', queso: 'сыр', yogurt: 'йогурт', arroz: 'рис', huevos: 'яйца', azucar: 'сахар', azúcar: 'сахар', atun: 'тунец', atún: 'тунец', sardina: 'сардины', fresco: 'свежий' },
};

const translateByPhrase = (text: string, language: LanguageCode) => {
  if (language === 'es' || !text) return text;

  if (isCjkLanguage(language)) {
    return text;
  }

  const dictionary = PHRASE_TRANSLATIONS[language] || PHRASE_TRANSLATIONS.en || {};
  const entries = Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length);

  return entries.reduce((current, [spanish, translated]) => {
    return current.replace(new RegExp(`\\b${spanish}\\b`, 'gi'), translated);
  }, text);
};

const getTranslatedProductName = (product: Product, language: LanguageCode) => {
  if (language === 'es') return product.name;

  const ruleTranslation = getRuleTranslation(product, language);
  if (ruleTranslation) return ruleTranslation;

  if (isCjkLanguage(language)) {
    const translatedCategory = translateCategoryLabel(product.category, language);
    return `${translatedCategory} · ${product.name}`;
  }

  return translateByPhrase(product.name, language);
};

const getTranslatedDescription = (product: Product, language: LanguageCode, translatedName: string) => {
  if (language === 'es') {
    return product.description || productUi('product.defaultDescription', language);
  }

  if (language === 'zh') {
    return `${translatedName}，可加入购物车。`;
  }

  if (language === 'ja') {
    return `${translatedName}。カートに追加できます。`;
  }

  if (!product.description) {
    return productUi('product.defaultDescription', language);
  }

  return translateByPhrase(product.description, language);
};

export function productUi(key: string, language: LanguageCode, params?: UiParams) {
  const text = pick(UI[key], language, key);
  return applyParams(text, params);
}

export function translateCategoryLabel(category: Category | 'Todos' | string, language: LanguageCode) {
  return pick(CATEGORY_TRANSLATIONS[category], language, category);
}

export function translateCategoryShort(category: Category | 'Todos' | string, language: LanguageCode) {
  const translated = translateCategoryLabel(category, language);
  if (language === 'es') return translated;
  if (translated.length <= 13) return translated;
  return translated.split(/\s|&/)[0] || translated;
}

export function translateSubcategoryLabel(subcategory: string | null | undefined, language: LanguageCode) {
  if (!subcategory) return '';
  return pick(SUBCATEGORY_TRANSLATIONS[subcategory], language, subcategory);
}

export function getProductDisplay(product: Product, language: LanguageCode): ProductText {
  const translatedName = getTranslatedProductName(product, language);
  const category = translateCategoryLabel(product.category, language);
  const subcategory = translateSubcategoryLabel(product.subcategory || null, language);
  const description = getTranslatedDescription(product, language, translatedName);
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
