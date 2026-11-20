import { formats, grades, layouts } from './presets.js';
import { drawLettering } from './lettering.js';

const paper = '#100c17';
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function gradePhoto(asset, name, finish) {
  if (name === 'original' && finish !== 'comic') return asset.source;
  const key = name + '/' + finish;
  if (asset.renders.has(key)) return asset.renders.get(key);

  const { width, height } = asset.source;
  const processed = Object.assign(document.createElement('canvas'), { width, height });
  const ctx = processed.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(asset.source, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height);
  const { data } = pixels;
  const grade = grades[name];
  const comic = finish === 'comic';
  const luminance = comic ? new Uint8Array(data.length / 4) : null;
  if (comic) {
    for (let i = 0; i < luminance.length; i++) {
      luminance[i] = data[i * 4] * .26 + data[i * 4 + 1] * .62 + data[i * 4 + 2] * .12;
    }
  }

  const [shadow, middle, light] = grade.split;
  const step = Math.max(1, Math.round(Math.max(width, height) / 700));
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * .26 + data[i + 1] * .62 + data[i + 2] * .12) / 255;
    const low = (1 - lum) ** 2;
    const high = lum ** 2;
    const mid = 1 - low - high;
    const offset = (lum * 255 - 128) * (grade.contrast - 1);
    const chroma = lum * 255 * (1 - grade.saturation);
    const p = i / 4;
    const edge = comic && p % width >= step && p % width < width - step && p >= width * step && p < width * (height - step)
      ? Math.max(0, Math.abs(luminance[p - step] - luminance[p + step]) +
        Math.abs(luminance[p - width * step] - luminance[p + width * step]) - 22) : 0;
    for (let c = 0; c < 3; c++) {
      let v = data[i + c] * grade.saturation + chroma + offset + shadow[c] * low + middle[c] * mid + light[c] * high;
      if (comic) v = v * .41 + Math.round(v / 31) * 31 * .59 - Math.min(78, edge * .82);
      data[i + c] = v;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  if (asset.renders.size >= 3) asset.renders.delete(asset.renders.keys().next().value);
  asset.renders.set(key, processed);
  return processed;
}

export function panelGeometry(state, index) {
  const { width, height } = formats[state.format];
  const margin = Math.round(Math.min(width, height) * .023);
  const coordinates = layouts[state.layout].panels[index];
  const path = new Path2D();
  let left = width, top = height, right = 0, bottom = 0;
  for (let i = 0; i < coordinates.length; i += 2) {
    const x = margin + coordinates[i] * (width - margin * 2);
    const y = margin + coordinates[i + 1] * (height - margin * 2);
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  path.closePath();
  return { path, left, top, w: right - left, h: bottom - top };
}

function drawPanelPhoto(ctx, image, panel, bounds) {
  const { left, top, w, h } = bounds;
  const angle = panel.rotation * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const fitW = w * Math.abs(cos) + h * Math.abs(sin);
  const fitH = w * Math.abs(sin) + h * Math.abs(cos);
  const cover = Math.max(fitW / image.width, fitH / image.height) * panel.zoom;
  const imageWidth = image.width * cover;
  const imageHeight = image.height * cover;
  const faceX = panel.flip ? 1 - panel.fx : panel.fx;
  const dx = panel.dx * w, dy = panel.dy * h;
  const x = clamp((.5 - faceX) * imageWidth + dx * cos + dy * sin, (fitW - imageWidth) / 2, (imageWidth - fitW) / 2);
  const y = clamp((.5 - panel.fy) * imageHeight - dx * sin + dy * cos, (fitH - imageHeight) / 2, (imageHeight - fitH) / 2);
  ctx.save();
  ctx.translate(left + w / 2, top + h / 2);
  ctx.rotate(angle);
  ctx.translate(x, y);
  if (panel.flip) ctx.scale(-1, 1);
  ctx.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
  ctx.restore();
}

let grain;
function grainTile() {
  if (grain) return grain;
  grain = Object.assign(document.createElement('canvas'), { width: 176, height: 176 });
  const ctx = grain.getContext('2d');
  const pixels = ctx.createImageData(grain.width, grain.height);
  let seed = 73129;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const shade = seed >>> 31 ? 255 : 12;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade;
    pixels.data[i + 3] = (seed >>> 21) % 35;
  }
  ctx.putImageData(pixels, 0, 0);
  return grain;
}

function printFinish(ctx, w, h, finish, grade) {
  if (finish === 'clean') return;
  const tone = grades[grade];
  const spill = ctx.createLinearGradient(0, 0, w, h * .68);
  spill.addColorStop(0, tone.swatch[0] + '45');
  spill.addColorStop(.43, '#00000000');
  spill.addColorStop(.71, '#00000000');
  spill.addColorStop(1, tone.swatch[2] + '32');
  ctx.fillStyle = spill;
  ctx.globalCompositeOperation = 'screen';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  const vignette = ctx.createRadialGradient(w * .51, h * .46, Math.min(w, h) * .31, w * .51, h * .46, Math.hypot(w, h) * .56);
  vignette.addColorStop(0, '#10071c00');
  vignette.addColorStop(1, '#10071c83');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
  ctx.globalAlpha = .33;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  if (finish === 'comic') {
    ctx.fillStyle = '#1b0d3432';
    ctx.beginPath();
    for (let y = 5; y < h; y += 9) {
      for (let x = 4 + (y % 2) * 4; x < w; x += 9) {
        ctx.moveTo(x + 1.5, y);
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }
}

function frame(ctx, w, h, unit, accent) {
  ctx.strokeStyle = paper;
  ctx.lineWidth = unit * 46;
  ctx.strokeRect(0, 0, w, h);
  ctx.strokeStyle = accent + '92';
  ctx.lineWidth = unit * 1.25;
  ctx.strokeRect(unit * 12, unit * 12, w - unit * 24, h - unit * 24);
  for (const [x, y, sx, sy] of [[19, 19, 1, 1], [w / unit - 19, 19, -1, 1], [19, h / unit - 19, 1, -1], [w / unit - 19, h / unit - 19, -1, -1]]) {
    ctx.save();
    ctx.translate(x * unit, y * unit);
    ctx.scale(sx * unit, sy * unit);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.lineTo(0, 0);
    ctx.lineTo(28, 0);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawCover(canvas, state, assets) {
  const { width: w, height: h } = formats[state.format];
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  const unit = Math.min(w, h) / 1080;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'medium';
  const geometry = layouts[state.layout].panels.map((_, i) => panelGeometry(state, i));

  geometry.forEach((bounds, index) => {
    const panel = state.panels[index];
    const asset = assets.get(panel.asset);
    ctx.save();
    ctx.clip(bounds.path);
    if (asset) {
      drawPanelPhoto(ctx, gradePhoto(asset, panel.grade || state.grade, state.finish), panel, bounds);
    } else {
      const fill = ctx.createLinearGradient(bounds.left, bounds.top, bounds.left + bounds.w, bounds.top + bounds.h);
      fill.addColorStop(0, '#442435');
      fill.addColorStop(1, '#16172c');
      ctx.fillStyle = fill;
      ctx.fillRect(bounds.left, bounds.top, bounds.w, bounds.h);
    }
    if (panel.mix > 0) {
      ctx.globalAlpha = panel.mix / 100;
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = panel.tint;
      ctx.fillRect(bounds.left, bounds.top, bounds.w, bounds.h);
    }
    ctx.restore();
  });

  printFinish(ctx, w, h, state.finish, state.grade);
  ctx.lineJoin = 'round';
  for (const { path } of geometry) {
    ctx.lineWidth = unit * 18;
    ctx.strokeStyle = '#120e1b';
    ctx.stroke(path);
    ctx.lineWidth = unit * 1.3;
    ctx.strokeStyle = '#d3988b72';
    ctx.stroke(path);
  }

  frame(ctx, w, h, unit, grades[state.grade].swatch[1]);
  drawLettering(ctx, state, w, h);
}
