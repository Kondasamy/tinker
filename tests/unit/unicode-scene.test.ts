// The telegraph office (KTD8): one row of holes per byte, a hole per 1 bit, at most MAX_ROWS rows plus a count pill,
// the reader's plate following its table, and the typed text drawn only through esc().
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  MAX_ROWS,
  TAPE_BOARD,
  TAPE_PARTS,
  clip,
  tapeLabel,
  tapeScene,
  type TapeOpts,
} from '../../src/components/scenes/tapeScene';
import { tapeOf } from '../../src/content/unicode/kit';
import { bytesOf } from '../../src/lib/unicode/bytes';
import { CUSTOMER, MOJI } from '../../src/lib/unicode/story';

const draw = (o: TapeOpts) =>
  renderToString(createElement(IsoStage, { board: TAPE_BOARD, scene: tapeScene(o), label: tapeLabel(o) }));
const rows = (svg: string) => [...svg.matchAll(/data-row="(\d+)" data-byte="(\d+)"/g)].map(m => Number(m[2]));

describe('the tape', () => {
  it('punches one row per UTF-8 byte, with the byte’s bits as holes', () => {
    const svg = draw(tapeOf(CUSTOMER, 'utf-8'));
    expect(rows(svg)).toEqual([...bytesOf(CUSTOMER)]);
    // each row: its 1 bits as big holes, plus one sprocket hole
    const row = svg.match(/<g data-row="3"[^>]*>(.*?)<\/g>/)![1];
    const ones = [...bytesOf(CUSTOMER)][3].toString(2).replace(/0/g, '').length;
    expect(row.match(/<path/g)!.length).toBeGreaterThanOrEqual(ones + 1);
  });
  it('draws at most 24 bytes plus a count pill, whatever the length typed', () => {
    const long = 'Ж'.repeat(40);
    const svg = draw(tapeOf(long, 'utf-8'));
    expect(MAX_ROWS).toBe(24);
    expect(rows(svg)).toHaveLength(MAX_ROWS);
    expect(svg).toContain(`+${80 - MAX_ROWS} BYTES`);
    expect(draw(tapeOf('Zoe', 'utf-8'))).not.toContain('BYTES');
  });
  it('renders untrusted text as text only', () => {
    const svg = draw(tapeOf('<img src=x onerror=alert(1)>', 'utf-8'));
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;img');
  });
  it('the reader’s plate and pill follow its table; the label shows what comes back', () => {
    const wrong = draw(tapeOf(CUSTOMER, 'windows-1252'));
    expect(wrong).toContain('data-part="reader" data-right="0"');
    expect(wrong).toContain('LATIN-1');
    expect(wrong).toContain(MOJI);
    expect(draw(tapeOf(CUSTOMER, 'utf-8'))).toContain('data-part="reader" data-right="1"');
  });
  it('lights the key caps of the last byte’s 1 bits', () => {
    const svg = draw(tapeOf('A', 'utf-8')); // 0x41: bits 1 and 7
    expect([...svg.matchAll(/data-key="(\d)" data-on="1"/g)].map(m => Number(m[1]))).toEqual([1, 7]);
  });
  it('draws a callout on every part it exports, and a fresh row drops in', () => {
    for (const part of TAPE_PARTS)
      expect(draw({ ...tapeOf(CUSTOMER, 'utf-8'), say: { block: part, text: 'Here' } }), part).toContain(
        'class="callout"',
      );
    expect(draw({ ...tapeOf(CUSTOMER, 'utf-8'), fresh: 2 }).match(/class="tp-new"/g)).toHaveLength(2);
  });
  it('clips long pill text by code points, never through a character', () => {
    expect(clip('🙂'.repeat(20), 5)).toBe('🙂🙂🙂🙂…');
    expect(clip('Zoë')).toBe('Zoë');
  });
});
