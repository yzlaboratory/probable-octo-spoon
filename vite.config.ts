import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4321,
    proxy: {
      "/api": "http://localhost:4322",
      "/media": "http://localhost:4322",
    },
  },
  preview: { port: 4321 },
});
