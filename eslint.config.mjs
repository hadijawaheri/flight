import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "apps/web/src/components/ui/**",
      "apps/web/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports", disallowTypeAnnotations: false },
      ],
    },
  },
  {
    files: [
      "apps/api/**/*.ts",
      "apps/api/migrate-mongo-config.js",
      "apps/api/migrations/**/*.js",
      "packages/**/*.ts",
      "scripts/**/*.mjs",
      "*.mjs",
    ],
    languageOptions: { globals: globals.node },
  },
  // Cloudflare Worker runs in a service-worker runtime (fetch, Request, URL), not Node
  {
    files: ["infra/**/*.js"],
    languageOptions: { globals: globals.serviceworker },
  },
  // CommonJS config files (PM2 reads ecosystem.config.cjs)
  {
    files: ["**/*.cjs"],
    languageOptions: { globals: globals.node, sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Decorator metadata needs real value imports for DI and Mongoose types
  {
    files: ["apps/api/**/*.ts"],
    rules: { "@typescript-eslint/consistent-type-imports": "off" },
  },
  ...nextVitals.map((config) => ({ ...config, files: ["apps/web/**/*.{ts,tsx,js,jsx,mjs}"] })),
  { files: ["apps/web/**"], settings: { next: { rootDir: "apps/web" } } },
);
