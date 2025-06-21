# css-layering-webpack-plugin &middot; [![RL Status Badge](https://secure.software/npm/badge/css-layering-webpack-plugin)](https://secure.software/npm/packages/css-layering-webpack-plugin)

Wraps CSS in named cascade layers. What CSS is wrapped in which layer is defined using glob patterns supported by minimatch package. Note that it is also possible to exclude paths using glob patterns (see advanced use case). Layer order is derived from order in which layers are defined.

## Getting Started

To begin, you'll need to install `css-layering-webpack-plugin`:

```console
npm install css-layering-webpack-plugin --save-dev
```

or

```console
yarn add -D css-layering-webpack-plugin
```

or

```console
pnpm add -D css-layering-webpack-plugin
```

Then add the plugin to your `webpack` config. For example:

**webpack.config.js**

```js
const { CSSLayeringPlugin } = require("css-layering-webpack-plugin");

module.exports = {
  plugins: [
    new CSSLayeringPlugin({
      layers: [
        { path: "**/src/features/exports/**/*.module.scss", name: "exports" },
        { path: "**/src/components/**/*.module.scss", name: "components" },
        {
          path: "**/libraries/ui/dist/components/**/*.module.scss",
          name: "ui-shared",
        },
      ],
    }),
  ],
};
```

## Options

### `injectOrderAs`

```ts
type InjectOrderAs = "style" | "link" | "none";
```

Determines how the @layer order statement will be injected. Either as a style or link tag. Default value is `style`.

### `publicPath`

```ts
type PublicPath = string;
```

If the layer order is injected using link tag then the href property will be set to value of this option.

### `nonce`

```ts
type Nonce = string;
```

If the layer order is injected via style tag then the nonce property will be set to this option.

## Advanced usage example

```js
const CssLayeringPlugin = require("css-layering-webpack-plugin");

module.exports = {
  plugins: [
    new CssLayeringPlugin({
      layers: [
        { path: "**/src/features/exports/**/*.module.scss", name: "exports" },
        { path: "**/src/components/**/*.module.scss", name: "components" },
        {
          path: "**/libraries/ui/dist/components/**/*.module.scss",
          exclude: "**/notification.module.scss",
          name: "ui-shared",
        },
      ],
      injectOrderAs: "link",
      publicPath: "/static/css/layers.css",
    }),
  ],
};
```

> [!Note]
>
> You can inject preexisting named layers into layer order by specifying a layer without `path`

## License

[MIT](./LICENSE)
