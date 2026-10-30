// npm run build の後に dist/ を確かめる（仕様書 §29.4）
// TASK ごとに確かめることを足していく：敵の絵（TASK-0018）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const errors = [];
const read = (p) => fs.readFileSync(path.join(dist, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(dist, p));

if (!exists('index.html')) {
  errors.push('dist/index.html がない（npm run build を先に動かす）');
} else {
  const html = read('index.html');
  if (!html.includes('id="app"')) errors.push('index.html に #app がない');
  if (!html.includes(`<meta name="app-id" content="${pkg.name}"`)) errors.push(`index.html に <meta name="app-id" content="${pkg.name}"> がない`);
  if (html.includes('__APP_ID__')) errors.push('index.html に __APP_ID__ が置き換わらずに残っている');
  if (!html.includes('<html lang="ja">')) errors.push('index.html の <html> に lang="ja" がない');
  // 起動の見張り（仕様書 §30.4）
  if (!html.includes('id="boot-error"')) errors.push('index.html に #boot-error がない');
  if (!/<script src="\.\/boot\.js"><\/script>/.test(html)) errors.push('index.html が boot.js を読み込んでいない');
}
if (!exists('boot.js')) errors.push('boot.js がない');
else if (!read('boot.js').includes('__appStarted')) errors.push('boot.js が __appStarted を見ていない');

// manifest と Service Worker（仕様書 §30.1）
if (!exists('manifest.webmanifest')) errors.push('manifest.webmanifest がない');
else {
  const m = JSON.parse(read('manifest.webmanifest'));
  if (m.name !== 'WIZ') errors.push(`manifest の name が「WIZ」でない（${m.name}）`);
  if (m.display !== 'standalone') errors.push('manifest の display が standalone でない');
  if (!m.start_url) errors.push('manifest に start_url がない');
  if (m.orientation !== 'portrait') errors.push('manifest の orientation が portrait でない');
  if (exists('index.html') && !read('index.html').includes('manifest.webmanifest')) errors.push('index.html が manifest.webmanifest を読み込んでいない');
  // アイコン 192（any）・512（any）・512（maskable）が manifest にあり、ファイルもある
  for (const [size, purpose] of [['192x192', 'any'], ['512x512', 'any'], ['512x512', 'maskable']]) {
    const icon = (m.icons || []).find((i) => i.sizes === size && (i.purpose || 'any').split(' ').includes(purpose));
    if (!icon) errors.push(`manifest にアイコン ${size}（${purpose}）がない`);
    else if (!exists(icon.src)) errors.push(`アイコンのファイル ${icon.src} がない`);
  }
}
// apple-touch-icon（iPhone のホーム画面）
if (!exists('icons/apple-touch-icon.png')) errors.push('icons/apple-touch-icon.png がない');
if (exists('index.html') && !/rel="apple-touch-icon"/.test(read('index.html'))) errors.push('index.html に apple-touch-icon の link がない');
if (!exists('sw.js')) errors.push('sw.js がない');

// Web フォントを同梱しない（端末のフォントを使う。ADR-0010）
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
if (fs.existsSync(dist)) for (const f of walk(dist)) if (/\.(woff2?|ttf|otf)$/i.test(f)) errors.push(`Web フォントがある：${path.relative(dist, f)}`);

for (const e of errors) console.error(`エラー: ${e}`);
console.log(errors.length ? `dist の検査：エラー ${errors.length}` : 'dist の検査：OK');
process.exit(errors.length ? 1 : 0);
