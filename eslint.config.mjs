import eslint from "@eslint/js";
import { globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";


export default tseslint.config([
  // { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js, prettier }, extends: ["js/recommended"] },
  globalIgnores(["dist/"]),
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: globals.node } },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier
]);
