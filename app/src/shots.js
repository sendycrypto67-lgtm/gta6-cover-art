// Fixed scenes for screenshots and the export self-test.
//   ?shot=cover&layout=grid&grade=sunset&caption=Vice%20Coast&size=square
//     draws the cover alone, full viewport.
//   ?shot=editor&layout=trio&grade=neon&caption=Neon%20Nights
//     shows the editor with the cover loaded.
//   ?shot=export&size=portrait draws a cover off-screen, exports it as a PNG
//     blob and writes the byte count into #export-result for the test harness.
// window.__shotReady is set once the scene is painted.
export async function runShot(shot, query, app) {
  const { state } = app;
  const layout = query.get('layout') || 'grid';
  const grade = query.get('grade') || 'sunset';
  const caption = query.get('caption') ?? 'Vice Coast';
  const captionPos = query.get('captionPos') || 'bottom';
  const size = query.get('size') || 'square';
  const photos = (query.get('photos') || 'pier,boulevard,pier,boulevard').split(',');

  if (shot === 'cover') document.body.classList.add('shot-cover');
  app.setLayout(layout);
  app.setSize(size);
  app.setCaption(caption);
  app.setCaptionPos(captionPos);
  state.captionPos = captionPos;

  // Load the panel photos, alternating the two samples by default.
  const loaded = await Promise.all(photos.map((key) => {
    const k = key.trim() || 'pier';
    return app.loadImage(`samples/${k}.jpg`).catch(() => null);
  }));
  const grades = ['sunset', 'neon', 'sunset', 'neon'];
  loaded.forEach((img, i) => {
    state.panels[i].img = img;
    state.panels[i].grade = grade === 'mixed' ? grades[i] : grade;
    state.panels[i].zoom = 1;
    state.panels[i].ox = 0;
    state.panels[i].oy = 0;
  });
  app.redraw();

  if (shot === 'export') {
    const sizeDef = app.SIZES[size] || app.SIZES.square;
    const off = document.createElement('canvas');
    off.width = sizeDef.w;
    off.height = sizeDef.h;
    const { drawCover } = await import('./cover.js');
    drawCover(off.getContext('2d'), state, sizeDef.w, sizeDef.h);
    const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
    const el = document.createElement('p');
    el.id = 'export-result';
    el.textContent = blob ? `PNG ${blob.size} bytes ${blob.type}` : 'EXPORT FAILED';
    document.body.appendChild(el);
  }

  // Wait for the bold caption font, then paint twice before signalling ready.
  try {
    await document.fonts.load('700 100px "DejaVu Sans"');
    await document.fonts.ready;
  } catch { /* system sans still draws */ }
  app.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
