import { defineConfig } from "vite";

export default defineConfig({
  base: "/weaverfall/",
  build: {
    target: "es2020",
    sourcemap: false,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
