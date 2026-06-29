// Genera un HTML autonomo (un solo archivo) a partir de la carpeta dist/.
// Inlinea el JS y el CSS dentro del index.html para que la app funcione
// abriendo el archivo con doble clic (file://), sin servidor ni Node.
//
// Uso: node scripts/inline-standalone.mjs
// Salida: dist/iraurgi-ordu.html

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const indexPath = join(distDir, "index.html");

if (!existsSync(indexPath)) {
  console.error("No existe dist/index.html. Ejecuta antes 'npm run build'.");
  process.exit(1);
}

let html = readFileSync(indexPath, "utf8");

// Evita que un '</script>' dentro del bundle cierre el script inline antes de tiempo.
const escapeScript = (code) => code.replace(/<\/script>/gi, "<\\/script>");

// Inlinea las hojas de estilo: <link rel="stylesheet" ... href="./assets/x.css">
html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, (tag) => {
  const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
  if (!href) return tag;
  const cssPath = join(distDir, href.replace(/^\.?\//, ""));
  if (!existsSync(cssPath)) return tag;
  const css = readFileSync(cssPath, "utf8");
  return `<style>\n${css}\n</style>`;
});

// Inlinea los scripts de modulo: <script type="module" crossorigin src="./assets/x.js"></script>
html = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi, (tag, src) => {
  const jsPath = join(distDir, src.replace(/^\.?\//, ""));
  if (!existsSync(jsPath)) return tag;
  const js = readFileSync(jsPath, "utf8");
  // Mantener type="module" (el bundle usa sintaxis de modulos) pero sin src ni crossorigin:
  // un script de modulo *inline* si se ejecuta desde file://.
  return `<script type="module">\n${escapeScript(js)}\n</script>`;
});

const outPath = join(distDir, "iraurgi-ordu.html");
writeFileSync(outPath, html, "utf8");

const kb = (Buffer.byteLength(html, "utf8") / 1024).toFixed(0);
console.log(`OK -> dist/iraurgi-ordu.html (${kb} KB, autonomo, abrible con doble clic)`);
