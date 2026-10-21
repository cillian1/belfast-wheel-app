// Builds the Android app from the latest Wheel of Life HTML.
//   node tools/build.mjs [path/to/wheel-of-life.html]
// Output: out/WheelOfLife.apk and out/publish/ (version.json, game/index.html, app/WheelOfLife.apk) for the updates repo.
// Bump "release" in config.json for a game-only update, and "apk" too when the Java side changes.
import fs from 'fs';
import path from 'path';
import { execFileSync as run } from 'child_process';
import { moneyify } from './money.mjs';

const A = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(A, 'config.json'), 'utf8'));
const game = process.argv[2] || path.join(A, '..', 'wheel-of-life.html');
const work = process.env.WORK || '/tmp/wol-build';
const out = path.join(A, 'out');
const tools = process.env.TOOLS || path.join(work, 'tools');
fs.rmSync(work, { recursive: true, force: true });
for (const d of ['assets/fonts', 'classes', 'stubs', 'icons', 'tools']) fs.mkdirSync(path.join(work, d), { recursive: true });
fs.mkdirSync(path.join(out, 'publish/game'), { recursive: true }); fs.mkdirSync(path.join(out, 'publish/app'), { recursive: true });

// 1. tools: android stub jar, dx and apksig from Maven Central (dl.google.com is not needed)
const jar = path.join(tools, 'android-4.1.1.4.jar'), dx = path.join(tools, 'dalvik-dx-16.0.1.jar');
if (!fs.existsSync(jar)) run('curl', ['-sfo', jar, 'https://repo1.maven.org/maven2/com/google/android/android/4.1.1.4/android-4.1.1.4.jar']);
const sig = path.join(tools, 'apksig-2.3.0.jar');
if (!fs.existsSync(sig)) run('curl', ['-sfo', sig, 'https://repo1.maven.org/maven2/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar']);
if (!fs.existsSync(dx)) run('curl', ['-sfo', dx, 'https://repo1.maven.org/maven2/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar']);

// 2. the page: local fonts, prizes through $m(), wallet layer on top
let html = fs.readFileSync(game, 'utf8');
// the artifact host adds these; a WebView needs them in the page (else: Latin-1 text and a 980px desktop viewport)
if (!/<meta charset/i.test(html)) html = '<meta charset="utf-8">\n' + html;
if (!/<meta name="viewport"/i.test(html)) html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
const build = (/const BUILD = (\d+)/.exec(html) || [])[1] || '?';
const fontCss = fs.readFileSync(path.join(A, 'fonts/fonts.css'), 'utf8').replace(/FONTDIR\//g, 'file:///android_asset/fonts/');
html = html.replace(/<link rel="preconnect"[^>]*>\s*/g, '').replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<style>\n' + fontCss + '</style>');
// app-only odds: near-miss tip chance, and (optionally) no money on Mark's prize chickens
const patch = (re, to, what) => { if (!re.test(html)) throw new Error('game changed, cannot patch ' + what); html = html.replace(re, to); };
if (cfg.tip != null) patch(/let TIP_CHANCE = [\d.]+;/, `let TIP_CHANCE = ${cfg.tip};`, 'TIP_CHANCE');
if (cfg.markPrizes === false) patch(
  /v = k === 'W' \? 10 : 5; return \{ lbl: \[`€\$\{v\}`, \.\.\.q\.lbl\.slice\(0, 2\)\]\.slice\(0, 3\), t: q\.t, b: `\$\{k === 'W' \? 'A gold' : 'A purple'\} chicken made it: €\$\{v\} if Mark answers properly\.`, prize: v,/,
  "v = 0; return { lbl: q.lbl.slice(0, 3), t: q.t, b: `${k === 'W' ? 'A gold' : 'A purple'} chicken made it.`, prize: v,", 'Mark prize chickens');
const a = html.indexOf('<script>') + 8, b = html.lastIndexOf('</script>');
const m = moneyify(html.slice(a, b));
console.log(`game build ${build}: ${m.count} money edits`);
html = html.slice(0, a) + m.js + html.slice(b);
html = html.replace(/<footer>Build (\d+)<\/footer>/, `<footer>Build $1 · app ${cfg.release}</footer>`);
const walletCfg = {
  db: cfg.db, revolut: cfg.revolut, gameVersion: cfg.release, ev: cfg.ev, edge: cfg.edge, stakes: cfg.stakes,
  updateUrl: `https://raw.githubusercontent.com/${cfg.repo}/main/version.json`,
};
html += `\n<script>window.WALLET_CFG = ${JSON.stringify(walletCfg)};</script>\n<script>\n${fs.readFileSync(path.join(A, 'wallet.js'), 'utf8')}</script>\n`;
fs.writeFileSync(path.join(work, 'assets/index.html'), html);

// host page for Cillian (GitHub Pages): same database helpers as the app
const wallet = fs.readFileSync(path.join(A, 'wallet.js'), 'utf8');
const shared = wallet.slice(wallet.indexOf('// <shared>'), wallet.indexOf('// </shared>'));
const host = fs.readFileSync(path.join(A, 'host.html'), 'utf8').replace('/*CFG*/{}', JSON.stringify(walletCfg)).replace('/*SHARED*/', () => shared);
fs.writeFileSync(path.join(out, 'publish/host.html'), host);
fs.writeFileSync(path.join(out, 'publish/index.html'), '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Wheel</title><meta http-equiv="refresh" content="0; url=host.html">\n');
fs.writeFileSync(path.join(work, 'assets/version.txt'), String(cfg.release));
for (const f of fs.readdirSync(path.join(A, 'fonts'))) if (f.endsWith('.woff2')) fs.copyFileSync(path.join(A, 'fonts', f), path.join(work, 'assets/fonts', f));

// 3. Java -> dex
const javac = (cp, dst, files) => run('javac', ['-nowarn', '--release', '8', '-cp', cp, '-d', dst, ...files], { stdio: ['ignore', 'ignore', 'inherit'] });
const ls = d => fs.readdirSync(d).map(f => path.join(d, f));
javac(jar, path.join(work, 'stubs'), ls(path.join(A, 'stubs/android/webkit')));
javac(path.join(work, 'stubs') + ':' + jar, path.join(work, 'classes'), ls(path.join(A, 'src/ie/belfast/wheel')));
run('java', ['-cp', dx, 'com.android.dx.command.Main', '--dex', '--min-sdk-version=24', '--output=' + path.join(work, 'classes.dex'), path.join(work, 'classes')], { stdio: ['ignore', 'ignore', 'inherit'] });

// 4. icons, zip, sign
for (const f of ['icon.png', 'icon_fg.png', 'icon_bg.png']) fs.copyFileSync(path.join(A, 'icons', f), path.join(work, 'icons', f));
const unsigned = path.join(work, 'unsigned.apk'), apk = path.join(out, 'WheelOfLife.apk');
run('python3', [path.join(A, 'tools/mkapk.py'), unsigned, path.join(work, 'classes.dex'), path.join(work, 'assets'), path.join(work, 'icons'), String(cfg.apk), `1.${cfg.apk}.${cfg.release}`]);
const ks = path.join(A, 'keystore.p12');
if (!fs.existsSync(ks)) run('keytool', ['-genkeypair', '-keystore', ks, '-storetype', 'PKCS12', '-storepass', 'wheeloflife', '-alias', 'wheel', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Wheel of Life'], { stdio: 'ignore' });
console.log(run('java', ['--add-exports', 'java.base/sun.security.x509=ALL-UNNAMED', '--add-exports', 'java.base/sun.security.pkcs=ALL-UNNAMED', '--add-exports', 'java.base/sun.security.util=ALL-UNNAMED', '-cp', sig, path.join(A, 'tools/Sign.java'), unsigned, apk, ks, 'wheeloflife', 'wheel'], { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim());

// 5. files for the updates repo
fs.writeFileSync(path.join(out, 'publish/game/index.html'), html);
fs.copyFileSync(apk, path.join(out, 'publish/app/WheelOfLife.apk'));
const raw = `https://raw.githubusercontent.com/${cfg.repo}/main/`;
fs.writeFileSync(path.join(out, 'publish/version.json'), JSON.stringify({
  game: cfg.release, apk: cfg.apk, gameBuild: +build || 0, notes: cfg.notes || '',
  gameUrl: raw + 'game/index.html', apkUrl: raw + 'app/WheelOfLife.apk',
}, null, 2) + '\n');
console.log('built', apk, fs.statSync(apk).size, 'bytes');
