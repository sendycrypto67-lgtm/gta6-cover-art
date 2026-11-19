// Wires the page: layout, per-panel photo / zoom / grade, caption, export.
// Photos never leave the machine: uploads are read with FileReader into an
// <img> in memory, and every export is drawn on a local canvas.
import { drawCover, hitPanel, LAYOUTS, GRADES, panelPolys } from './cover.js';
import { runShot } from './shots.js';

const SIZES = {
  square: { label: '1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: '1080 x 1350', w: 1080, h: 1350 },
  wide: { label: '1920 x 1080', w: 1920, h: 1080 },
};

const SAMPLES = [
  { key: 'pier', label: 'Pier', url: 'samples/pier.jpg' },
  { key: 'boulevard', label: 'Boulevard', url: 'samples/boulevard.jpg' },
];

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function blankPanel(grade = 'sunset') {
  return { img: null, zoom: 1, ox: 0, oy: 0, grade };
}

const state = {
  layout: 'grid',
  size: 'square',
  caption: 'Vice Coast',
  captionPos: 'bottom',
  panels: [blankPanel('sunset'), blankPanel('neon'), blankPanel('sunset'), blankPanel('neon')],
};

let selected = 0;

function currentSize() {
  return SIZES[state.size];
}

function redraw() {
  const { w, h } = currentSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(ctx, state, w, h);
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

// ---------- panel controls ----------

const panelTabs = document.getElementById('panel-tabs');
const zoomInput = document.getElementById('zoom');
const zoomVal = document.getElementById('zoom-val');

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function renderPanelTabs() {
  panelTabs.innerHTML = '';
  const n = panelCount();
  if (selected >= n) selected = 0;
  for (let i = 0; i < n; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (i === selected ? ' active' : '');
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => {
      selected = i;
      renderPanelTabs();
      syncPanelControls();
    });
    panelTabs.appendChild(b);
  }
}

function syncPanelControls() {
  const p = state.panels[selected];
  zoomInput.value = String(p.zoom);
  zoomVal.textContent = `${p.zoom.toFixed(1)}x`;
  document.querySelectorAll('#grades .chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.grade === p.grade);
  });
  document.querySelectorAll('#layout .chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.layout === state.layout);
  });
  document.querySelectorAll('#sizes .chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.size === state.size);
  });
  document.querySelectorAll('#cap-pos .chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.pos === state.captionPos);
  });
}

function setLayout(layout) {
  state.layout = layout;
  // Keep four panel slots; layouts just use the first N.
  while (state.panels.length < 4) state.panels.push(blankPanel());
  renderPanelTabs();
  syncPanelControls();
  redraw();
}

function setGrade(grade) {
  state.panels[selected].grade = grade;
  syncPanelControls();
  redraw();
}

async function setPanelSample(key) {
  const sample = SAMPLES.find((s) => s.key === key);
  if (!sample) return;
  try {
    state.panels[selected].img = await loadImage(sample.url);
    state.panels[selected].zoom = 1;
    state.panels[selected].ox = 0;
    state.panels[selected].oy = 0;
    syncPanelControls();
    redraw();
    setStatus(`Panel ${selected + 1}: ${sample.label} photo loaded.`);
  } catch {
    setStatus('Could not load that sample photo.');
  }
}

async function setPanelUpload(file) {
  if (!file) return;
  try {
    const url = URL.createObjectURL(file);
    state.panels[selected].img = await loadImage(url);
    state.panels[selected].zoom = 1;
    state.panels[selected].ox = 0;
    state.panels[selected].oy = 0;
    syncPanelControls();
    redraw();
    setStatus(`Panel ${selected + 1}: your photo loaded. It stays on this device.`);
  } catch {
    setStatus('Could not read that file as an image.');
  }
}

// ---------- build the control chips ----------

function buildChips(containerId, items, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = item.label;
    Object.entries(item.data || {}).forEach(([k, v]) => { b.dataset[k] = v; });
    b.addEventListener('click', () => onPick(item));
    box.appendChild(b);
  }
}

buildChips('layout', Object.entries(LAYOUTS).map(([key, v]) => ({
  label: v.label, data: { layout: key },
})), (item) => setLayout(item.data.layout));

buildChips('sizes', Object.entries(SIZES).map(([key, v]) => ({
  label: v.label, data: { size: key },
})), (item) => {
  state.size = item.data.size;
  syncPanelControls();
  redraw();
});

buildChips('grades', Object.entries(GRADES).map(([key, v]) => ({
  label: v.label, data: { grade: key },
})), (item) => setGrade(item.data.grade));

buildChips('cap-pos', [
  { label: 'Bottom', data: { pos: 'bottom' } },
  { label: 'Top', data: { pos: 'top' } },
], (item) => {
  state.captionPos = item.data.pos;
  syncPanelControls();
  redraw();
});

buildChips('samples', SAMPLES.map((s) => ({ label: s.label, data: { sample: s.key } })),
  (item) => setPanelSample(item.data.sample));

document.getElementById('upload').addEventListener('change', (e) => {
  setPanelUpload(e.target.files[0]);
  e.target.value = '';
});

zoomInput.addEventListener('input', () => {
  state.panels[selected].zoom = Number(zoomInput.value);
  zoomVal.textContent = `${state.panels[selected].zoom.toFixed(1)}x`;
  redraw();
});

const captionInput = document.getElementById('caption');
captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});

// ---------- drag to reposition the photo inside a panel ----------

let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  const { w, h } = currentSize();
  return { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h };
}

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const { w, h } = currentSize();
  const idx = hitPanel(state.layout, p.x, p.y, w, h);
  if (idx < 0) return;
  selected = idx;
  renderPanelTabs();
  syncPanelControls();
  const panel = state.panels[idx];
  drag = { idx, startX: p.x, startY: p.y, ox: panel.ox, oy: panel.oy };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const { w, h } = currentSize();
  const polys = panelPolys(state.layout);
  const poly = polys[drag.idx];
  let bw = 0;
  let bh = 0;
  for (const [fx, fy] of poly) {
    bw = Math.max(bw, fx * w);
    bh = Math.max(bh, fy * h);
  }
  const panel = state.panels[drag.idx];
  panel.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (p.x - drag.startX) / bw));
  panel.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (p.y - drag.startY) / bh));
  redraw();
});

canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

// ---------- export ----------

function exportPNG(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext('2d'), state, size.w, size.h);
  off.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed, try again.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved cover-${size.w}x${size.h}.png (${Math.round(blob.size / 1024)} KB).`);
  }, 'image/png');
}

document.querySelectorAll('#export .chip').forEach((b) => {
  b.addEventListener('click', () => exportPNG(b.dataset.size));
});

// ---------- shot mode (screenshots) and first paint ----------

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    state, setLayout, setGrade, setPanelSample, redraw, loadImage, SIZES,
    setCaption(text) { state.caption = text; captionInput.value = text; },
    setCaptionPos(pos) { state.captionPos = pos; },
    setSize(key) { state.size = key; },
  });
} else {
  // First paint: fill the grid with the two samples so the tool is useful at once.
  Promise.all([loadImage('samples/pier.jpg'), loadImage('samples/boulevard.jpg')])
    .then(([pier, boulevard]) => {
      state.panels[0].img = pier;
      state.panels[1].img = boulevard;
      state.panels[2].img = boulevard;
      state.panels[3].img = pier;
      renderPanelTabs();
      syncPanelControls();
      redraw();
    })
    .catch(() => {
      renderPanelTabs();
      syncPanelControls();
      redraw();
    });
}

// Exposed for the shot scenes and for the export self-test.
window.__coverApp = { state, redraw, exportPNG, SIZES, setLayout, setPanelSample };
