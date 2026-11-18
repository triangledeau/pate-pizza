import { build } from "esbuild";
import { mkdirSync, copyFileSync } from "node:fs";
mkdirSync("www", { recursive: true });
copyFileSync("src/index.html", "www/index.html");
await build({ entryPoints: ["src/notifs.js"], bundle: true, format: "iife", outfile: "www/notifs.js", minify: true, target: "es2020" });
console.log("www/ prêt");
