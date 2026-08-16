import js from "@eslint/js";
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const sourceFiles = ["src/**/*.{js,jsx}"];
const testFiles = ["src/**/*.{test,spec}.{js,jsx}"];
const configFiles = ["*.config.js"];

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  {
    files: [...sourceFiles, ...configFiles],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      sourceType: "module",
    },
  },
  {
    files: sourceFiles,
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "jsx-a11y": jsxA11y,
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "react/jsx-uses-vars": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    files: testFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: configFiles,
    languageOptions: {
      globals: globals.node,
    },
  },
];
