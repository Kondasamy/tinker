// The masked model's loader (KTD4): /data/diffusion-llms/meta.json lays out mlm.bin as model.bin is laid out, its
// vocab read from the meta. The real files come with U3; this fixture puts model.bin under a meta of that layout.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Meta, modelLoader } from '../../src/lib/lm/load';

const disk = (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const base = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
// only the keys the loader reads, in the shape train.py writes them
const fixture = { model: { ...base.model, vocab: 769 }, dtype: base.dtype, bytes: base.bytes, tensors: base.tensors };
const files: Record<string, () => ArrayBuffer> = {
  'meta.json': () => new TextEncoder().encode(JSON.stringify(fixture)).buffer as ArrayBuffer,
  'mlm.bin': () => disk('model.bin'),
};

afterEach(() => vi.unstubAllGlobals());

describe('the mlm loader', () => {
  it('decodes mlm.bin by its own meta, vocab included', async () => {
    const m = await modelLoader(async f => files[f](), 'mlm').load();
    const { params: _, ...config } = fixture.model;
    expect(m.config).toEqual(config);
    expect(m.config.vocab).toBe(769);
    expect(m.tensors['wte.weight']).toHaveLength(768 * 32);
    expect(m.tensors['wte.weight'].some(v => v !== 0)).toBe(true);
  });

  it('fetches from /data/diffusion-llms/ by default', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      seen.push(url);
      return new Response(files[url.split('/').at(-1)!]());
    });
    await modelLoader(undefined, 'mlm').load();
    expect(seen.sort()).toEqual(['/data/diffusion-llms/meta.json', '/data/diffusion-llms/mlm.bin']);
  });

  it('rejects a missing file, so the stage offers Retry, and recovers on retry', async () => {
    let calls = 0;
    const m = modelLoader(async f => {
      if (f === 'mlm.bin' && calls++ === 0) throw new Error('mlm.bin: HTTP 404');
      return files[f]();
    }, 'mlm');
    await expect(m.load()).rejects.toThrow(/mlm\.bin/);
    expect(m.status()).toBe('error');
    await m.load();
    expect(m.status()).toBe('ready');
  });
});
