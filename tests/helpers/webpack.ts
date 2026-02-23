import path from "node:path";
import webpack, {
  type Compiler,
  type Configuration,
  type Stats,
} from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { CSSLayeringPlugin } from "../../dist";

type PluginOptions = ConstructorParameters<typeof CSSLayeringPlugin>[0];

export function getPaths(fixtureName: string, outputName: string) {
  const fixturesDir = path.resolve(__dirname, "../fixtures", fixtureName);
  const outDir = path.resolve(
    __dirname,
    "../fixtures-output",
    `${fixtureName}-${outputName}`,
  );

  return { fixturesDir, outDir };
}

export function createCompiler(
  fixtureName: string,
  outputName: string,
  pluginOptions: PluginOptions,
  extraConfig: Configuration = {},
): Compiler {
  const { fixturesDir, outDir } = getPaths(fixtureName, outputName);

  const baseConfig: Configuration = {
    mode: "production",
    devtool: false,
    context: fixturesDir,
    entry: path.join(fixturesDir, "entry.ts"),
    output: {
      path: outDir,
      filename: "bundle.js",
      publicPath: "",
    },
    module: {
      rules: [],
    },
    plugins: [
      new CSSLayeringPlugin(pluginOptions),
      new HtmlWebpackPlugin({
        template: path.join(fixturesDir, "index.html"),
        filename: "index.html",
      }),
    ],
  };

  return webpack({ ...baseConfig, ...extraConfig });
}

export function runCompiler(compiler: Compiler): Promise<Stats> {
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      compiler.close(() => {});

      if (err) {
        reject(err);
        return;
      }

      if (!stats) {
        reject(new Error("No stats returned"));
        return;
      }

      if (stats.hasErrors()) {
        reject(new Error(stats.toString("errors-only")));
        return;
      }

      resolve(stats);
    });
  });
}

export function getAssetSource(
  stats: Stats,
  filename: string,
): string | undefined {
  const asset = stats.compilation.assets[filename];
  if (!asset) return undefined;

  const source = asset.source();
  return typeof source === "string" ? source : source.toString();
}
