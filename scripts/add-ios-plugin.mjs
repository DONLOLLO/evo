#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// add-ios-plugin.mjs
// ────────────────────────────────────────────────────────────────────────
// Aggiunge LocalAIPlugin.swift al target Xcode "App" (sources + group).
// Idempotente: se già presente, non duplica.
// Eseguire dopo `npx cap add ios` o quando si aggiunge un nuovo plugin
// Swift in ios/App/App/.
// ════════════════════════════════════════════════════════════════════════

import xcode from "xcode";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectPath = path.join(
  __dirname,
  "..",
  "ios",
  "App",
  "App.xcodeproj",
  "project.pbxproj",
);

const FILES_TO_ADD = ["LocalAIPlugin.swift"];

const project = xcode.project(projectPath);

project.parse((err) => {
  if (err) {
    console.error("Parse error:", err);
    process.exit(1);
  }

  // Trova il group "App" (la cartella blu interna nel Project Navigator)
  const groups = project.hash.project.objects["PBXGroup"];
  let appGroupKey = null;
  for (const [key, value] of Object.entries(groups)) {
    if (value && typeof value === "object" && value.name === "App" && value.path === "App") {
      appGroupKey = key;
      break;
    }
  }
  // Fallback: cerca per path solo
  if (!appGroupKey) {
    for (const [key, value] of Object.entries(groups)) {
      if (value && typeof value === "object" && value.path === "App" && Array.isArray(value.children)) {
        appGroupKey = key;
        break;
      }
    }
  }

  if (!appGroupKey) {
    console.error("Impossibile trovare il group 'App' nel pbxproj");
    process.exit(1);
  }

  let added = 0;
  let skipped = 0;

  for (const filename of FILES_TO_ADD) {
    // Verifica se è già nel progetto come Source
    const sources = project.pbxSourcesBuildPhaseObj();
    const alreadyInSources = (sources.files || []).some((f) => {
      const ref = project.hash.project.objects["PBXBuildFile"][f.value];
      if (!ref) return false;
      const fileRef = project.hash.project.objects["PBXFileReference"][ref.fileRef];
      return fileRef && fileRef.path === filename;
    });

    if (alreadyInSources) {
      console.log(`✓ ${filename} già nel target App, salto.`);
      skipped++;
      continue;
    }

    // Aggiungi al group + sources
    const file = project.addSourceFile(
      filename,
      { target: project.getFirstTarget().uuid },
      appGroupKey,
    );

    if (!file) {
      console.error(`✗ Errore aggiungendo ${filename}`);
      continue;
    }

    console.log(`✓ ${filename} aggiunto al target App.`);
    added++;
  }

  // Salva
  fs.writeFileSync(projectPath, project.writeSync());
  console.log(`\nDone. ${added} aggiunti, ${skipped} già presenti.`);
});
