import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { SANDBOX_BOARD, sandboxLabel, sandboxScene, sandboxState, type SandboxOpts } from '../../src/components/scenes/sandboxScene';
import { sandboxMessages } from '../../src/components/scenes/sandboxSequence';
import { run, type Run, type Setup } from '../../src/lib/sandboxing/loop';
import { RECORDING } from '../../src/lib/sandboxing/turns';

const go = (s: Partial<Setup> & { case: string }) => run(RECORDING, s);
const draw = (o: SandboxOpts) => renderToString(createElement(IsoStage, { board: SANDBOX_BOARD, scene: sandboxScene(o), label: sandboxLabel(o) }));
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
      expect(draw({ run: REPORT, wall: true, egress }), egress).toContain(`data-prop="net-door" data-egress="${egress}"`);
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
