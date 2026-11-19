// The cover engine: draws a multi-panel GTA 6-style poster cover onto a 2D canvas.
// Everything is local: photos come from the user's files or the bundled samples,
// grades are canvas filters plus gradient overlays, lettering is the bundled
// DejaVu Sans Bold (see app/fonts/LICENSE-DejaVu.txt). No Rockstar logo, no
// official artwork, no Rockstar font is used anywhere.
//
// A cover state looks like:
//   { layout: 'hero' | 'split' | 'trio' | 'grid',
//     caption: string, captionPos: 'top' | 'bottom',
//     panels: [{ img, zoom, ox, oy, grade }] }   // ox, oy in panel fractions
// img is an HTMLImageElement (or null for an empty panel), zoom 1..3, ox/oy
// shift the photo inside its panel (-0.5..0.5).

export const LAYOUTS = {
  hero: { label: 'Single hero', panels: 1 },
  split: { label: 'Diagonal split', panels: 2 },
  trio: { label: 'Hero + two', panels: 3 },
  grid: { label: 'Four panel grid', panels: 4 },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.3) contrast(1.06) brightness(1.03)',
    overlay: ['rgba(255, 122, 26, 0.28)', 'rgba(255, 64, 129, 0.22)', 'rgba(88, 28, 135, 0.30)'],
    blend: 'overlay',
  },
  neon: {
    label: 'Neon',
    filter: 'saturate(1.65) contrast(1.12) brightness(1.0)',
    overlay: ['rgba(255, 0, 160, 0.30)', 'rgba(0, 0, 0, 0.0)', 'rgba(0, 229, 255, 0.30)'],
    blend: 'overlay',
  },
  noir: {
    label: 'Noir',
    filter: 'grayscale(1) contrast(1.22) brightness(1.04)',
    overlay: ['rgba(255, 255, 255, 0.05)', 'rgba(0, 0, 0, 0.10)'],
    blend: 'soft-light',
  },
  natural: {
    label: 'Natural',
    filter: 'saturate(1.05) contrast(1.02)',
    overlay: [],
    blend: 'overlay',
  },
};

/** Panel polygons for a layout, as fractions of the cover [x, y] in 0..1. */
export function panelPolys(layout) {
  const g = 0.008; // gutter, as a fraction of the short side
  switch (layout) {
    case 'hero':
      return [[[0, 0], [1, 0], [1, 1], [0, 1]]];
    case 'split':
      // One diagonal seam, top-right to bottom-left.
      return [
        [[0, 0], [0.66, 0], [0.34, 1], [0, 1]],
        [[0.66, 0], [1, 0], [1, 1], [0.34, 1]],
      ];
    case 'trio':
      return [
        [[0, 0], [0.62, 0], [0.62, 1], [0, 1]],
        [[0.62 + g, 0], [1, 0], [1, 0.5 - g / 2], [0.62 + g, 0.5 - g / 2]],
        [[0.62 + g, 0.5 + g / 2], [1, 0.5 + g / 2], [1, 1], [0.62 + g, 1]],
      ];
    case 'grid':
    default:
      return [
        [[0, 0], [0.5 - g / 2, 0], [0.5 - g / 2, 0.5 - g / 2], [0, 0.5 - g / 2]],
        [[0.5 + g / 2, 0], [1, 0], [1, 0.5 - g / 2], [0.5 + g / 2, 0.5 - g / 2]],
        [[0, 0.5 + g / 2], [0.5 - g / 2, 0.5 + g / 2], [0.5 - g / 2, 1], [0, 1]],
        [[0.5 + g / 2, 0.5 + g / 2], [1, 0.5 + g / 2], [1, 1], [0.5 + g / 2, 1]],
      ];
  }
}

function polyPath(ctx, poly, w, h) {
  ctx.beginPath();
  poly.forEach(([fx, fy], i) => {
    const x = fx * w;
    const y = fy * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function pointInPoly(x, y, poly, w, h) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0] * w;
    const yi = poly[i][1] * h;
    const xj = poly[j][0] * w;
    const yj = poly[j][1] * h;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Index of the panel under canvas point (x, y), or -1. */
export function hitPanel(layout, x, y, w, h) {
  const polys = panelPolys(layout);
  for (let i = polys.length - 1; i >= 0; i--) {
    if (pointInPoly(x, y, polys[i], w, h)) return i;
  }
  return -1;
}

/** Bounding box of a polygon, in pixels. */
function polyBox(poly, w, h) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [fx, fy] of poly) {
    x0 = Math.min(x0, fx * w);
    y0 = Math.min(y0, fy * h);
    x1 = Math.max(x1, fx * w);
    y1 = Math.max(y1, fy * h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function drawPanel(ctx, poly, panel, w, h) {
  const box = polyBox(poly, w, h);
  ctx.save();
  polyPath(ctx, poly, w, h);
  ctx.clip();
  // Base fill so an empty panel still reads as a poster block.
  const base = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  base.addColorStop(0, '#3a1c5c');
  base.addColorStop(0.55, '#c2437f');
  base.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = base;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  const img = panel && panel.img;
  if (img && img.naturalWidth) {
    const zoom = panel.zoom || 1;
    const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const ox = (panel.ox || 0) * box.w;
    const oy = (panel.oy || 0) * box.h;
    const grade = GRADES[panel.grade] || GRADES.sunset;
    ctx.filter = grade.filter;
    ctx.drawImage(img, box.x + (box.w - pw) / 2 + ox, box.y + (box.h - ph) / 2 + oy, pw, ph);
    ctx.filter = 'none';
    // Grade overlay: a vertical wash in the grade's colours.
    if (grade.overlay.length) {
      const wash = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
      grade.overlay.forEach((c, i) => wash.addColorStop(i / (grade.overlay.length - 1), c));
      ctx.globalCompositeOperation = grade.blend;
      ctx.fillStyle = wash;
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // Vignette: darkens the panel edges, the poster look.
  const vig = ctx.createRadialGradient(
    box.x + box.w / 2, box.y + box.h / 2, Math.min(box.w, box.h) * 0.42,
    box.x + box.w / 2, box.y + box.h / 2, Math.max(box.w, box.h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(10, 2, 24, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

function drawCaption(ctx, text, pos, w, h) {
  const words = text.trim().toUpperCase();
  if (!words) return;
  const bandH = h * (pos === 'top' ? 0.16 : 0.2);
  const cy = pos === 'top' ? h * 0.02 : h - bandH;
  // Soft dark band behind the letters so they read on any photo.
  const band = ctx.createLinearGradient(0, cy, 0, cy + bandH);
  if (pos === 'top') {
    band.addColorStop(0, 'rgba(12, 2, 28, 0.55)');
    band.addColorStop(1, 'rgba(12, 2, 28, 0)');
  } else {
    band.addColorStop(0, 'rgba(12, 2, 28, 0)');
    band.addColorStop(1, 'rgba(12, 2, 28, 0.6)');
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, cy, w, bandH);

  let size = h * 0.115;
  const setFont = () => {
    ctx.font = `700 ${size}px "DejaVu Sans", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas */ }
  };
  setFont();
  while (ctx.measureText(words).width > w * 0.92 && size > 14) {
    size -= 2;
    setFont();
  }
  const baseline = pos === 'top' ? h * 0.115 : h - h * 0.055;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  // Sunset gradient fill, white core: the poster lettering.
  const fill = ctx.createLinearGradient(0, baseline - size, 0, baseline);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(0.55, '#ffe9c9');
  fill.addColorStop(1, '#ff9a5c');
  ctx.fillStyle = fill;
  ctx.strokeStyle = 'rgba(20, 4, 32, 0.92)';
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.045;
  ctx.strokeText(words, w / 2, baseline);
  ctx.fillText(words, w / 2, baseline);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

/** Draws the whole cover for `state` onto `ctx` at pixel size w x h. */
export function drawCover(ctx, state, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const polys = panelPolys(state.layout);
  const panels = state.panels || [];
  polys.forEach((poly, i) => drawPanel(ctx, poly, panels[i] || null, w, h));
  // A white seam along the diagonal split, the poster's dividing line.
  if (state.layout === 'split') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
    ctx.beginPath();
    ctx.moveTo(w * 0.66, 0);
    ctx.lineTo(w * 0.34, h);
    ctx.stroke();
  }
  // Thin white frame around the whole cover.
  const frame = Math.max(2, Math.round(Math.min(w, h) * 0.006));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame);
  drawCaption(ctx, state.caption || '', state.captionPos || 'bottom', w, h);
}
