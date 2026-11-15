// EMBER & ANVIL — main.ts
// The entrypoint (Node 22, standard library only). It copies game/ and
// screenshots/ from this repository into the output directory and writes
// /output/dossier.json with buildDossier from vendor/makefun-game.ts.
//
// The grader's /output is a mounted volume: this program NEVER deletes the
// output directory itself — it only clears the game/ and screenshots/
// subdirectories inside it, then copies the fresh files in.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = new URL('.', import.meta.url).pathname;
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

mkdirSync(outDir, { recursive: true });

// Clear only the subdirectories this program owns, never outDir itself.
for (const sub of ['game', 'screenshots']) {
  const dest = join(outDir, sub);
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
}

cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, caps);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`ember-and-anvil: wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
