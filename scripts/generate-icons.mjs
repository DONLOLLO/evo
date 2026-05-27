// Genera le icone PWA dai master in resources/. Mantiene coerenza
// tra PWA web e versioni nativa iOS/Android.
import sharp from "sharp";
import { readFileSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const svg = readFileSync(resolve(root, "resources/icon-master.svg"));

const sizes = [
  { size: 180, name: "apple-touch-icon.png" },
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
];

for (const { size, name } of sizes) {
  await sharp(svg, { density: 400 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 31, g: 24, b: 56, alpha: 1 },
    })
    .flatten({ background: { r: 31, g: 24, b: 56 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(resolve(root, "public", name));
  console.log("✓", name, `${size}x${size}`);
}

// Aggiorna anche public/icon.svg (sorgente del favicon e dello splash interno
// usato da App.tsx per il loading screen) con il nuovo design.
copyFileSync(
  resolve(root, "resources/icon-master.svg"),
  resolve(root, "public/icon.svg"),
);
console.log("✓ public/icon.svg sincronizzato dal master");
