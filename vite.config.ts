import { defineConfig } from "vite";

// Vite config for Crystal Spin Legends V0.1.
// host: true exposes the dev server on the network so it can be previewed
// from a browser outside the container.
//
// base: when deploying to GitHub Pages the site is served from
// https://<user>.github.io/crystal-legend-spin/, so asset URLs must be
// prefixed with the repo name. The Pages workflow sets DEPLOY_TARGET=gh-pages;
// local dev and other hosts keep the default "/" root.
export default defineConfig({
  base: process.env.DEPLOY_TARGET === "gh-pages" ? "/crystal-legend-spin/" : "/",
  server: {
    host: true,
    port: 5173,
  },
});
