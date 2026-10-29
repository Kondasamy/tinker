// Chapter 4: who said it could buy? Dana signs a spending slip (a mandate) live in the page with her demo key; the agent
// carries it through the hatch and Larkspur's shop checks the signature, then each signed term, stamping each field.
// Then the reader predicts what a cap changed after signing does, and tries it: the signature fails.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { HATCH_PARTS } from '../../components/scenes/hatchScene';
import { canonical, type Slip } from '../../lib/agent-commerce/mandate';
import { BUILDER, COMPANY, SLIPS, usd } from '../../lib/agent-commerce/story';
import pinned from '../../../data/agent-commerce/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { DemoKeyNote, Fact, raised, SignSlip, type SlipEvent } from './kit';

const MODULE = 'agent-commerce',
  ID = '04-who-said-it-could-buy';
export const PARTS = HATCH_PARTS;
const DANA = BUILDER.name;
const CAP = SLIPS.larkspur.cap;

export interface S {
  slip: Slip | null;
  /** the fields the shop failed on the last check; null until checked */
  failed: string[] | null;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `After ${DANA} signs, the agent doubles the slip’s cap. What does the shop do?`,
  options: [
    'Accepts: the cap now covers more',
    'Refuses: the signature no longer matches',
    'Accepts, up to the cap she signed',
  ],
};
/** a changed cap fails the signature (pinned verdict, recomputed in the engine test) */
export const OUTCOME = pinned.verdicts['tampered-cap'].includes('signature') ? 1 : 0;

export const QUIZ = {
  question: `A slip signed for ${usd(CAP)} arrives; the agent says ${DANA} agreed to ${usd(raised(CAP))} by phone. What should the shop do?`,
  options: [
    `Hold to the signed ${usd(CAP)}`,
    `Accept ${usd(raised(CAP))}: the agent speaks for her`,
    'Split the difference',
  ],
  correct: 0,
  explanation: 'The shop can check a signature; it cannot check an agent’s word.',
  why: [
    'Right: only the signed terms carry her say-so, and they say the lower cap.',
    'Anyone can claim to speak for her; the signature is the one thing only she can make.',
    'A cap nobody signed is no cap at all, whatever the split.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'sign',
    focus: 'sign',
    visibleControls: ['note'],
    narration: `${DANA} signs a mandate: what, how much, where and until when. Her demo key signs it, live.`,
    act: 'Set the terms, then press Sign.',
    say: { block: 'builder', text: 'She signs' },
    predicate: s => s.slip !== null,
  },
  {
    id: 'send',
    focus: 'send',
    visibleControls: ['signed'],
    narration: 'The signature covers every field. The agent carries the slip, never the key.',
    act: 'Press Send.',
    say: { block: 'satchel', text: 'Carries it' },
    predicate: s => s.failed !== null,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['signed', 'p1'],
    narration: 'The shop checked the signature first, then each signed term, and stamped every field.',
    act: 'Predict the next one.',
    say: { block: 'slip', text: 'Six checks' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'tamper',
    focus: 'tamper',
    visibleControls: ['p1'],
    narration: 'Change one field after signing, and the signed text no longer matches.',
    act: 'Sign, press Change the cap, then Send.',
    say: { block: 'seal', text: 'Her seal' },
    predicate: s => !!s.failed?.includes('signature'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'fact', 'quiz'],
    narration: 'Refused on the signature, whatever the agent says. The shop trusts the signed text, not its carrier.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which of the two can the shop check for itself?',
  },
];

/** the chapter's state after one of the slip's events */
export function onSlip(s: S, e: SlipEvent): S | null {
  if (e.kind === 'signed') return { ...s, slip: e.slip, failed: null };
  if (e.kind === 'checked' && e.verdict)
    return { ...s, failed: e.verdict.checks.filter(c => !c.pass).map(c => c.field) };
  return null;
}

export default function WhoSaidItCouldBuy() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ slip: null, failed: null, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        // a fresh slip for the tamper round; the read-out clears with it
        <SignSlip
          key={focus === 'tamper' || focus === 'quiz' ? 'tamper' : 'first'}
          terms={SLIPS.larkspur}
          say={say}
          caption={`${DANA} signs for ${COMPANY} only, items and cap as she sets them.`}
          onEvent={e => {
            // a shop's check is an attempt on the steps that ask for one; signing is only the way there
            const next = onSlip(state, e);
            if (next) (e.kind === 'checked' && (focus === 'send' || focus === 'tamper') ? apply : sync)(next);
          }}
        />
      )}
      controls={{
        note: () => (
          <>
            <DemoKeyNote />
            <Fact id="ap2-mandates" />
          </>
        ),
        signed: ({ state }) =>
          state.slip && (
            <figure className="ac-read">
              <figcaption>What the signature covers, exactly</figcaption>
              <pre className="ac-page">{canonical(state.slip.mandate)}</pre>
              <p className="note">{`Signature: ${state.slip.sig.slice(0, 32)}…`}</p>
            </figure>
          ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        fact: () => <Fact id="ap2-v02" />,
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
    />
  );
}
