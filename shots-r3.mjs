// Round 3 screenshot + selftest driver (written fresh for this round).
// Uses the upstream Chromium from the Playwright cache: the Hatch-patched
// Chromium in /opt/meta-chromium refuses every localhost navigation
// (ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS) in this cell.
// Usage: node shots-r3.mjs
import { spawn, execFile } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const PORT = 8083;
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const MAX_BYTES = 262144;
const SHOTS = [
  { name: '1-cover.jpg', w: 1280, h: 720, url: '/?shot=cover&layout=hero-top&grade=vice-sunset&title=VICE%20CITY&photo=convertible' },
  { name: '2-editor.jpg', w: 1280, h: 800, url: '/?shot=editor&layout=hero-top&grade=neon-night' },
  { name: '3-portrait.jpg', w: 1024, h: 1280, url: '/?shot=cover&layout=portrait-stack&grade=magenta-dusk&size=portrait&title=SUNSET%20HEIST' },
  { name: '4-square.jpg', w: 1024, h: 1024, url: '/?shot=cover&layout=four-square&grade=gold-hour&size=square&title=GOLD%20RUSH&photo=convertible' },
];
const CHROME_FLAGS = [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--hide-scrollbars', '--force-device-scale-factor=1', '--no-proxy-server',
  '--user-data-dir=/tmp/chrome-prof-r3',
];

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 20 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) reject(new Error(cmd + ' failed: ' + (stderr || err.message)));
      else resolve(stdout);
    });
  });
}

async function waitForServer(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try { const res = await fetch(`http://127.0.0.1:${PORT}/`); if (res.ok) return; } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('server did not come up on port ' + PORT);
}

async function toJpeg(pngPath, jpgPath) {
  for (const q of [88, 80, 72, 64, 55, 45]) {
    const script = [
      'from PIL import Image',
      `im = Image.open(${JSON.stringify(pngPath)}).convert("RGB")`,
      `im.save(${JSON.stringify(jpgPath)}, "JPEG", quality=${q}, optimize=True)`,
    ].join('\n');
    await run('python3', ['-c', script]);
    if (statSync(jpgPath).size <= MAX_BYTES) return q;
  }
  throw new Error(jpgPath + ' still over 256 KiB at quality 45');
}

async function main() {
  mkdirSync(join(here, 'screenshots'), { recursive: true });
  const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'ignore' });
  try {
    await waitForServer();
    console.log('server up on ' + PORT);

    // --- selftest (?selftest=1 writes its verdict into <title>) ---
    const dom = await run(CHROME, [
      ...CHROME_FLAGS, '--virtual-time-budget=20000', '--dump-dom',
      `http://127.0.0.1:${PORT}/?selftest=1`,
    ]);
    const m = dom.match(/<title>([^<]*)<\/title>/);
    console.log('SELFTEST:', m ? m[1] : 'NO TITLE FOUND');
    if (!m || !m[1].startsWith('SELFTEST PASS')) throw new Error('selftest did not pass: ' + (m ? m[1] : '(no title)'));

    // --- screenshots ---
    for (const s of SHOTS) {
      const png = join('/tmp', s.name.replace('.jpg', '.png'));
      const jpg = join(here, 'screenshots', s.name);
      await run(CHROME, [
        ...CHROME_FLAGS,
        `--window-size=${s.w},${s.h}`,
        '--virtual-time-budget=15000',
        `--screenshot=${png}`,
        `http://127.0.0.1:${PORT}${s.url}`,
      ]);
      if (!existsSync(png)) throw new Error('no screenshot produced for ' + s.name);
      const q = await toJpeg(png, jpg);
      console.log(`${s.name}: ${statSync(jpg).size} bytes (quality ${q}), ${s.w}x${s.h}`);
    }
  } finally {
    server.kill();
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
