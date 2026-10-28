// Every module trailer (public/video/<id>-trailer.mp4) ships whole: poster and captions beside it, its HyperFrames
// project in videos/, a live module to belong to, a Trailer on that module's intro whose running time is the MP4's,
// and captions that are its recorded narration word for word.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { MODULES } from '../../src/lib/modules';

const IDS = readdirSync('public/video')
  .filter(f => f.endsWith('-trailer.mp4'))
  .map(f => f.slice(0, -'-trailer.mp4'.length));

/** The MP4's duration in seconds, from its movie header (mvhd) box. */
function seconds(file: string) {
  const b = readFileSync(file);
  const at = b.indexOf('mvhd') + 4;
  return b[at] === 1
    ? Number(b.readBigUInt64BE(at + 24)) / b.readUInt32BE(at + 20)
    : b.readUInt32BE(at + 16) / b.readUInt32BE(at + 12);
}
const mss = (s: number) => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;

/** Every <Trailer …/> on the module intros, as [page, id, length]. */
const USED = MODULES.flatMap(m => {
  const page = `src/pages/${m.id}/index.astro`;
  if (!existsSync(page)) return [];
  return [...readFileSync(page, 'utf8').matchAll(/<Trailer id="([^"]+)"[^>]*length="([^"]+)"/g)].map(
    t => [page, t[1], t[2]] as const,
  );
});

describe('module trailers', () => {
  it('reads the running time of the RAG trailer', () => {
    expect(mss(seconds('public/video/rag-trailer.mp4'))).toBe('0:47');
  });

  it.each(IDS)('%s: poster, captions, project, a live module', id => {
    for (const ext of ['jpg', 'vtt']) expect(existsSync(`public/video/${id}-trailer.${ext}`), ext).toBe(true);
    expect(existsSync(`videos/${id}-trailer/SCRIPT.md`)).toBe(true);
    expect(MODULES.find(m => m.id === id)?.status).toBe('live');
  });

  it.each(IDS)('%s: its intro shows it, with the MP4’s running time', id => {
    const use = USED.find(([page, used]) => used === id && page === `src/pages/${id}/index.astro`);
    expect(use, `src/pages/${id}/index.astro has no <Trailer id="${id}" …/>`).toBeDefined();
    expect(use![2]).toBe(mss(seconds(`public/video/${id}-trailer.mp4`)));
  });

  it('no intro shows a trailer that is not there', () => {
    for (const [page, id] of USED) expect(IDS, page).toContain(id);
  });

  it.each(IDS)('%s: the captions are the recorded narration, word for word', id => {
    const cues = readFileSync(`public/video/${id}-trailer.vtt`, 'utf8')
      .split('\n\n')
      .slice(1)
      .map(c => c.split('\n').slice(1).join(' ').trim());
    const words: Record<string, { words: { text: string }[] }> = JSON.parse(
      readFileSync(`videos/${id}-trailer/assets/voice/words.json`, 'utf8'),
    );
    expect(cues.join(' ').split(/\s+/)).toEqual(Object.values(words).flatMap(l => l.words.map(w => w.text)));
  });
});
