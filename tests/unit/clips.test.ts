// The committed opener clips (pnpm clips; video/README.md): every chapter with clip lines has its video, poster and
// captions, each within the size budget, and the captions say exactly the registry's lines.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MODULES } from '../../src/lib/modules';

const MB = 1024 * 1024;
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const file = (m: string, c: string, ext: string) => `public/video/${m}/${c}.${ext}`;
const clipped = MODULES.flatMap(m => m.chapters.filter(c => c.intro.clip).map(c => ({ m: m.id, c })));
/** a VTT file's cue texts, in order */
const cues = (vtt: string) =>
  vtt
    .split(/\n\n+/)
    .filter(b => b.includes('-->'))
    .map(b => b.split('\n').slice(1).join('\n').trim());

describe.each(clipped)('$m/$c.id clip', ({ m, c }) => {
  it('has its video, poster and captions', () => {
    for (const ext of ['mp4', 'jpg', 'vtt']) expect(existsSync(file(m, c.id, ext)), file(m, c.id, ext)).toBe(true);
  });
  it('weighs at most 1 MB', () => {
    expect(statSync(file(m, c.id, 'mp4')).size).toBeLessThanOrEqual(MB);
  });
  it('captions the registry lines, in order', () => {
    expect(cues(readFileSync(file(m, c.id, 'vtt'), 'utf8'))).toEqual(c.intro.clip);
  });
  it('keeps every line to 10 words', () => {
    expect(c.intro.clip!.filter(l => words(l) > 10)).toEqual([]);
  });
});

describe('clips per module', () => {
  it('keep a module’s videos and posters within 6 MB', () => {
    for (const m of MODULES) {
      const dir = `public/video/${m.id}`;
      if (!existsSync(dir)) continue;
      const total = readdirSync(dir)
        .filter(f => /\.(mp4|jpg)$/.test(f))
        .reduce((n, f) => n + statSync(`${dir}/${f}`).size, 0);
      expect(total, m.id).toBeLessThanOrEqual(6 * MB);
    }
  });
  it('belong only to chapters the registry has, with clip lines', () => {
    const known = new Set(clipped.map(({ m, c }) => `${m}/${c.id}`));
    const stray = MODULES.filter(m => existsSync(`public/video/${m.id}`)).flatMap(m =>
      readdirSync(`public/video/${m.id}`)
        .map(f => `${m.id}/${f.replace(/\.(mp4|jpg|vtt)$/, '')}`)
        .filter(k => !known.has(k)),
    );
    expect(stray).toEqual([]);
  });
});
