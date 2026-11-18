// Prépare www/ pour Capacitor : pages et modules de src/, polices locales, données de départ,
// et le pont natif (src/commun/natif.js) compilé avec ses plugins.
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, copyFileSync } from "node:fs";

rmSync("www", { recursive: true, force: true });
cpSync("src", "www", { recursive: true, filter: (f) => !f.endsWith("natif.js") });
mkdirSync("www/commun/fonts", { recursive: true });
mkdirSync("www/data", { recursive: true });
const polices = {
  "bricolage-latin.woff2": "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2",
  "bricolage-latin-ext.woff2": "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-ext-standard-normal.woff2",
};
for (const [nom, src] of Object.entries(polices)) copyFileSync("node_modules/" + src, "www/commun/fonts/" + nom);
copyFileSync("data/cuisine.json", "www/data/cuisine.json");
await build({ entryPoints: ["src/commun/natif.js"], bundle: true, format: "iife", outfile: "www/commun/natif.js", minify: true, target: "es2020" });
console.log("www/ prêt");
