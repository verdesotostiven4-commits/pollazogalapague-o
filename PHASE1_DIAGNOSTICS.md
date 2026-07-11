# Phase 1 diagnostics

Generated from commit: `ba9b1b153d1edea084294eb2707bd2575551267a`

| Check | Result |
|---|---|
| npm ci | PASS |
| TypeScript | FAIL (2) |
| ESLint | FAIL (1) |
| Production build | FAIL (1) |

## npm-ci

```text

added 343 packages, and audited 344 packages in 4s

70 packages are looking for funding
  run `npm fund` for details

18 vulnerabilities (2 low, 8 moderate, 8 high)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
```

## typecheck

```text
  Type 'null' is not assignable to type 'string | undefined'.
src/Cart.tsx(119,24): error TS2322: Type 'string | null | undefined' is not assignable to type 'string | undefined'.
  Type 'null' is not assignable to type 'string | undefined'.
src/components/AdminDashboard.tsx(52,10): error TS2724: '"../utils/whatsapp"' has no exported member named 'buildStatusWhatsAppUrl'. Did you mean 'buildWhatsAppUrl'?
src/components/AdminDashboard.tsx(800,19): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(802,40): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(803,23): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(817,19): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(819,36): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(825,15): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(831,16): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(831,47): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(833,31): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(838,29): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(848,29): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(858,29): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(902,45): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(902,77): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(906,66): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(908,59): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(909,61): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(910,61): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(911,56): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(912,67): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(913,67): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(917,52): error TS2339: Property 'total' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(921,15): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(922,16): error TS2339: Property 'payment_method' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(922,52): error TS2339: Property 'payment_method' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(940,72): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(941,76): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(943,80): error TS2339: Property 'total' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(944,85): error TS2339: Property 'total' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(945,85): error TS2339: Property 'total' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(961,20): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(961,80): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(965,20): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(965,80): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1022,65): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1029,71): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1033,17): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1034,17): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1036,17): error TS2339: Property 'payment_method' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1038,17): error TS2339: Property 'delivery_type' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1039,17): error TS2339: Property 'reference' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1049,34): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1050,34): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1857,82): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1900,76): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1903,41): error TS2339: Property 'lat' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1904,41): error TS2339: Property 'lng' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1906,41): error TS2339: Property 'reference' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1908,39): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1910,23): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1911,24): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1913,73): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1914,59): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1918,30): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1934,85): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1943,54): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1946,34): error TS2339: Property 'membership_applied' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1966,34): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1970,52): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1976,46): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1981,34): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1982,46): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(1996,39): error TS2339: Property 'total' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2000,137): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2002,32): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2006,46): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2011,26): error TS2339: Property 'membership_applied' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2020,40): error TS2339: Property 'bonus_items' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2020,62): error TS2339: Property 'bonus_items' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2027,30): error TS2339: Property 'bonus_items' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2048,44): error TS2339: Property 'payment_method' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2049,45): error TS2339: Property 'payment_method' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2063,32): error TS2339: Property 'delivery_type' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2097,29): error TS2339: Property 'items' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2098,30): error TS2339: Property 'items' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2134,28): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2137,64): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2145,29): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2145,65): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2148,64): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2156,29): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2156,60): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2159,64): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2167,28): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2170,64): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2181,36): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2183,49): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2196,31): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2197,31): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2198,31): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2208,69): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2218,28): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2218,60): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2221,64): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminDashboard.tsx(2230,66): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(268,17): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(268,49): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(271,80): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(274,28): error TS2339: Property 'membership_applied' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(714,73): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(717,45): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(723,49): error TS2339: Property 'bonus_items' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(724,25): error TS2339: Property 'bonus_items' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(726,55): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(726,93): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(731,30): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(742,32): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(742,95): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(745,40): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(745,70): error TS2339: Property 'total' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(750,48): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(788,66): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(795,66): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(804,64): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(811,61): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(812,61): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(814,53): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/AdminPlusPanel.tsx(818,52): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/CartScreen.tsx(198,16): error TS7053: Element implicitly has an 'any' type because expression of type 'LanguageCode' can't be used to index type '{ readonly es: "Tu carrito está vacío"; readonly en: "Your cart is empty"; readonly pt: "Seu carrinho está vazio"; readonly fr: "Votre panier est vide"; readonly de: "Dein Warenkorb ist leer"; ... 4 more ...; readonly ru: "Корзина пуста"; } | ... 100 more ... | { ...; }'.
  Property 'pt' does not exist on type '{ readonly es: "Tu carrito está vacío"; readonly en: "Your cart is empty"; readonly pt: "Seu carrinho está vazio"; readonly fr: "Votre panier est vide"; readonly de: "Dein Warenkorb ist leer"; ... 4 more ...; readonly ru: "Корзина пуста"; } | ... 100 more ... | { ...; }'.
src/components/CartScreen.tsx(198,53): error TS2339: Property 'es' does not exist on type 'never'.
src/components/CartScreen.tsx(244,5): error TS18047: 'ctx' is possibly 'null'.
src/components/CartScreen.tsx(253,7): error TS18047: 'ctx' is possibly 'null'.
src/components/CartScreen.tsx(254,7): error TS18047: 'ctx' is possibly 'null'.
src/components/CartScreen.tsx(255,7): error TS18047: 'ctx' is possibly 'null'.
src/components/CartScreen.tsx(256,7): error TS18047: 'ctx' is possibly 'null'.
src/components/CartScreen.tsx(257,7): error TS18047: 'ctx' is possibly 'null'.
src/components/CartScreen.tsx(258,7): error TS18047: 'ctx' is possibly 'null'.
src/components/CartScreen.tsx(259,7): error TS18047: 'ctx' is possibly 'null'.
src/components/DeliveryDashboard.tsx(22,15): error TS2305: Module '"../types"' has no exported member 'Order'.
src/components/DeliveryDashboard.tsx(83,39): error TS7006: Parameter 'sum' implicitly has an 'any' type.
src/components/DeliveryDashboard.tsx(83,44): error TS7006: Parameter 'item' implicitly has an 'any' type.
src/components/DeliveryDashboard.tsx(97,10): error TS7006: Parameter 'item' implicitly has an 'any' type.
src/components/DeliveryDashboard.tsx(293,30): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(294,34): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(294,75): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(299,30): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(300,50): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(300,107): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(305,64): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(307,46): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(308,45): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(318,36): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(318,60): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(322,27): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(322,68): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(372,68): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(382,53): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(382,84): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(389,62): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(407,29): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(650,51): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(655,39): error TS2339: Property 'lat' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(656,39): error TS2339: Property 'lng' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(658,37): error TS2339: Property 'reference' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(659,33): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(660,60): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(664,28): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(674,126): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(675,32): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(685,43): error TS2339: Property 'created_at' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(694,30): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(703,69): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(784,162): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(793,28): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(796,59): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/DeliveryDashboard.tsx(809,48): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/InstallQrGuideBridge.tsx(2,48): error TS2305: Module '"lucide-react"' has no exported member 'Safari'.
src/components/OrdersScreen.tsx(22,25): error TS2305: Module '"../types"' has no exported member 'Order'.
src/components/OrdersScreen.tsx(502,42): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/OrdersScreen.tsx(507,93): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/OrdersScreen.tsx(508,77): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/OrdersScreen.tsx(517,39): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/OrdersScreen.tsx(524,15): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/OrdersScreen.tsx(526,15): error TS2339: Property 'total' does not exist on type 'ExtendedOrder'.
src/components/OrdersScreen.tsx(527,15): error TS2339: Property 'reference' does not exist on type 'ExtendedOrder'.
src/components/OrdersScreen.tsx(731,45): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/components/OrdersScreen.tsx(738,42): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/OrdersScreen.tsx(738,54): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/OrdersScreen.tsx(746,107): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/SafeOrdersOverlay.tsx(6,25): error TS2305: Module '"../types"' has no exported member 'Order'.
src/components/SafeOrdersOverlay.tsx(146,42): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/components/SafeOrdersOverlay.tsx(158,27): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/SafeOrdersOverlay.tsx(158,53): error TS2339: Property 'total' does not exist on type 'ExtendedOrder'.
src/components/SafeOrdersOverlay.tsx(158,66): error TS2339: Property 'reference' does not exist on type 'ExtendedOrder'.
src/components/SafeOrdersOverlay.tsx(166,68): error TS2339: Property 'total' does not exist on type 'ExtendedOrder'.
src/components/SafeOrdersOverlay.tsx(255,48): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/components/SafeOrdersOverlay.tsx(255,60): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/SafeOrdersOverlay.tsx(259,98): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/components/SafeOrdersOverlay.tsx(262,89): error TS2339: Property 'total' does not exist on type 'ExtendedOrder'.
src/components/SafeOrdersOverlay.tsx(268,237): error TS2304: Cannot find name 'Repeat2'.
src/components/SafeOrdersOverlay.tsx(269,117): error TS2304: Cannot find name 'WHATSAPP_NUMBER'.
src/components/SafeOrdersOverlay.tsx(269,204): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(13,3): error TS2305: Module '"../types"' has no exported member 'AppSettings'.
src/context/AdminContext.tsx(15,3): error TS2305: Module '"../types"' has no exported member 'CustomerMembership'.
src/context/AdminContext.tsx(16,3): error TS2305: Module '"../types"' has no exported member 'ExtraSettings'.
src/context/AdminContext.tsx(17,3): error TS2305: Module '"../types"' has no exported member 'MembershipPayment'.
src/context/AdminContext.tsx(18,3): error TS2305: Module '"../types"' has no exported member 'Order'.
src/context/AdminContext.tsx(19,3): error TS2305: Module '"../types"' has no exported member 'OrderBonusItem'.
src/context/AdminContext.tsx(128,62): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(169,41): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(260,34): error TS2339: Property 'created_at' does not exist on type 'ExtendedCustomer'.
src/context/AdminContext.tsx(261,34): error TS2339: Property 'created_at' does not exist on type 'ExtendedCustomer'.
src/context/AdminContext.tsx(294,29): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(296,24): error TS2339: Property 'payment_method' does not exist on type 'Partial<ExtendedOrder>'.
src/context/AdminContext.tsx(315,29): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(319,24): error TS2339: Property 'payment_method' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(412,25): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(416,16): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(424,30): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(425,26): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(441,16): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(454,30): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(455,26): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(456,23): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(461,41): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(675,17): error TS7006: Parameter 'prev' implicitly has an 'any' type.
src/context/AdminContext.tsx(1453,28): error TS2339: Property 'status' does not exist on type 'CreateOrderInput'.
src/context/AdminContext.tsx(1456,62): error TS2339: Property 'customer_phone' does not exist on type 'CreateOrderInput'.
src/context/AdminContext.tsx(1459,37): error TS2339: Property 'customer_phone' does not exist on type 'CreateOrderInput'.
src/context/AdminContext.tsx(1462,44): error TS2339: Property 'subtotal' does not exist on type 'CreateOrderInput'.
src/context/AdminContext.tsx(1465,55): error TS2339: Property 'delivery_fee' does not exist on type 'CreateOrderInput'.
src/context/AdminContext.tsx(1474,53): error TS2339: Property 'customer_phone' does not exist on type 'CreateOrderInput'.
src/context/AdminContext.tsx(1479,25): error TS2339: Property 'provider' does not exist on type 'CreateOrderInput'.
src/context/AdminContext.tsx(1484,67): error TS2339: Property 'total' does not exist on type 'CreateOrderInput'.
src/context/AdminContext.tsx(1490,28): error TS2339: Property 'bonus_items' does not exist on type 'CreateOrderInput'.
src/context/AdminContext.tsx(1491,33): error TS2339: Property 'vip_gift_message' does not exist on type 'CreateOrderInput'.
src/context/AdminContext.tsx(1492,27): error TS2339: Property 'created_at' does not exist on type 'CreateOrderInput'.
src/context/AdminContext.tsx(1512,62): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1513,46): error TS2339: Property 'total' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1584,51): error TS2339: Property 'status' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1585,55): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1590,9): error TS2353: Object literal may only specify known properties, and 'status' does not exist in type 'Partial<ExtendedOrder>'.
src/context/AdminContext.tsx(1615,17): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1655,55): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1663,32): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1664,34): error TS2339: Property 'order_code' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1665,38): error TS2339: Property 'customer_phone' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1691,40): error TS2339: Property 'bonus_items' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1691,68): error TS2339: Property 'bonus_items' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1702,32): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1711,17): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/context/AdminContext.tsx(1711,37): error TS2339: Property 'id' does not exist on type 'ExtendedOrder'.
src/context/LanguageContext.tsx(58,40): error TS2550: Property 'replaceAll' does not exist on type 'string'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later.
src/context/UserContext.tsx(12,3): error TS2305: Module '"../types"' has no exported member 'CustomerMembership'.
src/utils/productI18n.ts(30,40): error TS2550: Property 'replaceAll' does not exist on type 'string'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later.
```

## lint

```text

> vite-react-typescript-starter@0.0.0 lint
> eslint .


/home/runner/work/pollazogalapague-o/pollazogalapague-o/api/check-memberships.ts
   36:17  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  252:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/api/register-push.ts
   5:10  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  11:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/api/send-push.ts
    6:10  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   35:17  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  541:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/api/verify-panel-pin.ts
  3:10  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/public/index.ts
  13:9  error  Parsing error: '>' expected

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/App.tsx
  205:28  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  241:28  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  276:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/AdminDashboard.tsx
   183:46  error    Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   194:43  error    Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   457:36  error    Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   459:17  error    Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   473:34  error    Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   485:36  error    Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   539:33  error    Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   543:40  error    Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   677:9   warning  The 'safeProducts' logical expression could make the dependencies of useMemo Hook (at line 893) change on every render. Move it inside the useMemo callback. Alternatively, wrap the initialization of 'safeProducts' in its own useMemo() Hook  react-hooks/exhaustive-deps
   678:9   warning  The 'safeCustomers' logical expression could make the dependencies of useMemo Hook (at line 873) change on every render. To fix this, wrap the initialization of 'safeCustomers' in its own useMemo() Hook                                       react-hooks/exhaustive-deps
   678:9   warning  The 'safeCustomers' logical expression could make the dependencies of useMemo Hook (at line 1054) change on every render. To fix this, wrap the initialization of 'safeCustomers' in its own useMemo() Hook                                      react-hooks/exhaustive-deps
   679:9   warning  The 'safeOrders' logical expression could make the dependencies of useEffect Hook (at line 869) change on every render. To fix this, wrap the initialization of 'safeOrders' in its own useMemo() Hook                                           react-hooks/exhaustive-deps
   679:9   warning  The 'safeOrders' logical expression could make the dependencies of useMemo Hook (at line 903) change on every render. To fix this, wrap the initialization of 'safeOrders' in its own useMemo() Hook                                             react-hooks/exhaustive-deps
   679:9   warning  The 'safeOrders' logical expression could make the dependencies of useMemo Hook (at line 936) change on every render. To fix this, wrap the initialization of 'safeOrders' in its own useMemo() Hook                                             react-hooks/exhaustive-deps
   679:9   warning  The 'safeOrders' logical expression could make the dependencies of useMemo Hook (at line 985) change on every render. To fix this, wrap the initialization of 'safeOrders' in its own useMemo() Hook                                             react-hooks/exhaustive-deps
   679:9   warning  The 'safeOrders' logical expression could make the dependencies of useMemo Hook (at line 1054) change on every render. To fix this, wrap the initialization of 'safeOrders' in its own useMemo() Hook                                            react-hooks/exhaustive-deps
   680:9   warning  The 'safeSeasons' logical expression could make the dependencies of useMemo Hook (at line 899) change on every render. Move it inside the useMemo callback. Alternatively, wrap the initialization of 'safeSeasons' in its own useMemo() Hook    react-hooks/exhaustive-deps
  1147:31  error    Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
  2027:53  error    Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
  2098:54  error    Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
  2764:58  error    Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/AdminPlusPanel.tsx
    3:3   error  'AlertTriangle' is defined but never used  @typescript-eslint/no-unused-vars
   16:3   error  'Sparkles' is defined but never used       @typescript-eslint/no-unused-vars
   18:3   error  'Truck' is defined but never used          @typescript-eslint/no-unused-vars
   20:3   error  'X' is defined but never used              @typescript-eslint/no-unused-vars
   90:41  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any
  767:41  error  Unexpected any. Specify a different type   @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/AdminPosCorrectionsLauncher.tsx
  92:6  warning  React Hook useEffect has a missing dependency: 'loadSales'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/AdminPosReportsLauncher.tsx
  156:6  warning  React Hook useEffect has a missing dependency: 'loadReport'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/AdminPosSmartLauncher.tsx
  239:6  warning  React Hook useEffect has a missing dependency: 'register'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/Catalog.tsx
    2:10  error  'ChevronLeft' is defined but never used                @typescript-eslint/no-unused-vars
    2:37  error  'ChevronDown' is defined but never used                @typescript-eslint/no-unused-vars
    2:50  error  'Flame' is defined but never used                      @typescript-eslint/no-unused-vars
   10:7   error  'bestsellers' is assigned a value but never used       @typescript-eslint/no-unused-vars
   64:16  error  'visible' is assigned a value but never used           @typescript-eslint/no-unused-vars
   69:10  error  'carouselIndex' is assigned a value but never used     @typescript-eslint/no-unused-vars
   69:25  error  'setCarouselIndex' is assigned a value but never used  @typescript-eslint/no-unused-vars
  156:55  error  Unexpected any. Specify a different type               @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/CheckoutBusinessRulesBridge.tsx
  201:48  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  202:37  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/InfoScreen.tsx
  368:17  error    React Hook "useLanguage" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return?                                               react-hooks/rules-of-hooks
  639:9   warning  The 'safeAddresses' conditional could make the dependencies of useMemo Hook (at line 655) change on every render. Move it inside the useMemo callback. Alternatively, wrap the initialization of 'safeAddresses' in its own useMemo() Hook  react-hooks/exhaustive-deps

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/LandingPage.tsx
  224:31  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/LocationLiteMapBridge.tsx
  495:31  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  496:14  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/OrdersScreen.tsx
  147:35   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:25   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  155:26   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  159:29   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  164:30   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  178:29   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  193:29   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  197:29   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  197:69   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  211:37   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  231:35   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  253:32   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  266:40   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  376:41   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  406:120  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  455:82   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/PersistentTrackingCenter.tsx
  27:11  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/PollazoPlusProCard.tsx
  64:35  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/PollazoPlusProCardNew.tsx
   11:3  error  'HelpCircle' is defined but never used             @typescript-eslint/no-unused-vars
  230:9  error  'expiresLabel' is assigned a value but never used  @typescript-eslint/no-unused-vars
  231:9  error  'daysLeft' is assigned a value but never used      @typescript-eslint/no-unused-vars

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/SafeOrdersOverlay.tsx
  55:33  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  59:25  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  63:26  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  71:29  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  75:32  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/Testimonials.tsx
  455:19  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/context/AdminContext.tsx
   59:12  error    Unexpected any. Specify a different type                                                                                        @typescript-eslint/no-explicit-any
  141:58  error    Unexpected any. Specify a different type                                                                                        @typescript-eslint/no-explicit-any
  144:46  error    Unexpected any. Specify a different type                                                                                        @typescript-eslint/no-explicit-any
  178:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  765:50  error    Unexpected any. Specify a different type                                                                                        @typescript-eslint/no-explicit-any
  828:33  error    Unexpected any. Specify a different type                                                                                        @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/context/CartContext.tsx
  429:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/context/DarkModeContext.tsx
  20:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/context/FlyToCartContext.tsx
  53:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/context/LanguageContext.tsx
   25:14  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  384:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/context/UserContext.tsx
  1334:14  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/pages/Ranking.tsx
  813:68  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/utils/whatsapp.ts
  1:25  error  'OrderStatus' is defined but never used       @typescript-eslint/no-unused-vars
  6:7   error  'APP_URL' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 99 problems (79 errors, 20 warnings)

```

## build

```text

> vite-react-typescript-starter@0.0.0 build
> vite build

[36mvite v5.4.8 [32mbuilding for production...[36m[39m
transforming...
Browserslist: caniuse-lite is outdated. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
[32m✓[39m 1625 modules transformed.
[31mx[39m Build failed in 4.02s
[31merror during build:
[31msrc/components/AdminDashboard.tsx (52:9): "buildStatusWhatsAppUrl" is not exported by "src/utils/whatsapp.ts", imported by "src/components/AdminDashboard.tsx".[31m
file: [36m/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/AdminDashboard.tsx:52:9[31m
[33m
50: import { supabase, isSupabaseConfigured } from '../lib/supabase';
51: import type { Category, OrderStatus, PaymentStatus } from '../types';
52: import { buildStatusWhatsAppUrl } from '../utils/whatsapp';
             ^
53: import AdminPlusPanel from './AdminPlusPanel';
[31m
    at getRollupError (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/parseAst.js:395:41)
    at error (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/parseAst.js:391:42)
    at Module.error (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:15535:16)
    at Module.traceVariable (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:15984:29)
    at ModuleScope.findVariable (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:13770:39)
    at FunctionScope.findVariable (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:5252:38)
    at FunctionBodyScope.findVariable (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:5252:38)
    at ReturnValueScope.findVariable (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:5252:38)
    at FunctionBodyScope.findVariable (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:5252:38)
    at Identifier.bind (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:5035:40)[39m
```

