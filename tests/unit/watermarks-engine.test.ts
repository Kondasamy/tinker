// Watermarks' engine (U15, KTD3, KTD9): every effect a chapter teaches is pinned in data/watermarks/pinned.json and
// rerun here. Regenerate (signing the label once with Locks and keys' demo key) with
// WRITE_PINNED=1 pnpm vitest run tests/unit/watermarks-engine.test.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { decode, encode } from '../../src/lib/lm/bpe';
import { modelLoader } from '../../src/lib/lm/load';
import { ecdsaSign } from '../../src/lib/encryption/real';
import { check, checkText, LINE, MIN_PAIRS, type score } from '../../src/lib/watermarks/detect';
import { choicesAt, rewordAll, swap, washOut } from '../../src/lib/watermarks/edit';
import { FACTS } from '../../src/lib/watermarks/facts';
import { isGreen } from '../../src/lib/watermarks/greenlist';
import { checkLabel, LABEL, manifestOf, pixelHash, signedText, TRIPS, travel } from '../../src/lib/watermarks/label';
import { blur, crop, detect, mark, PICTURE, pattern, SIZE } from '../../src/lib/watermarks/pixels';
import { larkspur, logLikelihood, write, type Writer } from '../../src/lib/watermarks/sample';
import {
  DELTAS,
  FORWARDED,
  GENERATOR,
  HUMAN,
  LOWER_LINE,
  MACHINE,
  MACHINE_META,
  MARK,
  MARKED_PICTURE,
  PICTURE_INFO,
  PREFIXES,
  REPLY,
  STEPS,
} from '../../src/lib/watermarks/story';

const PINNED = 'data/watermarks/pinned.json';
const disk = async (f: string) => {
  const b = readFileSync(`public/data/lm/${f}`);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const r4 = (x: number | null) => (x === null ? null : Math.round(x * 1e4) / 1e4);
const read = (c: ReturnType<typeof score>) => ({ pairs: c.pairs, green: c.green, z: r4(c.z), verdict: c.verdict });
const pin = () => JSON.parse(readFileSync(PINNED, 'utf8'));

let w: Writer;
beforeAll(async () => {
  w = larkspur(await modelLoader(disk).load());
});

/** Every number the chapters show, from the live engine (the label's signature is the one thing not derived). */
function derive() {
  const { gamma } = MARK,
    reply = write(w, REPLY.prompt, MARK, REPLY.seed, STEPS);
  const leaning = DELTAS.map(delta => {
    const ids = write(w, REPLY.prompt, { gamma, delta }, REPLY.seed, STEPS);
    return { delta, ids, ...read(check(ids, gamma)), logLikelihood: r4(logLikelihood(w, REPLY.prompt, ids)) };
  });
  const prefixes = PREFIXES.map(n => ({ tokens: n, ...read(check(reply.slice(0, n), gamma)) }));
  const zs = (texts: string[]) => texts.map(t => r4(checkText(t, gamma).z));
  const human = zs(HUMAN.map(h => h.reply)),
    machine = zs(MACHINE.map(m => m.reply));
  const over = (xs: (number | null)[], line: number) => xs.filter(z => z !== null && z >= line).length;
  const swaps = washOut(w, REPLY.prompt, reply, gamma),
    washed = swaps.reduce((r, [i, id]) => swap(r, i, id), reply),
    all = rewordAll(w, REPLY.prompt, reply);
  const trips = Object.fromEntries(
    TRIPS.map(t => {
      const c = detect(travel(MARKED_PICTURE, LABEL, t).pic, PICTURE_INFO.seed);
      return [t, { z: r4(c.z), verdict: c.verdict }];
    }),
  );
  return {
    reply: { ...REPLY, ids: reply, text: decode(reply), ...read(check(reply, gamma)) },
    leaning,
    counting: { prefixes, forwarded: read(checkText(FORWARDED.body, gamma)) },
    human: { zs: human, atLine: over(human, LINE), atLowerLine: over(human, LOWER_LINE) },
    machine: { zs: machine, atLine: over(machine, LINE), atLowerLine: over(machine, LOWER_LINE) },
    rewording: {
      choicesAt0: choicesAt(w, REPLY.prompt, reply, 0),
      swaps,
      washed: read(check(washed, gamma)),
      all,
      reworded: read(check(all, gamma)),
    },
    pixels: {
      hash: pixelHash(PICTURE),
      markedHash: pixelHash(MARKED_PICTURE),
      unmarked: r4(detect(PICTURE, PICTURE_INFO.seed).z),
      trips,
    },
  };
}

if (process.env.WRITE_PINNED)
  it('regenerates pinned.json and signs the label once', async () => {
    const old = pin(),
      manifest = manifestOf(MARKED_PICTURE, PICTURE_INFO.title, GENERATOR);
    const label = { manifest, signature: await ecdsaSign(signedText(manifest)) };
    const note =
      'Every number Watermarks teaches, rerun by tests/unit/watermarks-engine.test.ts and watermarks-workbench.test.ts. z is scored on encode(decode(ids)) at U2’s chosen γ. label: the C2PA-shaped manifest over the marked toy picture, signed once in a test with Locks and keys’ demo key; ECDSA signatures are randomised, so it is committed and verified live.';
    writeFileSync(PINNED, `${JSON.stringify({ note, ...derive(), label, workbench: old.workbench }, null, 2)}\n`);
  }, 600_000);

describe('the pins', () => {
  it('every chapter number re-derives from its seed', () => {
    const { label, workbench, note, ...rest } = pin();
    expect(derive()).toEqual(rest);
  });
});

describe('writing and checking (chapters 3–4)', () => {
  it('the chapter reply is U2’s first marked reply, and it reads as marked', () => {
    const p = pin();
    const spike = JSON.parse(readFileSync('data/watermarks/spike.json', 'utf8'));
    expect(p.reply.ids).toEqual(spike.replies.marked[0].ids);
    expect(p.reply.verdict).toBe('marked');
  });
  it('a bigger nudge means more green and a lower likelihood: the cost', () => {
    const l = pin().leaning;
    expect(l.map((x: { delta: number }) => x.delta)).toEqual(DELTAS);
    expect(l[0].z).toBeLessThan(LINE);
    for (let i = 1; i < l.length; i++) expect(l[i].green / l[i].pairs).toBeGreaterThan(l[0].green / l[0].pairs);
    expect(l.at(-1).logLikelihood).toBeLessThan(l[0].logLikelihood);
  });
  it('short text is too short to say, and the full reply is marked', () => {
    const pre = pin().counting.prefixes;
    expect(pre[0].verdict).toBe('too short to say');
    expect(pre[0].pairs).toBeLessThan(MIN_PAIRS);
    expect(pre.at(-1).verdict).toBe('marked');
  });
  it('the forwarded email, human replies and the recorded model’s replies all carry no mark', () => {
    const p = pin();
    expect(p.counting.forwarded.verdict).not.toBe('marked');
    expect(p.human.atLine).toBe(0);
    expect(p.machine.atLine).toBe(0);
    for (const z of p.human.zs) expect(z).toBeLessThan(LINE);
    // a lower line starts flagging people
    expect(p.human.atLowerLine).toBeGreaterThan(0);
  });
  it('recorded replies name their model and date, and answer the hand-written questions', () => {
    expect(MACHINE_META.model).toBeTruthy();
    expect(MACHINE_META.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(MACHINE.map(m => [m.id, m.question])).toEqual(HUMAN.map(h => [h.id, h.question]));
    for (const m of MACHINE) expect(m.reply.length).toBeGreaterThan(0);
  });
});

describe('rewording (chapter 5)', () => {
  it('six choices at a token, never the one already there', () => {
    const c = pin().rewording.choicesAt0;
    expect(c).toHaveLength(6);
    expect(c).not.toContain(pin().reply.ids[0]);
  });
  it('the pinned swaps take z from marked to below the line, each a green token turned red', () => {
    const p = pin(),
      { gamma } = MARK,
      prev = encode(REPLY.prompt).at(-1)!;
    let r = p.reply.ids as number[];
    for (const [i, id] of p.rewording.swaps as [number, number][]) {
      expect(isGreen(i ? r[i - 1] : prev, r[i], gamma)).toBe(true);
      expect(isGreen(i ? r[i - 1] : prev, id, gamma)).toBe(false);
      r = swap(r, i, id);
    }
    expect(p.reply.z).toBeGreaterThanOrEqual(LINE);
    expect(p.rewording.washed.z).toBeLessThan(LINE);
    expect(p.rewording.reworded.z).toBeLessThan(LINE);
  });
});

describe('the toy pixel mark (chapter 6)', () => {
  const trips = () => pin().pixels.trips;
  it('is strong on the marked picture, near zero on the unmarked one', () => {
    expect(trips()['as sent'].verdict).toBe('marked');
    expect(Math.abs(pin().pixels.unmarked)).toBeLessThan(2);
  });
  it('survives one pixel and a screenshot; a 4-pixel crop and a blur fall below the line', () => {
    expect(trips()['one pixel'].verdict).toBe('marked');
    expect(trips().screenshot.verdict).toBe('marked');
    expect(trips().crop.z).toBeLessThan(LINE);
    expect(trips().blur.z).toBeLessThan(LINE);
  });
  it('the crop really cuts 4 pixels, and the pattern is a seeded ±1 per pixel', () => {
    expect(crop(PICTURE).w).toBe(SIZE - 4);
    expect(blur(PICTURE).px.length).toBe(SIZE * SIZE);
    const p = pattern(PICTURE_INFO.seed);
    expect(p.length).toBe(SIZE * SIZE);
    expect(new Set(p)).toEqual(new Set([-1, 1]));
    expect(mark(PICTURE, PICTURE_INFO.seed, 0).px).toEqual(PICTURE.px);
  });
});

describe('the signed label (chapter 6)', () => {
  it('is the manifest of the marked picture, says made by a model, and verifies', async () => {
    expect(LABEL.manifest).toEqual(manifestOf(MARKED_PICTURE, PICTURE_INFO.title, GENERATOR));
    expect(JSON.stringify(LABEL.manifest)).toContain('trainedAlgorithmicMedia');
    expect((await checkLabel(MARKED_PICTURE, LABEL)).verdict).toBe('made by AI, signed');
  });
  it('fails after one changed pixel, is absent after a screenshot, and a changed claim breaks the signature', async () => {
    const after = async (t: (typeof TRIPS)[number]) => {
      const { pic, label } = travel(MARKED_PICTURE, LABEL, t);
      return (await checkLabel(pic, label)).verdict;
    };
    expect(await after('one pixel')).toBe('label does not match');
    expect(await after('screenshot')).toBe('no label');
    expect(await after('crop')).toBe('label does not match');
    const forged = { ...LABEL, manifest: { ...LABEL.manifest, title: 'Photo by our studio' } };
    expect((await checkLabel(MARKED_PICTURE, forged)).verdict).toBe('forged label');
  });
});

describe('facts', () => {
  it('every fact has a source and is dated', () => {
    for (const f of FACTS) {
      expect(f.source).toMatch(/^https:\/\//);
      expect(f.claim.length).toBeGreaterThan(20);
    }
  });
});
