// The scaffold (KTD14): what it would write, and what it refuses. `plan` only reads; nothing here touches the tree.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { plan } from '../../scripts/new-module.mjs';

/** The live entries of MODULES, in order: home numbers modules by it. */
const live = (registry: string) => [...registry.matchAll(/^ {2}([A-Z_]+_MODULE),$/gm)].map(m => m[1]);

// a registry with planned cards, so these cases do not depend on which planned() lines src/lib/modules.ts still has
const REGISTRY = "import { RAG_MODULE } from '../content/rag/module';\n\nexport const MODULES: Module[] = [\n  RAG_MODULE,\n"
  + "  planned('tokens', 'Tokens & embeddings', 'Beginner', 'How text becomes numbers.'),\n"
  + "  planned('transformers', 'Transformer architecture', 'Advanced', 'Inside the model.'),\n];\n";

describe('pnpm new-module', () => {
  it('refuses an id that is not kebab-case', () => {
    for (const id of ['Demo', 'demo_mod', '-demo', 'demo-', '1demo', '', undefined]) expect(plan(id, 'Demo').error, String(id)).toMatch(/kebab-case/);
  });

  it('refuses an existing module', () => {
    expect(plan('rag', 'RAG').error).toMatch(/module "rag" already exists/);
    expect(plan('tool-calling', 'Tool calling').error).toMatch(/already exists/);
  });

  it('refuses a missing title', () => {
    expect(plan('demo', '').error).toMatch(/title/);
  });

  it('fills the template and registers the module at the end of MODULES', () => {
    const { files, registry, error } = plan('zz-scaffold-check', "Bob's demo", REGISTRY);
    expect(error).toBeUndefined();
    const paths = files.map(([p]: [string]) => p).sort();
    expect(paths).toEqual([
      'data/zz-scaffold-check/facts.json', 'src/content/zz-scaffold-check/01-first-step.tsx', 'src/content/zz-scaffold-check/module.ts', 'src/content/zz-scaffold-check/recall.ts',
      'src/pages/zz-scaffold-check/[chapter].astro', 'src/pages/zz-scaffold-check/index.astro', 'src/pages/zz-scaffold-check/recap.astro', 'tests/e2e/zz-scaffold-check.spec.ts',
    ]);
    for (const [p, text] of files) expect(text, p).not.toMatch(/__(ID|CONST|TITLE)__/);
    expect(files.find(([p]: [string]) => p.endsWith('module.ts'))[1]).toContain("export const ZZ_SCAFFOLD_CHECK_MODULE: Module = {\n  id: 'zz-scaffold-check',\n  title: 'Bob’s demo',");
    expect(registry).toContain("import { ZZ_SCAFFOLD_CHECK_MODULE } from '../content/zz-scaffold-check/module';");
    expect(registry).toMatch(/\n {2}planned\('transformers'.*\n {2}ZZ_SCAFFOLD_CHECK_MODULE,\n\];/);
  });

  it('turns a planned module live at the end, removing its planned card: live modules keep their numbers', () => {
    const { registry } = plan('demo-live', 'Demo', REGISTRY.replace("planned('tokens'", "planned('demo-live'"));
    expect(registry).toMatch(/\n {2}planned\('transformers'.*\n {2}DEMO_LIVE_MODULE,\n\];/);
    expect(registry).not.toContain("planned('demo-live'");
  });

  it('on the real registry, appends a new module after every live one, leaving their order alone', () => {
    const real = readFileSync('src/lib/modules.ts', 'utf8');
    const { registry, error } = plan('zz-fresh-check', 'Fresh');
    expect(error).toBeUndefined();
    expect(live(registry!)).toEqual([...live(real), 'ZZ_FRESH_CHECK_MODULE']);
  });

  it('registers the module at the end of MODULES when no planned() card exists, and refuses when it cannot', () => {
    const fixture = "import { RAG_MODULE } from '../content/rag/module';\n\nexport const MODULES: Module[] = [\n  RAG_MODULE,\n];\n\nconst x = [];\n";
    expect(plan('demo', 'Demo', fixture).registry).toBe(
      "import { RAG_MODULE } from '../content/rag/module';\nimport { DEMO_MODULE } from '../content/demo/module';\n\nexport const MODULES: Module[] = [\n  RAG_MODULE,\n  DEMO_MODULE,\n];\n\nconst x = [];\n");
    const noList = "import { RAG_MODULE } from '../content/rag/module';\nexport const MODULES = [RAG_MODULE];\n";
    expect(plan('demo', 'Demo', noList)).toEqual({ error: expect.stringMatching(/could not register "demo" in src\/lib\/modules\.ts/) });
  });

  it('copies a title with $ patterns and backslashes literally, as a valid string literal', () => {
    const { files } = plan('zz-scaffold-check', 'A $& \\ b $\' c');
    const text = files.find(([p]: [string]) => p.endsWith('module.ts'))[1];
    expect(text).toContain("  title: 'A $& \\\\ b $’ c',");
  });
});
