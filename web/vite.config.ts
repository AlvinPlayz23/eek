import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The build is served by the Hono app at /dashboard, so every asset URL keeps that prefix. In
// development the API is proxied to the local server, which keeps the dashboard cookies on one origin
export default defineConfig({
  base: "/dashboard/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    outDir: "../public/dashboard",
    emptyOutDir: true,
  },
  server: {
    proxy: { "/api": "http://localhost:3000" },
  },
});
