import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // node_modules/.vite here is owned by a different account than the one
  // running npm, so Vite can't unlink its old dep-optimization cache there.
  // Point it at a fresh directory instead.
  cacheDir: "node_modules/.vite-cache",
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the Express server in dev.
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
