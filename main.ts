// Package the static studio and its captured covers for make.fun using Node 22.
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const sourceShots = join(root, 'screenshots');
const captured = readdirSync(sourceShots).filter(name => !name.startsWith('.')).sort();
const shotManifest = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8')) as { name: string }[];
const expected = shotManifest.map(shot => shot.name).sort();

if (captured.length < 3 || captured.length > 4 || captured.join('\n') !== expected.join('\n')) {
  throw new Error('shots.json must match the three or four images in screenshots/.');
}

mkdirSync(output, { recursive: true });
cpSync(join(root, 'app'), join(output, 'app'), { recursive: true });
cpSync(sourceShots, join(output, 'screenshots'), { recursive: true });

const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});

writeFileSync(join(output, 'dossier.json'), dossier);
