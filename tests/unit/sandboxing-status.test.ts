import { describe, expect, it } from 'vitest';
import { run } from '../../src/lib/sandboxing/loop';
import { RECORDING } from '../../src/lib/sandboxing/turns';
import { status } from '../../src/content/sandboxing/06-fewer-prompts';

const exfil = (approval: 'off' | 'approve' | 'deny') => run(RECORDING, { case: 'exfil', sandbox: true, files: 'scoped', egress: 'allowlist', secret: 'env', approval });

describe('chapter 6 status line', () => {
  it('says nobody was asked when approval is off', () => {
    const s = status(exfil('off') as never, 'exfil');
    expect(s).toContain('nobody was asked');
    expect(s).not.toContain('person refused');
  });
  it('says the person refused only when a person was asked', () => {
    expect(status(exfil('deny') as never, 'exfil')).toContain('person refused');
  });
});
