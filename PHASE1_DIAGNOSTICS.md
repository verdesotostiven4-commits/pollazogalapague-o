# Phase 1 diagnostics

Generated from commit: `8e185d3479e3fab34eb343b4fbd604297749fd8f`

| Check | Result |
|---|---|
| npm ci | PASS |
| TypeScript | FAIL (2) |
| ESLint | FAIL (1) |
| Production build | FAIL (1) |

## npm-ci

```text

added 343 packages, and audited 344 packages in 3s

70 packages are looking for funding
  run `npm fund` for details

18 vulnerabilities (2 low, 8 moderate, 8 high)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
```

## typecheck

```text

> vite-react-typescript-starter@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json

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
src/components/InstallQrGuideBridge.tsx(2,48): error TS2305: Module '"lucide-react"' has no exported member 'Safari'.
src/components/SafeOrdersOverlay.tsx(268,237): error TS2304: Cannot find name 'Repeat2'.
src/components/SafeOrdersOverlay.tsx(269,117): error TS2304: Cannot find name 'WHATSAPP_NUMBER'.
src/context/LanguageContext.tsx(58,40): error TS2550: Property 'replaceAll' does not exist on type 'string'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later.
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

✖ 97 problems (77 errors, 20 warnings)

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
[31mx[39m Build failed in 3.97s
[31merror during build:
[31msrc/components/InstallQrGuideBridge.tsx (2:47): "Safari" is not exported by "node_modules/lucide-react/dist/esm/lucide-react.js", imported by "src/components/InstallQrGuideBridge.tsx".[31m
file: [36m/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/InstallQrGuideBridge.tsx:2:47[31m
[33m
1: import { useEffect, useMemo, useState } from 'react';
2: import { ChevronRight, Download, Home, QrCode, Safari, Smartphone, Sparkles, X } from 'lucide-react';
                                                  ^
3: 
4: const INSTALL_PATH = '/instalar';
[31m
    at getRollupError (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/parseAst.js:395:41)
    at error (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/parseAst.js:391:42)
    at Module.error (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:15535:16)
    at Module.traceVariable (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:15984:29)
    at ModuleScope.findVariable (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:13770:39)
    at FunctionScope.findVariable (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:5252:38)
    at FunctionBodyScope.findVariable (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:5252:38)
    at Identifier.bind (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:5035:40)
    at CallExpression.bind (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:2851:28)
    at CallExpression.bind (file:///home/runner/work/pollazogalapague-o/pollazogalapague-o/node_modules/rollup/dist/es/shared/node-entry.js:11235:15)[39m
```

