import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
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
  'src/wallet/core.js',
  'src/wallet/helpers.js',
  'src/wallet/firebase.js',
  'src/wallet/payouts.js',
  'src/wallet/styles.js',
  'src/wallet/top-bar.js',
  'src/wallet/accounts.js',
  'src/wallet/spins.js',
  'src/wallet/top-up.js',
  'src/wallet/account-stats.js',
  'src/wallet/withdraw.js',
  'src/wallet/live-watch.js',
  'src/wallet/big-wins.js',
  'src/wallet/messages.js',
  'src/wallet/live-feed.js',
  'src/wallet/updates.js',
  'src/wallet/boot.js',
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
html = replaceMarker(html, '<!-- @style-fonts -->', `<style>${newline}${read('src/css/fonts.css')}${newline}</style>`);
html = replaceMarker(html, '<!-- @style-app -->', `<style>${newline}${read('src/css/app.css')}${newline}</style>`);
html = replaceMarker(html, '<!-- @game-script -->', `<script>${newline}${gameModules.map(read).join('')}${newline}</script>`);
html = replaceMarker(html, '<!-- @wallet-config -->', `<script>window.WALLET_CFG = ${read('src/config.json').trim()};</script>`);
html = replaceMarker(html, '<!-- @wallet-script -->', `<script>${newline}${walletModules.map(read).join('')}${newline}</script>`);

writeFileSync(resolve(root, 'game/index.html'), html, 'utf8');
