/* eslint @typescript-eslint/no-var-requires: "off" */
const path = require("path");
const { Compilation, sources, validateSchema } = require("webpack");
const {
  OPTIONS_SCHEMA: LOADER_OPTIONS_SCHEMA,
} = require("./loader");

const LAYER_ASSET_PATH = "/static/css/layers.css";
const PLUGIN_NAME = "CssLayeringPlugin";

const OPTIONS_SCHEMA = {
  type: "object",
  required: ["layers"],
  properties: {
    ...LOADER_OPTIONS_SCHEMA.properties,
    nonce: {
      description:
        "Nonce used for style tag when layer order declaration is injected into html using style tag.",
      type: "string",
    },
    publicPath: {
      description: "Public path",
      type: "string",
    },
    orderInjectStyle: {
      description:
        "Determines how layer order declaration is injected into html.",
      enum: ["link", "style"],
    },
  },
};

/**
 * @typedef {Object} Layer
 * @property {string} path
 * @property {string} name
 */

/**
 * @typedef {Object} Options
 * @property {Layer[]} layers
 * @property {string} nonce
 * @property {"link"|"style"} orderInjectStyle
 * @property {string} publicPath
 */

class CSSLayeringPlugin {
  /**
   * @param {Options} options
   */
  constructor(options) {
    validateSchema(OPTIONS_SCHEMA, options, { name: PLUGIN_NAME });
    this.layers = options.layers;
    this.nonce = options.nonce;
    this.orderInjectStyle = options.orderInjectStyle ?? "style";
    this.linkHref = path.join(options.publicPath ?? "", LAYER_ASSET_PATH);
  }

  getOrderDeclaration() {
    const order = this.layers.map((layer) => layer.name).join(", ");
    return `@layer ${order};`;
  }

  injectOrder(compilation) {
    const HtmlWebpackPlugin = require("html-webpack-plugin");

    HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
      PLUGIN_NAME,
      (data, cb) => {
        if (this.orderInjectStyle === "style") {
          const nonceAttribute = this.nonce ? `nonce="${this.nonce}"` : "";
          const styleTag = `<style ${nonceAttribute}>${this.getOrderDeclaration()}</style>`;
          data.html = data.html.replace("<head>", `<head>${styleTag}`);
          cb(null, data);
        } else {
          const linkTag = `<link rel="stylesheet" type="text/css" href="${this.linkHref}">`;
          data.html = data.html.replace("<head>", `<head>${linkTag}`);
          cb(null, data);
        }
      }
    );
  }

  emitLinkAsset(compilation) {
    compilation.hooks.processAssets.tap(
      {
        name: PLUGIN_NAME,
        stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
      },
      () => {
        const order = this.getOrderDeclaration();
        compilation.emitAsset(LAYER_ASSET_PATH, new sources.RawSource(order));
      }
    );
  }

  addLayeringLoader(compiler) {
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      const layeringLoaderRule = {
        test: /\.(sa|sc|c)ss$/,
        use: {
          loader: path.resolve(__dirname, "loader.js"),
          options: { layers: this.layers },
        },
      };

      compiler.options.module.rules = compiler.options.module.rules || [];
      compiler.options.module.rules.push(layeringLoaderRule);
    });
  }

  apply(compiler) {
    this.addLayeringLoader(compiler);

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      this.injectOrder(compilation);
      if (this.orderInjectStyle === "link") {
        this.emitLinkAsset(compilation);
      }
    });
  }
}

module.exports = CSSLayeringPlugin;
