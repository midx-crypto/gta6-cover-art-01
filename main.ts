// Vice Cover Studio — make.fun entry program (Node 22, standard library only).
// Written fresh for the round-2 rebuild: copies this repo's app/ and
// screenshots/ into the output directory, then writes the dossier that the
// kit's buildDossier computes from those exact files, so the dossier always
// matches what was handed in. Run: MAKEFUN_OUTPUT_DIR=out node main.ts

import { buildDossier } from './vendor/makefun-app.ts';
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The gate refuses symlinks under app/, so refuse them here too instead of
// silently copying whatever they point at.
function assertNoSymlinks(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`refusing symlink: ${full}`);
    if (entry.isDirectory()) assertNoSymlinks(full);
  }
}

function copyTree(name) {
  const src = join(repoRoot, name);
  if (!existsSync(src)) throw new Error(`missing ${name}/ in ${repoRoot}`);
  assertNoSymlinks(src);
  cpSync(src, join(outDir, name), { recursive: true });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
copyTree('app');
copyTree('screenshots');

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
