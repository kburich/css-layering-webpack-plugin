import path from "node:path";
import fs from "node:fs/promises";
import { createCompiler, runCompiler, getPaths } from "./helpers/webpack";

function normalizeCss(css: string): string {
  return css.replace(/\s+/g, " ").trim();
}

describe("CSSLayeringPlugin CSS transformation integration", () => {
  const cases = [
    // Basic case: single CSS file matched by path
    {
      fixture: "css-basic",
      outputName: "css",
      cssFile: "styles.css",
      layers: [{ name: "components", path: "**/styles.css" }],
    },
    // Exclude behavior: one file wrapped, one left untouched
    {
      fixture: "css-exclude",
      outputName: "css",
      cssFile: "styles.css",
      layers: [
        { name: "components", path: "**/*.css", exclude: "**/*.ignore.css" },
      ],
    },
    {
      fixture: "css-exclude",
      outputName: "css",
      cssFile: "styles.ignore.css",
      layers: [
        { name: "components", path: "**/*.css", exclude: "**/*.ignore.css" },
      ],
    },
    // Multiple layers with different paths
    {
      fixture: "css-multi-layers",
      outputName: "css",
      cssFile: "reset.css",
      layers: [
        { name: "base", path: "**/reset.css" },
        { name: "components", path: "**/components.css" },
      ],
    },
    {
      fixture: "css-multi-layers",
      outputName: "css",
      cssFile: "components.css",
      layers: [
        { name: "base", path: "**/reset.css" },
        { name: "components", path: "**/components.css" },
      ],
    },
    // Layers without path should not be used for wrapping
    {
      fixture: "css-preexisting-layer",
      outputName: "css",
      cssFile: "styles.css",
      layers: [
        { name: "preexisting" },
        { name: "components", path: "**/styles.css" },
      ],
    },
    // Non-matching path pattern should leave CSS unchanged
    {
      fixture: "css-no-match",
      outputName: "css",
      cssFile: "plain.css",
      layers: [{ name: "components", path: "**/styles.css" }],
    },
    // Use ordering and comments: @use lines hoisted, others wrapped
    {
      fixture: "css-use-ordering",
      outputName: "css",
      cssFile: "styles.css",
      layers: [{ name: "components", path: "**/styles.css" }],
    },
    // SCSS file handling
    {
      fixture: "css-scss",
      outputName: "css",
      cssFile: "styles.scss",
      layers: [{ name: "components", path: "**/*.scss" }],
    },
    // Complex SCSS file with nesting, extends, variables, media queries
    {
      fixture: "css-scss-complex",
      outputName: "css",
      cssFile: "styles-complex.scss",
      layers: [{ name: "components", path: "**/styles-complex.scss" }],
    },
    // Multiple layers affecting the same file: first matching layer should be used
    {
      fixture: "css-multi-match",
      outputName: "css",
      cssFile: "styles.css",
      layers: [
        { name: "base", path: "**/styles.css" },
        { name: "components", path: "**/*.css" },
      ],
    },
    // Single layer applied to multiple files via glob
    {
      fixture: "css-multi-file",
      outputName: "css",
      cssFile: "one.css",
      layers: [{ name: "shared", path: "**/*.css" }],
    },
    {
      fixture: "css-multi-file",
      outputName: "css",
      cssFile: "two.css",
      layers: [{ name: "shared", path: "**/*.css" }],
    },
  ] as const;

  for (const testCase of cases) {
    const { fixture, outputName, cssFile, layers } = testCase;

    it(`wraps CSS for fixture ${fixture} with configured layers`, async () => {
      const compiler = createCompiler(
        fixture,
        outputName,
        { layers },
        {
          module: {
            rules: [
              {
                test: /\.(sa|sc|c)ss$/,
                type: "asset/resource",
                generator: {
                  filename: "css/[name][ext]",
                },
              },
            ],
          },
        },
      );

      await runCompiler(compiler);

      const { outDir, fixturesDir } = getPaths(fixture, outputName);

      const actualCss = await fs.readFile(
        path.join(outDir, "css", cssFile),
        "utf8",
      );
      const expectedCss = await fs.readFile(
        path.join(fixturesDir, "expected", cssFile),
        "utf8",
      );

      expect(normalizeCss(actualCss)).toBe(normalizeCss(expectedCss));
    });
  }
});
