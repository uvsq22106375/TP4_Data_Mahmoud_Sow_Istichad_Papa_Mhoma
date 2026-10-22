// Lance les tests « .spec.js » d'un dossier (kits de TP), sans dépendre des globs du shell.
// Usage : node tools/run-specs.js <dossier>
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = process.argv[2];
const files = [];
(function walk(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.spec.js')) files.push(p);
  }
})(dir);
if (!files.length) { console.error(`Aucun fichier .spec.js dans ${dir}`); process.exit(1); }
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(r.status ?? 1);
