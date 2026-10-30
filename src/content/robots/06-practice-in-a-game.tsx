// Chapter 6: practice in a game first. Mira's four demos plus practice in the simulator (dagger.ts: the expert on
// crate-free practice bins, light and slips varied when chosen), tested on the 20 held-out bins under the real bay's
// simulated slips and light. Plain practice leaves the camera blind in dim light; varying the light closes most of the
// gap (Tobin et al. 2017, cited). Scores are pinned and re-derived in the engine test; the picture replays one real bin.
import { useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Say, Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CLAW_PARTS } from '../../components/scenes/clawScene';
import pinned from '../../../data/robots/pinned.json' with { type: 'json' };
import { detectorOf, practicePairs } from '../../lib/robots/dagger';
import { replay } from '../../lib/robots/policy';
import { demoPairs, PERSON } from '../../lib/robots/story';
import { BINS, REAL } from '../../lib/robots/world';
import { PRACTICE_OF, type PracticeKind } from '../../lib/robots/workbench';
import { Outcome } from '../tool-calling/kit';
import { Fact, Radios, ReplayStage, SimNote, type View } from './kit';

const MODULE = 'robots',
  ID = '06-practice-in-a-game';
export const PARTS = CLAW_PARTS;
type Kind = Exclude<PracticeKind, 'none'>;
const KINDS: Kind[] = ['plain', 'light', 'slip', 'both'];
const WORDS: Record<Kind, string> = {
  plain: 'Plain',
  light: 'Light varied',
  slip: 'Slips varied',
  both: 'Both varied',
};
const N = REAL.length;
export const SCORE: Record<string, { solved: number; median: number }> = Object.fromEntries(
  pinned.practice.map(p => [p.practice, p]),
);
const DEMO = demoPairs(BINS.practiceDemos);
const runOf = (k: Kind, i: number) => {
  const p = PRACTICE_OF[k],
    det = detectorOf(p);
  return replay([...DEMO, ...practicePairs(p)], REAL[i], { slip: BINS.real.slip, seed: i, detector: det });
};
/** the real bin the picture replays: the first that plain practice fails and both varied clears */
export const SHOWN = REAL.findIndex((_, i) => runOf('plain', i).end !== 'done' && runOf('both', i).end === 'done');

export interface S {
  practice: Kind;
  tested: Kind[];
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'Which change to practice helps most in the real bay?',
  options: ['Varying the light', 'Varying the slips', 'Neither: only real demos help'],
};
export const OUTCOME = SCORE.light.solved >= SCORE.slip.solved ? 0 : 1;

export const QUIZ = {
  question: 'A simulator draws every part shiny grey; real parts come in five finishes. What is the best fix?',
  options: ['Randomise the finishes in the simulator', 'Draw the grey more realistically', 'Practise longer on grey'],
  correct: 0,
  explanation: 'Vary what the simulator gets wrong, so the real finishes look like one more variation.',
  why: [
    'Right: that is domain randomisation, as Tobin et al. did with textures and light.',
    'A perfect grey still isn’t the four other finishes the camera will meet.',
    'More grey practice teaches grey better, and the other finishes not at all.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'plain',
    focus: 'stage',
    visibleControls: [],
    narration: `${PERSON}’s ${BINS.practiceDemos} demos, plus free practice in a simulator with even light and no slips.`,
    act: 'Press Test on the real bins.',
    say: { block: 'machine', text: 'Practised' },
    predicate: s => s.tested.includes('plain'),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${SCORE.plain.solved} of ${N}: the sim-to-real gap. The real bay is often dimmer, and in dim light the camera loses the part.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'vary',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: 'Your pick is locked. Varying the game’s conditions in practice is domain randomisation.',
    act: 'Pick Both varied, then test again.',
    say: { block: 'camera', text: 'Sees dim light' },
    predicate: s => s.tested.includes('both'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: `Light varied: ${SCORE.light.solved} of ${N}; both: ${SCORE.both.solved}. The camera met dim light in practice, so the real bay looked familiar.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did the simulator get wrong, and how did varying it help?',
  },
];

function PracticeStage({ s, set, say }: { s: S; set: (s: S) => void; say?: Say }) {
  const [go, setGo] = useState(0);
  const [shown, setShown] = useState<Kind>(s.practice);
  const run = runOf(shown, SHOWN);
  const test = () => {
    setShown(s.practice);
    setGo(g => g + 1);
  };
  const score = SCORE[shown];
  return (
    <ReplayStage
      layout={REAL[SHOWN]}
      states={run.states}
      actions={run.actions}
      end={run.end}
      go={go}
      onEnd={() => set({ ...s, tested: s.tested.includes(shown) ? s.tested : [...s.tested, shown] })}
      detector={detectorOf(PRACTICE_OF[shown])}
      say={say}
      view={s.view}
      onView={view => set({ ...s, view })}
      caption={`One of ${N} simulated real bins, light ${REAL[SHOWN].light.toFixed(2)} of the demos’ 1.`}
    >
      <div className="rb-controls">
        <Radios
          legend="Practice"
          options={KINDS}
          value={s.practice}
          words={k => WORDS[k]}
          onChange={practice => set({ ...s, practice })}
        />
        <button type="button" className="chip" onClick={test}>
          Test on the real bins
        </button>
      </div>
      {go > 0 && (
        <p className="rb-headline">{`${WORDS[shown]}: ${score.solved} of ${N} real bins cleared, median ${score.median} steps.`}</p>
      )}
    </ReplayStage>
  );
}

export default function PracticeInAGame() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ practice: 'plain', tested: [], view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <PracticeStage s={state} set={sync} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        fact: () => (
          <>
            <Fact id="domain-randomisation" />
            <p className="note">
              <a href="/synthetic-data/06-keep-the-real-data/">
                Synthetic data keeps real examples beside the made ones too.
              </a>
            </p>
            <SimNote />
          </>
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
    />
  );
}
