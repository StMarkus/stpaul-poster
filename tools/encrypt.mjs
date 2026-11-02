#!/usr/bin/env node
// Verschlüsselt den Generator (Ordner src/) mit einem Passwort in die Datei app.bin.
// Nur app.bin wird veröffentlicht; src/ bleibt privat (steht in .gitignore).
//
//   node tools/encrypt.mjs            # fragt das Passwort ab
//   POSTER_PASSWORD=... node tools/encrypt.mjs
//
// Format von app.bin: "SPP1" | Iterationen (uint32 BE) | Salt (16) | IV (12) | AES-256-GCM-Chiffrat
import { webcrypto as crypto } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const ITER = 600000;
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.json': 'application/json' };

function walk(dir) {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function ask(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) { reject(new Error('Kein Terminal – Passwort über POSTER_PASSWORD übergeben.')); return; }
    process.stdout.write(question);
    stdin.setRawMode(true); stdin.resume(); stdin.setEncoding('utf8');
    let s = '';
    const on = ch => {
      if (ch === '\r' || ch === '\n' || ch === '\u0004') { stdin.setRawMode(false); stdin.pause(); stdin.off('data', on); process.stdout.write('\n'); resolve(s); }
      else if (ch === '\u0003') { process.stdout.write('\n'); process.exit(1); }
      else if (ch === '\u007f' || ch === '\b') s = s.slice(0, -1);
      else s += ch;
    };
    stdin.on('data', on);
  });
}

async function main() {
  let pw = process.env.POSTER_PASSWORD;
  if (!pw) {
    pw = await ask('Passwort: ');
    const pw2 = await ask('Passwort wiederholen: ');
    if (pw !== pw2) throw new Error('Die Passwörter stimmen nicht überein.');
  }
  if (pw.length < 8) throw new Error('Bitte mindestens 8 Zeichen verwenden.');

  const html = readFileSync(join(SRC, 'index.html'), 'utf8');
  const m = html.match(/<!--APP-START-->([\s\S]*)<!--APP-END-->/);
  if (!m) throw new Error('src/index.html: Markierungen APP-START/APP-END fehlen.');
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(x => x[1]);

  const files = {};
  for (const p of walk(SRC)) {
    const rel = relative(SRC, p).split('\\').join('/');
    if (rel === 'index.html' || rel.startsWith('.')) continue;
    const type = TYPES[extname(p).toLowerCase()];
    if (!type) continue;
    files[rel] = { type, b64: readFileSync(p).toString('base64') };
  }
  const plain = new TextEncoder().encode(JSON.stringify({ v: 1, html: m[1], scripts, styles: ['style.css'], files }));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));

  const head = new Uint8Array(4 + 4 + 16 + 12);
  head.set(new TextEncoder().encode('SPP1'), 0);
  new DataView(head.buffer).setUint32(4, ITER);
  head.set(salt, 8); head.set(iv, 24);
  const out = new Uint8Array(head.length + ct.length); out.set(head); out.set(ct, head.length);
  writeFileSync(join(ROOT, 'app.bin'), out);
  console.log(`app.bin geschrieben: ${Object.keys(files).length} Dateien, ${(out.length / 1048576).toFixed(1)} MB.`);
}

main().catch(e => { console.error('Fehler:', e.message); process.exit(1); });
