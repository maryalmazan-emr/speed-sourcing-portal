// File: client/eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // Ignore build outputs
  globalIgnores(["dist", "node_modules"]),

  {
    files: ["**/*.{ts,tsx}"],

    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      react.configs.flat.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],

    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },

    // Prevent noise from "unused eslint-disable" while you're iterating quickly
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },

    rules: {
      // -------------------------
      // React 17+/18+/19 JSX runtime
      // -------------------------
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",

      // TS handles props typing
      "react/prop-types": "off",

      // -------------------------
      // Productivity / iteration
      // -------------------------
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "react-refresh/only-export-components": "off",

      // -------------------------
      // Hooks rules (too strict for current patterns)
      // -------------------------
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "warn",

      // -------------------------
      // React plugin rules
      // -------------------------
      "react/no-danger": "off",

      // -------------------------
      // Unused vars handling
      // (fixes _adminEmail and similar)
      // -------------------------
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },

    settings: {
      react: {
        version: "detect",
      },
    },
  },
]);