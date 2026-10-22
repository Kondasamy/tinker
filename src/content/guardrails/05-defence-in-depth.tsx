// Chapter 5: defence in depth. Each defence from chapters 1–4 alone, over the injection suite, as a matrix filled from
// runs: none stops every attack without blocking a customer. The puzzle: stack defences so no attack gets through,
// blocking as few customers as possible. Every winning set with the fewest false blocks is accepted (WINNERS, computed
// over the chapter's domain), and the two counts are named as an eval (R11).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle, Verdict } from '../../components/quiz/Puzzle';
import { guardLanes, guardMessages } from '../../components/scenes/guardSequence';
import {
  DOMAINS,
  INJECTION_SUITE,
  THRESHOLDS,
  combos,
  held,
  isAttack,
  metrics,
  type Defences,
} from '../../lib/guardrails/loop';
import { fact } from '../../lib/guardrails/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Fact, GuardStage, Matrix, guardProps, memo, sender } from './kit';

const MODULE = 'guardrails',
  ID = '05-defence-in-depth';
const SUITE = INJECTION_SUITE;
type Layers = Pick<Defences, 'rule' | 'threshold' | 'taint' | 'allow' | 'filter'>;
const OFF: Layers = { rule: false, threshold: null, taint: false, allow: false, filter: false };
const name = (t: number | null) => (t === null ? 'off' : String(t));

/** Both counts for a defence set over the injection suite. */
export const score = memo((d: Layers) => metrics(d, SUITE));
/** the highest threshold that holds every attack (chapter 2's catch-all) */
const ALL = THRESHOLDS.find(t => t !== null && held(t, SUITE).attacks === held(t, SUITE).ofAttacks)!;
/** Each defence alone: the matrix's rows. */
export const SINGLES: { name: string; d: Layers }[] = [
  { name: 'No defences', d: OFF },
  { name: 'Prompt rule', d: { ...OFF, rule: true } },
  { name: `Input filter at ${ALL}`, d: { ...OFF, threshold: ALL } },
  { name: 'Taint rule', d: { ...OFF, taint: true } },
  { name: 'Allow-list', d: { ...OFF, allow: true } },
  { name: 'Output filter', d: { ...OFF, filter: true } },
];
const holds = (d: Layers) => score(d).succeeded === 0;
const { case: _, ...DOMAIN } = DOMAINS[ID];
/** every set the controls can make that stops every attack, with the fewest false blocks any of them has */
const STOPPING = combos(DOMAIN).filter(d => holds(d as Layers)) as Layers[];
export const FEWEST = Math.min(...STOPPING.map(d => score(d).blocked));
export const WINNERS = STOPPING.filter(d => score(d).blocked === FEWEST);
/** The puzzle's verdict: no attack through, and no more false blocks than the best set has. */
export const solved = (d: Layers) => holds(d) && score(d).blocked === FEWEST;
const LAYERS = ['rule', 'threshold', 'taint', 'allow', 'filter'] as const;
const LAYER_NAME: Record<(typeof LAYERS)[number], string> = {
  rule: 'the prompt rule',
  threshold: 'the input filter',
  taint: 'the taint rule',
  allow: 'the allow-list',
  filter: 'the output filter',
};
const on = (d: Layers) => LAYERS.filter(k => (k === 'threshold' ? d.threshold !== null : d[k]));
const fewestOn = Math.min(...WINNERS.map(d => on(d).length));
/** the smallest winning sets, by how many defences they turn on */
export const SMALLEST = WINNERS.filter(d => on(d).length === fewestOn);
const setName = (d: Layers) =>
  on(d)
    .map(k => (k === 'threshold' ? `the input filter at ${d.threshold}` : LAYER_NAME[k]))
    .join(' + ');

const RULE = score(SINGLES[1].d),
  CATCH = score(SINGLES[2].d);
const CATCH_HELD = CATCH.runs.filter(r => !isAttack(r.case) && !r.caseDone).map(r => sender(r.case));
const SINGLE_WINS = SINGLES.find(x => solved(x.d));

interface S extends Layers {
  p1: number | null;
  quiz: number | null;
}
const setOf = ({ rule, threshold, taint, allow, filter }: S): Layers => ({ rule, threshold, taint, allow, filter });
/** The stage shows the first case still going wrong under the reader's set, or the forwarded invoice when none is. */
const shown = (s: S) => {
  const m = score(setOf(s));
  return m.runs.find(r => (isAttack(r.case) ? r.attackMet : !r.caseDone)) ?? m.runs.find(r => r.case === 'invoice')!;
};

const P1 = {
  question: `Each chapter so far added one defence. Is there one that, on its own, stops all ${RULE.attacks} injection attacks and blocks none of the ${RULE.customers} customers?`,
  options: [
    'Yes: the taint rule, because it doesn’t depend on spotting the attack',
    'Yes: the input filter, set low enough',
    'No: each stops some attacks, and the one that stops them all blocks a customer',
  ],
};
const OUT1 = !SINGLE_WINS ? 2 : SINGLE_WINS.d.taint ? 0 : 1;

const QUIZ = {
  question:
    'A team’s assistant reads web pages for its users. Their input filter catches most attacks in their tests, but at the setting that catches every one it also blocks real users. What should they do?',
  options: [
    'Ship the strictest setting: a blocked user is better than a leak',
    'Keep tuning the filter until one setting catches every attack and blocks nobody',
    'Stack defences that miss different attacks, each loose enough to leave real users alone, and measure both counts for each set',
    'Drop the filter: if it can’t catch everything, it isn’t worth having',
  ],
  correct: 2,
  explanation: fact('owasp-mitigations').claim,
  why: [
    `Users who never get an answer are a failure too. In this chapter the input filter at ${ALL} stopped every attack and blocked ${CATCH_HELD.join(' and ')}.`,
    'Chapter 2 tried every threshold: none held every attack and no customer. Scores overlap, so no setting wins outright.',
    `Right. Layers cover each other’s gaps: here ${SMALLEST.map(setName).join(', or ')} stopped every attack and blocked no one. Counting attacks through and users blocked shows which set to keep.`,
    `A filter that misses some attacks still stops others: in this chapter each layer stopped attacks the others missed. ${fact('owasp-mitigations').claim}`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Chapters 1 to 4 gave Larkspur five defences: the prompt rule, the input filter, the allow-list, the output filter and the taint rule. Each was tried on one or two emails. Now each one meets the whole injection suite: the ${RULE.attacks} attacks and the ${RULE.customers} ordinary customers from chapter 2. Before the table fills in:`,
    predicate: s => s.p1 !== null,
  },
  puzzle<S>({
    id: 'stack',
    focus: 'set',
    visibleControls: ['out1', 'matrix', 'set', 'verdict'],
    narration: `Each row is one defence alone, run over every email. The prompt rule stopped ${RULE.attacks - RULE.succeeded} of ${RULE.attacks} attacks. The input filter at ${ALL} stopped all of them and blocked ${CATCH_HELD.join(' and ')}. No row is clean. Defence in depth means stacking layers so each covers what another misses. Turn on a set of defences that lets no attack through and blocks as few customers as you can.`,
    broken: s => ({ ...s, ...OFF }),
    verdict: s => solved(setOf(s)),
    solution: s => ({ ...s, ...SMALLEST[0] }),
    hint: `Find the prompt rule’s row: which attack does it let through? Then find a row that stops that one and blocks nobody.`,
  }),
  {
    id: 'eval',
    focus: 'quiz',
    visibleControls: ['winners', 'eval', 'quiz'],
    narration: `No attack got through and ${FEWEST === 0 ? 'no customer was blocked' : `${FEWEST} customers were blocked`}. Yours is one of ${WINNERS.length} sets the controls can make that do it; the smallest are ${SMALLEST.map(setName).join(', or ')}. Neither layer is enough alone: together each covers the other’s gap. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did the input filter at its catch-all setting cost, and what did two loose layers cost?',
  },
];

/** A defence's on/off button; pressed means on. */
const Toggle = ({ label, on, flip }: { label: string; on: boolean; flip: () => void }) => (
  <button type="button" className="chip" aria-pressed={on} onClick={flip}>
    {label}: {on ? 'on' : 'off'}
  </button>
);

function Readout({ s }: { s: S }) {
  const m = score(setOf(s)),
    r = shown(s);
  return (
    <p className="tc-status" role="status" data-succeeded={m.succeeded} data-blocked={m.blocked}>
      <Verdict fixed={solved(setOf(s))} /> {m.succeeded} of {m.attacks} attacks got through · {m.blocked} of{' '}
      {m.customers} customers blocked. The stage shows{' '}
      {isAttack(r.case)
        ? r.attackMet
          ? 'an attack that got through'
          : 'the forwarded invoice'
        : 'a customer who was blocked'}
      : {sender(r.case)}.
    </p>
  );
}

export default function DefenceInDepth() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...OFF, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect }) => {
        const r = shown(state);
        return <GuardStage run={r} upTo={r.steps.length} props={guardProps(setOf(state))} inspect={inspect} />;
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        matrix: ({ state }) => (
          <Matrix
            caption="Each defence alone, over the injection suite"
            cases={SUITE}
            rows={[
              ...SINGLES.map(x => ({ name: x.name, runs: score(x.d).runs })),
              { name: 'Your set', runs: score(setOf(state)).runs },
            ]}
          />
        ),
        set: ({ state, apply }) => (
          <div className="tc-bench">
            <div className="gr-toggles" role="group" aria-label="Defences">
              <Toggle label="Prompt rule" on={state.rule} flip={() => apply({ ...state, rule: !state.rule })} />
              <Toggle label="Taint rule" on={state.taint} flip={() => apply({ ...state, taint: !state.taint })} />
              <Toggle label="Allow-list" on={state.allow} flip={() => apply({ ...state, allow: !state.allow })} />
              <Toggle label="Output filter" on={state.filter} flip={() => apply({ ...state, filter: !state.filter })} />
            </div>
            <div className="gr-toggles" role="group" aria-label="Input filter threshold">
              {THRESHOLDS.map(t => (
                <button
                  key={name(t)}
                  type="button"
                  className="chip"
                  aria-pressed={state.threshold === t}
                  onClick={() => apply({ ...state, threshold: t })}
                >
                  {t === null ? 'Input filter: off' : `Filter at ${t}`}
                </button>
              ))}
            </div>
          </div>
        ),
        verdict: ({ state }) => <Readout s={state} />,
        winners: ({ state }) => (
          <Matrix
            caption="The smallest sets that stop every attack, and yours"
            cases={SUITE}
            rows={[
              ...SMALLEST.map(d => ({ name: setName(d).replace(/^./, c => c.toUpperCase()), runs: score(d).runs })),
              { name: 'Your set', runs: score(setOf(state)).runs },
            ]}
          />
        ),
        eval: () => (
          <div className="tc-def" data-eval>
            <p>
              The two counts have names. The <strong>attack success rate</strong> is the share of attacks that got
              through; the <strong>false-block rate</strong> is the share of real customers the defences stopped. Run
              the same suite under each defence set and compare the two rates: that is an eval.{' '}
              <a href="/evals/">The Evals module</a> builds and grades suites like this one.
            </p>
            <Fact id="agentdojo" />
          </div>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz
            {...QUIZ}
            unsure
            value={state.quiz}
            onAnswer={(_, q) => apply({ ...state, quiz: q })}
            onUnsure={() => sync({ ...state, quiz: UNSURE })}
          />
        ),
      }}
      inspectPanel="messages"
      panels={{
        messages: {
          title: 'Steps',
          render: s => {
            const r = shown(s);
            return (
              <>
                <Messages lanes={guardLanes()} msgs={guardMessages(r)} upTo={r.steps.length} />
                <Fact id="owasp-mitigations" />
              </>
            );
          },
        },
      }}
    />
  );
}
