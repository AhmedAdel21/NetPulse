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
- `**exactOptionalPropertyTypes**` — distinguishes `{ name?: string }` (property may be missing) from `{ name: string | undefined }` (property is present, value may be undefined). Most codebases conflate these and ship subtle bugs.
- `**noPropertyAccessFromIndexSignature**` — forces `obj["key"]` for indexed access on `Record<string, T>`, preventing accidental treating of dynamic objects as typed ones.
- `**noImplicitOverride**` — class methods overriding a parent must use the `override` keyword. Prevents accidental shadowing.

**Revisit when:** never. Stricter is better; junior contributors learn faster on strict configs than on loose ones.

---

## 5. Module resolution: dropped `baseUrl`, kept `paths` with relative targets

**Chosen:** No `baseUrl` in `tsconfig.json`. Path aliases (`@app/`*, `@features/*`, `@shared/*`, `@pages/*`) declared in `paths` with explicit `./src/...` relative targets.

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

- `eslint-plugin-import` is resolver-agnostic by design. We have to install the TS resolver ourselves to make `import/`* rules understand `@app/*`, `@features/*`, etc.
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

## How to use this document

- Append new decisions, don't edit history. If a decision changes, add a new entry that supersedes the old one and link to it.
- Every non-trivial trade-off gets an entry. "We chose X over Y because Z." Even small ones — they compound into a clear architecture story.
- Bring this file to interviews. Most candidates can't articulate *why* their stack is what it is. You will.
