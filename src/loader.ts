import { minimatch } from "minimatch";
import { validateSchema, LoaderContext } from "webpack";
import type { JSONSchema7 } from "json-schema";

export const OPTIONS_SCHEMA: JSONSchema7 = {
  type: "object",
  required: ["layers"],
  properties: {
    layers: {
      type: "array",
      items: {
        type: "object",
        required: ["name"],
        properties: {
          path: {
            description:
              "All files that are matched with this value using minimatch package will be wrapped with this layer." +
              "If undefined layer will only be included in layer order declaration (can be used for preexisting layers).",
            type: "string",
          },
          exclude: {
            description:
              "All files matched with this value using minimatch package will be excluded from layer wrapping.",
            type: "string",
          },
          name: {
            description: "Name of layer",
            type: "string",
          },
        },
      },
    },
  },
};

export type Layer = {
  path: string;
  exclude: string;
  name: string;
};

function loader(this: LoaderContext<{ layers: Layer[] }>, source: string) {
  const options = this.getOptions() || {};
  validateSchema(OPTIONS_SCHEMA, options, { name: "CSS Layering Loader" });

  const layers = options.layers.filter((layer) => layer.path);

  for (const layer of layers) {
    const { path, name, exclude } = layer;
    if (
      minimatch(this.resourcePath, path) &&
      (exclude === undefined || !minimatch(this.resourcePath, exclude))
    ) {
      return wrapSourceInLayer(source, name);
    }
  }

  return source;
}

const wrapSourceInLayer = async (source: string, layerName: string) => {
  const lines = source.split("\n");

  const useLines = lines.filter((line) => line.trim().startsWith("@use"));
  const otherLines = lines.filter((line) => !line.trim().startsWith("@use"));

  const useLinesString = useLines.join("\n");
  const otherLinesString = otherLines.join("\n");

  return `${useLinesString}\n@layer ${layerName} {\n ${otherLinesString} \n}`;
};

export default loader;
