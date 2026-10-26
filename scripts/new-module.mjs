/**
 * Scaffolds a module from templates/module/ (KTD14): the registry entry, intro, chapter route, recap page, one chapter,
 * a recall bank, a data folder and an e2e spec, then registers the module in src/lib/modules.ts.
 * Run: pnpm new-module <id> "<Title>"    e.g. pnpm new-module tokens "Tokens & embeddings"
 * Refuses an id that is not kebab-case, or one whose files already exist, before writing anything.
 * Pages, share-image ids and ALL_PAGES follow from the registry; `pnpm test` then lists what the module still needs.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(ROOT, 'templates/module');
const REGISTRY = path.join(ROOT, 'src/lib/modules.ts');

/** Every template file, as [relative path with __ID__, contents]. */
const walk = (dir, rel = '') =>
  readdirSync(dir).flatMap(f =>
    statSync(path.join(dir, f)).isDirectory()
      ? walk(path.join(dir, f), path.join(rel, f))
      : [[path.join(rel, f), readFileSync(path.join(dir, f), 'utf8')]],
  );

/** The files and the new registry text for a module, or an error. Writes nothing. */
export function plan(id, title, registry = readFileSync(REGISTRY, 'utf8')) {
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id ?? ''))
    return { error: `module id must be kebab-case (like tool-calling), got "${id ?? ''}"` };
  if (!title?.trim()) return { error: 'give the module a title: pnpm new-module <id> "<Title>"' };
  const CONST = id.toUpperCase().replace(/-/g, '_') + '_MODULE';
  // the title lands in a '...' string literal; replacer functions keep `$&` and friends literal
  const safe = title.replace(/\\/g, '\\\\').replace(/'/g, '’');
  const fill = s =>
    s
      .replaceAll('__ID__', () => id)
      .replaceAll('__CONST__', () => CONST)
      .replaceAll('__TITLE__', () => safe);
  const files = walk(TEMPLATE).map(([rel, text]) => [fill(rel), fill(text)]);
  const taken = files.map(([rel]) => rel).filter(rel => existsSync(path.join(ROOT, rel)));
  if (taken.length || new RegExp(`id: '${id}'|from '../content/${id}/module'`).test(registry))
    return {
      error: `module "${id}" already exists${taken.length ? `: ${taken.join(', ')}` : ' in src/lib/modules.ts'}`,
    };
  // import beside the other modules; the entry goes after the last live module, before the roadmap cards (home numbers
  // modules in registry order, so live modules append in go-live order), and a planned() card of the same id is removed,
  // on one line or as Biome formats it, one argument per line
  const imports = [...registry.matchAll(/^import \{ \w+ \} from '\.\.\/content\/[\w-]+\/module';$/gm)].at(-1);
  const unregistered = {
    error: `could not register "${id}" in src/lib/modules.ts: no module import, or no \`export const MODULES = [\` list closed by \`];\``,
  };
  if (!imports) return unregistered;
  let next =
    registry.slice(0, imports.index + imports[0].length) +
    `\nimport { ${CONST} } from '../content/${id}/module';` +
    registry.slice(imports.index + imports[0].length);
  next = next.replace(new RegExp(`^  planned\\((?:'${id}',.*|\\n\\s+'${id}',[\\s\\S]*?\\n  \\)),\\n`, 'm'), '');
  next = next.replace(/(^export const MODULES\b[^\n]*\[\n[\s\S]*?)^( {2}planned\(|\];)/m, `$1  ${CONST},\n$2`);
  if (!next.includes(`\n  ${CONST},\n`)) return unregistered;
  return { files, registry: next };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [id, title] = process.argv.slice(2);
  const p = plan(id, title);
  if (p.error) {
    console.error(`new-module: ${p.error}`);
    process.exit(1);
  }
  for (const [rel, text] of p.files) {
    mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
    writeFileSync(path.join(ROOT, rel), text);
    console.log(`new-module: ${rel}`);
  }
  writeFileSync(REGISTRY, p.registry);
  console.log(
    `new-module: registered in src/lib/modules.ts\nNext: pnpm test lists what "${id}" still needs; pnpm og draws its share images.`,
  );
}
