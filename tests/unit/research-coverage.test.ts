// Research behind every chapter (R1, R5a): each chapter draws at least one cited fact from its own module's facts file,
// and each module doc records which toy numbers match the research and which are labelled as toys.
import { describe, expect, it } from 'vitest';
import { MODULES } from '../../src/lib/modules';

const sources = import.meta.glob<string>('../../src/content/*/[0-9]*.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const docs = import.meta.glob<string>('../../docs/modules/*.md', { eager: true, query: '?raw', import: 'default' });
const facts = import.meta.glob<{ facts: { id: string }[] }>('../../data/*/facts.json', {
  eager: true,
  import: 'default',
});
const live = MODULES.filter(m => m.chapters.length > 0);

/** modules still being researched (KTD8): each must fail until its wave lands, then leave this list */
const PENDING = new Set<string>([
  'ab-testing',
  'agent-commerce',
  'backups',
  'caching',
  'calibration',
  'choosing-models',
  'coding-agents',
  'compression',
  'computer-use',
  'consistency',
  'databases',
  'dependencies',
  'diffusion',
  'diffusion-llms',
  'email',
  'encryption',
  'fairness',
  'git',
  'interpretability',
  'labelling',
  'load-balancing',
  'logins',
  'memorisation',
  'mixture-of-experts',
  'multimodal',
  'on-device',
  'parallel-training',
  'payments',
  'post-training',
  'prompts',
  'queues',
  'rag',
  'rate-limits',
  'releases',
  'routes',
  'sandboxing',
  'search',
  'small-models',
  'unicode',
  'voice',
  'watermarks',
  'web-requests',
]);

/** chapters whose `<Fact id={…}>` is fully dynamic: file (from src/content/), and where its ids come from */
const DYNAMIC: Record<string, string> = {
  'mixture-of-experts/07-workbench.tsx': 'the card the reader picks; every card names a fact in its facts file',
};

/** The fact ids a chapter renders with `<Fact id=…>`: literals, and every quoted literal inside an `id={…}`. */
function shownIds(src: string): { ids: string[]; dynamic: boolean } {
  const ids: string[] = [];
  let dynamic = false;
  for (const m of src.matchAll(/<Fact\s+id=(?:"([^"]+)"|'([^']+)'|\{([^}]*)\})/g)) {
    if (m[1] ?? m[2]) ids.push((m[1] ?? m[2])!);
    else {
      // a literal compared against (`mode === 'chained'`) is a condition, not an id
      const expr = m[3].replace(/[=!]==?\s*(['"])[^'"]*\1/g, '');
      const inner = [...expr.matchAll(/'([^']+)'|"([^"]+)"/g)].map(x => x[1] ?? x[2]);
      if (inner.length) ids.push(...inner);
      else dynamic = true;
    }
  }
  return { ids, dynamic };
}

/** Every way a module falls short, as readable lines. */
function gaps(moduleId: string) {
  const m = live.find(x => x.id === moduleId)!;
  const out: string[] = [];
  const known = new Set((facts[`../../data/${m.id}/facts.json`]?.facts ?? []).map(f => f.id));
  if (!known.size) out.push(`${m.id}: no data/${m.id}/facts.json`);
  for (const ch of m.chapters) {
    const file = `${m.id}/${ch.id}.tsx`;
    const src = sources[`../../src/content/${file}`];
    if (!src) throw new Error(`${file}: no chapter file`);
    const { ids, dynamic } = shownIds(src);
    for (const id of ids) if (!known.has(id)) out.push(`${file}: shows fact "${id}", not in data/${m.id}/facts.json`);
    if (!ids.some(id => known.has(id)) && !(dynamic && DYNAMIC[file])) out.push(`${file}: shows no cited fact`);
  }
  if (!/^#+ Toy vs real\b/m.test(docs[`../../docs/modules/${m.id}.md`] ?? ''))
    out.push(`docs/modules/${m.id}.md: no "Toy vs real" section`);
  return out;
}

describe('research coverage', () => {
  for (const m of live)
    it(m.id, () => {
      const found = gaps(m.id);
      // FULL=1 shows a pending module's whole list, as a finished one would
      if (PENDING.has(m.id) && !process.env.FULL)
        expect(found, `${m.id} passes now: remove it from PENDING`).not.toEqual([]);
      else expect(found).toEqual([]);
    });

  it('reads literal, ternary and dynamic fact ids', () => {
    expect(shownIds(`<Fact id="rt1-loop" />`)).toEqual({ ids: ['rt1-loop'], dynamic: false });
    expect(shownIds(`<Fact id={mode === 'chained' ? 'a' : 'b'} />`)).toEqual({ ids: ['a', 'b'], dynamic: false });
    expect(shownIds(`<Fact id={s.card} />`)).toEqual({ ids: [], dynamic: true });
  });

  it('never counts a fact read for a constant as a shown fact', () => {
    expect(shownIds(`export const RT1 = Number(fact('rt1-loop').value);`).ids).toEqual([]);
  });
});
