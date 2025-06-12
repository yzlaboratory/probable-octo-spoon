// @ts-check
import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
// https://astro.build/config
export default defineConfig({
  vite: { plugins: [tailwindcss()] },
  env: {
    schema: {
      IG_ACCESS_TOKEN: envField.string({ context: "server", access: "secret"})
    }
  },
  adapter: node({
    mode: "standalone",
   
  }),
  output: 'static'
});
