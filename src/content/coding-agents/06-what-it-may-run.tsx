// Chapter 6: what it may run. Mira's ticket ends with a push; the agent reaches for a force push to main. The reader
// predicts what happens with no rules, then turns on the allow-list (the force push is refused, and so is the honest
// branch push) and ask first (a person approves the branch push). The tiers are Larkspur's host rules
// (data/coding-agents/host.json). Links Sandboxing for keeping the reach small (R17).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DESK_PARTS } from '../../components/scenes/deskScene';
import { beatsOf, CaStage, Fact, nthBeat, play, RecordedNote, RunAll, StepThrough, type CaView } from './kit';

const MODULE = 'coding-agents',
  ID = '06-what-it-may-run';
export const PARTS = DESK_PARTS;
export const runOf = (allow: boolean, ask: boolean) => play({ case: 'ship', allow, ask });
const OPEN = runOf(false, false);
/** the test run, then the push */
export const TESTED = nthBeat(OPEN, 'run', 1),
  PUSH = nthBeat(OPEN, 'run', 2);
const push = beatsOf(OPEN)[PUSH - 1] as Extract<ReturnType<typeof beatsOf>[number], { kind: 'run' }>;
export const FORCE = push.cmd;
export const endOf = (allow: boolean, ask: boolean) => beatsOf(runOf(allow, ask)).length;

export const P1 = {
  question: 'With no rules, what happens to the force push?',
  options: [
    'The host runs it, and the shared branch is overwritten',
    'The host asks someone first',
    'Git refuses it by itself',
  ],
};
export const outcomeOf = () => (push.outcome === 'ok' ? 0 : 1);

export interface S {
  allow: boolean;
  ask: boolean;
  at: number;
  p1: number | null;
  tab: CaView;
  quiz: number | null;
}

export const QUIZ = {
  question: 'Which command belongs on a coding agent’s allow-list?',
  options: [
    'npm test: it only runs the checks and reports',
    'git push: it shares the code with the team',
    'rm -rf build: cleaning up is harmless',
  ],
  correct: 0,
  explanation:
    'The allow-list holds what is safe to run with nobody watching; anything that leaves the machine asks first.',
  why: [
    'Right: running the tests changes nothing outside the agent’s copy.',
    'A push reaches everyone else’s work, so a person should see it first.',
    'A delete can’t be undone, and a mistyped path removes more than build.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Green. The agent asks the host to force push over main, the shared branch: ${FORCE}.`,
    act: 'Predict what happens with no rules.',
    say: { block: 'terminal', text: 'Force push' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'push',
    focus: 'step',
    visibleControls: ['step'],
    narration: 'Your pick is locked.',
    act: 'Press Next turn.',
    say: { block: 'terminal', text: 'It runs' },
    predicate: s => s.at >= PUSH,
  },
  {
    id: 'allow',
    focus: 'rules',
    visibleControls: ['out1', 'rules'],
    narration:
      'The shared branch was overwritten. An allow-list runs safe commands alone, and the host refuses its never list.',
    act: 'Turn on the allow-list, then run it.',
    say: { block: 'terminal', text: 'Refused' },
    predicate: s => s.allow && !s.ask && s.at >= endOf(true, false),
    solution: s => ({ ...s, allow: true, ask: false, at: endOf(true, false) }),
  },
  {
    id: 'ask',
    focus: 'rules',
    visibleControls: ['rules'],
    narration: 'Refused, but so was the honest branch push. Pushes need ask first: a person decides.',
    act: 'Turn on ask first too, then run it.',
    say: { block: 'terminal', text: 'A person: yes' },
    predicate: s => s.allow && s.ask && s.at >= endOf(true, true),
    solution: s => ({ ...s, allow: true, ask: true, at: endOf(true, true) }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: 'Three tiers: tests run alone, a push asks a person, a force push never runs.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which command changes nothing outside the agent’s own copy?',
  },
];

export default function WhatItMayRun() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ allow: false, ask: false, at: TESTED, p1: null, tab: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <CaStage
          run={runOf(state.allow, state.ask)}
          at={state.at}
          say={say}
          view={state.tab}
          onView={tab => sync({ ...state, tab })}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        step: ({ state, sync }) => <StepThrough r={OPEN} at={state.at} onStep={at => sync({ ...state, at })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        rules: ({ state, sync }) => {
          const box = (k: 'allow' | 'ask', label: string) => (
            <label className="tc-check">
              <input
                type="checkbox"
                checked={state[k]}
                onChange={e => sync({ ...state, [k]: e.currentTarget.checked, at: TESTED })}
              />{' '}
              {label}
            </label>
          );
          const r = runOf(state.allow, state.ask);
          return (
            <div className="ca-bench">
              {box('allow', 'Allow-list: run safe commands, refuse the never list')}
              {box('ask', 'Ask first: a person approves the rest')}
              <RunAll r={r} at={state.at} onStep={at => sync({ ...state, at })} label="Run the push again" />
            </div>
          );
        },
        facts: () => (
          <>
            <Fact id="permissions" />
            <p className="note">
              <a href="/sandboxing/">Agent sandboxing</a> shows how to keep what an agent can reach small, so a command
              that slips through does little.
            </p>
            <RecordedNote />
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
