import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": path.resolve(__dirname, "mock-cloudflare.ts"),
      "@": path.resolve(__dirname, "../src"),
    },
  },
});
