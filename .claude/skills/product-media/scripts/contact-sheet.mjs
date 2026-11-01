// Builds one contact sheet per stock video, using a real browser, so no ffmpeg is needed.
// Run from the repo root: node .claude/skills/product-media/scripts/contact-sheet.mjs
// Then open http://127.0.0.1:4178/?dir=<Collection> and wait for "ALL DONE". It exits by itself then.
// Reads "Business data/Stock" only. Writes sheets only to the OS temp folder, because
// frames may show another brand and must stay out of the repo and out of "Business data/".
import { createReadStream, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve('Business data/Stock');
const out = path.join(os.tmpdir(), 'mustafa-contact-sheets');
const port = 4178;
const VIDEO = /\.(mp4|mov|webm)$/i;

// Spread through the video, then close together at the end, where end cards appear.
const page = `<!doctype html><meta charset="utf-8"><title>Contact sheets</title>
<body style="font:14px sans-serif"><pre id="log"></pre><script>
const log = (t) => { document.getElementById('log').textContent += t + '\\n'; };
const dir = new URLSearchParams(location.search).get('dir');
async function sheet(file) {
  const v = document.createElement('video');
  v.muted = true; v.preload = 'auto'; v.src = '/file/' + encodeURIComponent(file);
  await new Promise((ok, no) => { v.onloadedmetadata = ok; v.onerror = () => no(new Error('cannot decode')); });
  const d = v.duration;
  const times = [0, .2, .4, .6, .8].map((f) => f * d).concat([d - 3, d - 1, d - 0.1]).map((t) => Math.max(0, t)).sort((a, b) => a - b);
  const w = 360, h = Math.round((w * v.videoHeight) / v.videoWidth);
  const c = document.createElement('canvas'); c.width = w * 4; c.height = (h + 24) * 2;
  const g = c.getContext('2d'); g.font = '16px sans-serif'; g.fillStyle = '#fff';
  for (const [i, t] of times.entries()) {
    await new Promise((ok) => { v.onseeked = ok; v.currentTime = t; });
    const x = (i % 4) * w, y = Math.floor(i / 4) * (h + 24);
    g.drawImage(v, x, y + 24, w, h);
    g.fillText(t.toFixed(1) + ' s of ' + d.toFixed(1) + ' s', x + 4, y + 17);
  }
  const res = await fetch('/sheet/' + encodeURIComponent(file), { method: 'POST', body: c.toDataURL('image/jpeg', 0.85) });
  log(file + ' | ' + d.toFixed(1) + ' s | ' + v.videoWidth + 'x' + v.videoHeight + ' | ' + (await res.text()));
}
(async () => {
  for (const file of await (await fetch('/list/' + encodeURIComponent(dir))).json()) {
    try { await sheet(file); } catch (e) { log(file + ' | FAILED: ' + e.message); }
  }
  log('ALL DONE');
  fetch('/done', { method: 'POST' });
})();
</script>`;

const inStock = (encoded) => {
  const file = path.resolve(root, decodeURIComponent(encoded));
  return file.startsWith(root + path.sep) ? file : null;
};

createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  const [, kind, name] = pathname.split('/');

  if (kind === 'done') return void res.end(() => process.exit(0));

  if (kind === 'list') {
    const dir = inStock(name);
    if (!dir) return void res.writeHead(403).end();
    const files = readdirSync(dir).filter((f) => VIDEO.test(f)).map((f) => `${decodeURIComponent(name)}/${f}`);
    return void res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(files));
  }

  if (kind === 'sheet') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      mkdirSync(out, { recursive: true });
      const target = path.join(out, `${path.basename(decodeURIComponent(name))}.jpg`);
      writeFileSync(target, Buffer.from(body.split(',')[1], 'base64'));
      res.end(target);
    });
    return;
  }

  if (kind === 'file') {
    const file = inStock(name);
    if (!file) return void res.writeHead(403).end();
    const { size } = statSync(file);
    const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? '');
    const start = range ? Number(range[1]) : 0;
    const end = range && range[2] ? Number(range[2]) : size - 1;
    res.writeHead(range ? 206 : 200, {
      'content-type': 'video/mp4',
      'accept-ranges': 'bytes',
      'content-length': end - start + 1,
      ...(range ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}),
    });
    return void createReadStream(file, { start, end }).pipe(res);
  }

  res.writeHead(200, { 'content-type': 'text/html' }).end(page);
}).listen(port, '127.0.0.1', () => console.log(`Open http://127.0.0.1:${port}/?dir=<Collection>. Sheets go to ${out}`));
