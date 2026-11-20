const limit = 2200;

function surface(width, height) {
  return Object.assign(document.createElement('canvas'), { width, height });
}

export async function decodePhoto(source) {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

function rasterize(image, x, y, width, height) {
  const scale = Math.min(1, limit / Math.max(width, height));
  const canvas = surface(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  canvas.getContext('2d').drawImage(image, x, y, width, height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function buildAsset(id, label, image, crop) {
  return { id, label, source: rasterize(image, ...crop), renders: new Map() };
}

export async function readLocalPhoto(file, id) {
  const url = URL.createObjectURL(file);
  try {
    const image = await decodePhoto(url);
    return buildAsset(id, file.name, image, [0, 0, image.naturalWidth, image.naturalHeight]);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const sceneNames = {
  heat: ['Deco Hotel', 'Aviators', 'Sunset Coupe', 'Palm Causeway', 'Rooftop', 'Marina Run'],
  night: ['Night Watch', 'Underpass', 'Neon Mile', 'City Lights', 'Midnight Palms', 'Blue Rider'],
  coast: ['Coastal Coupe', 'Getaway Driver', 'Lifeguard Station', 'Dune Road', 'Overpass', 'Marina'],
};

export async function loadScene(name) {
  const image = await decodePhoto(new URL('../samples/' + name + '.jpg', import.meta.url).href);
  const names = sceneNames[name];
  if (!names) {
    return [buildAsset(name, name === 'pier' ? 'Sunset Pier' : 'Ocean Drive', image, [0, 0, image.naturalWidth, image.naturalHeight])];
  }
  const w = image.naturalWidth / 3;
  const h = image.naturalHeight / 2;
  return names.map((label, i) =>
    buildAsset(name + '-' + i, label, image, [(i % 3) * w + 3, Math.floor(i / 3) * h + 3, w - 6, h - 6]));
}

export function photoFocus(asset) {
  const thumbnail = surface(26, 26);
  const ctx = thumbnail.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(asset.source, 0, 0, 26, 26);
  const { data } = ctx.getImageData(0, 0, 26, 26);
  let horizontal = 0;
  let vertical = 0;
  let total = 0;
  for (let y = 2; y < 24; y++) {
    for (let x = 2; x < 24; x++) {
      const p = (y * 26 + x) * 4;
      const edge = Math.abs(data[p - 4] - data[p + 4]) + Math.abs(data[p - 104] - data[p + 104]);
      const center = 1 - Math.hypot(x - 12.5, y - 11.5) / 19;
      const weight = (edge + 10) * center * center * (data[p] > data[p + 2] * 1.1 ? 1.32 : 1);
      horizontal += (x + .5) * weight;
      vertical += (y + .5) * weight;
      total += weight;
    }
  }
  return [horizontal / (26 * total), vertical / (26 * total)];
}
