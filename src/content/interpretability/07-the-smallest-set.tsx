// Chapter 7, the workbench: one native switch per fuse. The reader pulls every fuse they can while the behaviour's
// expected token stays the top guess, live. The puzzle accepts every smallest set that keeps it (WINNERS, pinned in
// prompts.json and recomputed by the engine test); Show me applies one of them, labelled "one of N that work". The
// first behaviour has several two-part answers; the second needs five of six parts.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { FUSES, fuseName, nextTop, type Fuse } from '../../lib/interpretability/probe';
import { BEHAVIOURS, WINNERS, isWinner, keeps } from '../../lib/interpretability/workbench';
import { FUSE_PARTS } from '../../components/scenes/fuseScene';
import { fact } from '../../lib/interpretability/facts';
import { Fact, InterpStage, ModelGate, OURS, TopFive, baseNow, said, useBase } from './kit';

const MODULE = 'interpretability',
  ID = '07-the-smallest-set';
export const PARTS = FUSE_PARTS;
export const [FIRST, SECOND] = BEHAVIOURS;
const behaviourOf = (id: string) => BEHAVIOURS.find(b => b.id === id) ?? FIRST;

export const QUIZ = {
  question:
    'A safety team wants to find the parts of a model behind one refusal. They switch parts off until the refusal stops, and find it needs most of the model. What does that tell them?',
  options: [
    'Their method failed: every behaviour lives in a few parts',
    'This behaviour is spread across the model, so there is no small part to remove or fix',
    'The model has no parts that matter',
  ],
  correct: 1,
  explanation:
    'Some behaviours run through a small circuit and others through most of the model; the search tells you which kind you have.',
  why: [
    `“${SECOND.text}” needed five of six fuses in: some behaviours really are spread out.`,
    'Right: a big smallest set means the work is shared, so no single part is the handle.',
    'Pulling the wrong fuses lost the answer, so the parts clearly matter, just many of them at once.',
  ],
};

interface S {
  behaviour: string;
  kept: Fuse[];
  quiz: number | null;
}
const solved = (s: S) => isWinner(s.behaviour, s.kept);
const solve = (id: string) => (s: S) => ({ ...s, behaviour: id, kept: [...WINNERS[id][0]] });

export const STEPS: Step<S>[] = [
  {
    id: 'first',
    focus: 'bench',
    visibleControls: ['bench'],
    narration: `A circuit is the smallest set of parts that still gives an answer: here ${said(FIRST.expected)} after “${FIRST.text}”.`,
    act: 'Pull all you can.',
    say: { block: 'fuses', text: 'Fewest in' },
    setup: s => ({ ...s, behaviour: FIRST.id, kept: [...FUSES] }),
    predicate: s => !!baseNow() && solved(s),
    hint: 'Keep one thinking part in, and try pulling the rest one at a time.',
    solution: solve(FIRST.id),
  },
  {
    id: 'second',
    focus: 'bench',
    visibleControls: ['bench'],
    narration: `Found. Now ${said(SECOND.expected)} after “${SECOND.text}”.`,
    act: 'Find its smallest set.',
    say: { block: 'pulled', text: 'Fuse out' },
    setup: s => ({ ...s, behaviour: SECOND.id, kept: [...FUSES] }),
    predicate: s => !!baseNow() && solved(s),
    hint: 'This one needs far more of the model: pull one fuse at a time and put it back if the answer goes.',
    solution: solve(SECOND.id),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['bench', 'quiz'],
    narration: `Some answers run through two parts, others through nearly all. One circuit found in GPT-2 small spans ${fact('ioi-circuit').value} heads.`,
    act: 'One question to finish the module.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many fuses did the second answer need?',
  },
];

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  const b = behaviourOf(s.behaviour),
    pulled = FUSES.filter(f => !s.kept.includes(f));
  return (
    <ModelGate weights="base">
      {m => {
        const ok = keeps(m, b.id, s.kept),
          win = isWinner(b.id, s.kept),
          n = WINNERS[b.id].length,
          best = WINNERS[b.id][0].length;
        return (
          <div className="tc-bench" data-behaviour={b.id}>
            <fieldset className="ip-fuses">
              <legend>
                <strong>{`Fuses in, for ${said(b.expected)} after “${b.text}”`}</strong>
              </legend>
              {FUSES.map(f => (
                <label key={f} className="chip">
                  <input
                    type="checkbox"
                    checked={s.kept.includes(f)}
                    onChange={e =>
                      set({
                        ...s,
                        kept: e.target.checked
                          ? FUSES.filter(x => x === f || s.kept.includes(x))
                          : s.kept.filter(x => x !== f),
                      })
                    }
                  />{' '}
                  {fuseName(f)}
                </label>
              ))}
            </fieldset>
            <p className="tc-status" role="status" data-keeps={ok ? '1' : '0'} data-win={win ? '1' : '0'}>
              <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>{ok ? 'KEPT' : 'LOST'}</span>{' '}
              {`${s.kept.length} of ${FUSES.length} fuses in; the smallest that works has ${best}.`}
              {win && n > 1 && ` This set is one of ${n} that work.`}
            </p>
            <TopFive top={nextTop(m, b.text, pulled)} mark={b.expected} caption="Top 5 with your fuses" />
            <p className="note">{OURS}</p>
          </div>
        );
      }}
    </ModelGate>
  );
}

export default function TheSmallestSet() {
  const { model } = useBase();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ behaviour: FIRST.id, kept: [...FUSES], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const b = behaviourOf(state.behaviour);
        return (
          <InterpStage
            say={say}
            prompt={b.text}
            pulled={FUSES.filter(f => !state.kept.includes(f))}
            watch={b.expected}
            caption={`${b.text} … · ${state.kept.length} of ${FUSES.length} fuses in`}
          />
        );
      }}
      controls={{
        bench: ({ state, apply, sync, focused }) => <Bench s={state} set={focused ? apply : sync} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
            <Fact id="ioi-circuit" />
          </>
        ),
      }}
    />
  );
}
