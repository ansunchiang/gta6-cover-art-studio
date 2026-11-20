import { drawCover, panelGeometry } from './cover.js';
import { formats, grades, inks, layouts, panelState, presets } from './presets.js';
import { loadScene, photoFocus, readLocalPhoto } from './photos.js';
import { prepareShot } from './shots.js';

const get = id => document.getElementById(id);
const cover = get('cover');
const selection = get('selection');
const selectionContext = selection.getContext('2d');
const assets = new Map();
const loadedScenes = new Map();
const past = [];
const future = [];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const count = () => layouts[state.layout].panels.length;
const make = (tag, className, title) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (title) el.textContent = title;
  return el;
};

let state = {
  ...presets.heat, scene: '', panels: Array.from({ length: 5 }, () => panelState()), library: [],
};
let defaultState;
let selected = 0;
let guide = false;
let tab = 'lettering';
let drawRequest;
let dragged;
let editGroup;
let job = 0;

function notify(message, error = false) {
  get('status').textContent = message;
  get('status').dataset.error = error;
}

function snapshot() {
  return structuredClone(state);
}

function updateHistory() {
  get('undo').disabled = past.length === 0;
  get('redo').disabled = future.length === 0;
}

function recordChange() {
  past.push(snapshot());
  if (past.length > 36) past.shift();
  future.length = 0;
  updateHistory();
}

function restoreHistory(from, to) {
  if (!from.length) return;
  to.push(snapshot());
  state = from.pop();
  editGroup = undefined;
  selected = Math.min(selected, count() - 1);
  refresh();
  notify('Ready to export');
}

function change(callback) {
  editGroup = undefined;
  recordChange();
  callback();
  refresh();
}

function showInspector(next) {
  tab = next;
  for (const name of ['lettering', 'crop']) {
    get(name).hidden = tab !== name;
    get(name + '-tab').setAttribute('aria-pressed', tab === name);
  }
}

function drawGuide() {
  if (selection.width !== cover.width) selection.width = cover.width;
  if (selection.height !== cover.height) selection.height = cover.height;
  const ctx = selectionContext;
  ctx.clearRect(0, 0, selection.width, selection.height);
  get('clear-focus').disabled = !guide;
  if (!guide) return;

  const { path, left, top, w, h } = panelGeometry(state, selected);
  ctx.save();
  ctx.fillStyle = '#ffb8a015';
  ctx.fill(path);
  ctx.strokeStyle = '#241224';
  ctx.lineWidth = 9;
  ctx.stroke(path);
  ctx.strokeStyle = '#ffbcaa';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 7]);
  ctx.stroke(path);
  ctx.setLineDash([]);
  const number = String(selected + 1).padStart(2, '0');
  ctx.font = '750 28px Studio, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const x = left + w / 2;
  const y = top + h * .18;
  ctx.fillStyle = '#ffbcaa';
  ctx.fillRect(x - 27, y - 20, 54, 40);
  ctx.fillStyle = '#2c1928';
  ctx.fillText(number, x, y);
  ctx.restore();
}

function scheduleDraw() {
  if (drawRequest) return;
  drawRequest = requestAnimationFrame(() => {
    drawRequest = 0;
    drawCover(cover, state, assets);
    drawGuide();
  });
}

function samplePanel(asset, index, total) {
  const [x, y] = asset.focal ??= photoFocus(asset);
  const variations = [[-.22, -.21, 1.24], [.02, -.10, 1.12], [.23, .21, 1.31], [-.23, .14, 1.49], [.04, .08, 1.07], [.25, -.16, 1.45]];
  const [dx, dy, zoom] = variations[index % variations.length];
  return panelState(asset.id, clamp(x + dx, .20, .80), clamp(y + dy, .20, .80), total === 1 ? 1 : zoom);
}

async function useScene(name, remember = true) {
  if (!Object.hasOwn(presets, name)) return;
  const request = ++job;
  try {
    const sceneAssets = loadedScenes.get(name) ?? await loadScene(name);
    loadedScenes.set(name, sceneAssets);
    if (request !== job) return;
    for (const asset of sceneAssets) assets.set(asset.id, asset);
    const preset = presets[name];
    const panels = layouts[preset.layout].panels.map((_, i) => preset.images
      ? panelState(sceneAssets[preset.images[i]].id, ...preset.focus[i])
      : samplePanel(sceneAssets[0], i, 4));
    if (remember) recordChange();
    state = { ...preset, scene: name, panels, library: sceneAssets.map(asset => asset.id) };
    selected = 0;
    guide = false;
    editGroup = undefined;
    showInspector('lettering');
    refresh();
    notify('Ready to export');
  } catch {
    if (request === job) notify('The sample could not be opened.', true);
  }
}

async function importPhotos(files, target = null) {
  const images = [...files].filter(file => !file.type || file.type.startsWith('image/'));
  if (!images.length) {
    notify('Choose a photo file such as JPEG, PNG, or WebP.', true);
    return;
  }
  const request = ++job;
  notify('Opening photos…');
  const results = await Promise.allSettled(images.slice(0, target === null ? 6 : 1).map((file, i) =>
    readLocalPhoto(file, 'local-' + request + '-' + i)));
  if (job !== request) return;
  const photos = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  if (!photos.length) {
    notify('Chrome could not read those photos. Try JPEG, PNG, or WebP.', true);
    return;
  }
  for (const photo of photos) assets.set(photo.id, photo);
  change(() => {
    state.scene = '';
    state.library = [...state.library, ...photos.map(photo => photo.id)];
    if (target === null) {
      state.panels = Array.from({ length: Math.max(count(), state.panels.length, photos.length) },
        (_, i) => samplePanel(photos[i % photos.length], photos.length === 1 ? i : 0, photos.length === 1 ? count() : 1));
      guide = false;
      showInspector('lettering');
    } else {
      selected = Math.min(target, count() - 1);
      state.panels[selected] = samplePanel(photos[0], 0, 1);
      guide = true;
      showInspector('crop');
    }
  });
  const skipped = images.length - photos.length;
  notify('Added ' + photos.length + (photos.length === 1 ? ' photo' : ' photos') + (skipped ? ' · ' + skipped + ' skipped' : ''));
}

function choice(container, key, label, handler, className) {
  const button = make('button', className);
  button.type = 'button';
  button.dataset.key = key;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.addEventListener('click', handler);
  get(container).append(button);
  return button;
}

function addOption(select, value, label) {
  const option = make('option', '', label);
  option.value = value;
  select.append(option);
}

function syncChoices(container, active) {
  for (const button of get(container).children) button.setAttribute('aria-pressed', button.dataset.key === active);
}

function selectPanel(index, open = true) {
  editGroup = undefined;
  selected = index;
  guide = true;
  if (open) showInspector('crop');
  syncChoices('panels', String(selected));
  syncPanel();
  drawGuide();
}

function setupChoices() {
  for (const [key, format] of Object.entries(formats)) {
    const label = format.label + ' ' + format.width + ' × ' + format.height;
    const button = choice('formats', key, label, () => {
      if (state.format !== key) change(() => { state.format = key; });
    });
    button.textContent = format.ratio + ' ' + format.label;
  }

  for (const key of ['heat', 'night', 'coast']) {
    const preset = presets[key];
    const button = choice('templates', key, preset.name, () => useScene(key), 'template');
    const image = make('img');
    image.src = './samples/' + key + '.jpg';
    image.alt = '';
    const text = make('span');
    text.append(make('strong', '', preset.name), make('small', '', preset.description));
    const arrow = make('span', '', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    button.append(image, text, arrow);
  }

  for (const [key, layout] of Object.entries(layouts)) {
    const button = choice('layouts', key, layout.name + ' · ' + layout.panels.length + ' panels', () => {
      if (state.layout === key) return;
      change(() => {
        state.layout = key;
        while (state.panels.length < count()) {
          const asset = assets.get(state.panels[0]?.asset);
          state.panels.push(asset ? samplePanel(asset, state.panels.length, count()) : panelState());
        }
        selected = Math.min(selected, count() - 1);
      });
    }, 'layout-button');
    const mini = Object.assign(make('canvas'), { width: 58, height: 48 });
    mini.setAttribute('aria-hidden', 'true');
    const ctx = mini.getContext('2d');
    ctx.fillStyle = '#af8ba2';
    ctx.strokeStyle = '#241d2b';
    ctx.lineWidth = 3.4;
    for (const points of layout.panels) {
      ctx.beginPath();
      for (let i = 0; i < points.length; i += 2) ctx.lineTo(3 + points[i] * 52, 3 + points[i + 1] * 42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    button.append(mini);
  }

  addOption(get('panel-grade'), '', 'Match cover');
  for (const [key, grade] of Object.entries(grades)) {
    const button = choice('grades', key, grade.name, () => {
      if (state.grade !== key) change(() => { state.grade = key; });
    }, 'grade-button');
    const swatch = Object.assign(make('canvas'), { width: 34, height: 34 });
    swatch.setAttribute('aria-hidden', 'true');
    const ctx = swatch.getContext('2d');
    const wash = ctx.createLinearGradient(0, 5, 32, 28);
    grade.swatch.forEach((color, i) => wash.addColorStop(i / 2, color));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, 34, 34);
    button.append(swatch, make('span', '', grade.name));
    addOption(get('panel-grade'), key, grade.name);
  }

  for (const [key, ink] of Object.entries(inks)) addOption(get('ink'), key, ink.name);

  for (let index = 0; index < 6; index++) {
    const button = choice('panels', String(index), 'Panel ' + (index + 1), () => selectPanel(index), 'panel-button');
    button.append(Object.assign(make('canvas'), { width: 140, height: 86 }),
      make('span', '', String(index + 1).padStart(2, '0')));
  }
}

function drawPanelThumbnails() {
  for (const [i, button] of [...get('panels').children].entries()) {
    button.hidden = i >= count();
    if (button.hidden) continue;
    const canvas = button.firstChild;
    const ctx = canvas.getContext('2d');
    const photo = assets.get(state.panels[i].asset);
    button.title = 'Panel ' + (i + 1) + (photo ? ' · ' + photo.label : '');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!photo) continue;
    const source = photo.source;
    const fit = Math.max(canvas.width / source.width, canvas.height / source.height);
    const w = source.width * fit, h = source.height * fit;
    ctx.drawImage(source, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }
}

function syncPanel() {
  const panel = state.panels[selected];
  const selector = get('panel-photo');
  selector.replaceChildren();
  addOption(selector, '', 'Empty panel');
  for (const id of state.library) addOption(selector, id, assets.get(id).label);
  selector.value = panel.asset;
  get('current-panel').textContent = 'Panel ' + String(selected + 1).padStart(2, '0');
  for (const key of ['zoom', 'rotation', 'mix', 'tint']) get(key).value = panel[key];
  get('panel-grade').value = panel.grade;
  get('flip').checked = panel.flip;
  syncRangeValues();
}

function syncRangeValues() {
  for (const key of ['x', 'y', 'scale', 'mix']) get(key + '-value').textContent = get(key).value + '%';
  get('rotation-value').textContent = get('rotation').value + '°';
  get('zoom-value').textContent = Number(get('zoom').value).toFixed(2) + '×';
}

function refresh() {
  syncChoices('formats', state.format);
  syncChoices('layouts', state.layout);
  syncChoices('templates', state.scene);
  syncChoices('grades', state.grade);
  syncChoices('panels', String(selected));
  get('sample').value = ['pier', 'boulevard'].includes(state.scene) ? state.scene : '';
  get('canvas-wrap').dataset.format = state.format;
  get('layout-name').textContent = layouts[state.layout].name;
  get('panel-count').textContent = count() + ' panels';
  const { width, height } = formats[state.format];
  get('dimensions').textContent = width + ' × ' + height + ' px';
  for (const key of ['title', 'subtitle', 'badge', 'finish', 'ink', 'style', 'x', 'y', 'scale']) {
    if (String(get(key).value) !== String(state[key])) get(key).value = state[key];
  }
  drawPanelThumbnails();
  syncPanel();
  updateHistory();
  scheduleDraw();
}

function wireInputs() {
  const controls = {
    title: ['title', String], subtitle: ['subtitle', String], badge: ['badge', String],
    finish: ['finish', String], ink: ['ink', String], style: ['style', String],
    x: ['x', Number], y: ['y', Number], scale: ['scale', Number],
    zoom: ['zoom', Number, true], rotation: ['rotation', Number, true], flip: ['flip', Boolean, true],
    mix: ['mix', Number, true], tint: ['tint', String, true], 'panel-grade': ['grade', String, true],
  };
  for (const [id, [key, coerce, panel]] of Object.entries(controls)) {
    const input = get(id);
    input.addEventListener('input', () => {
      if (editGroup !== id) recordChange();
      editGroup = id;
      const target = panel ? state.panels[selected] : state;
      target[key] = coerce(input.type === 'checkbox' ? input.checked : input.value);
      syncRangeValues();
      scheduleDraw();
    });
    for (const event of ['blur', 'change']) input.addEventListener(event, () => { editGroup = undefined; });
  }

  get('sample').addEventListener('change', event => useScene(event.target.value));
  get('import').addEventListener('click', () => get('photo-files').click());
  get('replace-photo').addEventListener('click', () => get('panel-file').click());
  get('photo-files').addEventListener('change', event => {
    importPhotos(event.target.files, get('import-mode').value === 'panel' ? selected : null);
    event.target.value = '';
  });
  get('panel-file').addEventListener('change', event => {
    importPhotos(event.target.files, selected);
    event.target.value = '';
  });
  get('panel-photo').addEventListener('change', event => change(() => {
    const asset = assets.get(event.target.value);
    state.panels[selected] = asset ? samplePanel(asset, 0, 1) : panelState();
  }));
  get('reframe').addEventListener('click', () => change(() => {
    const panel = state.panels[selected];
    const asset = assets.get(panel.asset);
    const reset = asset ? samplePanel(asset, 0, 1) : panelState();
    Object.assign(panel, { dx: 0, dy: 0, zoom: 1, fx: reset.fx, fy: reset.fy, rotation: 0, flip: false });
  }));
  get('lettering-tab').addEventListener('click', () => showInspector('lettering'));
  get('crop-tab').addEventListener('click', () => selectPanel(selected));
  get('clear-focus').addEventListener('click', () => {
    guide = false;
    drawGuide();
  });
  get('reset').addEventListener('click', () => {
    if (!defaultState) return;
    ++job;
    change(() => {
      state = structuredClone(defaultState);
      selected = 0;
      guide = false;
      showInspector('lettering');
    });
    notify('Studio reset');
  });
  get('undo').addEventListener('click', () => restoreHistory(past, future));
  get('redo').addEventListener('click', () => restoreHistory(future, past));
  document.addEventListener('keydown', event => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key !== 'z' && key !== 'y') return;
    event.preventDefault();
    if (key === 'y' || event.shiftKey) restoreHistory(future, past);
    else restoreHistory(past, future);
  });
}

function coverPoint(event) {
  const bounds = cover.getBoundingClientRect();
  return [
    (event.clientX - bounds.left) * cover.width / bounds.width,
    (event.clientY - bounds.top) * cover.height / bounds.height,
  ];
}

function panelAt(x, y) {
  return state.panels.slice(0, count())
    .findIndex((_, i) => selectionContext.isPointInPath(panelGeometry(state, i).path, x, y));
}

function wireCanvas() {
  cover.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const [x, y] = coverPoint(event);
    const index = panelAt(x, y);
    if (index < 0) return;
    selectPanel(index);
    const { w, h } = panelGeometry(state, index);
    const panel = state.panels[index];
    if (!panel.asset) return;
    dragged = { panel, x, y, w, h, dx: panel.dx, dy: panel.dy, id: event.pointerId, changed: false };
    cover.setPointerCapture(event.pointerId);
  });
  cover.addEventListener('pointermove', event => {
    if (!dragged || dragged.id !== event.pointerId) return;
    const [x, y] = coverPoint(event);
    const dx = x - dragged.x, dy = y - dragged.y;
    if (!dragged.changed) {
      if (Math.hypot(dx, dy) < 5) return;
      recordChange();
      dragged.changed = true;
      if (dragged.panel.zoom < 1.08) {
        dragged.panel.zoom = 1.15;
        get('zoom').value = 1.15;
        syncRangeValues();
      }
    }
    dragged.panel.dx = clamp(dragged.dx + dx / dragged.w, -3, 3);
    dragged.panel.dy = clamp(dragged.dy + dy / dragged.h, -3, 3);
    scheduleDraw();
  });
  cover.addEventListener('lostpointercapture', () => { dragged = undefined; });

  const targets = [get('stage'), get('import')];
  document.addEventListener('dragover', event => {
    if (event.dataTransfer.types.includes('Files')) event.preventDefault();
  });
  document.addEventListener('drop', event => {
    if (event.dataTransfer.types.includes('Files')) event.preventDefault();
  });
  for (const target of targets) {
    target.addEventListener('dragover', event => {
      if (!event.dataTransfer.types.includes('Files')) return;
      event.dataTransfer.dropEffect = 'copy';
      target.classList.add('drag-target');
    });
    target.addEventListener('dragleave', event => {
      if (!(event.relatedTarget instanceof Node) || !target.contains(event.relatedTarget)) {
        target.classList.remove('drag-target');
      }
    });
    target.addEventListener('drop', event => {
      target.classList.remove('drag-target');
      if (!event.dataTransfer.files.length) return;
      const hit = event.target === cover ? panelAt(...coverPoint(event)) : -1;
      const panel = get('import-mode').value === 'panel' ? (hit >= 0 ? hit : selected) : null;
      importPhotos(event.dataTransfer.files, panel);
    });
  }
}

function coverPNG() {
  drawCover(cover, state, assets);
  drawGuide();
  return new Promise((resolve, reject) => cover.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
}

get('export').addEventListener('click', async () => {
  const button = get('export');
  button.disabled = true;
  try {
    const { width, height } = formats[state.format];
    const slug = state.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const file = (slug || 'viceprint') + '-' + width + 'x' + height + '.png';
    const url = URL.createObjectURL(await coverPNG());
    const anchor = make('a');
    anchor.href = url;
    anchor.download = file;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    notify('Exported ' + file);
  } catch {
    notify('The PNG could not be saved. Try exporting again.', true);
  } finally {
    button.disabled = false;
  }
});

setupChoices();
wireInputs();
wireCanvas();
const query = new URLSearchParams(location.search);
const scene = Object.hasOwn(presets, query.get('scene')) ? query.get('scene') : 'heat';
await Promise.allSettled([document.fonts.load('900 120px Poster'), document.fonts.load('120px Neon'), document.fonts.load('750 14px Studio')]);
await useScene(scene, false);
defaultState = snapshot();
if (query.has('shot')) await prepareShot(query.get('shot'), coverPNG);
