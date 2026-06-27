import { useEffect } from 'react';
import type { LanguageCode } from '../types';

const LANGUAGE_STORAGE_KEY = 'pollazo_language';
const STYLE_ID = 'pollazo-language-polish-style';

const SKIP_SELECTOR = [
  'script',
  'style',
  'textarea',
  'input',
  'select',
  '[contenteditable="true"]',
  '.maplibregl-map',
  '.maplibregl-map *',
].join(',');

type TextMap = Partial<Record<LanguageCode, string>>;

const textMap: Record<string, TextMap> = {
  'Official information': { ru: 'Официальная информация', en: 'Official information', pt: 'Informação oficial', fr: 'Information officielle', de: 'Offizielle Informationen', it: 'Informazioni ufficiali', zh: '官方信息', ja: '公式情報', nl: 'Officiële informatie' },
  'La Casa del Pollazo': { ru: 'La Casa del Pollazo', en: 'La Casa del Pollazo', pt: 'La Casa del Pollazo', fr: 'La Casa del Pollazo', de: 'La Casa del Pollazo', it: 'La Casa del Pollazo', zh: 'La Casa del Pollazo', ja: 'La Casa del Pollazo', nl: 'La Casa del Pollazo' },
  'El Mirador · Puerto Ayora': { ru: 'El Mirador · Пуэрто-Айора', en: 'El Mirador · Puerto Ayora', pt: 'El Mirador · Puerto Ayora', fr: 'El Mirador · Puerto Ayora', de: 'El Mirador · Puerto Ayora', it: 'El Mirador · Puerto Ayora', zh: 'El Mirador · Puerto Ayora', ja: 'El Mirador · Puerto Ayora', nl: 'El Mirador · Puerto Ayora' },
  'Vuelve a ser Plus': { ru: 'Вернитесь в Plus', en: 'Become Plus again', pt: 'Volte a ser Plus', fr: 'Redevenez Plus', de: 'Wieder Plus werden', it: 'Torna Plus', zh: '重新成为 Plus', ja: 'Plus に戻る', nl: 'Word opnieuw Plus' },
  'Renueva tus beneficios': { ru: 'Обновите свои преимущества', en: 'Renew your benefits', pt: 'Renove seus benefícios', fr: 'Renouvelez vos avantages', de: 'Vorteile erneuern', it: 'Rinnova i benefici', zh: '续享福利', ja: '特典を更新', nl: 'Vernieuw je voordelen' },
  'Delivery gratis durante el mes, prioridad y beneficios especiales.': { ru: 'Бесплатная доставка в течение месяца, приоритет и специальные преимущества.', en: 'Free delivery during the month, priority and special benefits.', pt: 'Entrega grátis durante o mês, prioridade e benefícios especiais.', fr: 'Livraison gratuite pendant le mois, priorité et avantages spéciaux.', de: 'Kostenlose Lieferung im Monat, Priorität und besondere Vorteile.', it: 'Consegna gratuita durante il mese, priorità e benefici speciali.', zh: '本月免费配送、优先服务和特别福利。', ja: '1か月の無料配達、優先対応、特別特典。', nl: 'Gratis bezorging deze maand, prioriteit en speciale voordelen.' },
  'Envíos gratis': { ru: 'Бесплатная доставка', en: 'Free delivery', pt: 'Entregas grátis', fr: 'Livraison gratuite', de: 'Kostenlose Lieferung', it: 'Consegne gratuite', zh: '免费配送', ja: '無料配達', nl: 'Gratis bezorging' },
  'Envios gratis': { ru: 'Бесплатная доставка', en: 'Free delivery', pt: 'Entregas grátis', fr: 'Livraison gratuite', de: 'Kostenlose Lieferung', it: 'Consegne gratuite', zh: '免费配送', ja: '無料配達', nl: 'Gratis bezorging' },
  'Todo el mes': { ru: 'Весь месяц', en: 'All month', pt: 'Todo o mês', fr: 'Tout le mois', de: 'Den ganzen Monat', it: 'Tutto il mese', zh: '整个月', ja: '1か月中', nl: 'De hele maand' },
  'Sorpresas': { ru: 'Сюрпризы', en: 'Surprises', pt: 'Surpresas', fr: 'Surprises', de: 'Überraschungen', it: 'Sorprese', zh: '惊喜', ja: 'サプライズ', nl: 'Verrassingen' },
  'Según stock': { ru: 'По наличию', en: 'Depending on stock', pt: 'Conforme estoque', fr: 'Selon stock', de: 'Je nach Bestand', it: 'Secondo disponibilità', zh: '视库存而定', ja: '在庫次第', nl: 'Volgens voorraad' },
  'Prioridad': { ru: 'Приоритет', en: 'Priority', pt: 'Prioridade', fr: 'Priorité', de: 'Priorität', it: 'Priorità', zh: '优先', ja: '優先', nl: 'Prioriteit' },
  'Atención Plus': { ru: 'Plus-обслуживание', en: 'Plus service', pt: 'Atendimento Plus', fr: 'Service Plus', de: 'Plus-Service', it: 'Servizio Plus', zh: 'Plus 服务', ja: 'Plus サービス', nl: 'Plus-service' },
  'Membresía mensual': { ru: 'Ежемесячная подписка', en: 'Monthly membership', pt: 'Assinatura mensal', fr: 'Abonnement mensuel', de: 'Monatliche Mitgliedschaft', it: 'Abbonamento mensile', zh: '月度会员', ja: '月額メンバーシップ', nl: 'Maandelijks lidmaatschap' },
  'Ver Plus': { ru: 'Смотреть Plus', en: 'View Plus', pt: 'Ver Plus', fr: 'Voir Plus', de: 'Plus ansehen', it: 'Vedi Plus', zh: '查看 Plus', ja: 'Plus を見る', nl: 'Bekijk Plus' },
  'Renovar Pollazo Plus': { ru: 'Продлить Pollazo Plus', en: 'Renew Pollazo Plus', pt: 'Renovar Pollazo Plus', fr: 'Renouveler Pollazo Plus', de: 'Pollazo Plus verlängern', it: 'Rinnova Pollazo Plus', zh: '续订 Pollazo Plus', ja: 'Pollazo Plus を更新', nl: 'Pollazo Plus vernieuwen' },
  'Al continuar, aceptas términos y condiciones.': { ru: 'Продолжая, вы принимаете условия использования.', en: 'By continuing, you accept the terms and conditions.', pt: 'Ao continuar, você aceita os termos e condições.', fr: 'En continuant, vous acceptez les conditions.', de: 'Mit dem Fortfahren akzeptieren Sie die Bedingungen.', it: 'Continuando, accetti termini e condizioni.', zh: '继续即表示您接受条款和条件。', ja: '続行すると利用規約に同意したことになります。', nl: 'Door te gaan accepteer je de voorwaarden.' },
  'Transparencia': { ru: 'Прозрачность', en: 'Transparency', pt: 'Transparência', fr: 'Transparence', de: 'Transparenz', it: 'Trasparenza', zh: '透明度', ja: '透明性', nl: 'Transparantie' },
  'En tiempo real': { ru: 'В реальном времени', en: 'In real time', pt: 'Em tempo real', fr: 'En temps réel', de: 'In Echtzeit', it: 'In tempo reale', zh: '实时', ja: 'リアルタイム', nl: 'In realtime' },
  'Indicadores vivos de actividad y pedidos de La Casa del Pollazo.': { ru: 'Живые показатели активности и заказов La Casa del Pollazo.', en: 'Live activity and order indicators for La Casa del Pollazo.', pt: 'Indicadores ao vivo de atividade e pedidos da La Casa del Pollazo.', fr: 'Indicateurs en direct d’activité et de commandes de La Casa del Pollazo.', de: 'Live-Anzeigen für Aktivität und Bestellungen von La Casa del Pollazo.', it: 'Indicatori live di attività e ordini di La Casa del Pollazo.', zh: 'La Casa del Pollazo 的实时活动和订单指标。', ja: 'La Casa del Pollazo の活動と注文のライブ指標。', nl: 'Live activiteit- en bestelindicatoren voor La Casa del Pollazo.' },
  'En línea ahora': { ru: 'Сейчас онлайн', en: 'Online now', pt: 'Online agora', fr: 'En ligne maintenant', de: 'Jetzt online', it: 'Online ora', zh: '当前在线', ja: '現在オンライン', nl: 'Nu online' },
  'Visitas totales': { ru: 'Всего посещений', en: 'Total visits', pt: 'Visitas totais', fr: 'Visites totales', de: 'Besuche gesamt', it: 'Visite totali', zh: '总访问量', ja: '総訪問数', nl: 'Totale bezoeken' },
  'Pedidos confirmados': { ru: 'Подтвержденные заказы', en: 'Confirmed orders', pt: 'Pedidos confirmados', fr: 'Commandes confirmées', de: 'Bestätigte Bestellungen', it: 'Ordini confermati', zh: '已确认订单', ja: '確認済み注文', nl: 'Bevestigde bestellingen' },
  'Language': { ru: 'Язык', en: 'Language', pt: 'Idioma', fr: 'Langue', de: 'Sprache', it: 'Lingua', zh: '语言', ja: '言語', nl: 'Taal' },
  'Idioma de la app': { ru: 'Язык приложения', en: 'App language', pt: 'Idioma do app', fr: 'Langue de l’application', de: 'App-Sprache', it: 'Lingua dell’app', zh: '应用语言', ja: 'アプリの言語', nl: 'App-taal' },
  'Selecciona cómo quieres ver la app.': { ru: 'Выберите язык отображения приложения.', en: 'Choose how you want to view the app.', pt: 'Escolha como quer ver o app.', fr: 'Choisissez comment afficher l’application.', de: 'Wählen Sie die App-Sprache.', it: 'Scegli come vedere l’app.', zh: '选择应用显示语言。', ja: 'アプリの表示言語を選択してください。', nl: 'Kies hoe je de app wilt zien.' },
  'Cambiar idioma': { ru: 'Сменить язык', en: 'Change language', pt: 'Mudar idioma', fr: 'Changer de langue', de: 'Sprache ändern', it: 'Cambia lingua', zh: '更改语言', ja: '言語を変更', nl: 'Taal wijzigen' },
  'Idioma actual': { ru: 'Текущий язык', en: 'Current language', pt: 'Idioma atual', fr: 'Langue actuelle', de: 'Aktuelle Sprache', it: 'Lingua attuale', zh: '当前语言', ja: '現在の言語', nl: 'Huidige taal' },
  'Mi cuenta Pollazo': { ru: 'Мой аккаунт Pollazo', en: 'My Pollazo account', pt: 'Minha conta Pollazo', fr: 'Mon compte Pollazo', de: 'Mein Pollazo-Konto', it: 'Il mio account Pollazo', zh: '我的 Pollazo 账户', ja: 'Pollazo アカウント', nl: 'Mijn Pollazo-account' },
  'Level progress': { ru: 'Прогресс уровня', en: 'Level progress', pt: 'Progresso de nível', fr: 'Progression du niveau', de: 'Level-Fortschritt', it: 'Avanzamento livello', zh: '等级进度', ja: 'レベル進行', nl: 'Niveauvoortgang' },
  'Progreso de nivel': { ru: 'Прогресс уровня', en: 'Level progress', pt: 'Progresso de nível', fr: 'Progression du niveau', de: 'Level-Fortschritt', it: 'Avanzamento livello', zh: '等级进度', ja: 'レベル進行', nl: 'Niveauvoortgang' },
  'Nivel máximo de cliente histórico.': { ru: 'Максимальный уровень постоянного клиента.', en: 'Maximum level for a historic customer.', pt: 'Nível máximo de cliente histórico.', fr: 'Niveau maximum du client historique.', de: 'Maximaler Level für Stammkunden.', it: 'Livello massimo per cliente storico.', zh: '历史客户最高等级。', ja: '常連顧客の最高レベル。', nl: 'Maximaal niveau voor vaste klant.' },
  'Ya llegaste al nivel máximo.': { ru: 'Вы уже достигли максимального уровня.', en: 'You have reached the maximum level.', pt: 'Você chegou ao nível máximo.', fr: 'Vous avez atteint le niveau maximum.', de: 'Sie haben das maximale Level erreicht.', it: 'Hai raggiunto il livello massimo.', zh: '您已达到最高等级。', ja: '最高レベルに到達しました。', nl: 'Je hebt het hoogste niveau bereikt.' },
  'Ver niveles': { ru: 'Смотреть уровни', en: 'View levels', pt: 'Ver níveis', fr: 'Voir les niveaux', de: 'Level ansehen', it: 'Vedi livelli', zh: '查看等级', ja: 'レベルを見る', nl: 'Bekijk niveaus' },
  'Niveles Pollazo': { ru: 'Уровни Pollazo', en: 'Pollazo levels', pt: 'Níveis Pollazo', fr: 'Niveaux Pollazo', de: 'Pollazo-Level', it: 'Livelli Pollazo', zh: 'Pollazo 等级', ja: 'Pollazo レベル', nl: 'Pollazo-niveaus' },
  'Así subes de nivel': { ru: 'Как повысить уровень', en: 'How to level up', pt: 'Como subir de nível', fr: 'Comment monter de niveau', de: 'So steigst du auf', it: 'Come salire di livello', zh: '如何升级', ja: 'レベルアップ方法', nl: 'Zo stijg je in niveau' },
  'Tu nivel sube con tu historial de compras válidas. Sirve para entender tu progreso como cliente y preparar futuros beneficios cuando el negocio los active.': { ru: 'Ваш уровень растет благодаря истории действительных покупок. Это помогает видеть прогресс клиента и готовить будущие преимущества, когда бизнес их активирует.', en: 'Your level rises with your valid purchase history. It helps show your customer progress and prepare future benefits when the business activates them.', pt: 'Seu nível sobe com seu histórico de compras válidas. Ajuda a mostrar seu progresso como cliente e preparar benefícios futuros.', fr: 'Votre niveau augmente avec vos achats valides. Cela montre votre progression client et prépare de futurs avantages.', de: 'Ihr Level steigt mit gültigen Käufen. Es zeigt Ihren Kundenfortschritt und bereitet künftige Vorteile vor.', it: 'Il tuo livello cresce con gli acquisti validi. Mostra il progresso cliente e prepara futuri benefici.', zh: '您的等级会随着有效购买记录提升，用于显示客户进度并准备未来福利。', ja: '有効な購入履歴でレベルが上がります。顧客としての進行状況と今後の特典に役立ちます。', nl: 'Je niveau stijgt met geldige aankopen. Het toont je klantvoortgang en bereidt toekomstige voordelen voor.' },
  'Mi entrega': { ru: 'Моя доставка', en: 'My delivery', pt: 'Minha entrega', fr: 'Ma livraison', de: 'Meine Lieferung', it: 'La mia consegna', zh: '我的配送', ja: '私の配達', nl: 'Mijn levering' },
  'Ready': { ru: 'Готово', en: 'Ready', pt: 'Pronto', fr: 'Prêt', de: 'Bereit', it: 'Pronto', zh: '就绪', ja: '準備完了', nl: 'Klaar' },
  'Current': { ru: 'Текущий', en: 'Current', pt: 'Atual', fr: 'Actuel', de: 'Aktuell', it: 'Attuale', zh: '当前', ja: '現在', nl: 'Huidig' },
  'Selected': { ru: 'Выбрано', en: 'Selected', pt: 'Selecionado', fr: 'Sélectionné', de: 'Ausgewählt', it: 'Selezionato', zh: '已选择', ja: '選択済み', nl: 'Geselecteerd' },
  'Use': { ru: 'Использовать', en: 'Use', pt: 'Usar', fr: 'Utiliser', de: 'Nutzen', it: 'Usa', zh: '使用', ja: '使う', nl: 'Gebruik' },
  'Edit': { ru: 'Изменить', en: 'Edit', pt: 'Editar', fr: 'Modifier', de: 'Bearbeiten', it: 'Modifica', zh: '编辑', ja: '編集', nl: 'Bewerken' },
  'Add new address': { ru: 'Добавить новый адрес', en: 'Add new address', pt: 'Adicionar novo endereço', fr: 'Ajouter une adresse', de: 'Neue Adresse hinzufügen', it: 'Aggiungi nuovo indirizzo', zh: '添加新地址', ja: '新しい住所を追加', nl: 'Nieuw adres toevoegen' },
  'Avisos importantes': { ru: 'Важные уведомления', en: 'Important notices', pt: 'Avisos importantes', fr: 'Avis importants', de: 'Wichtige Hinweise', it: 'Avvisi importanti', zh: '重要通知', ja: '重要なお知らせ', nl: 'Belangrijke meldingen' },
  'Notificaciones Pollazo': { ru: 'Уведомления Pollazo', en: 'Pollazo notifications', pt: 'Notificações Pollazo', fr: 'Notifications Pollazo', de: 'Pollazo-Benachrichtigungen', it: 'Notifiche Pollazo', zh: 'Pollazo 通知', ja: 'Pollazo 通知', nl: 'Pollazo-meldingen' },
  'Activar avisos': { ru: 'Включить уведомления', en: 'Enable notices', pt: 'Ativar avisos', fr: 'Activer les avis', de: 'Hinweise aktivieren', it: 'Attiva avvisi', zh: '启用通知', ja: '通知を有効化', nl: 'Meldingen inschakelen' },
  'Recomendado': { ru: 'Рекомендуется', en: 'Recommended', pt: 'Recomendado', fr: 'Recommandé', de: 'Empfohlen', it: 'Consigliato', zh: '推荐', ja: 'おすすめ', nl: 'Aanbevolen' },
  'Soporte local': { ru: 'Местная поддержка', en: 'Local support', pt: 'Suporte local', fr: 'Support local', de: 'Lokaler Support', it: 'Supporto locale', zh: '本地支持', ja: 'ローカルサポート', nl: 'Lokale ondersteuning' },
  'Centro de ayuda': { ru: 'Центр помощи', en: 'Help center', pt: 'Central de ajuda', fr: 'Centre d’aide', de: 'Hilfezentrum', it: 'Centro assistenza', zh: '帮助中心', ja: 'ヘルプセンター', nl: 'Helpcentrum' },
  'Pedidos, pagos, entregas, promociones y cuenta.': { ru: 'Заказы, платежи, доставка, акции и аккаунт.', en: 'Orders, payments, deliveries, promotions and account.', pt: 'Pedidos, pagamentos, entregas, promoções e conta.', fr: 'Commandes, paiements, livraisons, promotions et compte.', de: 'Bestellungen, Zahlungen, Lieferungen, Aktionen und Konto.', it: 'Ordini, pagamenti, consegne, promozioni e account.', zh: '订单、付款、配送、促销和账户。', ja: '注文、支払い、配達、プロモーション、アカウント。', nl: 'Bestellingen, betalingen, leveringen, promoties en account.' },
  'Direct contact': { ru: 'Прямой контакт', en: 'Direct contact', pt: 'Contato direto', fr: 'Contact direct', de: 'Direkter Kontakt', it: 'Contatto diretto', zh: '直接联系', ja: '直接連絡', nl: 'Direct contact' },
  'Official WhatsApp': { ru: 'Официальный WhatsApp', en: 'Official WhatsApp', pt: 'WhatsApp oficial', fr: 'WhatsApp officiel', de: 'Offizielles WhatsApp', it: 'WhatsApp ufficiale', zh: '官方 WhatsApp', ja: '公式 WhatsApp', nl: 'Officiële WhatsApp' },
  'Immediate support': { ru: 'Быстрая помощь', en: 'Immediate support', pt: 'Suporte imediato', fr: 'Support immédiat', de: 'Soforthilfe', it: 'Supporto immediato', zh: '即时支持', ja: '即時サポート', nl: 'Directe hulp' },
  'Phone line': { ru: 'Телефонная линия', en: 'Phone line', pt: 'Linha telefônica', fr: 'Ligne téléphonique', de: 'Telefonleitung', it: 'Linea telefonica', zh: '电话热线', ja: '電話窓口', nl: 'Telefoonlijn' },
  'Opening hours': { ru: 'Часы работы', en: 'Opening hours', pt: 'Horário de atendimento', fr: 'Horaires', de: 'Öffnungszeiten', it: 'Orari di apertura', zh: '营业时间', ja: '営業時間', nl: 'Openingstijden' },
  'Location': { ru: 'Местоположение', en: 'Location', pt: 'Localização', fr: 'Emplacement', de: 'Standort', it: 'Posizione', zh: '位置', ja: '場所', nl: 'Locatie' },
  'Comprar ahora': { ru: 'Заказать сейчас', en: 'Buy now', pt: 'Comprar agora', fr: 'Acheter maintenant', de: 'Jetzt kaufen', it: 'Compra ora', zh: '立即购买', ja: '今すぐ購入', nl: 'Nu kopen' },
  'View catalog and build your order': { ru: 'Откройте каталог и соберите заказ', en: 'View catalog and build your order', pt: 'Ver catálogo e montar pedido', fr: 'Voir le catalogue et préparer la commande', de: 'Katalog ansehen und Bestellung zusammenstellen', it: 'Vedi catalogo e prepara l’ordine', zh: '查看目录并下单', ja: 'カタログを見て注文を作成', nl: 'Bekijk catalogus en stel je bestelling samen' },
  'Our team': { ru: 'Наша команда', en: 'Our team', pt: 'Nossa equipe', fr: 'Notre équipe', de: 'Unser Team', it: 'Il nostro team', zh: '我们的团队', ja: '私たちのチーム', nl: 'Ons team' },
  'People behind service and support': { ru: 'Люди, которые отвечают за сервис и поддержку', en: 'People behind service and support', pt: 'Pessoas por trás do serviço e suporte', fr: 'Les personnes derrière le service et le support', de: 'Menschen hinter Service und Support', it: 'Persone dietro servizio e supporto', zh: '服务和支持背后的团队', ja: 'サービスとサポートを支える人々', nl: 'Mensen achter service en support' },
  'Parte del equipo': { ru: 'Часть команды', en: 'Team member', pt: 'Parte da equipe', fr: 'Membre de l’équipe', de: 'Teammitglied', it: 'Parte del team', zh: '团队成员', ja: 'チームメンバー', nl: 'Teamlid' },
  'Encargado': { ru: 'Ответственный', en: 'Manager', pt: 'Responsável', fr: 'Responsable', de: 'Verantwortlich', it: 'Responsabile', zh: '负责人', ja: '担当者', nl: 'Verantwoordelijke' },
  'Marketing': { ru: 'Маркетинг', en: 'Marketing', pt: 'Marketing', fr: 'Marketing', de: 'Marketing', it: 'Marketing', zh: '营销', ja: 'マーケティング', nl: 'Marketing' },
  'Gallery': { ru: 'Галерея', en: 'Gallery', pt: 'Galeria', fr: 'Galerie', de: 'Galerie', it: 'Galleria', zh: '图库', ja: 'ギャラリー', nl: 'Galerij' },
  'Galería': { ru: 'Галерея', en: 'Gallery', pt: 'Galeria', fr: 'Galerie', de: 'Galerie', it: 'Galleria', zh: '图库', ja: 'ギャラリー', nl: 'Galerij' },
  'Nuestras instalaciones': { ru: 'Наши помещения', en: 'Our facilities', pt: 'Nossas instalações', fr: 'Nos installations', de: 'Unsere Räumlichkeiten', it: 'Le nostre strutture', zh: '我们的设施', ja: '店舗の様子', nl: 'Onze faciliteiten' },
  'Opiniones del club': { ru: 'Отзывы клуба', en: 'Club reviews', pt: 'Opiniões do clube', fr: 'Avis du club', de: 'Club-Bewertungen', it: 'Opinioni del club', zh: '会员评价', ja: 'クラブのレビュー', nl: 'Clubreviews' },
  'Opinar': { ru: 'Оставить отзыв', en: 'Review', pt: 'Opinar', fr: 'Aviser', de: 'Bewerten', it: 'Recensisci', zh: '评价', ja: 'レビューする', nl: 'Beoordelen' },
  'This delivery could be free': { ru: 'Эта доставка могла бы быть бесплатной', en: 'This delivery could be free', pt: 'Esta entrega poderia ser grátis', fr: 'Cette livraison pourrait être gratuite', de: 'Diese Lieferung könnte kostenlos sein', it: 'Questa consegna potrebbe essere gratis', zh: '此配送可免费', ja: 'この配達は無料にできます', nl: 'Deze levering kan gratis zijn' },
  'View Pollazo Plus': { ru: 'Смотреть Pollazo Plus', en: 'View Pollazo Plus', pt: 'Ver Pollazo Plus', fr: 'Voir Pollazo Plus', de: 'Pollazo Plus ansehen', it: 'Vedi Pollazo Plus', zh: '查看 Pollazo Plus', ja: 'Pollazo Plus を見る', nl: 'Bekijk Pollazo Plus' },
  'Your products': { ru: 'Ваши продукты', en: 'Your products', pt: 'Seus produtos', fr: 'Vos produits', de: 'Ihre Produkte', it: 'I tuoi prodotti', zh: '您的商品', ja: '商品', nl: 'Je producten' },
  'Products': { ru: 'Продукты', en: 'Products', pt: 'Produtos', fr: 'Produits', de: 'Produkte', it: 'Prodotti', zh: '商品', ja: '商品', nl: 'Producten' },
  'Empty cart': { ru: 'Очистить корзину', en: 'Empty cart', pt: 'Esvaziar carrinho', fr: 'Vider le panier', de: 'Warenkorb leeren', it: 'Svuota carrello', zh: '清空购物篮', ja: 'かごを空にする', nl: 'Mandje leegmaken' },
  'Delivery': { ru: 'Доставка', en: 'Delivery', pt: 'Entrega', fr: 'Livraison', de: 'Lieferung', it: 'Consegna', zh: '配送', ja: '配達', nl: 'Levering' },
  'Delivery address': { ru: 'Адрес доставки', en: 'Delivery address', pt: 'Endereço de entrega', fr: 'Adresse de livraison', de: 'Lieferadresse', it: 'Indirizzo di consegna', zh: '配送地址', ja: '配達先住所', nl: 'Bezorgadres' },
  'Address ready for delivery': { ru: 'Адрес готов для доставки', en: 'Address ready for delivery', pt: 'Endereço pronto para entrega', fr: 'Adresse prête pour la livraison', de: 'Adresse bereit für Lieferung', it: 'Indirizzo pronto per consegna', zh: '配送地址已准备好', ja: '配達先住所が準備完了', nl: 'Adres klaar voor levering' },
  'Change': { ru: 'Изменить', en: 'Change', pt: 'Alterar', fr: 'Changer', de: 'Ändern', it: 'Cambia', zh: '更改', ja: '変更', nl: 'Wijzigen' },
  'Payment method': { ru: 'Способ оплаты', en: 'Payment method', pt: 'Método de pagamento', fr: 'Méthode de paiement', de: 'Zahlungsmethode', it: 'Metodo di pagamento', zh: '付款方式', ja: '支払い方法', nl: 'Betaalmethode' },
  'Choose how you want to pay': { ru: 'Выберите способ оплаты', en: 'Choose how you want to pay', pt: 'Escolha como quer pagar', fr: 'Choisissez comment payer', de: 'Wählen Sie die Zahlungsart', it: 'Scegli come pagare', zh: '选择付款方式', ja: '支払い方法を選択', nl: 'Kies hoe je wilt betalen' },
  'Efectivo': { ru: 'Наличные', en: 'Cash', pt: 'Dinheiro', fr: 'Espèces', de: 'Barzahlung', it: 'Contanti', zh: '现金', ja: '現金', nl: 'Contant' },
  'Pay on delivery': { ru: 'Оплата при доставке', en: 'Pay on delivery', pt: 'Pagar na entrega', fr: 'Payer à la livraison', de: 'Bei Lieferung bezahlen', it: 'Paga alla consegna', zh: '货到付款', ja: '配達時に支払い', nl: 'Betalen bij levering' },
  'Transferencia': { ru: 'Перевод', en: 'Transfer', pt: 'Transferência', fr: 'Virement', de: 'Überweisung', it: 'Bonifico', zh: '转账', ja: '振込', nl: 'Overschrijving' },
  'Choose your bank and copy details': { ru: 'Выберите банк и скопируйте данные', en: 'Choose your bank and copy details', pt: 'Escolha seu banco e copie os dados', fr: 'Choisissez votre banque et copiez les infos', de: 'Bank wählen und Daten kopieren', it: 'Scegli la banca e copia i dati', zh: '选择银行并复制信息', ja: '銀行を選び詳細をコピー', nl: 'Kies je bank en kopieer gegevens' },
  'Confirmar': { ru: 'Подтвердить', en: 'Confirm', pt: 'Confirmar', fr: 'Confirmer', de: 'Bestätigen', it: 'Conferma', zh: '确认', ja: '確認', nl: 'Bevestigen' },
  'Check the total before continuing': { ru: 'Проверьте итог перед продолжением', en: 'Check the total before continuing', pt: 'Confira o total antes de continuar', fr: 'Vérifiez le total avant de continuer', de: 'Prüfen Sie die Summe vor dem Fortfahren', it: 'Controlla il totale prima di continuare', zh: '继续前请检查总额', ja: '続行前に合計を確認', nl: 'Controleer het totaal voordat je doorgaat' },
  'Subtotal': { ru: 'Промежуточный итог', en: 'Subtotal', pt: 'Subtotal', fr: 'Sous-total', de: 'Zwischensumme', it: 'Subtotale', zh: '小计', ja: '小計', nl: 'Subtotaal' },
  'Final total': { ru: 'Итоговая сумма', en: 'Final total', pt: 'Total final', fr: 'Total final', de: 'Endsumme', it: 'Totale finale', zh: '最终总额', ja: '最終合計', nl: 'Eindtotaal' },
  'Payment': { ru: 'Оплата', en: 'Payment', pt: 'Pagamento', fr: 'Paiement', de: 'Zahlung', it: 'Pagamento', zh: '付款', ja: '支払い', nl: 'Betaling' },
  'Pending': { ru: 'Ожидает', en: 'Pending', pt: 'Pendente', fr: 'En attente', de: 'Ausstehend', it: 'In attesa', zh: '待处理', ja: '保留中', nl: 'In behandeling' },
  'Choose your payment method': { ru: 'Выберите способ оплаты', en: 'Choose your payment method', pt: 'Escolha o método de pagamento', fr: 'Choisissez votre méthode de paiement', de: 'Zahlungsmethode wählen', it: 'Scegli il metodo di pagamento', zh: '选择付款方式', ja: '支払い方法を選択', nl: 'Kies je betaalmethode' },
  'Mis pedidos': { ru: 'Мои заказы', en: 'My orders', pt: 'Meus pedidos', fr: 'Mes commandes', de: 'Meine Bestellungen', it: 'I miei ordini', zh: '我的订单', ja: '注文履歴', nl: 'Mijn bestellingen' },
  'Mi historial Pollazo': { ru: 'Моя история Pollazo', en: 'My Pollazo history', pt: 'Meu histórico Pollazo', fr: 'Mon historique Pollazo', de: 'Mein Pollazo-Verlauf', it: 'Il mio storico Pollazo', zh: '我的 Pollazo 历史', ja: 'Pollazo 履歴', nl: 'Mijn Pollazo-geschiedenis' },
  'Activos': { ru: 'Активные', en: 'Active', pt: 'Ativos', fr: 'Actifs', de: 'Aktiv', it: 'Attivi', zh: '进行中', ja: 'アクティブ', nl: 'Actief' },
  'Entregados': { ru: 'Доставленные', en: 'Delivered', pt: 'Entregues', fr: 'Livrés', de: 'Geliefert', it: 'Consegnati', zh: '已送达', ja: '配達済み', nl: 'Geleverd' },
  'Todos': { ru: 'Все', en: 'All', pt: 'Todos', fr: 'Tous', de: 'Alle', it: 'Tutti', zh: '全部', ja: 'すべて', nl: 'Alle' },
  'Comprado': { ru: 'Куплено', en: 'Purchased', pt: 'Comprado', fr: 'Acheté', de: 'Gekauft', it: 'Acquistato', zh: '已购买', ja: '購入済み', nl: 'Gekocht' },
  'Buscar por código o producto...': { ru: 'Поиск по коду или продукту...', en: 'Search by code or product...', pt: 'Buscar por código ou produto...', fr: 'Rechercher par code ou produit...', de: 'Nach Code oder Produkt suchen...', it: 'Cerca per codice o prodotto...', zh: '按代码或商品搜索...', ja: 'コードまたは商品で検索...', nl: 'Zoek op code of product...' },
  'Estado': { ru: 'Статус', en: 'Status', pt: 'Estado', fr: 'Statut', de: 'Status', it: 'Stato', zh: '状态', ja: 'ステータス', nl: 'Status' },
  'Por confirmar': { ru: 'Ожидает подтверждения', en: 'To confirm', pt: 'A confirmar', fr: 'À confirmer', de: 'Zu bestätigen', it: 'Da confermare', zh: '待确认', ja: '確認待ち', nl: 'Te bevestigen' },
  'Productos más': { ru: 'товаров еще', en: 'more products', pt: 'produtos a mais', fr: 'produits en plus', de: 'weitere Produkte', it: 'altri prodotti', zh: '更多商品', ja: 'その他の商品', nl: 'meer producten' },
  '¿Qué buscas hoy?': { ru: 'Что ищете сегодня?', en: 'What are you looking for today?', pt: 'O que você procura hoje?', fr: 'Que cherchez-vous aujourd’hui ?', de: 'Was suchen Sie heute?', it: 'Cosa cerchi oggi?', zh: '今天想找什么？', ja: '今日は何を探していますか？', nl: 'Wat zoek je vandaag?' },
  'By amount': { ru: 'По сумме', en: 'By amount', pt: 'Por valor', fr: 'Par montant', de: 'Nach Betrag', it: 'Per importo', zh: '按金额', ja: '金額で選択', nl: 'Op bedrag' },
  'Choose amount': { ru: 'Выберите сумму', en: 'Choose amount', pt: 'Escolha o valor', fr: 'Choisir le montant', de: 'Betrag wählen', it: 'Scegli importo', zh: '选择金额', ja: '金額を選択', nl: 'Kies bedrag' },
  'Minimum': { ru: 'Минимум', en: 'Minimum', pt: 'Mínimo', fr: 'Minimum', de: 'Minimum', it: 'Minimo', zh: '最低', ja: '最低', nl: 'Minimum' },
  'Choose': { ru: 'Выбрать', en: 'Choose', pt: 'Escolher', fr: 'Choisir', de: 'Wählen', it: 'Scegli', zh: '选择', ja: '選択', nl: 'Kiezen' },
  'Add': { ru: 'Добавить', en: 'Add', pt: 'Adicionar', fr: 'Ajouter', de: 'Hinzufügen', it: 'Aggiungi', zh: '添加', ja: '追加', nl: 'Toevoegen' },
  'Canasta': { ru: 'Корзина', en: 'Basket', pt: 'Cesta', fr: 'Panier', de: 'Warenkorb', it: 'Carrello', zh: '购物篮', ja: 'かご', nl: 'Mandje' },
  'Pedido': { ru: 'Заказ', en: 'Order', pt: 'Pedido', fr: 'Commande', de: 'Bestellung', it: 'Ordine', zh: '订单', ja: '注文', nl: 'Bestelling' },
  'De regreso,': { ru: 'С возвращением,', en: 'Welcome back,', pt: 'Bem-vindo de volta,', fr: 'Bon retour,', de: 'Willkommen zurück,', it: 'Bentornato,', zh: '欢迎回来，', ja: 'おかえりなさい、', nl: 'Welkom terug,' },
  'Hola,': { ru: 'Здравствуйте,', en: 'Hi,', pt: 'Olá,', fr: 'Bonjour,', de: 'Hallo,', it: 'Ciao,', zh: '你好，', ja: 'こんにちは、', nl: 'Hallo,' },
  'Ver categorías': { ru: 'Смотреть категории', en: 'View categories', pt: 'Ver categorias', fr: 'Voir catégories', de: 'Kategorien ansehen', it: 'Vedi categorie', zh: '查看分类', ja: 'カテゴリを見る', nl: 'Bekijk categorieën' },
  'Compra rápida': { ru: 'Быстрая покупка', en: 'Quick purchase', pt: 'Compra rápida', fr: 'Achat rapide', de: 'Schneller Einkauf', it: 'Acquisto rapido', zh: '快速购买', ja: 'クイック購入', nl: 'Snelle aankoop' },
  'Seleccione categoría': { ru: 'Выберите категорию', en: 'Choose category', pt: 'Escolha a categoria', fr: 'Choisir une catégorie', de: 'Kategorie wählen', it: 'Scegli categoria', zh: '选择类别', ja: 'カテゴリを選択', nl: 'Kies categorie' },
  'Seleccione categoria': { ru: 'Выберите категорию', en: 'Choose category', pt: 'Escolha a categoria', fr: 'Choisir une catégorie', de: 'Kategorie wählen', it: 'Scegli categoria', zh: '选择类别', ja: 'カテゴリを選択', nl: 'Kies categorie' },
  'Ver todo': { ru: 'Смотреть все', en: 'View all', pt: 'Ver tudo', fr: 'Voir tout', de: 'Alles ansehen', it: 'Vedi tutto', zh: '查看全部', ja: 'すべて見る', nl: 'Alles bekijken' },
  'Ofertas del día': { ru: 'Предложения дня', en: 'Today’s deals', pt: 'Ofertas do dia', fr: 'Offres du jour', de: 'Tagesangebote', it: 'Offerte del giorno', zh: '今日优惠', ja: '本日の特価', nl: 'Aanbiedingen van vandaag' },
  'Frescas y listas cada día': { ru: 'Свежие цены и наличие каждый день', en: 'Fresh prices and availability every day', pt: 'Preços e disponibilidade frescos todos os dias', fr: 'Prix et disponibilité frais chaque jour', de: 'Frische Preise und Verfügbarkeit täglich', it: 'Prezzi e disponibilità aggiornati ogni giorno', zh: '每日更新价格和库存', ja: '毎日新しい価格と在庫', nl: 'Dagelijks actuele prijzen en voorraad' },
  'Comprar aquí es fácil': { ru: 'Покупать здесь легко', en: 'Buying here is easy', pt: 'Comprar aqui é fácil', fr: 'Acheter ici est facile', de: 'Hier einkaufen ist einfach', it: 'Comprare qui è facile', zh: '在这里购买很简单', ja: 'ここでの購入は簡単', nl: 'Hier kopen is makkelijk' },
  'Fresco cada día': { ru: 'Свежо каждый день', en: 'Fresh every day', pt: 'Fresco todo dia', fr: 'Frais chaque jour', de: 'Jeden Tag frisch', it: 'Fresco ogni giorno', zh: '每日新鲜', ja: '毎日新鮮', nl: 'Elke dag vers' },
  'Entrega': { ru: 'Доставка', en: 'Delivery', pt: 'Entrega', fr: 'Livraison', de: 'Lieferung', it: 'Consegna', zh: '配送', ja: '配達', nl: 'Levering' },
  'Soporte simple': { ru: 'Простая поддержка', en: 'Simple support', pt: 'Suporte simples', fr: 'Support simple', de: 'Einfacher Support', it: 'Supporto semplice', zh: '简单支持', ja: '簡単サポート', nl: 'Eenvoudige hulp' },
  'Garantía': { ru: 'Гарантия', en: 'Guarantee', pt: 'Garantia', fr: 'Garantie', de: 'Garantie', it: 'Garanzia', zh: '保障', ja: '保証', nl: 'Garantie' },
  'No disponible': { ru: 'Нет в наличии', en: 'Unavailable', pt: 'Indisponível', fr: 'Indisponible', de: 'Nicht verfügbar', it: 'Non disponibile', zh: '无货', ja: '利用不可', nl: 'Niet beschikbaar' },
  'Sin stock': { ru: 'Нет в наличии', en: 'Out of stock', pt: 'Sem estoque', fr: 'Rupture de stock', de: 'Ausverkauft', it: 'Esaurito', zh: '缺货', ja: '在庫切れ', nl: 'Niet op voorraad' },
  'Agotado por ahora': { ru: 'Пока нет в наличии', en: 'Sold out for now', pt: 'Esgotado por enquanto', fr: 'Épuisé pour le moment', de: 'Derzeit ausverkauft', it: 'Esaurito per ora', zh: '暂时售罄', ja: '現在売り切れ', nl: 'Voorlopig uitverkocht' },
};

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const getLanguage = (): LanguageCode => {
  const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
  return raw || 'es';
};

const translatedText = (text: string, language: LanguageCode) => {
  const normalized = normalizeText(text);
  const exact = textMap[normalized];
  const lower = textMap[normalized.toLowerCase()];
  const entry = exact || lower;

  if (!entry || language === 'es') return text;

  return entry[language] || entry.en || text;
};

const isSkippable = (element: Element | null) => {
  if (!element) return true;
  return Boolean(element.closest(SKIP_SELECTOR));
};

const polishTextNodes = (root: ParentNode, language: LanguageCode) => {
  if (language === 'es') return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (isSkippable(parent)) return NodeFilter.FILTER_REJECT;
      const raw = node.nodeValue || '';
      const normalized = normalizeText(raw);
      if (!normalized || normalized.length > 120) return NodeFilter.FILTER_REJECT;
      return textMap[normalized] || textMap[normalized.toLowerCase()]
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  const nodes: Text[] = [];
  let node = walker.nextNode();

  while (node && nodes.length < 320) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }

  nodes.forEach(textNode => {
    const current = textNode.nodeValue || '';
    const replacement = translatedText(current, language);
    if (replacement !== current) {
      const leading = current.match(/^\s*/)?.[0] || '';
      const trailing = current.match(/\s*$/)?.[0] || '';
      textNode.nodeValue = `${leading}${replacement}${trailing}`;
    }
  });
};

const polishInputs = (language: LanguageCode) => {
  if (language === 'es') return;

  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach(input => {
    const placeholder = input.getAttribute('placeholder');
    if (!placeholder) return;
    const replacement = translatedText(placeholder, language);
    if (replacement !== placeholder) input.setAttribute('placeholder', replacement);
  });
};

const installStyles = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html[data-pollazo-language="ru"] [lang="es"],
    html[data-pollazo-language="ru"] [data-lang="es"] {
      speak: normal;
    }
  `;
  document.head.appendChild(style);
};

export default function PollazoLanguagePolish() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    installStyles();

    let frame = 0;
    let lastRun = 0;

    const run = () => {
      frame = 0;
      const language = getLanguage();
      document.documentElement.dataset.pollazoLanguage = language;
      polishTextNodes(document.body, language);
      polishInputs(language);
      lastRun = Date.now();
    };

    const schedule = () => {
      if (frame) return;
      const delay = Math.max(0, 180 - (Date.now() - lastRun));
      frame = window.setTimeout(run, delay) as unknown as number;
    };

    const observer = new MutationObserver(mutations => {
      if (getLanguage() === 'es') return;

      const hasNewContent = mutations.some(mutation => mutation.addedNodes.length > 0);
      if (hasNewContent) schedule();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    schedule();
    window.addEventListener('click', schedule, true);
    window.addEventListener('popstate', schedule);
    window.addEventListener('storage', schedule);

    return () => {
      if (frame) window.clearTimeout(frame);
      observer.disconnect();
      window.removeEventListener('click', schedule, true);
      window.removeEventListener('popstate', schedule);
      window.removeEventListener('storage', schedule);
    };
  }, []);

  return null;
}
