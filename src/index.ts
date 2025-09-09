import { resolve, join } from "path";
import { getHooks } from "html-webpack-plugin";
import { Compilation, sources, validateSchema, type Compiler } from "webpack";
import { OPTIONS_SCHEMA as LOADER_OPTIONS_SCHEMA, type Layer } from "./loader";
import type { JSONSchema7 } from "json-schema";

const LAYER_ASSET_PATH = "/static/css/layers.css";
const PLUGIN_NAME = "CssLayeringPlugin";

const OPTIONS_SCHEMA: JSONSchema7 = {
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
    injectOrderAs: {
      description:
        "Determines how layer order declaration is injected into html.",
      enum: ["link", "style", "none"],
    },
  },
};

interface Options {
  layers: Layer[];
  nonce?: string;
  injectOrderAs?: "link" | "style" | "none";
  publicPath?: string;
}

export class CSSLayeringPlugin {
  private layers: Layer[];
  private nonce?: string;
  private injectOrderAs: string;
  private linkHref: string;

  constructor(options: Options) {
    validateSchema(OPTIONS_SCHEMA, options, { name: PLUGIN_NAME });
    this.layers = options.layers;
    this.nonce = options.nonce;
    this.injectOrderAs = options.injectOrderAs ?? "style";
    this.linkHref = join(options.publicPath ?? "", LAYER_ASSET_PATH);
  }

  getOrderDeclaration(): string {
    const order = this.layers.map((layer) => layer.name).join(", ");
    return `@layer ${order};`;
  }

  injectOrder(compilation: Compilation): void {
    getHooks(compilation).beforeEmit.tapAsync(PLUGIN_NAME, (data, cb) => {
      if (this.injectOrderAs === "style") {
        const nonceAttribute = this.nonce ? `nonce="${this.nonce}"` : "";
        const styleTag = `<style ${nonceAttribute}>${this.getOrderDeclaration()}</style>`;
        data.html = data.html.replace("<head>", `<head>${styleTag}`);
        cb(null, data);
      } else {
        const linkTag = `<link rel="stylesheet" type="text/css" href="${this.linkHref}">`;
        data.html = data.html.replace("<head>", `<head>${linkTag}`);
        cb(null, data);
      }
    });
  }

  emitLinkAsset(compilation: Compilation): void {
    compilation.hooks.processAssets.tap(
      {
        name: PLUGIN_NAME,
        stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
      },
      () => {
        const order = this.getOrderDeclaration();
        compilation.emitAsset(LAYER_ASSET_PATH, new sources.RawSource(order));
      },
    );
  }

  addLayeringLoader(compiler: Compiler): void {
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      const layeringLoaderRule = {
        test: /\.(sa|sc|c)ss$/,
        use: {
          loader: resolve(__dirname, "loader.js"),
          options: { layers: this.layers },
        },
      };

      compiler.options.module.rules = compiler.options.module.rules || [];
      compiler.options.module.rules.push(layeringLoaderRule);
    });
  }

  apply(compiler: Compiler): void {
    this.addLayeringLoader(compiler);

    if (this.injectOrderAs !== "none") {
      compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
        this.injectOrder(compilation);
        if (this.injectOrderAs === "link") {
          this.emitLinkAsset(compilation);
        }
      });
    }
  }
}
