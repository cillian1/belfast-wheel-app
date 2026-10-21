// ---------- boot ----------
// Owns initial canvas sizing, input handlers, and game startup.
fitStage();
new ResizeObserver(resize).observe(cv);
resize();
if (document.fonts && document.fonts.load) {
  Promise.all([document.fonts.load(`700 20px ${LABEL_FONT}`), document.fonts.load(`20px ${DISPLAY_FONT}`), document.fonts.load(`italic 500 20px "Cormorant Garamond"`)])
    .catch(() => {}).then(() => { if (N) { build(); draw(); } });
}
