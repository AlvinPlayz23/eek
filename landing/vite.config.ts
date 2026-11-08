import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The marketing site has its own route (/landing) and its own build directory, so it never
// touches the dashboard build or the server's root route. The same base prefix is used in dev,
// so `pnpm dev:landing` serves http://localhost:5174/landing/
export default defineConfig({
  base: "/landing/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../public/landing",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
  },
});
