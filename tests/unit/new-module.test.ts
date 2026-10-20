// The scaffold (KTD14): what it would write, and what it refuses. `plan` only reads; nothing here touches the tree.
import { describe, it, expect } from 'vitest';
import { plan } from '../../scripts/new-module.mjs';

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

  it('fills the template and registers the module before the planned ones', () => {
    const { files, registry, error } = plan('zz-scaffold-check', "Bob's demo");
    expect(error).toBeUndefined();
    const paths = files.map(([p]: [string]) => p).sort();
    expect(paths).toEqual([
      'data/zz-scaffold-check/facts.json', 'src/content/zz-scaffold-check/01-first-step.tsx', 'src/content/zz-scaffold-check/module.ts', 'src/content/zz-scaffold-check/recall.ts',
      'src/pages/zz-scaffold-check/[chapter].astro', 'src/pages/zz-scaffold-check/index.astro', 'src/pages/zz-scaffold-check/recap.astro', 'tests/e2e/zz-scaffold-check.spec.ts',
    ]);
    for (const [p, text] of files) expect(text, p).not.toMatch(/__(ID|CONST|TITLE)__/);
    expect(files.find(([p]: [string]) => p.endsWith('module.ts'))[1]).toContain("export const ZZ_SCAFFOLD_CHECK_MODULE: Module = {\n  id: 'zz-scaffold-check',\n  title: 'Bob’s demo',");
    expect(registry).toContain("import { ZZ_SCAFFOLD_CHECK_MODULE } from '../content/zz-scaffold-check/module';");
    expect(registry).toMatch(/\n {2}ZZ_SCAFFOLD_CHECK_MODULE,\n {2}planned\('tokens'/);
  });

  it('turns a planned module live in its place', () => {
    const { registry } = plan('tokens', 'Tokens & embeddings');
    expect(registry).toMatch(/\n {2}TOKENS_MODULE,\n {2}planned\('transformers'/);
    expect(registry).not.toContain("planned('tokens'");
  });
});
