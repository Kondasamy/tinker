// Chapter 6: who published this? A stranger publishes a hijacked inkdrop patch, reached through logline's caret range.
// The reader pins logline exactly (it still arrives), turns install scripts off (the script is reported, not run; the
// import payload still ships), then turns on the lockfile (it stays out). Nothing runs: both are flags in the data.
// This repo's own pnpm-workspace.yaml setting is cited as a real example; event-stream and xz are dated facts.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { APP, REGISTRY, auditOf, install, nodeAt } from '../../lib/dependencies/resolve';
import { FIRST, FIRST_LOCK, HIJACK, HIJACKED, HIJACK_DAY, LOGGER, pinned } from '../../lib/dependencies/story';
import { TOWER_PARTS, towerOf } from '../../components/scenes/towerScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DepsStage, Fact, RegistryNote, Toggle, type View } from './kit';

const MODULE = 'dependencies',
  ID = '06-who-published-this';
export const PARTS = TOWER_PARTS;
const OLD = nodeAt(FIRST, HIJACKED)!.version;
const VIA = REGISTRY[LOGGER].versions[nodeAt(FIRST, LOGGER)!.version].deps![HIJACKED];

interface S {
  pin: boolean;
  p1: number | null;
  installed: boolean;
  scripts: boolean;
  lock: boolean;
  view: View;
  quiz: number | null;
}
export const treeOf = (s: Pick<S, 'pin' | 'installed' | 'lock'>) =>
  install({
    day: s.installed ? HIJACK_DAY : HIJACK_DAY - 1,
    deps: s.pin ? pinned(LOGGER) : APP.deps,
    ...(s.lock ? { lock: FIRST_LOCK } : {}),
  });
export const auditFor = (s: Pick<S, 'pin' | 'installed' | 'lock' | 'scripts'>) => auditOf(treeOf(s), s.scripts);

export const P1 = {
  question: `${LOGGER} is pinned. What does day ${HIJACK_DAY}’s install bring?`,
  options: [
    `${HIJACKED} ${HIJACK.version}, the hijacked one`,
    `${HIJACKED} ${OLD}: the pin holds it`,
    'Nothing: the install refuses it',
  ],
};
export const outcomeOf = () =>
  nodeAt(treeOf({ pin: true, installed: true, lock: false }), HIJACKED)!.version === HIJACK.version ? 0 : 1;

export const QUIZ = {
  question:
    'A team pins every package it lists and turns install scripts off. A deep dependency is hijacked. Which step keeps it out?',
  options: [
    'Installing from a lockfile, and reading the diff before updating it',
    'Their pins already cover it',
    'Scripts off already cover it',
  ],
  correct: 0,
  explanation: 'Only the lockfile fixes every version deep in the tree, and a reviewed update decides when it moves.',
  why: [
    'Right: the lockfile names the deep package’s version too, so nothing new arrives unread.',
    'A pin fixes the package you list, not the ranges inside it.',
    'Scripts off stops code at install, not code that runs when the app imports the package.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'pin',
    focus: 'pin',
    visibleControls: ['pin'],
    narration: `${LOGGER} logs every order. It asks for ${HIJACKED} with a caret range, ${VIA}. The team decides to pin ${LOGGER}.`,
    act: `Pin ${LOGGER} exactly.`,
    predicate: s => s.pin,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Overnight a stranger took over ${HIJACKED}’s account and published ${HIJACK.version}: a hijacked release.`,
    act: 'Predict the next install.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'install',
    focus: 'install',
    visibleControls: ['p1', 'install'],
    narration: 'Your pick is locked.',
    act: `Install on day ${HIJACK_DAY}.`,
    predicate: s => s.installed,
  },
  {
    id: 'scripts',
    focus: 'scripts',
    visibleControls: ['out1', 'audit', 'scripts'],
    narration: `It arrived: the pin fixes ${LOGGER}, not what ${LOGGER} asks for. Its install script runs during the install.`,
    act: 'Turn install scripts off.',
    say: { block: 'hijacked', text: 'Stranger' },
    predicate: s => !s.scripts,
  },
  {
    id: 'lock',
    focus: 'lock',
    visibleControls: ['audit', 'scripts', 'lock'],
    narration: `The script is skipped. But its payload still runs when the app imports ${HIJACKED}.`,
    act: 'Turn on the lockfile.',
    predicate: s => s.lock,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['audit', 'facts', 'quiz'],
    narration: `The lockfile keeps ${HIJACKED} at ${OLD} until someone reads an update’s diff and takes it.`,
    act: 'One question to finish.',
    say: { block: 'lock', text: 'Still old' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which of the three names the deep package’s version?',
  },
];

function Audit({ s }: { s: S }) {
  const a = auditFor(s),
    v = nodeAt(treeOf(s), HIJACKED)!.version;
  const rows: [string, string, boolean][] = [
    [`${HIJACKED} installed`, v, v !== HIJACK.version],
    [
      'Its install script',
      a.scriptRan.length ? 'ran' : a.scriptBlocked.length ? 'reported, not run' : 'none',
      !a.scriptRan.length,
    ],
    ['Its import payload', a.payload.length ? 'in the app' : 'none', !a.payload.length],
  ];
  return (
    <table className="tc-ledger" data-audit>
      <caption>{`Day ${s.installed ? HIJACK_DAY : HIJACK_DAY - 1}, simulated: nothing really runs`}</caption>
      <tbody>
        {rows.map(([name, val, ok]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td className={ok ? 'ok' : 'bad'}>{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function WhoPublishedThis() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ pin: false, p1: null, installed: false, scripts: true, lock: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const t = treeOf(state),
          a = auditOf(t, state.scripts);
        return (
          <DepsStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              tower: towerOf(t, { lit: state.pin ? [LOGGER] : [], lock: state.lock }),
              tree: t,
              caption: `Day ${t.day}. ${LOGGER} ${state.pin ? 'pinned exactly' : `asks ${APP.deps[LOGGER]}`}.`,
              status: a.hijacked.length
                ? `Hijacked ${HIJACKED} ${HIJACK.version} installed; install script ${a.scriptRan.length ? 'ran' : 'reported, not run'}; payload in the app.`
                : `${HIJACKED} ${nodeAt(t, HIJACKED)!.version} installed; nothing hijacked.`,
            }}
          />
        );
      }}
      controls={{
        pin: ({ state, apply, sync, focused }) => (
          <Toggle
            label={`Pin ${LOGGER} exactly`}
            checked={state.pin}
            onChange={pin => (focused ? apply : sync)({ ...state, pin })}
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        install: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, installed: true })}>
            {`Install on day ${HIJACK_DAY}`}
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        audit: ({ state }) => <Audit s={state} />,
        scripts: ({ state, apply, sync, focused }) => (
          <Toggle
            label="Install scripts on"
            checked={state.scripts}
            onChange={scripts => (focused ? apply : sync)({ ...state, scripts })}
          />
        ),
        lock: ({ state, apply, sync, focused }) => (
          <Toggle
            label="Lockfile"
            checked={state.lock}
            onChange={lock => (focused ? apply : sync)({ ...state, lock })}
          />
        ),
        facts: () => (
          <>
            <Fact id="this-repo" />
            <Fact id="allow-builds" />
            <Fact id="event-stream" />
            <Fact id="xz" />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <RegistryNote />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
