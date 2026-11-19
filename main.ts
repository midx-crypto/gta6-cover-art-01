// A working gta6-cover-art-01 entry (Node 22, standard library only): the app is this directory's app/ folder, plain
// static files a desktop browser loads offline (app/index.html and its ES modules, no library and no network
// request), and the program hands it in. It copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library. Only the plumbing, not the
// cover art the bounty asks for: Cover Snap, a plain one-photo square cover with a sunset tint and a bold caption,
// exported as a 1080 x 1080 PNG. Its two sample photos (app/samples/) were made for make.fun with an image model and
// are free to use. Build your own GTA-style cover maker in its place, put your 3 or 4 PNG or JPEG screenshots in
// screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// --- Round 4 addition: build summary + input validation (written for this rebuild) ---
// Reads the copied app/ and screenshots/ in the output dir and prints a short,
// deterministic report. It is read-only (it writes no files), so running the build
// twice still produces byte-identical dossiers. It fails fast instead of handing
// the judge a dossier built from a half-copied tree.
function summarizeBuild(outputDir: string): void {
  const appDir = join(outputDir, 'app');
  const shotDir = join(outputDir, 'screenshots');
  const lines: string[] = [];
  const requiredApp = [
    'index.html',
    'style.css',
    'src/main.js',
    'src/cover.js',
    'src/shots.js',
    'fonts/Anton-Regular.ttf',
    'fonts/Pacifico-Regular.ttf',
    'fonts/OFL.txt',
  ];
  const missing = requiredApp.filter((rel) => !existsSync(join(appDir, rel)));
  lines.push(`app files present: ${requiredApp.length - missing.length}/${requiredApp.length}`);
  if (missing.length > 0) lines.push(`MISSING app files: ${missing.join(', ')}`);
  const sampleNames = readdirSync(join(appDir, 'samples'))
    .filter((name) => name.endsWith('.jpg'))
    .sort();
  lines.push(`sample photos: ${sampleNames.length} (${sampleNames.join(', ')})`);
  const shotNames = existsSync(shotDir)
    ? readdirSync(shotDir).filter((name) => name.endsWith('.jpg')).sort()
    : [];
  const oversize: string[] = [];
  let shotBytes = 0;
  for (const name of shotNames) {
    const size = statSync(join(shotDir, name)).size;
    shotBytes += size;
    if (size > 262144) oversize.push(`${name} (${size} bytes)`);
  }
  lines.push(`screenshots: ${shotNames.length} (${shotNames.join(', ')}) totalling ${shotBytes} bytes`);
  if (oversize.length > 0) lines.push(`OVERSIZE screenshots: ${oversize.join(', ')}`);
  const indexBytes = statSync(join(appDir, 'index.html')).size;
  lines.push(`app/index.html: ${indexBytes} bytes`);
  console.log(['--- Vice Cover Studio build summary ---', ...lines, '--- end summary ---'].join('\n'));
  const problems = [
    ...missing.map((name) => `missing ${name}`),
    ...oversize,
    ...(shotNames.length === 0 ? ['no screenshots'] : []),
  ];
  if (problems.length > 0) throw new Error(`build summary found problems: ${problems.join('; ')}`);
}

summarizeBuild(out);

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
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
