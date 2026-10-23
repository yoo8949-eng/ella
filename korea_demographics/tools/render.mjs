import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import path from 'path';
const [,, mode, a1, a2, a3] = process.argv;
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.error('PAGEERR', e.message));
await page.goto('file://' + path.resolve(process.env.HTML || 'index.html'));
await page.waitForFunction('window.ready===true', null, { timeout: 60000 });
if (mode === 'stills') {
  // a1 = comma times, a2 = outdir
  for (const t of a1.split(',').map(Number)) {
    const url = await page.evaluate(t => frameJpeg(t, .9), t);
    const fs = await import('fs');
    fs.writeFileSync(`${a2}/f_${t.toFixed(1).padStart(6, '0')}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  }
} else if (mode === 'check') {
  // render every 0.25s quickly to surface errors
  const total = await page.evaluate('TOTAL');
  const errs = await page.evaluate(total => { const out = []; for (let t = 0; t < total; t += 0.2) { try { render(t); } catch (e) { if (!out.some(o => o.endsWith(e.message))) out.push(t.toFixed(1) + ' ' + e.message); } } return out; }, total);
  console.log(errs.length ? errs.slice(0, 40).join('\n') : 'no errors');
} else if (mode === 'events') {
  // a1 = out json: collect SFX cues by rendering every frame
  const total = await page.evaluate('TOTAL');
  const ev = await page.evaluate(total => { for (let f = 0; f < total * 30; f++) render(f / 30); return EVENTS; }, total);
  const fs = await import('fs'); fs.writeFileSync(a1, JSON.stringify(ev)); console.log(ev.length, 'cues');
} else if (mode === 'video') {
  const f0 = +a1, f1 = +a2, out = a3, fps = 30;
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-threads', '2', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const url = await page.evaluate(t => frameJpeg(t, .93), f / fps);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 300 === 0) console.log(`${out} ${f - f0}/${f1 - f0} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await browser.close();