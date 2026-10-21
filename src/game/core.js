// Owns shared game constants, geometry, and utility functions.
const BUILD = 61;
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2, BASE = -Math.PI / 2;
const LABEL_FONT = '"IBM Plex Sans Condensed","Arial Narrow",sans-serif';
const DISPLAY_FONT = '"Michroma","Arial Black",sans-serif';
const pick = a => a[Math.floor(Math.random() * a.length)];
const mod = (a, n) => ((a % n) + n) % n;
const lerp = (a, b, t) => a + (b - a) * t;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const metres = () => pick([5, 10, 15, 20, 25, 30, 40, 50, 75, 100]);
