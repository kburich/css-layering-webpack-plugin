import path from "node:path";
import fs from "node:fs/promises";
import { createCompiler, runCompiler, getPaths } from "./helpers/webpack";

const LAYER_ASSET_PATH = "/static/css/layers.css";

describe("CSSLayeringPlugin integration", () => {
  const layers = [{ name: "base" }, { name: "components" }];

  it("injects @layer order as a <style> tag by default", async () => {
    const outputName = "style";
    const compiler = createCompiler("basic", outputName, { layers });

    await runCompiler(compiler);

    const { outDir } = getPaths("basic", outputName);
    const html = await fs.readFile(path.join(outDir, "index.html"), "utf8");

    expect(html).toContain("<style");
    expect(html).toContain("@layer base, components;");
  });

  it("injects a <link> tag and emits layers.css when injectOrderAs='link'", async () => {
    const outputName = "link";
    const publicPath = "/static/css/layers.css";

    const compiler = createCompiler("basic", outputName, {
      layers,
      injectOrderAs: "link",
      publicPath,
    });

    const stats = await runCompiler(compiler);

    const { outDir } = getPaths("basic", outputName);
    const html = await fs.readFile(path.join(outDir, "index.html"), "utf8");

    expect(html).toContain(
      `<link rel="stylesheet" type="text/css" href="${publicPath}">`,
    );

    // Ensure the asset exists in the compilation
    expect(stats.compilation.assets[publicPath]).toBeDefined();

    // And that the file written to disk contains the expected @layer declaration
    const css = await fs.readFile(
      path.join(outDir, "static/css/layers.css"),
      "utf8",
    );
    expect(css).toContain("@layer base, components;");
  });

  it("injects style tag with nonce when nonce is provided", async () => {
    const outputName = "style-nonce";
    const nonce = "test-nonce";

    const compiler = createCompiler("basic", outputName, {
      layers,
      nonce,
    });

    await runCompiler(compiler);

    const { outDir } = getPaths("basic", outputName);
    const html = await fs.readFile(path.join(outDir, "index.html"), "utf8");

    expect(html).toContain(
      `<style nonce="${nonce}">@layer base, components;</style>`,
    );
  });

  it("injects link tag with default publicPath when not provided", async () => {
    const outputName = "link-default-public-path";

    const compiler = createCompiler("basic", outputName, {
      layers,
      injectOrderAs: "link",
    });

    await runCompiler(compiler);

    const { outDir } = getPaths("basic", outputName);
    const html = await fs.readFile(path.join(outDir, "index.html"), "utf8");

    expect(html).toContain(
      `<link rel="stylesheet" type="text/css" href="${LAYER_ASSET_PATH}">`,
    );
  });

  it("does not inject order or emit asset when injectOrderAs='none'", async () => {
    const outputName = "none";
    const compiler = createCompiler("basic", outputName, {
      layers,
      injectOrderAs: "none",
    });

    const stats = await runCompiler(compiler);

    const { outDir } = getPaths("basic", outputName);
    const html = await fs.readFile(path.join(outDir, "index.html"), "utf8");

    expect(html).not.toContain("@layer base, components;");
    expect(html).not.toContain(LAYER_ASSET_PATH);

    // The layer asset should not be present in the compilation when injectOrderAs is 'none'
    expect(stats.compilation.assets[LAYER_ASSET_PATH]).toBeUndefined();
  });
});
