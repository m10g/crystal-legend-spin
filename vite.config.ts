import { defineConfig } from "vite";

// Vite config for Crystal Spin Legends V0.1.
// host: true exposes the dev server on the network so it can be previewed
// from a browser outside the container.
export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
});
