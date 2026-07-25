import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Workspace packages must be bundled (not externalized) so no node_modules ship.
const workspace = { exclude: ["@iptv/contracts", "@iptv/core", "@iptv/ui"] };

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(workspace)],
  },
  preload: {
    plugins: [externalizeDepsPlugin(workspace)],
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
      },
    },
    plugins: [react(), tailwindcss()],
  },
});
