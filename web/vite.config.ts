import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || "/",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          d3: ["d3", "d3-sankey"],
          recharts: ["recharts"],
          katex: ["katex"],
          vendor: ["react", "react-dom", "react-router-dom", "swr", "zustand"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
});
