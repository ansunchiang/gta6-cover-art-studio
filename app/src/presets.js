export const formats = {
  square: { label: 'Square', ratio: '1:1', width: 1080, height: 1080 },
  portrait: { label: 'Portrait', ratio: '4:5', width: 1080, height: 1350 },
  wide: { label: 'Widescreen', ratio: '16:9', width: 1920, height: 1080 },
};

const rect = (x, y, r, b) => [x, y, r, y, r, b, x, b];

export const layouts = {
  classic: { name: 'Vice Grid', panels: [
    [0, 0, .40, 0, .35, .348, 0, .396],
    [.40, 0, 1, 0, 1, .375, .35, .348],
    [0, .396, .35, .348, .57, .357, .63, .677, 0, .736],
    [.57, .357, 1, .375, 1, .642, .63, .677],
    [0, .736, .63, .677, 1, .642, 1, 1, 0, 1],
  ] },
  split: { name: 'Dynamic Split', panels: [
    [0, 0, .65, 0, .47, .49, 0, .43],
    [.65, 0, 1, 0, 1, .56, .47, .49],
    [0, .43, .47, .49, .60, 1, 0, 1],
    [.47, .49, 1, .56, 1, 1, .60, 1],
  ] },
  trio: { name: 'Neon Trio', panels: [
    [0, 0, 1, 0, 1, .42, 0, .54],
    [0, .54, .46, .485, .59, 1, 0, 1],
    [.46, .485, 1, .42, 1, 1, .59, 1],
  ] },
  cinema: { name: 'Cinematic Six', panels: [
    rect(0, 0, .31, .41),
    [ .31, 0, .675, 0, .604, .41, .31, .41 ],
    [ .675, 0, 1, 0, 1, .58, .5746, .58 ],
    [0, .41, .604, .41, .552, .71, 0, .71],
    [0, .71, .552, .71, .502, 1, 0, 1],
    [.5746, .58, 1, .58, 1, 1, .502, 1],
  ] },
  diagonal: { name: 'Diagonal Cut', panels: [
    [0, 0, .49, 0, .34, .45, 0, .55],
    [.49, 0, 1, 0, 1, .24, .34, .45],
    [.34, .45, 1, .24, 1, .67, .50, .77],
    [0, .55, .34, .45, .50, .77, .43, 1, 0, 1],
    [.50, .77, 1, .67, 1, 1, .43, 1],
  ] },
};

export const grades = {
  vice: { name: 'Vice Sunset', swatch: ['#ef5983', '#ffb36c', '#53c6bd'], split: [[16, 4, 34], [10, -8, 7], [23, 7, -14]], saturation: 1.25, contrast: 1.13 },
  neon: { name: 'Miami Neon', swatch: ['#9563ff', '#f364ac', '#63f3d7'], split: [[4, -8, 45], [19, -13, 21], [-17, 19, 19]], saturation: 1.36, contrast: 1.18 },
  heat: { name: 'Leonida Heatwave', swatch: ['#fa5b46', '#ffc16b', '#9ebc92'], split: [[14, 3, -1], [24, 5, -18], [24, 17, -9]], saturation: 1.15, contrast: 1.19 },
  midnight: { name: 'Midnight Palms', swatch: ['#364eaf', '#8952bf', '#53d7cf'], split: [[-8, -3, 37], [-14, 2, 23], [4, 6, 27]], saturation: 1.17, contrast: 1.22 },
  dusk: { name: 'Pastel Dusk', swatch: ['#a194d8', '#ff9ea2', '#fbd8a5'], split: [[20, 10, 32], [15, 5, 14], [16, 16, 6]], saturation: .98, contrast: .97 },
  original: { name: 'Original', swatch: ['#494858', '#a69eae', '#ded9df'], split: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], saturation: 1, contrast: 1 },
};

export const inks = {
  sunset: { name: 'Sunset', top: '#fff9d7', bottom: '#ffb36d', script: '#ff76ad', detail: '#ffe3a7' },
  electric: { name: 'Electric', top: '#ebfff6', bottom: '#6dffe0', script: '#ff75d9', detail: '#9bf5ed' },
  cream: { name: 'Golden', top: '#fffce0', bottom: '#f9c364', script: '#8bf7d9', detail: '#fff1bb' },
  pearl: { name: 'Pearl', top: '#ffffff', bottom: '#d1bddf', script: '#bdeeff', detail: '#efe3ff' },
};

export const presets = {
  heat: {
    name: 'Heat Index', description: 'Sunset crime fiction', format: 'portrait', layout: 'classic', grade: 'vice',
    title: 'HEAT\nINDEX', subtitle: 'Last Light', badge: 'AFTER HOURS', ink: 'sunset',
    images: [0, 1, 2, 3, 5], focus: [[.54,.42], [.53,.40], [.47,.52], [.70,.50], [.55,.55]],
    x: 54, y: 55, scale: 95, style: 'block', finish: 'print',
  },
  night: {
    name: 'Night Shift', description: 'Neon waterfront', format: 'square', layout: 'diagonal', grade: 'neon',
    title: 'NIGHT\nSHIFT', subtitle: 'City Nocturne', badge: 'VOL. 02', ink: 'electric',
    images: [2, 3, 0, 1, 5], focus: [[.52,.46], [.52,.59], [.53,.34], [.47,.52], [.55,.54]],
    x: 41, y: 47, scale: 88, style: 'slant', finish: 'print',
  },
  coast: {
    name: 'Coast Run', description: 'Golden-hour getaway', format: 'wide', layout: 'cinema', grade: 'heat',
    title: 'COAST\nRUN', subtitle: 'Mile Zero', badge: 'THE GOLD COAST', ink: 'cream',
    images: [3, 2, 1, 0, 4, 5], focus: [[.53,.51], [.50,.49], [.52,.40], [.50,.59], [.50,.45], [.54,.56]],
    x: 30, y: 47, scale: 106, style: 'slant', finish: 'print',
  },
  boulevard: {
    name: 'Ocean Drive', description: 'Single-photo remix', format: 'square', layout: 'split', grade: 'dusk',
    title: 'OCEAN\nDRIVE', subtitle: 'Pink Hour', badge: '', ink: 'pearl',
    x: 50, y: 49, scale: 97, style: 'block', finish: 'comic',
  },
  pier: {
    name: 'Sunset Pier', description: 'Single-photo remix', format: 'wide', layout: 'trio', grade: 'vice',
    title: 'SUNSET\nPIER', subtitle: 'Low Tide', badge: '', ink: 'sunset',
    x: 50, y: 50, scale: 103, style: 'block', finish: 'comic',
  },
};

export function panelState(asset = '', fx = .5, fy = .5, zoom = 1) {
  return { asset, fx, fy, zoom, dx: 0, dy: 0, rotation: 0, flip: false, grade: '', tint: '#ffffff', mix: 0 };
}
