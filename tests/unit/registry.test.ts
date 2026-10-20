// Registry checks (R26, KTD13): a live module must be complete before it ships. Each rule is a pure function over a
// module, the page list and a filesystem probe, so the rules themselves are tested below with fakes.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULES, type Module } from '../../src/lib/modules';
import { ALL_PAGES, type PageMeta } from '../../src/lib/pages';

interface Probe { exists(rel: string): boolean; read(rel: string): string; specs: string[] }

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const E2E = path.join(ROOT, 'tests/e2e');
const DISK: Probe = {
  exists: rel => existsSync(path.join(ROOT, rel)),
  read: rel => readFileSync(path.join(ROOT, rel), 'utf8'),
  specs: readdirSync(E2E).filter(f => f.endsWith('.ts')).map(f => readFileSync(path.join(E2E, f), 'utf8')),
};

/** What a live module still lacks, one message each, naming the module. Planned modules owe nothing yet. */
function missing(m: Module, pages: PageMeta[], fs: Probe): string[] {
  if (m.status !== 'live') return [];
  const out: string[] = [], no = (what: string) => out.push(`${m.id}: missing ${what}`);
  if (!m.level) no('a level');
  if (!m.author?.name || !m.author?.url) no('an author (name and url)');
  if (!m.chapters.length) no('chapters');
  const dir = `src/pages/${m.id}`;
  for (const f of ['index.astro', '[chapter].astro', 'recap.astro']) if (!fs.exists(`${dir}/${f}`)) no(`page ${dir}/${f}`);
  if (fs.exists(`${dir}/index.astro`) && !/april-zhu\.com\/colorfigures/.test(fs.read(`${dir}/index.astro`)))
    no(`the Colorfigures credit (a link to april-zhu.com/colorfigures) in ${dir}/index.astro`);
  const want = [`/${m.id}/`, ...m.chapters.map(c => `/${m.id}/${c.id}/`), `/${m.id}/recap/`];
  for (const p of want) {
    const page = pages.find(x => x.path === p);
    if (!page) no(`page ${p} in ALL_PAGES (src/lib/pages.ts)`);
    else if (!fs.exists(`public/og/${page.og}.jpg`)) no(`share image public/og/${page.og}.jpg for ${p} (run pnpm og)`);
  }
  const bank = m.recall ?? [];
  if (!bank.length) no('a recall bank (src/content/<module>/recall.ts, set as `recall` in module.ts)');
  for (const c of m.chapters) if (bank.length && !bank.some(i => i.chapter === c.id)) no(`recall items for chapter ${c.id}`);
  const pins = bank.filter(i => i.pin).length;
  if (bank.length && pins !== 1) no(`exactly one pinned recall item (has ${pins})`);
  if (pins === 1 && !bank[0].pin) out.push(`${m.id}: recall item ${bank.find(i => i.pin)!.id} is pinned but not first in the bank`);
  for (const [n, i] of bank.entries()) {
    const bad = (what: string) => out.push(`${m.id}: recall item ${i.id} ${what}`);
    if (bank.findIndex(j => j.id === i.id) !== n) { out.push(`${m.id}: recall item id ${i.id} is used more than once`); continue; }
    if (!Number.isInteger(i.correct) || i.correct < 0 || i.correct >= i.options.length) bad(`has correct index ${i.correct}, outside its ${i.options.length} options`);
    if (i.why.length !== i.options.length) bad(`has ${i.why.length} why lines for ${i.options.length} options`);
    if (new Set(i.options).size !== i.options.length) bad('repeats an option');
  }
  if (!fs.specs.some(s => s.includes(`/${m.id}/`))) no(`an e2e spec in tests/e2e that visits /${m.id}/`);
  return out;
}

/** Ids that two modules or two pages share. */
function collisions(modules: Module[], pages: PageMeta[]): string[] {
  const dupes = (xs: string[]) => [...new Set(xs.filter((x, i) => xs.indexOf(x) !== i))];
  return [
    ...dupes(modules.map(m => m.id)).map(id => `module id "${id}" is used by more than one module`),
    ...dupes(pages.map(p => p.og)).map(og => `share image id "${og}" is used by more than one page`),
    ...dupes(pages.map(p => p.path)).map(p => `path "${p}" is used by more than one page`),
  ];
}

describe('module registry checks (R26)', () => {
  for (const m of MODULES.filter(m => m.status === 'live')) {
    it(`live module "${m.id}" is complete`, () => {
      expect(missing(m, ALL_PAGES, DISK)).toEqual([]);
    });
  }

  it('module ids, share-image ids and page paths are unique', () => {
    expect(collisions(MODULES, ALL_PAGES)).toEqual([]);
  });

  it('every page has a share image, home included', () => {
    expect(ALL_PAGES.filter(p => !DISK.exists(`public/og/${p.og}.jpg`)).map(p => `${p.path}: no public/og/${p.og}.jpg`)).toEqual([]);
  });
});

describe('the registry rules themselves', () => {
  const chapter = (id: string) => ({ id, title: id, short: id, intro: { story: '', goal: '', learn: [], terms: [] } });
  const item = (id: string, ch: string, pin = false) => ({ id, chapter: ch, question: '?', options: ['a', 'b'], correct: 0, why: ['', ''], pin });
  const FAKE: Module = {
    id: 'fake', title: 'Fake', description: '', level: 'Beginner', status: 'live', author: { name: 'A', url: 'https://a.example' },
    prereqs: [], story: '', chapters: [chapter('01-a'), chapter('02-b')], recall: [item('x', '01-a', true), item('y', '02-b')],
  };
  const page = (p: string, og: string) => ({ path: p, og, title: '', description: '', kicker: '', headline: '', sub: '' });
  const PAGES = [page('/fake/', 'fake'), page('/fake/01-a/', 'fake-01-a'), page('/fake/02-b/', 'fake-02-b'), page('/fake/recap/', 'fake-recap')];
  const files = (...without: string[]) => {
    const all = ['src/pages/fake/index.astro', 'src/pages/fake/[chapter].astro', 'src/pages/fake/recap.astro', ...PAGES.map(p => `public/og/${p.og}.jpg`)];
    return (spec = "page.goto('/fake/01-a/')", intro = '<a href="https://april-zhu.com/colorfigures">Colorfigures</a>'): Probe =>
      ({ exists: f => all.includes(f) && !without.includes(f), read: () => intro, specs: [spec] });
  };

  it('passes a complete fake module', () => {
    expect(missing(FAKE, PAGES, files()())).toEqual([]);
  });

  it('names the module and the missing level or author', () => {
    expect(missing({ ...FAKE, level: '' as never }, PAGES, files()())).toEqual(['fake: missing a level']);
    expect(missing({ ...FAKE, author: { name: '', url: '' } }, PAGES, files()())).toEqual(['fake: missing an author (name and url)']);
  });

  it('fails a live module with no chapters', () => {
    expect(missing({ ...FAKE, chapters: [], recall: [item('x', '01-a', true)] }, PAGES, files()())).toContain('fake: missing chapters');
  });

  it('fails a missing page file, a page left out of ALL_PAGES, and a missing share image', () => {
    expect(missing(FAKE, PAGES, files('src/pages/fake/recap.astro')())).toEqual(['fake: missing page src/pages/fake/recap.astro']);
    expect(missing(FAKE, PAGES.slice(0, 3), files()())).toEqual(['fake: missing page /fake/recap/ in ALL_PAGES (src/lib/pages.ts)']);
    expect(missing(FAKE, PAGES, files('public/og/fake-02-b.jpg')())).toEqual(['fake: missing share image public/og/fake-02-b.jpg for /fake/02-b/ (run pnpm og)']);
  });

  it('fails a live module with no recall bank, a chapter it skips, or the wrong number of pins', () => {
    expect(missing({ ...FAKE, recall: undefined }, PAGES, files()())).toEqual(['fake: missing a recall bank (src/content/<module>/recall.ts, set as `recall` in module.ts)']);
    expect(missing({ ...FAKE, recall: [item('x', '01-a', true)] }, PAGES, files()())).toEqual(['fake: missing recall items for chapter 02-b']);
    expect(missing({ ...FAKE, recall: [item('x', '01-a', true), item('y', '02-b', true)] }, PAGES, files()())).toEqual(['fake: missing exactly one pinned recall item (has 2)']);
  });

  it('fails a recall item with a bad correct index, a why line per option short, or a repeated option', () => {
    const bad = (patch: object) => missing({ ...FAKE, recall: [item('x', '01-a', true), { ...item('y', '02-b'), ...patch }] }, PAGES, files()());
    expect(bad({ correct: 2 })).toEqual(['fake: recall item y has correct index 2, outside its 2 options']);
    expect(bad({ correct: 0.5 })).toEqual(['fake: recall item y has correct index 0.5, outside its 2 options']);
    expect(bad({ why: [''] })).toEqual(['fake: recall item y has 1 why lines for 2 options']);
    expect(bad({ options: ['a', 'a'] })).toEqual(['fake: recall item y repeats an option']);
  });

  it('fails repeated recall item ids, and a pinned item that is not first', () => {
    expect(missing({ ...FAKE, recall: [item('x', '01-a', true), item('x', '02-b')] }, PAGES, files()())).toEqual(['fake: recall item id x is used more than once']);
    expect(missing({ ...FAKE, recall: [item('y', '02-b'), item('x', '01-a', true)] }, PAGES, files()())).toEqual(['fake: recall item x is pinned but not first in the bank']);
  });

  it('fails without an e2e spec or the Colorfigures credit', () => {
    expect(missing(FAKE, PAGES, files()("page.goto('/other/')"))).toEqual(['fake: missing an e2e spec in tests/e2e that visits /fake/']);
    expect(missing(FAKE, PAGES, files()(undefined, '<footer>by me</footer>'))).toEqual(['fake: missing the Colorfigures credit (a link to april-zhu.com/colorfigures) in src/pages/fake/index.astro']);
  });

  it('exempts planned modules from every page and image check', () => {
    expect(missing({ ...FAKE, status: 'planned', chapters: [], recall: undefined }, [], { exists: () => false, read: () => '', specs: [] })).toEqual([]);
  });

  it('fails when two modules or two pages share an id', () => {
    expect(collisions([FAKE, FAKE], PAGES)).toEqual(['module id "fake" is used by more than one module']);
    expect(collisions([FAKE], [...PAGES, page('/fake/again/', 'fake')])).toEqual(['share image id "fake" is used by more than one page']);
    expect(collisions([FAKE], [...PAGES, page('/fake/', 'other')])).toEqual(['path "/fake/" is used by more than one page']);
  });
});
