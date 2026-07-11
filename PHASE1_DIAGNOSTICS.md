# Phase 1 diagnostics

Generated from commit: `249760504ac2b808180da3ca82c290df6f159c29`

| Check | Result |
|---|---|
| npm ci | PASS |
| TypeScript | FAIL (2) |
| ESLint | FAIL (1) |
| Production build | PASS |

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

> vite-react-typescript-starter@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json

src/components/CartScreen.tsx(244,5): error TS18047: 'context' is possibly 'null'.
src/components/CartScreen.tsx(253,7): error TS18047: 'context' is possibly 'null'.
src/components/CartScreen.tsx(254,7): error TS18047: 'context' is possibly 'null'.
src/components/CartScreen.tsx(255,7): error TS18047: 'context' is possibly 'null'.
src/components/CartScreen.tsx(256,7): error TS18047: 'context' is possibly 'null'.
src/components/CartScreen.tsx(257,7): error TS18047: 'context' is possibly 'null'.
src/components/CartScreen.tsx(258,7): error TS18047: 'context' is possibly 'null'.
src/components/CartScreen.tsx(259,7): error TS18047: 'context' is possibly 'null'.
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
  56:33  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  60:25  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  64:26  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  72:29  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  76:32  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

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
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m   11.39 kB[22m[1m[22m[2m │ gzip:   3.12 kB[22m
[2mdist/[22m[2massets/[22m[35mindex-Dm6avVHR.css  [39m[1m[2m  190.41 kB[22m[1m[22m[2m │ gzip:  27.21 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-Ce4fvbch.js   [39m[1m[33m1,963.64 kB[39m[22m[2m │ gzip: 544.44 kB[22m
[33m
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m
[32m✓ built in 6.53s[39m
```

