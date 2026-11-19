// Takes this entry's four QA screenshots with headless Chrome: serves
// app/ on a scratch port, captures each shot in shots.json at its window
// size, then converts the capture to a JPEG inside the gate's limits
// (long side at most 1280, short side at least 480, at most 256 KiB).
// Run from the repository root:  node shots-r5.mjs

import { execFile, spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const here = fileURLToPath(new URL('.', import.meta.url));
const shots = JSON.parse((await import('node:fs')).readFileSync(join(here, 'shots.json'), 'utf8'));
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;
const PORT = 8901;
const TMP = '/tmp/neon-palms-shots-r5';
mkdirSync(TMP, { recursive: true });

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'ignore' });
const waitForServer = async () => {
  const deadline = Date.now() + 15000;
  for (;;) {
    try {
      await run('curl', ['-sf', `http://127.0.0.1:${PORT}/`]);
      return;
    } catch {
      if (Date.now() > deadline) throw new Error('serve.ts did not answer in time');
      await new Promise((r) => setTimeout(r, 300));
    }
  }
};

const toJpeg = async (pngPath, jpgPath, w, h) => {
  // PIL squeezes the quality until the file fits the 256 KiB cap.
  const script = [
    'import sys',
    'from PIL import Image',
    'png, jpg, q = sys.argv[1], sys.argv[2], 88',
    'im = Image.open(png).convert("RGB")',
    'im.save(jpg, "JPEG", quality=q, optimize=True)',
    'import os',
    'while os.path.getsize(jpg) > 262144 and q > 40:',
    '    q -= 8',
    '    im.save(jpg, "JPEG", quality=q, optimize=True)',
    'print(f"{jpg} {im.size[0]}x{im.size[1]} {os.path.getsize(jpg)} bytes q={q}")',
  ].join('\n');
  const { stdout } = await run('python3', ['-c', script, pngPath, jpgPath]);
  console.log(stdout.trim());
};

try {
  await waitForServer();
  for (const shot of shots) {
    const png = join(TMP, shot.name.replace(/\.jpg$/, '.png'));
    const jpg = join(here, 'screenshots', shot.name);
    const url = `http://127.0.0.1:${PORT}/${shot.query}`;
    await run(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${shot.w},${shot.h}`,
      '--virtual-time-budget=20000',
      `--screenshot=${png}`,
      url,
    ]);
    if (!existsSync(png)) throw new Error(`chrome wrote no capture for ${shot.name}`);
    await toJpeg(png, jpg, shot.w, shot.h);
  }
  console.log('all 4 screenshots written to screenshots/');
} finally {
  server.kill();
}
