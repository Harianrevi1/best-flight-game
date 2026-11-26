// SKYLANE — Island Run: the hand-in program.
// Copies game/ and screenshots/ into the output directory and writes the
// dossier with make.fun's own library, so the entry is exactly what the
// scorer rebuilds from the same files.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = import.meta.dirname;
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });

const gameSrc = join(repoRoot, 'game');
const gameDst = join(outDir, 'game');
cpSync(gameSrc, gameDst, { recursive: true });

const shotsSrc = join(repoRoot, 'screenshots');
const shotsDst = join(outDir, 'screenshots');
if (existsSync(shotsSrc)) {
  cpSync(shotsSrc, shotsDst, { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
