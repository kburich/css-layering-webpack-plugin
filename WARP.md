# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Environment and setup

- Use Node.js version **18 or newer** (see `package.json` `engines.node`).
- Install dependencies with your preferred package manager, for example:
  - `pnpm install`

### Build and type-check

- `pnpm run build` — compile TypeScript in `src/` to CommonJS JavaScript in `dist/` via `tsc` and `tsconfig.json`.
- `pnpm run clean` — remove the `dist/` directory before a fresh build.

### Linting and formatting

- `pnpm run lint` — run ESLint across the project.
- `pnpm run format` — format the codebase with Prettier.

### Tests

- `pnpm test` — run the Jest test suite (Node test environment, tests under `tests/**/*.test.ts`).
- Run a single test file (example using the existing test file):
  - `pnpm jest tests/css-layering-plugin.integration.test.ts`
  - or `pnpm test -- tests/css-layering-plugin.integration.test.ts`

## Architecture overview

### High-level structure

This repository implements a **webpack plugin and loader** that wrap CSS (and Sass) modules in named CSS cascade layers, driven by glob patterns. The project is written in TypeScript and compiled to JavaScript in `dist/` for publishing.

Key pieces:
- `src/index.ts` — main webpack plugin implementation (`CSSLayeringPlugin`).
- `src/loader.ts` — webpack loader that wraps matched stylesheets in `@layer` blocks.
- `tests/css-layering-plugin.integration.test.ts` — Jest integration tests covering the plugin's HTML injection behavior using real webpack compilations.
- `tests/css-layering-plugin.css.integration.test.ts` — Jest integration tests covering CSS transformation with various layer configurations.
- `jest.config.js` — Jest configuration.
- `tsconfig.json` — TypeScript compiler configuration targeting `dist/`.

### CSSLayeringPlugin (`src/index.ts`)

The `CSSLayeringPlugin` class is the primary integration point with webpack and `html-webpack-plugin`:

- **Options and validation**
  - Accepts an `Options` object with:
    - `layers: Layer[]` (required, shared with the loader's `Layer` type).
    - `nonce?: string` — optional CSP nonce for injected `<style>` tags.
    - `injectOrderAs?: "link" | "style" | "none"` — controls how the `@layer` order declaration is injected. Defaults to `"style"`.
    - `publicPath?: string` — prepended to the fixed asset path `/static/css/layers.css` when emitting a link-based stylesheet.
  - Validates options against a JSON Schema (`OPTIONS_SCHEMA`) using webpack's `validateSchema`, extending the loader's `OPTIONS_SCHEMA` so plugin and loader stay in sync.

- **Layer order declaration**
  - `getOrderDeclaration()` builds a single `@layer` declaration from `layers`, e.g. `@layer exports, components, ui-shared;`.

- **HTML injection (via html-webpack-plugin)**
  - `injectOrder(compilation)` uses `html-webpack-plugin`'s `getHooks(compilation).beforeEmit.tapAsync` to modify generated HTML before it is emitted.
  - Behavior depends on `injectOrderAs`:
    - `"style"` (default): injects a `<style>` tag containing the `@layer` order into `<head>`, optionally adding a `nonce` attribute.
    - `"link"`: injects a `<link rel="stylesheet" href="{publicPath}/static/css/layers.css">` tag into `<head>`; the actual CSS for that asset is produced by `emitLinkAsset`.

- **Asset emission for link mode**
  - `emitLinkAsset(compilation)` registers a `processAssets` hook at `Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL` and emits `/static/css/layers.css` containing the `@layer` order declaration using `sources.RawSource`.

- **Loader wiring**
  - `addLayeringLoader(compiler)` taps `compiler.hooks.afterEnvironment` to push a new rule into `compiler.options.module.rules`:
    - `test: /\.(sa|sc|c)ss$/` — targets CSS/Sass files.
    - `use.loader` resolved to `loader.js` next to the compiled plugin (resolved via `path.resolve(__dirname, "loader.js")`).
    - `use.options.layers` set to the plugin's configured `layers` array.

- **Lifecycle**
  - `apply(compiler)` wires everything together:
    - Always calls `addLayeringLoader` so the loader is active.
    - If `injectOrderAs !== "none"`, taps `compiler.hooks.thisCompilation` to:
      - Call `injectOrder` so HTML is modified through `html-webpack-plugin` hooks.
      - Call `emitLinkAsset` when `injectOrderAs === "link"` so the external CSS asset is produced.

### Loader (`src/loader.ts`)

The loader encapsulates the per-file CSS wrapping logic and shares its option schema with the plugin:

- **Options schema and types**
  - `OPTIONS_SCHEMA` defines an object containing:
    - `layers: { path?: string; exclude?: string; name: string }[]`.
  - `Layer` type matches this schema and is re-used in the plugin.
  - A `Layer` may omit `path` to represent a pre-existing CSS layer that should only appear in the global layer order, not be used for wrapping files.

- **Runtime behavior**
  - The default-exported `loader` function:
    - Reads loader options via `this.getOptions()` and validates them with `validateSchema(OPTIONS_SCHEMA, { name: "CSS Layering Loader" })`.
    - Filters `layers` to only those with a defined `path`.
    - For each such layer, uses `minimatch` against `this.resourcePath` to decide whether the current stylesheet should be wrapped, and optionally applies an `exclude` glob to skip files.
    - On the first matching layer, returns the result of `wrapSourceInLayer(source, layer.name)`; otherwise returns the original `source` unchanged.

- **Layer wrapping semantics**
  - `wrapSourceInLayer(source, layerName)`:
    - Splits the stylesheet into lines.
    - Separates lines starting with `@use` from all other lines.
    - Reconstructs the source so that `@use` lines stay at the top, and the remaining content is wrapped in an `@layer { ... }` block:
      - `@use` lines
      - `@layer {layerName} {` …original non-`@use` content… `}`

This design ensures third-party `@use` imports remain at the top of the file, while the actual stylesheet content is scoped under the appropriate cascade layer.

### Tests and tooling

- **Jest configuration (`jest.config.js`)**
  - Node test environment.
  - Uses `ts-jest` to transform TypeScript test files.
  - Includes test files under `tests/**/*.test.ts`.

- **Integration tests (`tests/css-layering-plugin.integration.test.ts`)**
  - Uses Jest with real webpack compilations against test fixtures.
  - Verifies that:
    - With default settings (`injectOrderAs: "style"`), the plugin injects a `<style>` tag containing the expected `@layer` order into the HTML `<head>`.
    - With `injectOrderAs: "link"` and a `publicPath`, the plugin both injects a `<link>` tag and emits the `/static/css/layers.css` asset containing the correct `@layer` declaration.
    - When `injectOrderAs: "none"`, the plugin does not inject any order or emit any asset.
    - Nonce support works correctly when provided.

- **CSS transformation tests (`tests/css-layering-plugin.css.integration.test.ts`)**
  - Verifies CSS wrapping across multiple fixture scenarios including basic, exclude, multi-layer, SCSS, and edge cases.

### TypeScript configuration (`tsconfig.json`)

- Targets modern JavaScript (`ES2022`) and CommonJS modules.
- Emits declaration files and writes compiled output to `dist/`.
- Enables strict type-checking and common safety flags (`strict`, `noUnusedLocals`, `noUnusedParameters`, etc.).
- Includes only `src/**/*` in compilation; `tests/` are run directly by Jest using `ts-jest` for TypeScript support.
