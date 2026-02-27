import path from "node:path";
import fs from "node:fs/promises";
import { createCompiler, runCompiler, getPaths } from "./helpers/webpack";

function normalizeCss(css: string): string {
  return css.replace(/\s+/g, " ").trim();
}

describe("CSSLayeringPlugin CSS transformation integration", () => {
  const cases = [
    {
      name: "basic CSS file wrapping",
      fixture: "css-basic",
      outputName: "css",
      cssFiles: ["styles.css"],
      layers: [{ name: "components", path: "**/styles.css" }],
    },
    {
      name: "exclude pattern",
      fixture: "css-exclude",
      outputName: "css",
      cssFiles: ["styles.css", "styles.ignore.css"],
      layers: [
        { name: "components", path: "**/*.css", exclude: "**/*.ignore.css" },
      ],
    },
    {
      name: "multiple layers with different paths",
      fixture: "css-multi-layers",
      outputName: "css",
      cssFiles: ["reset.css", "components.css"],
      layers: [
        { name: "base", path: "**/reset.css" },
        { name: "components", path: "**/components.css" },
      ],
    },
    {
      name: "preexisting layers without path",
      fixture: "css-preexisting-layer",
      outputName: "css",
      cssFiles: ["styles.css"],
      layers: [
        { name: "preexisting" },
        { name: "components", path: "**/styles.css" },
      ],
    },
    {
      name: "non-matching path pattern",
      fixture: "css-no-match",
      outputName: "css",
      cssFiles: ["plain.css"],
      layers: [{ name: "components", path: "**/styles.css" }],
    },
    {
      name: "@use line hoisting",
      fixture: "css-use-ordering",
      outputName: "css",
      cssFiles: ["styles.css"],
      layers: [{ name: "components", path: "**/styles.css" }],
    },
    {
      name: "SCSS file handling",
      fixture: "css-scss",
      outputName: "css",
      cssFiles: ["styles.scss"],
      layers: [{ name: "components", path: "**/*.scss" }],
    },
    {
      name: "complex SCSS with nesting and variables",
      fixture: "css-scss-complex",
      outputName: "css",
      cssFiles: ["styles-complex.scss"],
      layers: [{ name: "components", path: "**/styles-complex.scss" }],
    },
    {
      name: "first matching layer wins",
      fixture: "css-multi-match",
      outputName: "css",
      cssFiles: ["styles.css"],
      layers: [
        { name: "base", path: "**/styles.css" },
        { name: "components", path: "**/*.css" },
      ],
    },
    {
      name: "single layer applied to multiple files",
      fixture: "css-multi-file",
      outputName: "css",
      cssFiles: ["one.css", "two.css"],
      layers: [{ name: "shared", path: "**/*.css" }],
    },
    {
      name: "array path patterns",
      fixture: "css-array-path",
      outputName: "css",
      cssFiles: ["button.css", "input.scss"],
      layers: [
        { name: "components", path: ["**/button.css", "**/input.scss"] },
      ],
    },
    {
      name: "array exclude patterns",
      fixture: "css-array-exclude",
      outputName: "css",
      cssFiles: ["app.css", "app.test.css", "app.spec.css"],
      layers: [
        {
          name: "components",
          path: "**/*.css",
          exclude: ["**/*.test.css", "**/*.spec.css"],
        },
      ],
    },
  ] as const;

  for (const testCase of cases) {
    const { name, fixture, outputName, cssFiles, layers } = testCase;

    it(name, async () => {
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

      // Check all CSS files for this fixture
      for (const cssFile of cssFiles) {
        const actualCss = await fs.readFile(
          path.join(outDir, "css", cssFile),
          "utf8",
        );
        const expectedCss = await fs.readFile(
          path.join(fixturesDir, "expected", cssFile),
          "utf8",
        );

        expect(normalizeCss(actualCss)).toBe(normalizeCss(expectedCss));
      }
    });
  }
});
