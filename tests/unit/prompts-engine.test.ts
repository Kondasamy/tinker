// Writing a prompt's engine (KTD4, KTD9, KTD13): the docket, signatures, live grades, the simulator's rules, and every
// pinned effect and the workbench's WINNERS recomputed. WRITE_PINNED=1 rewrites data/prompts/pinned.json.
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pinned from '../../data/prompts/pinned.json' with { type: 'json' };
import {
  assemble,
  blocked,
  CHAPTERS,
  canMoveRules,
  clip,
  combos,
  DOMAINS,
  moveRules,
  partsOf,
  signature,
  START,
  unclip,
  unclipBlocked,
} from '../../src/lib/prompts/assemble';
import { CARDS, type Docket, type Setup, TICKETS } from '../../src/lib/prompts/cards';
import { fact } from '../../src/lib/prompts/facts';
import { gradeReply, passes } from '../../src/lib/prompts/grade';
import { RULES, simulateReply } from '../../src/lib/prompts/simulate';
import { continueText, MINI_PROMPTS, NORECORD, replyOf, SIMULATED } from '../../src/lib/prompts/story';
import { measure, PLANS, RESULTS, solve, START as BENCH_START, WINNERS, wins } from '../../src/lib/prompts/workbench';
import { diskModel } from '../../src/lib/transformers/diskModel';

const setup = (d: Partial<Setup> = {}): Setup => ({
  role: true,
  task: 'clear',
  examples: 0,
  format: 'none',
  rules: 'none',
  ticket: 'outage',
  model: 'main',
  ...d,
});

// ---- what pinned.json holds, recomputed ----
const continuations = () => MINI_PROMPTS.map(prompt => ({ prompt, text: continueText(diskModel(), prompt) }));
/** Each recorded chapter's grades over its whole domain, as the chapter shows them. */
function effects() {
  return Object.fromEntries(
    Object.keys(DOMAINS)
      .filter(ch => ch !== '07-workbench')
      .map(ch => [
        ch,
        combos(DOMAINS[ch]).map(s => {
          const r = replyOf(ch, s);
          if (r === NORECORD) throw new Error(`${ch} ${signature(s)}`);
          const { text: _, ...g } = gradeReply(s, r.text);
          return { sig: signature(s), source: r.source, ...g };
        }),
      ]),
  );
}
const workbench = () => {
  const results = PLANS.map(measure);
  return { results, winners: solve(results) };
};

if (process.env.WRITE_PINNED)
  writeFileSync(
    'data/prompts/pinned.json',
    `${JSON.stringify(
      {
        simulated: pinned.simulated,
        simulatedOn: pinned.simulatedOn,
        continuations: continuations(),
        effects: effects(),
        workbench: workbench(),
      },
      null,
      2,
    )}\n`,
  );

const row = (ch: string, s: Partial<Setup>) =>
  (
    pinned.effects as Record<
      string,
      { sig: string; facts: boolean; quirk: boolean; signed: boolean; format: boolean | null; rule: boolean | null }[]
    >
  )[ch].find(r => r.sig === signature(setup(s)))!;

describe('the docket', () => {
  it('has seven chapters, and a domain for every recorded one', () => {
    expect(CHAPTERS).toHaveLength(7);
    expect(Object.keys(DOMAINS)).toEqual(CHAPTERS.slice(1));
    for (const ch of CHAPTERS.slice(1)) expect(Object.keys(START)).toContain(ch);
  });
  it('the rules card first and last give different signatures and orders', () => {
    expect(signature(setup({ rules: 'first' }))).not.toBe(signature(setup({ rules: 'last' })));
    expect(partsOf(setup({ rules: 'first' }))[0].slot).toBe('rules');
    expect(partsOf(setup({ rules: 'last' })).at(-1)!.slot).toBe('rules');
  });
  it('the same slots give the same signature whatever the clip history', () => {
    const ch = '07-workbench';
    let a = START[ch];
    for (const c of ['json', 'clear', 'two-examples', 'one-example']) a = clip(ch, a, c);
    let b = START[ch];
    for (const c of ['one-example', 'clear', 'json']) b = clip(ch, b, c);
    expect(signature({ ...a, ticket: 'outage', model: 'main' })).toBe(
      signature({ ...b, ticket: 'outage', model: 'main' }),
    );
  });
  it('a card whose slot the chapter does not open cannot be clipped, and says why', () => {
    const ch = '02-say-what-you-want',
      d = START[ch];
    expect(blocked(ch, 'json')).toBe('Opens in chapter 4.');
    expect(clip(ch, d, 'json')).toEqual(d);
    expect(blocked(ch, 'rules')).toBe('Opens in chapter 5.');
    expect(blocked('07-workbench', 'list')).toBe('Not used in this chapter.');
    expect(blocked(ch, 'clear')).toBeNull();
    expect(clip(ch, d, 'clear').task).toBe('clear');
  });
  it('the task never unclips; a chapter that keeps a slot clipped keeps it', () => {
    expect(unclipBlocked('03-show-dont-tell', 'task')).not.toBeNull();
    expect(unclip('07-workbench', START['07-workbench'], 'rules')).toEqual(START['07-workbench']);
    expect(unclip('03-show-dont-tell', { ...START['03-show-dont-tell'], examples: 2 }, 'examples').examples).toBe(0);
  });
  it('only chapters that open both places move the rules card', () => {
    expect(canMoveRules('05-order-and-emphasis')).toBe(true);
    expect(canMoveRules('06-test-it-like-code')).toBe(false);
    expect(moveRules('05-order-and-emphasis', START['05-order-and-emphasis']).rules).toBe('last');
  });
  it('every chapter starts on a docket its domain reaches, and every card names a real slot', () => {
    for (const [ch, d] of Object.entries(START))
      for (const [k, v] of Object.entries(d))
        expect((DOMAINS[ch] as Record<string, unknown[]>)[k], `${ch} ${k}`).toContain(v);
    for (const c of CARDS) expect(['role', 'task', 'examples', 'format', 'rules']).toContain(c.slot);
  });
  it('the prompt carries the ticket and, for a clear task, its policy line', () => {
    const t = TICKETS[0];
    expect(assemble(setup({ ticket: t.id }))).toContain(t.note);
    expect(assemble(setup({ ticket: t.id, task: 'vague' }))).not.toContain(t.note);
  });
});

describe('grades (live)', () => {
  it('reads JSON only when the whole reply parses, and routes by exact team', () => {
    const s = setup({ format: 'json' });
    expect(gradeReply(s, '{"team":"portal","reply":"Call extension 4410."}')).toMatchObject({
      format: true,
      routed: true,
      facts: true,
    });
    expect(gradeReply(s, '```json\n{"team":"portal","reply":"4410"}\n```').format).toBe(false);
    expect(gradeReply(s, '{"team":"billing","reply":"4410"}').routed).toBe(false);
  });
  it('checks the list and the house rule', () => {
    expect(gradeReply(setup({ format: 'list' }), '- a\n- b\n- c').format).toBe(true);
    expect(gradeReply(setup({ format: 'list' }), '- a\n- b').format).toBe(false);
    expect(gradeReply(setup({ rules: 'last' }), 'Call 4410. [LS-2041].').rule).toBe(true);
    expect(gradeReply(setup({ rules: 'last' }), '[LS-2041] Call 4410.').rule).toBe(false);
  });
});

describe('the simulator (KTD13): each rule shows its effect', () => {
  const g = (s: Partial<Setup>) => gradeReply(setup(s), simulateReply(setup(s)));
  it('every rule cites a fact', () => {
    for (const r of RULES) expect(fact(r.fact).source).toMatch(/^https:/);
  });
  it('fills every signature in every domain, deterministically', () => {
    for (const d of Object.values(DOMAINS))
      for (const s of combos(d)) expect(simulateReply(s)).toBe(simulateReply({ ...s }));
  });
  it('vague misses the fact, clear has it', () => {
    for (const t of TICKETS) {
      expect(g({ ticket: t.id, task: 'vague' }).facts).toBe(false);
      expect(g({ ticket: t.id }).facts).toBe(true);
    }
  });
  it('examples pass on their sign-off, and a shared quirk', () => {
    expect(g({ examples: 2 }).signed).toBe(true);
    expect(g({ examples: '2q' }).quirk).toBe(true);
    expect(g({}).quirk).toBe(false);
  });
  it('a rule on top under examples is missed; at the end it is kept', () => {
    expect(g({ examples: 2, rules: 'first' }).rule).toBe(false);
    expect(g({ examples: 2, rules: 'last' }).rule).toBe(true);
  });
  it('format cards are followed', () => {
    expect(g({ format: 'json' })).toMatchObject({ format: true, routed: true });
    expect(g({ format: 'list' }).format).toBe(true);
  });
});

describe('pinned effects (KTD9)', () => {
  it('chapter 1: Larkspur mini continues the text, matching its pin', () => {
    expect(continuations()).toEqual(pinned.continuations);
  });
  it('chapters 2–6 regrade to their pins', () => {
    expect(effects()).toEqual(pinned.effects);
  });
  it('every simulated chapter is one the recording could not show, named in pinned.json', () => {
    for (const ch of SIMULATED) expect(Object.keys(DOMAINS)).toContain(ch);
  });
  it('chapter 2: the clear task beats the vague one on key facts', () => {
    for (const role of [false, true]) {
      expect(row('02-say-what-you-want', { role, task: 'clear' }).facts).toBe(true);
      expect(row('02-say-what-you-want', { role, task: 'vague' }).facts).toBe(false);
    }
  });
  it('chapter 3: the quirky examples’ quirk appears in the reply, and not without them', () => {
    expect(row('03-show-dont-tell', { examples: '2q' }).quirk).toBe(true);
    expect(row('03-show-dont-tell', { examples: 0 }).quirk).toBe(false);
  });
  it('chapter 4: the JSON card’s reply parses', () => {
    expect(row('04-put-it-in-a-shape', { format: 'json' }).format).toBe(true);
  });
  it('chapter 5: the buried rule is missed on top and kept when moved last (simulated)', () => {
    expect(row('05-order-and-emphasis', { examples: 2, rules: 'first' }).rule).toBe(false);
    expect(row('05-order-and-emphasis', { examples: 2, rules: 'last' }).rule).toBe(true);
    expect(row('05-order-and-emphasis', { examples: 2, rules: 'last' })).toMatchObject({ source: 'simulated' });
  });
  it('chapter 5 is simulated because the recording kept the rule in both places (stop condition)', () => {
    expect(SIMULATED).toEqual(['05-order-and-emphasis']);
    for (const rules of ['first', 'last'] as const) {
      const s = setup({ examples: 2, rules }),
        r = replyOf('07-workbench', s);
      expect(r !== NORECORD && r.source === 'recorded' && gradeReply(s, r.text).rule, rules).toBe(true);
    }
  });
  const passed = (task: Docket['task'], model: Setup['model']) =>
    TICKETS.filter(t => {
      const s = setup({ ticket: t.id, task, model, format: 'json', rules: 'last' }),
        r = replyOf('06-test-it-like-code', s);
      return r !== NORECORD && passes(gradeReply(s, r.text));
    }).length;
  it('chapter 6: the clear task passes more of the question set than the vague one', () => {
    expect(passed('clear', 'main')).toBe(6);
    expect(passed('vague', 'main')).toBeLessThan(passed('clear', 'main'));
  });
  it('chapter 6: the same prompt on the smaller model passes fewer', () => {
    expect(passed('clear', 'small')).toBeLessThan(passed('clear', 'main'));
  });
});

describe('the workbench', () => {
  it('reruns every prompt to its pinned result', () => {
    expect(RESULTS).toEqual(PLANS.map(measure));
  });
  it('recomputes WINNERS', () => {
    expect(WINNERS.length).toBeGreaterThan(0);
    expect(solve(RESULTS)).toEqual(WINNERS);
  });
  it('starts on a prompt that loses', () => {
    expect(wins(BENCH_START)).toBe(false);
  });
  it('a winner passes every ticket; examples cost tokens without adding a pass', () => {
    for (const w of WINNERS) expect(measure(w).passed).toBe(6);
    expect(WINNERS.every(w => w.examples === 0 && w.task === 'clear' && w.format === 'json')).toBe(true);
  });
});
