#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// build-resources.mjs
// ────────────────────────────────────────────────────────────────────────
// Trasforma gli SVG master in PNG nelle dimensioni richieste da
// @capacitor/assets, che poi genera tutte le size native iOS + Android.
//
// Esegui dopo aver modificato gli SVG in resources/:
//   node scripts/build-resources.mjs
//   npx @capacitor/assets generate
// ════════════════════════════════════════════════════════════════════════

import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const resourcesDir = resolve(root, "resources");

const jobs = [
  {
    src: "icon-master.svg",
    out: "icon.png",
    size: 1024,
    flatten: { r: 31, g: 24, b: 56 }, // iOS NON vuole trasparenza
  },
  {
    src: "icon-foreground-master.svg",
    out: "icon-foreground.png",
    size: 1024,
    flatten: null, // Android foreground DEVE essere trasparente
  },
  {
    src: "icon-background-master.svg",
    out: "icon-background.png",
    size: 1024,
    flatten: { r: 31, g: 24, b: 56 },
  },
  {
    src: "splash-master.svg",
    out: "splash.png",
    size: 2732,
    flatten: { r: 2, g: 2, b: 5 },
  },
  {
    src: "splash-master.svg",
    out: "splash-dark.png",
    size: 2732,
    flatten: { r: 2, g: 2, b: 5 },
  },
];

for (const job of jobs) {
  const svg = readFileSync(resolve(resourcesDir, job.src));
  let pipeline = sharp(svg, { density: 400 }).resize(job.size, job.size, {
    fit: "contain",
    background: job.flatten
      ? { ...job.flatten, alpha: 1 }
      : { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (job.flatten) {
    pipeline = pipeline.flatten({ background: job.flatten });
  }
  await pipeline
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(resolve(resourcesDir, job.out));
  console.log(`✓ ${job.out} ${job.size}x${job.size}`);
}

console.log(
  "\nDone. Adesso esegui:\n  npx @capacitor/assets generate --ios --android\n",
);
