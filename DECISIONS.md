# DECISIONS.md

This document captures the architectural and tooling decisions made for NetPulse. Each entry follows the format: **what we chose, what we rejected, why, and when to revisit.** New decisions are appended; existing ones are updated rather than rewritten.

---

## 1. Folder structure: feature-based with public APIs

**Chosen:** Feature-based folder structure where each feature (`auth`, `dashboard`, `incidents`, `reports`) owns its own components, hooks, API calls, slice, and types. Cross-feature primitives live in `shared/`. Each feature exposes a public API via its `index.ts` — internals are not directly importable by other features.

**Rejected:** Type-based structure (top-level `components/`, `hooks/`, `utils/`, `pages/`).

**Why:**

- Code that changes together should live together. Adding a feature touches one folder, not five.
- Deletion is easy — `rm -rf features/incidents` removes the feature cleanly. Type-based codebases accrete dead code because no one knows what's safe to delete.
- Feature boundaries map to ownership boundaries on a real team. This scales with headcount.
- Public APIs via `index.ts` enforce module boundaries without runtime cost. We additionally enforce this with an ESLint rule (see decision #5).

**Revisit when:** never expected to revisit unless the project becomes a true monorepo with separately deployed packages, in which case features may graduate to `packages/`.

---

## 2. Package manager: pnpm

**Chosen:** pnpm.

**Rejected:** npm, yarn (classic and berry).

**Why:**

- Disk-efficient via content-addressable store — large monorepos save gigabytes.
- Strict by default: a package can only import dependencies it explicitly declares in `package.json`. npm and yarn allow phantom dependencies (importing transitive deps), which silently break when a transitive version changes.
- Faster install times than npm/yarn classic.
- Symlink-based `node_modules` structure makes module resolution problems easier to debug.

**Revisit when:** pnpm's strictness becomes a blocker for an unmaintained dependency. Mitigation: `public-hoist-pattern` in `.npmrc` for the specific case.

---

## 3. TypeScript transpilation: Babel for build, tsc for type-checking

**Chosen:** Babel (via `babel-loader` in webpack) handles TS-to-JS transpilation. `tsc --noEmit` runs separately as a type checker, both in dev (via `pnpm type-check`) and as a pre-commit hook.

**Rejected:** `ts-loader` (single-process transpilation + type-checking inside webpack).

**Why:**

- Babel is faster and parallel-friendly. It transpiles each file in isolation and never blocks the bundler on type-checking.
- Type-checking as a separate process means slow type-checks don't slow dev rebuilds. The dev server stays fast even on a large codebase.
- This split is the modern convention. Vite, Next.js, and Remix all do the same internally.
- The cost: `tsc` is the only thing that catches type errors, so we must run it explicitly. We do, in pre-commit and CI.

**Revisit when:** project becomes small enough that single-process `ts-loader` simplicity outweighs the speed difference (very unlikely on a real product).

---

## 4. TypeScript strictness: every relevant flag on

**Chosen:** Full strict mode plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`.

**Rejected:** Default `strict: true` only.

**Why each non-default flag earns its place:**

- `**noUncheckedIndexedAccess`** — `arr[0]` becomes `T | undefined`. Forces nullish handling on indexed access, which is where real bugs hide. Annoying at first, prevents production crashes.
- `**exactOptionalPropertyTypes`** — distinguishes `{ name?: string }` (property may be missing) from `{ name: string | undefined }` (property is present, value may be undefined). Most codebases conflate these and ship subtle bugs.
- `**noPropertyAccessFromIndexSignature`** — forces `obj["key"]` for indexed access on `Record<string, T>`, preventing accidental treating of dynamic objects as typed ones.
- `**noImplicitOverride**` — class methods overriding a parent must use the `override` keyword. Prevents accidental shadowing.

**Revisit when:** never. Stricter is better; junior contributors learn faster on strict configs than on loose ones.

---

## 5. Module resolution: dropped `baseUrl`, kept `paths` with relative targets

**Chosen:** No `baseUrl` in `tsconfig.json`. Path aliases (`@app/`*, `@features/`*, `@shared/*`, `@pages/*`) declared in `paths` with explicit `./src/...` relative targets.

**Rejected:** Legacy `baseUrl: "."` + non-relative path targets.

**Why:**

- TypeScript 5.5+ deprecated `baseUrl` because it created an implicit module resolution mode that conflicted with how modern bundlers work.
- With `"moduleResolution": "bundler"`, `paths` resolve correctly relative to `tsconfig.json` without needing `baseUrl`.
- Forces explicitness: relative paths now require `./`, anything else is unambiguously a node module.

**Revisit when:** `baseUrl` is fully removed in TS 7.0 — at that point this will already be correct.

---

## 6. ESLint version: pinned to v9 (not v10)

**Chosen:** ESLint `^9`.

**Rejected:** ESLint v10 (the latest major).

**Why:**

- ESLint v10 changed the rule context API — `getFilename()` was removed, replaced by direct properties.
- `eslint-plugin-react@7.x` (the current major) doesn't yet support v10's API, throwing runtime errors when rules execute.
- v9 is still actively supported and is the version most production codebases run in 2026.
- Flat config is preserved on v9, so we don't lose any modernization.

**Revisit when:** `eslint-plugin-react@8` (or whichever version supports ESLint v10) ships and is stable. Plan: bump ESLint to v10, run lint suite, fix any rule deprecations.

---

## 7. ESLint configuration format: flat config (`eslint.config.js`)

**Chosen:** Flat config (`eslint.config.js`, ESM).

**Rejected:** Legacy `.eslintrc.cjs` format.

**Why:**

- Flat config is the future of ESLint. Legacy `.eslintrc` is in deprecation runway and will be removed in a future major.
- Explicit imports beat string-based `extends` resolution. Easier to reason about, easier to debug when something goes wrong.
- Plugin configuration is direct — no hidden plugin loading magic.
- Single array of config objects is conceptually simpler than the cascading-files model.

**Revisit when:** never. This is the direction the ecosystem is moving.

---

## 8. Feature boundary enforcement via ESLint

**Chosen:** `no-restricted-imports` rule blocking deep imports into feature internals. Features must be imported via their `index.ts` public API.

**Rejected:** Convention-only enforcement (rely on developers to do the right thing).

**Why:**

- Conventions break under deadline pressure. Lint rules don't.
- Explicit module boundaries enable confident refactoring of feature internals — anything not in `index.ts` is private and can change freely.
- Catches the violation at PR time, not after months of accumulated coupling.
- Senior interview soundbite: *"I enforce module boundaries with ESLint, not just folder convention."*

**Revisit when:** the project grows large enough to benefit from a true monorepo split with package-level boundaries — at which point this rule becomes redundant.

---

## 9. ESLint TypeScript resolver: `eslint-import-resolver-typescript`

**Chosen:** `eslint-import-resolver-typescript` configured in `import/resolver` settings.

**Rejected:** Node default resolver only (cannot understand TS path aliases).

**Why:**

- `eslint-plugin-import` is resolver-agnostic by design. We have to install the TS resolver ourselves to make `import/`* rules understand `@app/`*, `@features/`*, etc.
- Without it, `import/no-cycle`, `import/no-self-import`, and ordering rules can't analyze our import graph.
- Standard convention; required by every TS project that uses `import/*` rules.

**Revisit when:** never.

---

## 10. Prettier: read-only check vs write are separate scripts

**Chosen:** Two scripts. `format` writes (`prettier --write`), `format:check` is read-only (`prettier --check`).

**Rejected:** A single `format` script that does both.

**Why:**

- Different consumers. CI needs read-only verification (fail builds on unformatted code). Developers need write (fix files locally).
- A single script that writes during CI would mask the fact that the developer forgot to format — it would silently fix and pass.
- Junior teams often conflate these; senior teams don't.

**Revisit when:** never.

---

## 11. Pre-commit hook: lint-staged + full type-check

**Chosen:** Husky `pre-commit` hook runs `lint-staged` (ESLint + Prettier on staged files) followed by `tsc --noEmit` (full project type-check).

**Rejected:** `lint-staged` alone; or pre-push instead of pre-commit; or no hook at all.

**Why:**

- `lint-staged` keeps the staged-files pass fast — only changed files are linted/formatted.
- Type-check runs against the whole project because **a type error in file A can be caused by a change in file B**. There's no such thing as "type-check only the staged files" that's actually correct.
- Pre-commit (not pre-push) catches problems before they enter history. A reverted commit is easier than a force-push.
- This is "the ratchet": once strict, only gets stricter.

**Revisit when:** type-check time on the pre-commit hook exceeds ~5 seconds and starts hurting developer flow. Mitigation: incremental type-checking with project references.

---

## 12. Style choices: semicolons, single quotes, 100-char width

**Chosen:** Semicolons on, single quotes in JS/TS, double quotes in JSX, trailing commas everywhere, 100-char line width, LF endings.

**Rejected:** No-semicolons, double-quote-everywhere, 80- or 120-char widths.

**Why:**

- These are consistency choices, not technical ones. The actual decision is "we have a Prettier config and everyone follows it" — the specific values are less important than the existence of a config.
- 100 chars is a middle ground between 80 (too narrow on modern displays) and 120 (hard to read on split panes).
- Semicolons-on side-steps the ASI footguns. They're rare in practice but real, and the senior-team convention skews toward semicolons.
- LF endings to avoid Windows/Unix CRLF churn in diffs.

**Revisit when:** never (changing these later creates massive PR diffs that pollute git blame).

---

## 13. Webpack split: `common` + `dev` + `prod` via `webpack-merge`

**Chosen:** Three webpack config files — `webpack.common.js` (shared), `webpack.dev.js`, `webpack.prod.js` — composed via `webpack-merge`.

**Rejected:** Single `webpack.config.js` with `if (env.production)` branches.

**Why:**

- Composition is clearer than conditionals. You read each file top-to-bottom; you don't trace through `if` branches to see what's active.
- Each config has a single responsibility — common contains what's truly shared, the others contain only their environment's overrides.
- `webpack-merge` knows how to deep-merge `module.rules` and `plugins` correctly. Hand-merging is error-prone.

**Revisit when:** never.

---

## 14. Loaders vs plugins (mental model documented)

**Decision:** Document the loader-vs-plugin distinction here so it's permanent reference.

- **Loaders transform individual files.** They take a file's contents in, produce JS modules out. Example: babel-loader transforms TS to JS, css-loader transforms CSS to a JS module that exports the parsed CSS.
- **Plugins hook into the build lifecycle.** They do whatever doesn't fit "transform one file" — generate HTML, extract CSS to separate files, copy static assets, analyze bundles.

**Why this matters:** when you need a feature, knowing which category it falls into tells you what package to look for. If it's "do something with each file matching a pattern," it's a loader. If it's "do something at a build stage," it's a plugin.

---

## 15. Default exports banned in source code

**Chosen:** Named exports only. Default exports allowed solely for top-level framework entry points where they're required (Webpack config files, route component conventions).

**Rejected:** Default exports as the convention for components.

**Why:**

- Named exports preserve identity through imports (the imported name matches the export name). Default exports lose their name and create rename inconsistency across files.
- Tree-shaking works better with named exports — bundlers can statically analyze which named exports are used.
- Refactoring tools (rename symbol, find references) work correctly with named exports. Default exports break them.
- Catches typos at import-time: `import { Apo } from './App'` is an error; `import Apo from './App'` silently works because the name is local.

**Revisit when:** never.

---

## 16. Source map: `eval-cheap-module-source-map` for dev

**Chosen:** `eval-cheap-module-source-map` in dev. (Prod choice deferred to Day 17.)

**Why:**

- Fast rebuilds (uses `eval()` to wrap modules).
- Line-accurate (not column-accurate — "cheap") — fine for dev, would be unacceptable for prod errors.
- Maps to original source ("module") — debugger shows your TS, not the transpiled JS.
- Industry-standard dev choice.

**Revisit when:** Day 17 when we choose the production source map flavor.

---

## 17. Production source maps: `source-map` (separate files)

**Chosen:** `devtool: 'source-map'` in production — full-fidelity source maps as `.map` files.

**Why:**

- Production errors must be column-accurate. Stack traces from real user errors need precise location.
- `.map` files can be uploaded to error reporting services (Sentry, Rollbar) and excluded from public CDN if desired.
- The build is slower than dev's `eval-cheap-module-source-map`, but build time isn't a hot path in CI.

**Revisit when:** never expected.

---

## 18. Cache strategy: content-hashed assets, fresh HTML

**Chosen:** All static assets use `[contenthash:8]` in their filename. `index.html` is unhashed.

**Why:**

- Hashed asset filenames enable infinite cache lifetimes `Cache-Control: max-age=31536000, immutable`). Browser never re-fetches an asset with the same hash.
- One-byte change → new hash → new URL → automatic cache bust.
- `index.html` is always fetched fresh because it's the entry point that resolves the current set of asset URLs.
- This is the universal pattern for modern static site hosting.

**Revisit when:** never.

---

## 19. Code splitting strategy: vendors + common + runtime

**Chosen:** SplitChunks with `vendors` (node_modules), `common` (modules used 2+ times), and a separate `runtime` chunk.

**Why:**

- Vendors change rarely; isolating them gives long-lived cache hits across deploys.
- Common chunks deduplicate code shared between routes.
- Runtime chunk separation prevents the small webpack bootstrap from invalidating the vendor cache when *anything* in your app changes.
- Defaults from CRA/Next.js do similar things; we make ours explicit and tunable.

**Revisit when:** profiling shows a specific cache or load-time problem the current strategy doesn't address.

---

## 20. CSS pipeline: style-loader (dev) vs MiniCssExtractPlugin (prod)

**Chosen:** Dev uses `style-loader` (CSS injected as `<style>` tags by JS). Prod uses `mini-css-extract-plugin` (real `.css` files referenced by `<link>` tags).

**Why dev = inline:** `style-loader` supports HMR for CSS — edit a CSS file, see the change instantly without reload. `MiniCssExtractPlugin` doesn't support HMR.

**Why prod = extracted:** parallel browser download (CSS doesn't block JS parse), proper caching of CSS separately, no FOUC because CSS applies before JS runs.

**Revisit when:** never.

---

## 21. Build-time configuration via `DefinePlugin` + `dotenv`

**Chosen:** Environment variables are loaded from `.env` via `dotenv`, then injected into source code at build time via Webpack's `DefinePlugin`.

**Why:**

- Browsers have no `process.env`. `DefinePlugin` does build-time string substitution, replacing `process.env.X` with the literal value.
- Only build-time values are exposed; runtime secrets must come from a backend.
- `.env.example` is committed (documents required vars). `.env` is gitignored (local values).

**Revisit when:** runtime configuration is needed (e.g., per-tenant config served from an API). At that point, switch to fetching config at app boot.

---

## 22. Browserslist for production-vs-dev targeting

**Chosen:** Two `browserslist` configs in `package.json` — wide modern-browser coverage in prod, evergreen-only in dev.

**Why:**

- Prod build down-levels for real-world browsers `>0.2%, not dead, not op_mini all`).
- Dev skips most down-leveling `last 1 chrome/firefox/safari`) for faster compile.
- `@babel/preset-env` reads browserslist automatically when no explicit `targets` is set.

**Revisit when:** analytics show our prod target list is missing real users, or modernizing eliminates a browser we no longer need to support.

---

## 23. Cross-platform env vars in npm scripts: `cross-env`

**Chosen:** `cross-env` for inline env-var assignment in npm scripts.

**Rejected:** Bash-style `VAR=value command` (breaks on Windows cmd/PowerShell), or maintaining separate Windows/Unix scripts.

**Why:**

- The bash-style syntax is the most natural for setting env vars in scripts but is fundamentally non-portable.
- `cross-env` works identically on every OS and is essentially the de facto standard for this in the JS ecosystem.
- Avoids a class of "works on my machine" bugs at near-zero cost.

**Revisit when:** Node ships first-class cross-platform env support in npm scripts (proposed but not landed as of 2026).

---

## 24. Build mode propagation: explicit `BABEL_ENV` + `NODE_ENV` in scripts

**Chosen:** Set both `BABEL_ENV` and `NODE_ENV` explicitly in every npm script (via `cross-env`). Babel's plugin gating uses a whitelist check (`=== 'development'`), not a blacklist (`!== 'production'`).

**Rejected:** Relying on Webpack's `mode` flag to propagate to Babel's process; or blacklist gating on `NODE_ENV`.

**Why:**

- Babel and Webpack are separate processes that don't share config state. Webpack's `mode: 'production'` does not set Babel's environment.
- Without explicit env vars, Babel reads `undefined`, which a blacklist check (`!== 'production'`) treats as "development" — so dev-only plugins like `react-refresh/babel` get applied to production builds, crashing the app at runtime with `$RefreshSig$ is not defined`.
- Whitelist gating is safer: the failure mode is "dev plugin not applied" (works in prod, slightly degraded dev), instead of "dev plugin applied to prod" (production crash).

**Revisit when:** never expected.

---

## 25. Router definition: `createBrowserRouter` (data router API)

**Chosen:** `createBrowserRouter` + `RouterProvider`.

**Rejected:** Legacy `<BrowserRouter>` + `<Routes>` JSX-based config.

**Why:**

- The data router API (v6.4+) is the future of React Router. It supports loaders, actions, deferred data, and proper error boundaries.
- Configuring routes as a data structure (not JSX) makes them inspectable, testable, and easier to generate from metadata.
- The legacy `<BrowserRouter>` API still works but is feature-frozen. Tutorials default to it; production codebases are migrating away.

**Revisit when:** never expected.

---

## 26. Route-level code splitting via `React.lazy`

**Chosen:** Every page component imported via `React.lazy(() => import(...))`. Each page becomes its own webpack chunk automatically.

**Rejected:** Eager imports of all pages.

**Why:**

- First page load only fetches the chunks needed for the visible route. Other pages are fetched on demand.
- Combined with Day 17's `splitChunks` config, this produces a granular chunk graph: vendors + main + per-route chunks.
- The `.then((m) => ({ default: m.X }))` mapping is needed because we use named exports (Decision #15) and `React.lazy` requires a default export.
- Each route is wrapped in its own `<Suspense>` so navigation loading states stay scoped to the content area, not the whole layout.

**Revisit when:** never.

---

## 27. Layout-as-parent-route composition

**Chosen:** Layouts (`AppLayout`, `AuthLayout`) are parent routes whose children inherit the layout via `<Outlet />`. Routes are grouped by layout, not flat.

**Rejected:** Per-page `<Layout><Page /></Layout>` wrapping.

**Why:**

- DRY: layout chrome is defined once, not duplicated per page.
- Idiomatic React Router v6 — the layout-route pattern is the official recommended approach.
- Switching layouts becomes a one-line change in the router config.

**Revisit when:** never.

---

## 28. Protected & public route redirects (UPDATED — see also Decision #28-rev)

**Original (#28):** ProtectedRoute passes `state.from`; LoginPage reads it imperatively after login.

**Revised:** PublicOnlyRoute itself reads `state.from` and redirects there when an authenticated user lands on a public-only route. LoginPage no longer navigates.

**Why the revision:**

- The original had a same-tick race condition: `login()` flipped auth state, the imperative `navigate(from)` was queued, but PublicOnlyRoute re-rendered first during commit and redirected to `/dashboard` declaratively — superseding the imperative call.
- The revised pattern eliminates the race by making PublicOnlyRoute the single source of truth for post-login destination. LoginPage becomes a pure auth mutation; routing logic lives in the route guard.
- General lesson: **declarative routing in render beats imperative routing in event handlers** when both are responding to the same state change. If the state change implies the navigation, render it; don't call it.

**Revisit when:** never expected.

---

## 29. Mock auth via `useSyncExternalStore`

**Chosen:** Mock auth state implemented as a module-level value with subscribe/notify, exposed through `useSyncExternalStore`.

**Rejected:** A `useState` + manual event listener pattern.

**Why:**

- `useSyncExternalStore` is React 18's official primitive for subscribing to external stores. It avoids tearing during concurrent renders — `useState` + manual listeners can produce inconsistent UI in concurrent mode.
- Demonstrates the pattern that Redux and Zustand implement at scale.
- This entire mock is throwaway — Day 19 replaces it with the real auth store. The abstraction (the `useAuth` shape) survives.

**Revisit when:** the mock is replaced (Day 19)

---

## 30. App composition root: `App.tsx` is one line

**Chosen:** `App.tsx` renders `<AppRouter />` and nothing else. All app composition lives in `AppRouter.tsx`.

**Rejected:** Doing routing logic inside `App.tsx`.

**Why:**

- `App.tsx` is the composition root. Its job is to assemble top-level concerns (router, providers, error boundaries) — not to be a feature.
- Easier to test: `App.tsx` is trivially renderable; routing logic is in `AppRouter.tsx` which can be tested with a memory router.
- Easier to extend: adding global providers later (Redux store, theme, error boundary) is a one-line wrap in `App.tsx`, not surgery in a routing file.

**Revisit when:** never.

---

## 31. Token storage: in-memory access + simulated httpOnly refresh

**Chosen:** Access token in memory (module-level variable). Refresh token in localStorage with a comment marking the production swap point to httpOnly cookies.

**Rejected:** Both tokens in localStorage; both in memory; sessionStorage.

**Why:**

- Access tokens in memory are XSS-safe (no script can read them — they're not exposed to any global).
- Refresh tokens belong in httpOnly Secure SameSite=Strict cookies in production. Client never sees them; server sets them on login, clears on logout, attaches them automatically on /refresh requests.
- localStorage is used here ONLY because there's no backend to set cookies. The storage module's interface (`setRefreshToken`/`getRefreshToken`) doesn't change when wired to a real backend; only the storage layer does.
- Trade-off accepted for the mock: refresh token is XSS-readable. In production this is unacceptable; for a local dev demo, the threat model doesn't include XSS in our own bundle.

**Revisit when:** wiring a real backend. The change is local to `tokenStorage.ts`.

---

## 32. HTTP client: fetch-based wrapper, not axios

**Chosen:** Custom fetch wrapper with `skipAuth` opt-out, `HttpError` class, and refresh-on-401 logic.

**Rejected:** axios.

**Why:**

- RTK Query (which we'll add later) uses fetch under the hood — keeping our HTTP layer fetch-aligned makes integration cleaner.
- ~15KB bundle savings vs axios.
- Writing the interceptor pattern from scratch teaches the pattern, not an axios feature. Transferable knowledge.
- `HttpError` subclass enables `instanceof` checks for status-aware error handling.

**Revisit when:** never expected.

---

## 33. Refresh strategy: reactive, single-flight

**Chosen:** Refresh on 401 (reactive). Single-flight: concurrent 401s share one in-flight refresh promise via a module-level promise variable.

**Rejected:** Proactive refresh (decode JWT, schedule a timer ahead of expiry); naive refresh (each 401 triggers its own refresh).

**Why:**

- Reactive is simpler and works for typical access token TTLs.
- Single-flight is non-negotiable: rotating refresh tokens (the modern security pattern) invalidate the previous refresh token on use. Without single-flight, parallel 401s trigger parallel refreshes; only the first succeeds; the rest see "invalid refresh token" and force a logout.
- Proactive refresh is a Week 6 polish item if needed — adds timer management complexity for a smoother UX.

**Revisit when:** UX feedback indicates the brief 401 → refresh → retry latency is noticeable.

---

## 34. Auth state in Redux Toolkit, UI state in Zustand

**Chosen:** Redux Toolkit for auth (slice, thunks, selectors). Zustand reserved for ephemeral UI state (Day 20).

**Rejected:** Putting both in Redux; putting both in Zustand; using only Context.

**Why:**

- Auth is shared, persistent, multi-component, side-effectful — Redux's strengths.
- Redux DevTools time-travel for auth state transitions is a powerful debugging asset.
- Zustand is unbeatable for ephemeral UI state (modals, sidebars, theme): less ceremony than Redux for state with simple mutation patterns.
- Having both in the project demonstrates judgment when an interviewer asks "when do you reach for Redux vs Zustand?"

**Revisit when:** never expected.

---

## 35. State machine over booleans for auth status

**Chosen:** `status: 'idle' | 'authenticating' | 'authenticated' | 'error'` as a string union.

**Rejected:** Booleans (`isLoading`, `isAuthenticated`, `hasError`).

**Why:**

- String unions make impossible states unrepresentable. With booleans, `(isLoading && hasError)` is a code path that shouldn't exist but can; with a status field, it can't be both.
- Single source of truth for "what's happening with auth right now."
- Simplifies UI logic: `status === 'authenticating'` is a clear branch; `(isLoading && !hasError && !isAuthenticated)` is a guess.

**Revisit when:** never

---

## 36. HTTP layer ↔ Redux decoupling via DOM events

**Chosen:** When refresh fails, the HTTP client dispatches a `CustomEvent('auth:logout')`. A listener mounted in `App.tsx` translates the event into a Redux `authReset` action.

**Rejected:** Importing the Redux store into the HTTP client; passing `dispatch` as a parameter into the HTTP layer.

**Why:**

- The HTTP layer should be agnostic of state management. It exists below feature code in the dependency graph.
- Importing the store would create a circular dependency: store imports auth feature, auth feature imports HTTP client, HTTP client imports store.
- Custom events are a standards-based pub/sub channel that any layer can dispatch to or listen for. Loose coupling at near-zero cost.
- Easy to extend: a third subsystem (analytics, error reporting) can listen for the same event without modifying any existing code.

**Revisit when:** never expected.

---

## How to use this document

- Append new decisions, don't edit history. If a decision changes, add a new entry that supersedes the old one and link to it.
- Every non-trivial trade-off gets an entry. "We chose X over Y because Z." Even small ones — they compound into a clear architecture story.
- Bring this file to interviews. Most candidates can't articulate *why* their stack is what it is. You will.
