// Watch narration is pinned to the copy (KTD4, KTD5). rag.script.json is what scripts/record-narration.mjs speaks,
// built here from the chapters' STEPS (plain Node can't import them); UPDATE_NARRATION=1 rewrites it. Every entry
// needs a recorded clip; a clip recorded from older text is stale and only warns, the player times it by words.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODULES } from '../../src/lib/modules';
import { spokenText } from '../../src/components/story/watch';
import type { Step } from '../../src/components/story/steps';

interface Entry {
  chapter: string;
  step: string;
  text: string;
}
type Recorded = Record<string, Record<string, { text: string; ms: number }>>;

const files = import.meta.glob<Record<string, unknown>>('../../src/content/rag/[0-9]*.tsx', { eager: true });
const SCRIPT = path.resolve('data/watch/rag.script.json');
const RECORDED = path.resolve('data/watch/rag.json');
const mp3 = (e: Entry) => path.resolve(`public/data/watch/rag/${e.chapter}/${e.step}.mp3`);

const build = (): Entry[] =>
  MODULES.find(m => m.id === 'rag')!.chapters.flatMap(ch =>
    (files[`../../src/content/rag/${ch.id}.tsx`].STEPS as Step<unknown>[]).map(s => ({
      chapter: ch.id,
      step: s.id,
      text: spokenText(s),
    })),
  );

/** What's wrong with the recorded clips, and which are stale (recorded from text the step no longer says). */
function audit(script: Entry[], recorded: Recorded, exists: (e: Entry) => boolean) {
  const errors: string[] = [],
    stale: string[] = [];
  for (const [i, e] of script.entries()) {
    const at = `${e.chapter}/${e.step}`,
      clip = recorded[e.chapter]?.[e.step];
    if (!clip) errors.push(`${at}: not in rag.json`);
    else if (clip.text !== e.text) {
      const near = [script[i - 1], script[i + 1]].some(n => n && n.text === clip.text);
      (near ? errors : stale).push(near ? `${at}: holds its neighbour's clip` : at);
    }
    if (!exists(e)) errors.push(`${at}: no MP3`);
  }
  return { errors, stale };
}

describe('RAG Watch narration', () => {
  const built = build();

  it('rag.script.json is built from the current STEPS', () => {
    if (process.env.UPDATE_NARRATION) {
      fs.mkdirSync(path.dirname(SCRIPT), { recursive: true });
      fs.writeFileSync(SCRIPT, `${JSON.stringify(built, null, 2)}\n`);
    }
    expect(fs.existsSync(SCRIPT), 'run pnpm narration:script').toBe(true);
    expect(JSON.parse(fs.readFileSync(SCRIPT, 'utf8'))).toEqual(built);
  });

  it('neighbouring steps say different things, so a swapped clip shows', () => {
    for (const [i, e] of built.entries()) if (i) expect(e.text, `${e.chapter}/${e.step}`).not.toBe(built[i - 1].text);
  });

  it('every step has a recorded clip on disk; stale clips warn without failing', () => {
    const { errors, stale } = audit(built, JSON.parse(fs.readFileSync(RECORDED, 'utf8')), e => fs.existsSync(mp3(e)));
    expect(errors).toEqual([]);
    if (stale.length) console.warn(`stale Watch narration (run pnpm record:narration): ${stale.join(', ')}`);
  });

  it('a missing MP3 or a swapped clip fails, a changed step only goes stale', () => {
    const script: Entry[] = [
      { chapter: 'c', step: 'a', text: 'One.' },
      { chapter: 'c', step: 'b', text: 'Two.' },
      { chapter: 'c', step: 'd', text: 'Three.' },
    ];
    const rec: Recorded = { c: { a: { text: 'Two.', ms: 1 }, b: { text: 'One.', ms: 1 }, d: { text: 'Old.', ms: 1 } } };
    expect(audit(script, rec, e => e.step !== 'd')).toEqual({
      errors: ["c/a: holds its neighbour's clip", "c/b: holds its neighbour's clip", 'c/d: no MP3'],
      stale: ['c/d'],
    });
  });
});
