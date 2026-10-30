// Plain words (R8–R10): a flagged word stays in reader copy only where its module defines it as a chapter term first;
// everywhere else it is swapped. Structured copy and fact claims are checked exactly, kits and intro pages by a scan of
// their prose.
import { describe, expect, it } from 'vitest';
import { MODULES } from '../../src/lib/modules';
import { FLAGGED, flaggedIn, wordRe } from '../../src/components/story/plain-words';
import type { Step } from '../../src/components/story/steps';

const chapters = import.meta.glob<Record<string, unknown>>('../../src/content/*/[0-9]*.tsx', { eager: true });
const sources = import.meta.glob<string>(
  ['../../src/content/*/[0-9]*.tsx', '../../src/content/*/kit.tsx', '../../src/pages/*/index.astro'],
  { eager: true, query: '?raw', import: 'default' },
);
const facts = import.meta.glob<{ facts: { id: string; claim: string }[] }>('../../data/*/facts.json', {
  eager: true,
  import: 'default',
});
const live = MODULES.filter(m => m.chapters.length > 0);

/** modules still being rewritten (KTD8): each must fail until its wave lands, then leave this list */
const PENDING = new Set<string>([
  'dependencies',
  'email',
  'load-balancing',
  'logins',
  'rag',
  'unicode',
]);

/** prose-scan hits that are not reader copy: file (from src/), word, reason */
const ALLOW: [string, string, string][] = [];

/** The prose of a source file: string literals, template literals and JSX text (never code: no `=` or `;`) of three
 * words or more. */
function prose(src: string): string[] {
  const code = src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\w'"`])\/\/.*$/gm, '$1')
    .replace(/^\s*import .*$/gm, '');
  const out: string[] = [];
  for (const m of code.matchAll(/'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`|>([^<>{}=;]+)</g))
    out.push((m[1] ?? m[2] ?? m[3] ?? m[4]).replace(/\$\{[^}]*\}/g, ' '));
  return out.filter(s => s.trim().split(/\s+/).length >= 3);
}

const quizText = (v: unknown): string[] => {
  if (!v || typeof v !== 'object' || !('question' in v)) return [];
  const q = v as { question?: unknown; options?: unknown; why?: unknown; explanation?: unknown };
  return [
    q.question,
    q.explanation,
    ...(Array.isArray(q.options) ? q.options : []),
    ...(Array.isArray(q.why) ? q.why : []),
  ].filter((s): s is string => typeof s === 'string');
};

/** Every flagged word used outside a term its module defines first, as readable lines. */
function misses(moduleId: string) {
  const m = live.find(x => x.id === moduleId)!;
  const out = new Set<string>();
  const termWords = m.chapters.map(ch => new Set(ch.intro.terms.flatMap(([t]) => flaggedIn(t))));
  const upTo = (i: number) => new Set(termWords.slice(0, i + 1).flatMap(s => [...s]));
  const anyChapter = upTo(m.chapters.length - 1);
  const report = (at: string, w: string, declarable: boolean) =>
    out.add(`${at}: "${w}" → "${FLAGGED[w]}"${declarable ? ' (or declare it as a term)' : ''}`);

  for (const [i, ch] of m.chapters.entries()) {
    const at = `${m.id}/${ch.id}`;
    const mod = chapters[`../../src/content/${m.id}/${ch.id}.tsx`] ?? {};
    const steps = (mod.STEPS ?? []) as Step<unknown>[];
    const spoken = steps.flatMap(s => [s.narration, s.act ?? '']).join(' ');
    const { story, goal, learn, terms } = ch.intro;
    const text = [
      story,
      goal,
      ...learn,
      ...terms.map(([, def]) => def),
      ...steps.flatMap(s => [s.narration, s.act ?? '', s.hint ?? '', s.say?.text ?? '']),
      ...Object.values(mod).flatMap(quizText),
    ];
    const ok = upTo(i);
    for (const w of flaggedIn(text.join('\n'))) if (!ok.has(w)) report(at, w, wordRe(w).test(spoken));
  }
  for (const r of m.recall ?? []) {
    const i = m.chapters.findIndex(ch => ch.id === r.chapter);
    const ok = i < 0 ? anyChapter : upTo(i);
    for (const w of flaggedIn(quizText(r).join('\n'))) if (!ok.has(w)) report(`${m.id} recall ${r.id}`, w, false);
  }
  for (const w of flaggedIn(`${m.description}\n${m.story}`)) if (!anyChapter.has(w)) report(`${m.id} module`, w, false);
  for (const f of facts[`../../data/${m.id}/facts.json`]?.facts ?? [])
    for (const w of flaggedIn(f.claim)) if (!anyChapter.has(w)) report(`${m.id} fact ${f.id}`, w, false);
  for (const [path, src] of Object.entries(sources)) {
    const file = path.replace('../../src/', '');
    if (!file.startsWith(`content/${m.id}/`) && !file.startsWith(`pages/${m.id}/`)) continue;
    for (const w of flaggedIn(prose(src).join('\n')))
      if (!anyChapter.has(w) && !ALLOW.some(([f, a]) => f === file && a === w)) report(file, w, false);
  }
  return [...out];
}

describe('plain words', () => {
  for (const m of live)
    it(m.id, () => {
      const found = misses(m.id);
      // FULL=1 shows a pending module's whole list, as a finished one would
      if (PENDING.has(m.id) && !process.env.FULL)
        expect(found, `${m.id} passes now: remove it from PENDING`).not.toEqual([]);
      else expect(found).toEqual([]);
    });

  it('matches whole words, plurals and possessives, never inside another word', () => {
    expect(wordRe('gantry').test('two gantries')).toBe(true);
    expect(wordRe('schema').test('the schemas')).toBe(true);
    expect(wordRe('latency').test("the latency's cost")).toBe(true);
    expect(wordRe('kv').test('a kvetch')).toBe(false);
    expect(wordRe('json').test('json-rpc')).toBe(false);
  });

  it('scans prose, not comments, imports or short identifiers', () => {
    const src = `import { gantry } from './gantry';\n// the gantry moves\nconst a = 'gantry';\nconst b = <p>The gantry moves left.</p>;`;
    expect(prose(src)).toEqual(['The gantry moves left.']);
  });

  it('names a swap for every flagged word', () => {
    for (const [w, swap] of Object.entries(FLAGGED)) {
      expect(w).toBe(w.toLowerCase());
      expect(swap.trim()).not.toBe('');
    }
  });
});
