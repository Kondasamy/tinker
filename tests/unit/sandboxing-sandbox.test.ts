import { describe, expect, it } from 'vitest';
import { exec, SECRET, type Policy } from '../../src/lib/sandboxing/sandbox';
import { policyOf, run, metrics, type Setup } from '../../src/lib/sandboxing/loop';
import { WINNERS, isWinner } from '../../src/lib/sandboxing/workbench';
import { RECORDING } from '../../src/lib/sandboxing/turns';

const scoped = (over: Partial<Setup> = {}): Policy =>
  policyOf({
    case: 'x',
    sandbox: true,
    files: 'scoped',
    egress: 'allowlist',
    secret: 'proxy',
    approval: 'off',
    ...over,
  });

describe('the modelled sandbox (KTD9)', () => {
  it('a read of a hidden path is denied', () => {
    expect(exec(scoped(), { tool: 'read_file', path: '/keys/id_rsa' }).outcome).toBe('denied');
  });
  it('a write to a read-only mount is denied, a write to a writable mount is ok', () => {
    expect(exec(scoped(), { tool: 'write_file', path: '/etc/cron.d/jobs', body: 'x' }).outcome).toBe('denied');
    expect(exec(scoped(), { tool: 'write_file', path: '/work/report.txt', body: 'x' }).outcome).toBe('ok');
  });
  it('a fetch with egress off is blocked; an allow-listed host is ok; a non-listed host is blocked', () => {
    expect(exec(scoped({ egress: 'off' }), { tool: 'fetch', host: 'api.larkspur.co', body: '' }).outcome).toBe(
      'blocked',
    );
    expect(exec(scoped(), { tool: 'fetch', host: 'api.larkspur.co', body: '' }).outcome).toBe('ok');
    expect(exec(scoped(), { tool: 'fetch', host: 'attacker.example', body: '' }).outcome).toBe('blocked');
  });
  it('a proxy-held secret never appears in any result the agent sees', () => {
    const r = exec(scoped({ secret: 'proxy' }), { tool: 'read_file', path: '/secret/token' });
    expect(r.outcome).toBe('denied');
    // and when the proxy injects on an allowed request, the agent's body never held the real secret
    const sent = exec(scoped({ secret: 'proxy' }), { tool: 'fetch', host: 'api.larkspur.co', body: 'GET /prices' });
    expect(sent.left?.body).not.toContain(SECRET);
    // with the secret in the env the agent can read it
    expect(exec(scoped({ secret: 'env' }), { tool: 'read_file', path: '/secret/token' }).read).toBe(SECRET);
  });
  it('on the host nothing is enforced', () => {
    const host = policyOf({
      case: 'x',
      sandbox: false,
      files: 'scoped',
      egress: 'off',
      secret: 'proxy',
      approval: 'off',
    });
    expect(exec(host, { tool: 'read_file', path: '/keys/id_rsa' }).outcome).toBe('ok');
    expect(exec(host, { tool: 'fetch', host: 'attacker.example', body: '' }).outcome).toBe('ok');
  });
});

describe('metrics and the lesson (KTD9)', () => {
  it('the empty policy (host) lets every attack succeed', () => {
    const m = metrics({ sandbox: false });
    expect(m.asr).toBe(1);
  });
  it('the allow-list alone does not stop chapter 5’s allowed-door attack', () => {
    const beacon = run(RECORDING, {
      case: 'beacon',
      sandbox: true,
      files: 'scoped',
      egress: 'allowlist',
      secret: 'proxy',
    });
    expect(beacon.attackMet).toBe(true);
    // removing the data leg stops it
    const cut = run(RECORDING, {
      case: 'beacon',
      sandbox: true,
      files: 'nodata',
      egress: 'allowlist',
      secret: 'proxy',
    });
    expect(cut.attackMet).toBe(false);
  });
  it('approving a boundary crossing undermines the sandbox (chapter 6)', () => {
    const safe = run(RECORDING, {
      case: 'exfil',
      sandbox: true,
      files: 'scoped',
      egress: 'allowlist',
      secret: 'env',
      approval: 'off',
    });
    const approved = run(RECORDING, {
      case: 'exfil',
      sandbox: true,
      files: 'scoped',
      egress: 'allowlist',
      secret: 'env',
      approval: 'approve',
    });
    expect(safe.attackMet).toBe(false);
    expect(approved.attackMet).toBe(true);
  });
});

describe('chapter 7 winners', () => {
  it('WINNERS is non-empty and every member stops every attack at the fewest false blocks', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    const blocks = WINNERS.map(w => metrics(w).blocked);
    for (const w of WINNERS) {
      const m = metrics(w);
      expect(m.succeeded).toBe(0);
      expect(m.blocked).toBe(blocks[0]);
    }
    expect(isWinner({ sandbox: true, files: 'nodata', egress: 'allowlist', secret: 'proxy', approval: 'off' })).toBe(
      true,
    );
  });
});
