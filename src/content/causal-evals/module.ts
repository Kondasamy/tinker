// Why did it fail?: the module's registry entry (KTD1). Chapter ids are a contract with readers' saved progress: never
// rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RUNS } from '../../lib/causal-evals/runs';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-the-failed-run',
    title: 'The failed run',
    short: 'Failed run',
    intro: {
      story:
        'Dana’s mower blade snapped. Larkspur’s assistant took eight steps and sent her the wrong blade. Inés lays the run out as a marble run.',
      goal: 'How does one step’s output travel to the end of a run?',
      learn: ['A run is steps in order, each reading earlier ones', 'Why a failure shows at the end'],
      terms: [
        ['Run', 'Every step an assistant took on one task, in order, with what each step wrote down.'],
        ['Outcome', 'Where a run ends: the right thing sent, the wrong thing, or nothing.'],
      ],
    },
  },
  {
    id: '02-blame-the-last-step',
    title: 'Blame the last step',
    short: 'Blame the last',
    intro: {
      story:
        'The wrong blade went out at piece 8, the run’s last step. The quick fix is to blame that step and change it.',
      goal: 'Does changing the step where it went wrong fix the run?',
      learn: ['Where a failure shows is not always where it began', 'What finding the cause asks of you'],
      terms: [
        ['Swap', 'Replacing one step’s output with a different one it could have written.'],
        ['Failure attribution', 'Finding which step of a run caused it to fail.'],
      ],
    },
  },
  {
    id: '03-replay-one-change',
    title: 'Replay with one change',
    short: 'One change',
    intro: {
      story: 'Changing piece 8 fixed nothing. Inés puts it back and tries other pieces, one at a time.',
      goal: 'Which step, swapped on its own, flips the run to the right blade?',
      learn: ['Change one step, keep everything else', 'The change that flips the outcome is the cause'],
      terms: [
        ['Replay', 'Rolling the run again from the start with one thing changed and the same dice.'],
        ['Cause', 'The earliest step whose fix turns the failure into a success.'],
      ],
    },
  },
  {
    id: '04-take-a-piece-out',
    title: 'Take a piece out',
    short: 'Take one out',
    intro: {
      story:
        'Swapping piece 3 found the cause. Another test takes a piece out entirely, to see which steps the run needs.',
      goal: 'What happens when you take one step out of the run?',
      learn: ['Which steps the outcome depends on', 'Why taking a step out is not the same as fixing it'],
      terms: [['Ablation', 'Taking one step out of a run and rolling it again, to see what still works.']],
    },
  },
  {
    id: '05-break-it-on-purpose',
    title: 'Break it on purpose',
    short: 'Break it',
    intro: {
      story:
        'Piece 3 is fixed and the right blade goes out. Before it ships, Inés wants to see how the run copes with a broken tool.',
      goal: 'What does the run do when a tool it calls stops answering?',
      learn: ['Break one part on purpose and watch', 'A run needs a plan for the tool that fails'],
      terms: [
        ['Fault injection', 'Breaking one part on purpose, such as a tool, to see how the run copes.'],
        ['Timeout', 'A tool call that takes too long, so the run gives up waiting.'],
        ['Retry', 'Asking a tool again after its call failed.'],
      ],
    },
  },
  {
    id: '06-many-runs',
    title: 'Many runs',
    short: 'Many runs',
    intro: {
      story:
        'One replay found the cause. But the assistant rolls dice when it picks a part, so two replays can land differently.',
      goal: 'How many replays does it take to trust a cause?',
      learn: ['One replay can be luck', 'Compare many replays with the unchanged run'],
      terms: [['Seeded replay', 'A replay whose dice start from a set number, so anyone can repeat it exactly.']],
    },
  },
  {
    id: '07-workbench',
    title: `Workbench: ${RUNS.length} failed runs`,
    short: 'Workbench',
    intro: {
      story:
        'You have swapped, taken out and broken pieces, and rolled many times. Now four failed runs wait on the bench.',
      goal: 'Can you find each run’s cause within the replay budget?',
      learn: ['Read the steps before you spend a replay', 'Name a cause only once its swap flipped the run'],
      terms: [],
    },
  },
];

export const CAUSAL_EVALS_MODULE: Module = {
  id: 'causal-evals',
  title: 'Why did it fail?',
  description:
    'Replay a run with one thing changed, break parts on purpose, and find the step that really caused a failure.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['evals', 'observability'],
  story:
    'Larkspur Supply Co.’s assistant sent a customer the wrong replacement blade. Inés lays its run out as a wooden marble run, one piece per step, and replays it to find the cause.',
  chapters: CHAPTERS,
  recall: RECALL,
};
