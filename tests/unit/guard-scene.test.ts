import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import { flatScene } from '../../src/lib/iso/flat';
import {
  GUARD_BOARD,
  guardLabel,
  guardScene,
  guardState,
  type GuardOpts,
} from '../../src/components/scenes/guardScene';
import { guardLanes, guardMessages } from '../../src/components/scenes/guardSequence';
import { guardProps } from '../../src/content/guardrails/kit';
import { run, type Run, type Setup } from '../../src/lib/guardrails/loop';
import { RECORDING } from '../../src/lib/guardrails/turns';

const go = (s: Partial<Setup> & { case: string }) => run(RECORDING, s);
const draw = (o: GuardOpts) =>
  renderToString(createElement(IsoStage, { board: GUARD_BOARD, scene: guardScene(o), label: guardLabel(o) }));
/** steps up to and including the first step matching */
const upTo = (r: Run, f: (s: Run['steps'][number]) => boolean) => r.steps.findIndex(f) + 1;
const isRead = (s: Run['steps'][number]) => s.kind === 'result' && s.call.name === 'read_inbox';

const PLAIN = go({ case: 'invoice' });
const HELD = go({ case: 'invoice', threshold: 0.5 });
const BLOCKED = go({ case: 'invoice', allow: true });
const TAINT = go({ case: 'invoice', taint: true });

describe('the screening arch', () => {
  it('a quarantined email is drawn held at the arch, not riding the belt', () => {
    expect(HELD.mail).toBe('quarantined');
    for (const n of [1, HELD.steps.length]) {
      const svg = draw({ run: HELD, upTo: n, screen: true });
      expect(svg).toContain('data-env="held"');
      expect(svg).not.toContain('data-env="from-mail"');
      expect(svg).toContain('data-lamp="bad"');
    }
  });
  it('an email the checks let through rides past the arch, lamp green', () => {
    const svg = draw({ run: PLAIN, upTo: upTo(PLAIN, isRead), screen: true });
    expect(svg).toContain('data-env="from-mail"');
    expect(svg).toContain('data-lamp="ok"');
  });
});

describe('the allow-list barrier', () => {
  it('a blocked send is drawn stopped at the barrier, arm down', () => {
    const n = upTo(BLOCKED, s => s.kind === 'blocked');
    expect(n).toBeGreaterThan(0);
    expect(guardState({ run: BLOCKED, upTo: n }).where).toBe('blocked');
    const svg = draw({ run: BLOCKED, upTo: n, allow: true });
    expect(svg).toContain('data-env="blocked"');
    expect(svg).toContain('data-prop="barrier" data-up="0"');
    expect(svg).toContain('ALLOW-LIST · BLOCKED');
  });
  it('without the allow-list the send goes down the chute', () => {
    expect(draw({ run: PLAIN, upTo: upTo(PLAIN, s => s.kind === 'call' && s.call.name === 'send_email') })).toContain(
      'data-env="out"',
    );
  });
});

describe('the taint tag', () => {
  it('appears only on envelopes from read_inbox', () => {
    PLAIN.steps.forEach((s, i) => {
      const svg = draw({ run: PLAIN, upTo: i + 1 }),
        tagged = (svg.match(/class="taint"/g) ?? []).length;
      expect(tagged, `step ${i + 1}: ${s.kind}`).toBe(isRead(s) ? 1 : 0);
    });
  });
});

describe('the taint rule and the trifecta', () => {
  it('the chute shuts once untrusted text is read, and the model loses send_email', () => {
    expect(guardState({ run: TAINT, upTo: 1, taint: true }).chute).toBe('open');
    const after = guardState({ run: TAINT, taint: true });
    expect(after.chute).toBe('closed');
    expect(after.tools).toBe(guardState({ run: TAINT, upTo: 1, taint: true }).tools - 1);
  });
  it('a removed leg is drawn removed', () => {
    expect(draw({ run: go({ case: 'invoice', remove: 'out' }), legs: true, remove: 'out' })).toContain(
      'data-prop="chute" data-state="removed"',
    );
    expect(draw({ run: go({ case: 'invoice', remove: 'private' }), legs: true, remove: 'private' })).toContain(
      'data-prop="records" data-removed="1"',
    );
    expect(draw({ run: go({ case: 'invoice', remove: 'untrusted' }), legs: true, remove: 'untrusted' })).toContain(
      'data-lid="1"',
    );
  });
  it('guardProps maps a setup to the props it turns on', () => {
    expect(guardProps({ threshold: 0.5, allow: true })).toEqual({
      screen: true,
      allow: true,
      taint: false,
      remove: 'none',
      legs: false,
    });
    expect(guardProps({ inputPolicy: true, taint: true }, true)).toMatchObject({
      screen: true,
      taint: true,
      legs: true,
    });
    expect(guardProps({}).screen).toBe(false);
  });
});

describe('untrusted strings', () => {
  it('an email body containing <img src=x onerror=...> renders escaped in both drawings', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const r: Run = {
      ...PLAIN,
      steps: PLAIN.steps.map(s =>
        s.kind === 'result'
          ? { ...s, result: { ...s.result, content: [{ type: 'text', text: evil }] } }
          : s.kind === 'proposal' || s.kind === 'call'
            ? { ...s, call: { ...s.call, arguments: { ...s.call.arguments, body: evil } } }
            : s.kind === 'answer'
              ? { ...s, text: evil }
              : s,
      ),
    };
    const o: GuardOpts = { run: r, host: evil, screen: true, allow: true, taint: true, legs: true };
    const svgs = [
      ...r.steps.map((_, i) => draw({ ...o, upTo: i + 1 })),
      draw({ ...o, scale: 1.8 }),
      flatScene(guardLanes(evil), guardMessages(r)).svg,
      flatScene(guardLanes(), guardMessages(r), { phone: true }).svg,
    ];
    for (const svg of svgs) expect(svg).not.toContain('<img');
    expect(guardMessages(r).some(m => m.text.includes(evil))).toBe(true);
  });
});

describe('the Steps lanes', () => {
  it('one mark per run step, in order, on known lanes', () => {
    const lanes = guardLanes();
    for (const r of [
      PLAIN,
      HELD,
      BLOCKED,
      TAINT,
      go({ case: 'link', filter: true }),
      go({ case: 'invoice', approval: 'deny' }),
      go({ case: 'discount', outputPolicy: 'on' }),
    ]) {
      const msgs = guardMessages(r);
      expect(msgs).toHaveLength(r.steps.length);
      for (const m of msgs) expect(lanes.map(l => l.id)).toEqual(expect.arrayContaining([m.from, m.to]));
      const marks = [...flatScene(lanes, msgs, { win: Infinity }).svg.matchAll(/data-msg="(\d+)"/g)].map(x => +x[1]);
      expect(marks).toEqual(r.steps.map((_, i) => i));
    }
  });
});
