import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  SANDBOX_BOARD,
  SANDBOX_PARTS,
  sandboxLabel,
  sandboxScene,
  sandboxState,
  type SandboxOpts,
} from '../../src/components/scenes/sandboxScene';
import { sandboxMessages } from '../../src/components/scenes/sandboxSequence';
import { combos, DOMAINS, run, WORKBENCH_DOMAINS, type Run, type Setup } from '../../src/lib/sandboxing/loop';
import { sandboxProps } from '../../src/content/sandboxing/kit';
import { RECORDING } from '../../src/lib/sandboxing/turns';

const go = (s: Partial<Setup> & { case: string }) => run(RECORDING, s);
const draw = (o: SandboxOpts) =>
  renderToString(createElement(IsoStage, { board: SANDBOX_BOARD, scene: sandboxScene(o), label: sandboxLabel(o) }));
const upTo = (r: Run, f: (s: Run['steps'][number]) => boolean) => r.steps.findIndex(f) + 1;

const REPORT = go({ case: 'report', sandbox: true, files: 'scoped', egress: 'allowlist', secret: 'proxy' });
const EXFIL_BLOCKED = go({ case: 'exfil', sandbox: true, files: 'scoped', egress: 'allowlist', secret: 'env' });
const PEEK_DENIED = go({ case: 'peek', sandbox: true, files: 'scoped', egress: 'allowlist', secret: 'proxy' });

describe('the glass room doors (KTD16)', () => {
  it('the wall is drawn only when the sandbox is on', () => {
    expect(draw({ run: REPORT, wall: true })).toContain('data-prop="wall"');
    expect(draw({ run: REPORT, wall: false })).not.toContain('data-prop="wall"');
  });
  it('the file door shows the mounted filesystem', () => {
    for (const files of ['open', 'scoped', 'nodata'] as const)
      expect(draw({ run: REPORT, wall: true, files }), files).toContain(`data-prop="file-door" data-mode="${files}"`);
  });
  it('the network door shows the egress setting', () => {
    for (const egress of ['off', 'allowlist', 'open'] as const)
      expect(draw({ run: REPORT, wall: true, egress }), egress).toContain(
        `data-prop="net-door" data-egress="${egress}"`,
      );
  });
  it('the proxy and the safe move with the secret setting', () => {
    const proxied = draw({ run: REPORT, wall: true, proxy: true });
    expect(proxied).toContain('data-prop="proxy"');
    expect(proxied).toContain('data-prop="safe" data-where="proxy"');
    const inEnv = draw({ run: REPORT, wall: true, proxy: false });
    expect(inEnv).not.toContain('data-prop="proxy"');
    expect(inEnv).toContain('data-prop="safe" data-where="env"');
  });
});

describe('blocked calls (KTD16)', () => {
  it('a fetch the network stopped is drawn at the network door, stamped REFUSED', () => {
    const n = upTo(EXFIL_BLOCKED, s => s.kind === 'blocked');
    expect(sandboxState({ run: EXFIL_BLOCKED, upTo: n }).where).toBe('net-blocked');
    const svg = draw({ run: EXFIL_BLOCKED, upTo: n, wall: true, egress: 'allowlist' });
    expect(svg).toContain('data-env="net-blocked"');
    expect(svg).toContain('REFUSED');
  });
  it('a read the filesystem denied is drawn at the file door', () => {
    const n = upTo(PEEK_DENIED, s => s.kind === 'blocked');
    expect(sandboxState({ run: PEEK_DENIED, upTo: n }).where).toBe('file-blocked');
    expect(draw({ run: PEEK_DENIED, upTo: n, wall: true, files: 'scoped' })).toContain('data-env="file-blocked"');
  });
  it('the lanes stamp a blocked call REFUSED, reusing Guardrails’ stamp (no new stamp)', () => {
    const msgs = sandboxMessages(EXFIL_BLOCKED);
    expect(msgs.some(m => m.stamp === 'REFUSED')).toBe(true);
  });
});

// every pill's rect in the emitted SVG (tag() draws one rect per pill), as [x0, y0, x1, y1]
const pillBoxes = (svg: string) =>
  [...svg.matchAll(/<g class="tag[^"]*">.*?<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(
    ([, x, y, w, h]) => [+x, +y, +x + +w, +y + +h],
  );
const overlaps = (a: number[], b: number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

describe('the glass room’s pills', () => {
  it('no two pills overlap, at any step of any chapter’s setup, on desktop and phone', () => {
    const setups = [...Object.values(DOMAINS), WORKBENCH_DOMAINS].flatMap(d =>
      combos({ ...d, approval: d.approval ?? ['off'] }),
    );
    const seen = new Set<string>();
    let checked = 0;
    for (const s of setups) {
      // setups that draw the same doors over the same messages draw the same picture
      const r = run(RECORDING, s as Setup),
        key = JSON.stringify([sandboxProps(s), sandboxMessages(r)]);
      if (seen.has(key)) continue;
      seen.add(key);
      for (let n = 1; n <= r.steps.length; n++)
        for (const scale of [1, 1.8]) {
          const boxes = pillBoxes(draw({ ...sandboxProps(s), run: r, upTo: n, scale }));
          for (let i = 0; i < boxes.length; i++)
            for (let j = i + 1; j < boxes.length; j++)
              expect(
                overlaps(boxes[i], boxes[j]),
                `${JSON.stringify(s)} step ${n} scale ${scale}: pills ${i} and ${j}`,
              ).toBe(false);
          checked++;
        }
    }
    expect(checked).toBeGreaterThan(50);
  }, 90_000);
});

describe('glass room callouts', () => {
  const callouts = (svg: string) => svg.split('<g class="callout"').length - 1;
  const full = (_: string): SandboxOpts => ({ run: REPORT, wall: true, proxy: true, schema: true });
  it('a callout over each part draws one lit pill with its words', () => {
    for (const block of SANDBOX_PARTS) {
      const svg = draw({ ...full(block), say: { block, text: 'LOOK HERE' } });
      expect(callouts(svg), block).toBe(1);
      expect(svg.slice(svg.indexOf('<g class="callout"'))).toContain('LOOK HERE');
    }
  });
  it('an unknown part draws no callout, and the picture is as without one', () => {
    const svg = draw({ ...full('model'), say: { block: 'nowhere', text: 'LOOK HERE' } });
    expect(callouts(svg)).toBe(0);
    expect(svg).toBe(draw(full('model')));
  });
  it('phones drop a callout over 16 characters and keep one of 16', () => {
    const phone = (text: string) => callouts(draw({ ...full('model'), scale: 1.8, say: { block: 'model', text } }));
    expect(phone('A'.repeat(17))).toBe(0);
    expect(phone('A'.repeat(16))).toBe(1);
  });
});
