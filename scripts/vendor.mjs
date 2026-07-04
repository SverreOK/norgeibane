// Copies the prebuilt library files needed at runtime out of node_modules
// into vendor/, so the deployed site is fully self-contained (no CDN).
//
// Run once after `npm install`:  npm run setup

import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const vendor = path.join(root, 'vendor');

const cesiumBuild = path.join(root, 'node_modules', 'cesium', 'Build', 'Cesium');
// satellite.js v6 is the last release with a UMD browser bundle (v7+ is ESM-only).
const satelliteUmd = path.join(root, 'node_modules', 'satellite.js', 'dist', 'satellite.min.js');

for (const p of [cesiumBuild, satelliteUmd]) {
  if (!existsSync(p)) {
    console.error(`Missing ${p} — run \`npm install\` first.`);
    process.exit(1);
  }
}

await rm(vendor, { recursive: true, force: true });
await mkdir(vendor, { recursive: true });

console.log('Copying CesiumJS Build/Cesium → vendor/cesium …');
await cp(cesiumBuild, path.join(vendor, 'cesium'), { recursive: true });

console.log('Copying satellite.js UMD → vendor/satellite.min.js …');
await cp(satelliteUmd, path.join(vendor, 'satellite.min.js'));

// First-run convenience: create the local (gitignored) config from the example.
const userConfig = path.join(root, 'js', 'config.js');
if (!existsSync(userConfig)) {
  await cp(path.join(root, 'js', 'config.example.js'), userConfig);
  console.log('Created js/config.js from the example — add your Ion token there.');
}

console.log('Done. vendor/ is ready — the site can now be served statically.');
