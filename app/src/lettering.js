import { inks } from './presets.js';

function titleLines(value) {
  const lines = value.toLocaleUpperCase().trim().split(/\n+/).map(line => line.trim()).filter(Boolean).slice(0, 3);
  if (lines.length !== 1 || lines[0].length < 15) return lines;
  const words = lines[0].split(/\s+/);
  if (words.length === 1) return lines;
  let split = 1;
  while (split < words.length - 1 && words.slice(0, split).join(' ').length < lines[0].length / 2 - 2) split++;
  return [words.slice(0, split).join(' '), words.slice(split).join(' ')];
}

function printTitle(ctx, lines, size, width, colors, style) {
  const step = size * .725;
  ctx.font = '900 ' + size + 'px Poster, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  const natural = lines.map(line => ctx.measureText(line).width);
  const longest = Math.max(...natural);
  const fontHeight = size * .69;

  lines.forEach((word, index) => {
    const y = (index - (lines.length - 1) / 2) * step + fontHeight * .44;
    const balance = lines.length > 1 ? Math.min(1.28, (longest / natural[index]) ** .52) : 1;
    ctx.save();
    ctx.translate(0, y);
    ctx.transform(Math.min(width / natural[index], balance * (style === 'wide' ? 1.34 : 1.17)), 0, style === 'slant' ? -.15 : 0, 1, 0, 0);
    ctx.lineJoin = 'round';

    ctx.strokeStyle = '#120d1b';
    ctx.lineWidth = size * .127;
    ctx.strokeText(word, size * .038, size * .064);
    ctx.fillStyle = '#130b18';
    ctx.fillText(word, size * .038, size * .064);
    ctx.strokeStyle = colors.bottom;
    ctx.lineWidth = size * .051;
    ctx.strokeText(word, size * .018, size * .038);
    ctx.fillStyle = '#3e202d';
    ctx.fillText(word, size * .018, size * .038);
    ctx.strokeStyle = '#16101b';
    ctx.lineWidth = size * .095;
    ctx.strokeText(word, 0, 0);

    const ink = ctx.createLinearGradient(0, -fontHeight, 0, size * .01);
    ink.addColorStop(0, colors.top);
    ink.addColorStop(.47, colors.top);
    ink.addColorStop(1, colors.bottom);
    ctx.fillStyle = ink;
    ctx.fillText(word, 0, 0);
    ctx.restore();
  });
  return (lines.length - 1) * step / 2 + fontHeight * .44;
}

function printScript(ctx, word, y, size, maxWidth, colors) {
  ctx.save();
  ctx.translate(0, y);
  ctx.rotate(-.11);
  ctx.font = size + 'px Neon, cursive';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  const textWidth = ctx.measureText(word).width;
  ctx.scale(Math.min(1, maxWidth / textWidth), 1);
  ctx.strokeStyle = '#100a16';
  ctx.lineWidth = size * .13;
  ctx.strokeText(word, size * .017, size * .034);
  ctx.shadowColor = colors.script;
  ctx.shadowBlur = size * .19;
  ctx.strokeStyle = colors.script;
  ctx.lineWidth = size * .049;
  ctx.strokeText(word, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = colors.script;
  ctx.fillText(word, 0, 0);
  ctx.strokeStyle = '#fff2de';
  ctx.lineWidth = size * .012;
  ctx.strokeText(word, 0, 0);
  const flourish = new Path2D();
  flourish.moveTo(-textWidth * .35, size * .18);
  flourish.quadraticCurveTo(-textWidth * .01, -size * .015, textWidth * .33, size * .068);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1b0c1b';
  ctx.lineWidth = size * .065;
  ctx.stroke(flourish);
  ctx.strokeStyle = colors.script;
  ctx.lineWidth = size * .026;
  ctx.stroke(flourish);
  ctx.restore();
}

function printBadge(ctx, badge, width, height, unit, colors) {
  ctx.save();
  ctx.font = '900 27px Poster, sans-serif';
  const text = badge.toLocaleUpperCase();
  const w = Math.min(258, ctx.measureText(text).width + 46);
  ctx.translate(width - (w / 2 + 41) * unit, height - 61 * unit);
  ctx.rotate(-.082);
  ctx.scale(unit, unit);
  ctx.fillStyle = '#100d17';
  ctx.fillRect(-w / 2 + 5, -22 + 5, w, 44);
  ctx.fillStyle = colors.detail;
  ctx.fillRect(-w / 2, -22, w, 44);
  ctx.strokeStyle = '#261a28';
  ctx.lineWidth = 1.35;
  ctx.strokeRect(-w / 2 + 4, -18, w - 8, 36);
  ctx.fillStyle = '#261a28';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0, w - 24);
  ctx.restore();
}

export function drawLettering(ctx, state, width, height) {
  const unit = Math.min(width, height) / 1080;
  const colors = inks[state.ink];
  const title = titleLines(state.title);
  const factor = state.scale / 100;
  const size = 224 * unit * factor * (title.length === 3 ? .76 : 1);
  const maxWidth = Math.min(width * .84, 746 * unit * factor);
  if (title.length || state.subtitle.trim()) {
    ctx.save();
    ctx.translate(width * state.x / 100, height * state.y / 100);
    const bottom = title.length ? printTitle(ctx, title, size, maxWidth, colors, state.style) : 0;
    if (state.subtitle.trim()) printScript(ctx, state.subtitle.trim(), bottom + size * .20, size * .58, maxWidth * .94, colors);
    ctx.restore();
  }
  if (state.badge.trim()) printBadge(ctx, state.badge.trim(), width, height, unit, colors);
}
