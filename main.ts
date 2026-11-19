// NEON PALMS entrypoint: hands the app in for the gta6-cover-art-01 bounty.
// The program copies app/ and screenshots/ from beside this file into the
// output directory and writes /output/dossier.json with the kit's vendored
// make.fun library, exactly as the bounty asks. Before the dossier is
// written it measures the entry it just copied (files, bytes, screenshots)
// and refuses to hand in anything past the gate's own caps, so a bad build
// fails loudly here instead of silently at the scorer.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** One entry's measured shape: what the gate will count. */
function measureEntryTree(rootDir) {
  const appDir = join(rootDir, 'app');
  const shotsDir = join(rootDir, 'screenshots');
  let appFiles = 0;
  let appBytes = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const info = statSync(path);
      if (info.isDirectory()) walk(path);
      else if (info.isFile()) {
        appFiles += 1;
        appBytes += info.size;
      }
    }
  };
  walk(appDir);
  const shotNames = existsSync(shotsDir)
    ? readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort()
    : [];
  const shotBytes = shotNames.map((n) => statSync(join(shotsDir, n)).size);
  return {
    appFiles,
    appBytes,
    shotNames,
    shotBytes,
    hasIndex: existsSync(join(appDir, 'index.html')),
  };
}

/** Refuses an entry the gate would refuse, naming the cap it breaks. */
function refuseOversizedEntry(facts) {
  if (!facts.hasIndex) throw new Error('refusing entry: app/index.html is missing');
  if (facts.appFiles > 993) throw new Error(`refusing entry: app/ holds ${facts.appFiles} files, over the 993 allowed`);
  if (facts.appBytes > 50331648) throw new Error(`refusing entry: app/ is ${facts.appBytes} bytes, over the 48 MiB allowed`);
  if (facts.shotNames.length < 3 || facts.shotNames.length > 4) {
    throw new Error(`refusing entry: screenshots/ holds ${facts.shotNames.length} images, need 3 or 4`);
  }
  facts.shotBytes.forEach((bytes, i) => {
    if (bytes > 262144) throw new Error(`refusing entry: screenshots/${facts.shotNames[i]} is ${bytes} bytes, over the 256 KiB allowed`);
  });
}

/** One line describing the entry that was just handed in. */
function buildSummaryLine(facts) {
  const shots = facts.shotNames.map((n, i) => `${n} (${facts.shotBytes[i]} bytes)`).join(', ');
  return `NEON PALMS entry: app/ ${facts.appFiles} files, ${facts.appBytes} bytes; screenshots ${shots}`;
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse.
const entryFacts = measureEntryTree(out);
refuseOversizedEntry(entryFacts);
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
console.log(buildSummaryLine(entryFacts));
