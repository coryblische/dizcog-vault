#!/usr/bin/env node
/** One-time import from local Netlify Blobs dev export into data/main.json */

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const blobPath = process.argv[2];
if (!blobPath) {
  console.error("Usage: node scripts/import-netlify-blob.mjs <path-to-blob-entry>");
  process.exit(1);
}

const outDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const outPath = path.join(outDir, "main.json");

await mkdir(outDir, { recursive: true });
await copyFile(blobPath, outPath);
console.log(`Imported ledger to ${outPath}`);
