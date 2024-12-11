/* eslint @typescript-eslint/no-var-requires: "off" */
const minimatch = require("minimatch");
const { validateSchema } = require("webpack");

const OPTIONS_SCHEMA = {
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
          name: {
            description: "Name of layer",
            type: "string",
          },
        },
      },
    },
  },
};

module.exports = function (source) {
  const options = this.getOptions() || {};
  validateSchema(OPTIONS_SCHEMA, options, { name: "CSS Layering Loader" });

  const layers = options.layers.filter((layer) => layer.path);

  for (const layer of layers) {
    const { path, name } = layer;
    if (minimatch.minimatch(this.resourcePath, path)) {
      return wrapSourceInLayer(source, name);
    }
  }

  return source;
};

const wrapSourceInLayer = async (source, layerName) => {
  const lines = source.split("\n");

  const useLines = lines.filter((line) => line.trim().startsWith("@use"));
  const otherLines = lines.filter((line) => !line.trim().startsWith("@use"));

  const useLinesString = useLines.join("\n");
  const otherLinesString = otherLines.join("\n");

  return `${useLinesString}\n@layer ${layerName} {\n ${otherLinesString} \n}`;
};

module.exports.OPTIONS_SCHEMA = OPTIONS_SCHEMA;
