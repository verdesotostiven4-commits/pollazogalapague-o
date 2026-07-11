# Phase 1 diagnostics

Generated from commit: `55435ef25d56bf47822dad368d0dc70d5006c4cf`

| Check | Result |
|---|---|
| npm ci | PASS |
| TypeScript | PASS |
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

```

## lint

```text

> vite-react-typescript-starter@0.0.0 lint
> eslint .


/home/runner/work/pollazogalapague-o/pollazogalapague-o/api/check-memberships.ts
   36:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  252:23  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/api/register-push.ts
   5:10  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  11:21  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/api/send-push.ts
    6:10  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   35:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  541:27  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/api/verify-panel-pin.ts
  3:10  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/App.tsx
  205:28  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  241:28  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  276:27  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/AdminDashboard.tsx
   183:46  warning  Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   194:43  warning  Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   457:36  warning  Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   459:17  warning  Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   473:34  warning  Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   485:36  warning  Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   539:33  warning  Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   543:40  warning  Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
   677:9   warning  The 'safeProducts' logical expression could make the dependencies of useMemo Hook (at line 893) change on every render. Move it inside the useMemo callback. Alternatively, wrap the initialization of 'safeProducts' in its own useMemo() Hook  react-hooks/exhaustive-deps
   678:9   warning  The 'safeCustomers' logical expression could make the dependencies of useMemo Hook (at line 873) change on every render. To fix this, wrap the initialization of 'safeCustomers' in its own useMemo() Hook                                       react-hooks/exhaustive-deps
   678:9   warning  The 'safeCustomers' logical expression could make the dependencies of useMemo Hook (at line 1054) change on every render. To fix this, wrap the initialization of 'safeCustomers' in its own useMemo() Hook                                      react-hooks/exhaustive-deps
   679:9   warning  The 'safeOrders' logical expression could make the dependencies of useEffect Hook (at line 869) change on every render. To fix this, wrap the initialization of 'safeOrders' in its own useMemo() Hook                                           react-hooks/exhaustive-deps
   679:9   warning  The 'safeOrders' logical expression could make the dependencies of useMemo Hook (at line 903) change on every render. To fix this, wrap the initialization of 'safeOrders' in its own useMemo() Hook                                             react-hooks/exhaustive-deps
   679:9   warning  The 'safeOrders' logical expression could make the dependencies of useMemo Hook (at line 936) change on every render. To fix this, wrap the initialization of 'safeOrders' in its own useMemo() Hook                                             react-hooks/exhaustive-deps
   679:9   warning  The 'safeOrders' logical expression could make the dependencies of useMemo Hook (at line 985) change on every render. To fix this, wrap the initialization of 'safeOrders' in its own useMemo() Hook                                             react-hooks/exhaustive-deps
   679:9   warning  The 'safeOrders' logical expression could make the dependencies of useMemo Hook (at line 1054) change on every render. To fix this, wrap the initialization of 'safeOrders' in its own useMemo() Hook                                            react-hooks/exhaustive-deps
   680:9   warning  The 'safeSeasons' logical expression could make the dependencies of useMemo Hook (at line 899) change on every render. Move it inside the useMemo callback. Alternatively, wrap the initialization of 'safeSeasons' in its own useMemo() Hook    react-hooks/exhaustive-deps
  1147:31  warning  Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
  2027:53  warning  Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
  2098:54  warning  Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any
  2764:58  warning  Unexpected any. Specify a different type                                                                                                                                                                                                         @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/AdminPlusPanel.tsx
    3:3   warning  'AlertTriangle' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
   16:3   warning  'Sparkles' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars
   18:3   warning  'Truck' is defined but never used. Allowed unused vars must match /^_/u          @typescript-eslint/no-unused-vars
   20:3   warning  'X' is defined but never used. Allowed unused vars must match /^_/u              @typescript-eslint/no-unused-vars
   90:41  warning  Unexpected any. Specify a different type                                         @typescript-eslint/no-explicit-any
  767:41  warning  Unexpected any. Specify a different type                                         @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/AdminPosCorrectionsLauncher.tsx
  92:6  warning  React Hook useEffect has a missing dependency: 'loadSales'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/AdminPosReportsLauncher.tsx
  156:6  warning  React Hook useEffect has a missing dependency: 'loadReport'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/AdminPosSmartLauncher.tsx
  239:6  warning  React Hook useEffect has a missing dependency: 'register'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/Catalog.tsx
    2:10  warning  'ChevronLeft' is defined but never used. Allowed unused vars must match /^_/u                @typescript-eslint/no-unused-vars
    2:37  warning  'ChevronDown' is defined but never used. Allowed unused vars must match /^_/u                @typescript-eslint/no-unused-vars
    2:50  warning  'Flame' is defined but never used. Allowed unused vars must match /^_/u                      @typescript-eslint/no-unused-vars
   10:7   warning  'bestsellers' is assigned a value but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars
   64:16  warning  'visible' is assigned a value but never used. Allowed unused vars must match /^_/u           @typescript-eslint/no-unused-vars
   69:10  warning  'carouselIndex' is assigned a value but never used. Allowed unused vars must match /^_/u     @typescript-eslint/no-unused-vars
   69:25  warning  'setCarouselIndex' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  156:55  warning  Unexpected any. Specify a different type                                                     @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/CheckoutBusinessRulesBridge.tsx
  201:48  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  202:37  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/InfoScreen.tsx
  368:17  error    React Hook "useLanguage" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return?                                               react-hooks/rules-of-hooks
  639:9   warning  The 'safeAddresses' conditional could make the dependencies of useMemo Hook (at line 655) change on every render. Move it inside the useMemo callback. Alternatively, wrap the initialization of 'safeAddresses' in its own useMemo() Hook  react-hooks/exhaustive-deps

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/LandingPage.tsx
  224:31  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/LocationLiteMapBridge.tsx
  495:31  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  496:14  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/OrdersScreen.tsx
  147:35   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:25   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  155:26   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  159:29   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  164:30   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  178:29   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  193:29   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  197:29   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  197:69   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  211:37   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  231:35   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  253:32   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  266:40   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  376:41   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  406:120  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  455:82   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/PersistentTrackingCenter.tsx
  27:11  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/PollazoPlusProCard.tsx
  64:35  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/PollazoPlusProCardNew.tsx
   11:3  warning  'HelpCircle' is defined but never used. Allowed unused vars must match /^_/u             @typescript-eslint/no-unused-vars
  230:9  warning  'expiresLabel' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  231:9  warning  'daysLeft' is assigned a value but never used. Allowed unused vars must match /^_/u      @typescript-eslint/no-unused-vars

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/SafeOrdersOverlay.tsx
  56:33  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  60:25  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  64:26  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  72:29  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  76:32  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/components/Testimonials.tsx
  455:19  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/home/runner/work/pollazogalapague-o/pollazogalapague-o/src/context/AdminContext.tsx
   59:12  warning  Unexpected any. Specify a different type                                                                                        @typescript-eslint/no-explicit-any
  141:58  warning  Unexpected any. Specify a different type                                                                                        @typescript-eslint/no-explicit-any
  144:46  warning  Unexpected any. Specify a different type                                                                                        @typescript-eslint/no-explicit-any
  178:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  765:50  warning  Unexpected any. Specify a different type                                                                                        @typescript-eslint/no-explicit-any
  828:33  warning  Unexpected any. Specify a different type                                                                                        @typescript-eslint/no-explicit-any

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
  813:68  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 96 problems (1 error, 95 warnings)

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
[2mdist/[22m[2massets/[22m[36mindex-AWunA08K.js   [39m[1m[33m1,963.64 kB[39m[22m[2m │ gzip: 544.45 kB[22m
[33m
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m
[32m✓ built in 6.79s[39m
```

