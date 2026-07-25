import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["out/**", "dist/**", "node_modules/**", "docs/**"],
  },
  lint: {
    plugins: ["react", "typescript", "unicorn"],
    env: {
      browser: true,
      node: true,
      es2023: true,
    },
    ignorePatterns: ["out/**", "dist/**", "node_modules/**", "docs/**", "**/i18n/locales/**"],
    rules: {
      "no-unused-vars": "warn",
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
});
