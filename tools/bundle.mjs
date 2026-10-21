import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const readBuffer = path => readFileSync(resolve(root, path));
const gameModules = [
  'src/game/core.js',
  'src/game/content.js',
  'src/game/canvas-helpers.js',
  'src/game/room.js',
  'src/game/faces.js',
  'src/game/state.js',
  'src/game/drawing.js',
  'src/game/sound.js',
  'src/game/music.js',
  'src/game/motion.js',
  'src/game/ball-physics.js',
  'src/game/ui.js',
  'src/game/ultra-bonus.js',
  'src/game/wild-room.js',
  'src/game/dice.js',
  'src/game/bonus-round.js',
  'src/game/phelans-revenge.js',
  'src/game/god-room.js',
  'src/game/pyramid.js',
  'src/game/mark-ending.js',
  'src/game/chicken-race.js',
  'src/game/show-me.js',
  'src/game/read-moves.js',
  'src/game/boot.js',
];
const walletModules = [
  'src/wallet/db.js',
  'src/wallet/ui.js',
  'src/wallet/money.js',
  'src/wallet/watch.js',
  'src/wallet/notes.js',
];

function replaceMarker(html, marker, replacement) {
  const first = html.indexOf(marker);
  if (first < 0 || html.indexOf(marker, first + marker.length) >= 0) {
    throw new Error(`Expected exactly one ${marker} marker in src/index.html`);
  }
  return html.slice(0, first) + replacement + html.slice(first + marker.length);
}

let html = read('src/index.html');
const newline = html.includes('\r\n') ? '\r\n' : '\n';
const ghostSprite = readBuffer('assets/ghost.webp');
if (ghostSprite.length > 150 * 1024) throw new Error('assets/ghost.webp must be no larger than 150 KB');
html = replaceMarker(html, '<!-- @style-fonts -->', `<style>${newline}${read('src/css/fonts.css')}${newline}</style>`);
html = replaceMarker(html, '<!-- @style-app -->', `<style>${newline}${read('src/css/app.css')}${newline}</style>`);
html = replaceMarker(html, '<!-- @game-script -->', `<script>${newline}${gameModules.map(read).join('')}${newline}</script>`);
html = replaceMarker(html, '<!-- @wallet-config -->', `<script>window.WALLET_CFG = ${read('src/config.json').trim()};</script>`);
html = replaceMarker(html, '<!-- @ghost-sprite -->', `<script>const GHOST_SPRITE_DATA = 'data:image/webp;base64,${ghostSprite.toString('base64')}';</script>`);
html = replaceMarker(html, '<!-- @wallet-script -->', `<script>${newline}${walletModules.map(read).join('')}${newline}</script>`);

writeFileSync(resolve(root, 'game/index.html'), html, 'utf8');
