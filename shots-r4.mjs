// shots-r4.mjs — captures the 4 round-4 screenshots + runs the in-browser self-test.
// Stdlib only: drives upstream Chromium (Playwright cache) over CDP with Node's
// built-in WebSocket client. Serves app/ on port 8084 via serve.ts while it runs.
// Usage: node shots-r4.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;
const PORT = 8084;
const DEBUG_PORT = 9223;
const BASE = `http://127.0.0.1:${PORT}`;

const SHOTS = [
  { name: '1-cover.jpg', query: '?shot=cover', w: 1280, h: 720 },
  { name: '2-editor.jpg', query: '?shot=editor', w: 1280, h: 800 },
  { name: '3-portrait.jpg', query: '?shot=portrait', w: 1024, h: 1280 },
  { name: '4-square.jpg', query: '?shot=square', w: 1024, h: 1024 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, timeoutMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error(`timed out waiting for ${url}`);
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    };
  }
  async send(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    const p = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return p;
  }
  async sendSession(sessionId, method, params = {}) {
    await this.ready;
    const id = ++this.id;
    const p = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return p;
  }
  close() { this.ws.close(); }
}

async function main() {
  mkdirSync(join(here, 'screenshots'), { recursive: true });

  // 1. Serve app/ on 8084.
  const server = spawn(process.execPath, ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (d) => process.stdout.write(`[serve] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[serve] ${d}`));
  const killAll = () => { try { server.kill(); } catch {} };

  // 2. Launch headless Chromium with a debugging port.
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${DEBUG_PORT}`, '--user-data-dir=/tmp/shots-r4-profile', 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  chrome.stderr.on('data', (d) => { const s = String(d); if (/ERROR|FATAL/.test(s)) process.stderr.write(`[chrome] ${s}`); });

  try {
    await waitFor(`${BASE}/index.html`);
    await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    const version = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json();
    const browser = new Cdp(version.webSocketDebuggerUrl);
    await browser.send('Target.setDiscoverTargets', { discover: true });

    const runPage = async (url, width, height) => {
      const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
      const page = {
        // Flat mode (flatten: true): send the method directly with sessionId.
        send: (method, params = {}) => browser.sendSession(sessionId, method, params),
        msgId: 0,
      };
      // Collect console errors / exceptions / failed requests via the event stream.
      const errors = [];
      const eventWatch = setInterval(() => {
        while (browser.events.length) {
          const ev = browser.events.shift();
          if (ev.sessionId !== sessionId) continue;
          if (ev.method === 'Runtime.exceptionThrown') errors.push(`exception: ${ev.params.exceptionDetails?.text || ''} ${ev.params.exceptionDetails?.exception?.description || ''}`);
          if (ev.method === 'Runtime.consoleAPICalled' && ev.params.type === 'error') errors.push(`console.error: ${ev.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
          if (ev.method === 'Log.entryAdded' && ev.params.entry.level === 'error') errors.push(`log: ${ev.params.entry.text} ${ev.params.entry.url || ''}`);
          if (ev.method === 'Network.loadingFailed') errors.push(`network failed: ${ev.params.errorText}`);
        }
      }, 100);
      const close = async () => {
        clearInterval(eventWatch);
        await browser.send('Target.detachFromTarget', { sessionId }).catch(() => {});
        await browser.send('Target.closeTarget', { targetId }).catch(() => {});
      };
      try {
        await page.send('Runtime.enable');
        await page.send('Page.enable');
        await page.send('Log.enable');
        await page.send('Network.enable');
        await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await page.send('Page.navigate', { url });
        // Wait for the page to signal it is painted.
        let ready = false;
        const t0 = Date.now();
        while (Date.now() - t0 < 30000) {
          const r = await page.send('Runtime.evaluate', { expression: 'window.__shotReady === true', returnByValue: true });
          if (r?.result?.value) { ready = true; break; }
          await sleep(250);
        }
        if (!ready) throw new Error(`__shotReady never fired for ${url}`);
        await sleep(400);
        const selftest = await page.send('Runtime.evaluate', { expression: 'window.__selftest || null', returnByValue: true });
        const shot = async (quality) => {
          const res = await page.send('Page.captureScreenshot', { format: 'jpeg', quality, captureBeyondViewport: false });
          return Buffer.from(res.data, 'base64');
        };
        return { page, errors, shot, selftest: selftest?.result?.value ?? null, close };
      } catch (err) {
        await close();
        throw err;
      }
    };

    // 3. Self-test first: it exercises every layout x grade in-browser.
    console.log('== selftest ==');
    const test = await runPage(`${BASE}/index.html?selftest=1`, 1280, 800);
    console.log('selftest:', test.selftest);
    console.log('console errors:', test.errors.length ? test.errors : 'none');
    await test.close();

    // 4. Screenshots, re-encoding at lower quality if any exceeds 256 KiB.
    for (const shotDef of SHOTS) {
      console.log(`== ${shotDef.name} ==`);
      const run = await runPage(`${BASE}/index.html${shotDef.query}`, shotDef.w, shotDef.h);
      let quality = 82;
      let buf = await run.shot(quality);
      while (buf.length > 262144 && quality > 40) {
        quality -= 12;
        buf = await run.shot(quality);
      }
      writeFileSync(join(here, 'screenshots', shotDef.name), buf);
      console.log(`${shotDef.name}: ${buf.length} bytes (quality ${quality}) errors: ${run.errors.length ? run.errors.join(' | ') : 'none'}`);
      await run.close();
    }
    browser.close();
  } finally {
    chrome.kill();
    killAll();
  }
}

main().catch((err) => {
  console.error('shots-r4 FAILED:', err);
  process.exit(1);
});
