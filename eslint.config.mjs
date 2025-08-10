import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([globalIgnores(["**/dist", "**/working-files"]), {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        "simple-import-sort": simpleImportSort,
        "unused-imports": unusedImports,
    },

    languageOptions: {
        parser: tsParser,
    },

    rules: {
        semi: ["error", "always"],
        quotes: ["error", "double"],
        "simple-import-sort/imports": "error",
        "simple-import-sort/exports": "error",
        "@typescript-eslint/no-unused-vars": "off",
        "unused-imports/no-unused-imports": "error",

        "key-spacing": ["error", {
            beforeColon: false,
            afterColon: true,
        }],

        curly: "error",
        eqeqeq: "error",
        "brace-style": "error",
        "keyword-spacing": "error",
        "comma-spacing": "error",
        "block-spacing": "error",
        "no-trailing-spaces": "error",
        "space-before-blocks": "error",
        indent: ["error", 4],
    },
}]);