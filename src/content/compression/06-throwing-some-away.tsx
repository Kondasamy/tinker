// Chapter 6: throwing some away (lossy). The reader predicts what fewer shades do to the picture's size, turns the
// shades and block-size knobs, compares the pixels, then finds a setting that fits a size and difference budget. The
// copy says JPEG works on the same idea more cleverly, and links to Multimodal's patches.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { PICTURE, fileOf } from '../../lib/compression/files';
import { BLOCKS, LEVELS, NO_LOSS, lossOf, type Loss } from '../../lib/compression/lossy';
import { BUDGET } from '../../lib/compression/workbench';
import { PILE_PARTS, pilesOf } from '../../components/scenes/pileScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CompressionStage, Fact, FilesNote, PixelView, bytes, type View } from './kit';
import Select from '../../components/story/Select';

const MODULE = 'compression',
  ID = '06-throwing-some-away';
export const PARTS = PILE_PARTS;
const FILE = fileOf('picture');
const LOSSLESS = lossOf(PICTURE, NO_LOSS).size;
export const fits = (l: Loss) => {
  const x = lossOf(PICTURE, l);
  return x.size <= BUDGET.picture && x.diff <= BUDGET.diff;
};
/** every setting that fits chapter 6's budget, for Show me and the test */
export const FITS: Loss[] = LEVELS.flatMap(levels => BLOCKS.map(block => ({ levels, block }))).filter(fits);

export const P1 = {
  question: 'Fewer shades per colour: what happens to the packed size?',
  options: ['Much smaller', 'About the same', 'Bigger'],
};
/** 32 shades against all 256, both packed by the pair */
export const outcomeOf = () => {
  const s = lossOf(PICTURE, { levels: LEVELS[1], block: 1 }).size;
  return s < LOSSLESS * 0.7 ? 0 : s <= LOSSLESS ? 1 : 2;
};

export const QUIZ = {
  question: 'Which of Larkspur’s files should never be packed lossily?',
  options: ['The price list: one changed digit is a wrong price', 'A product photo', 'A background texture'],
  correct: 0,
  explanation: 'Lossy packing suits what eyes and ears forgive, never data that must come back exact.',
  why: [
    'Right: text and numbers must come back byte for byte, so they get lossless packing.',
    'A photo forgives a few lost shades; that is what JPEG relies on.',
    'A texture is the easiest case: nobody notices its detail missing.',
  ],
};

interface S extends Loss {
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Every way so far was lossless: every byte came back. Lossy packing throws some detail away first.',
    act: 'Predict what fewer shades do to the size.',
    say: { block: 'parcel', text: 'Barely shrank' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'shades',
    focus: 'knobs',
    visibleControls: ['p1', 'knobs'],
    narration: 'Your pick is locked. Each colour will round to the nearest of fewer shades.',
    act: 'Pick fewer shades.',
    predicate: s => s.levels < 256,
    hint: 'Choose any number under 256 in the Shades list.',
  },
  {
    id: 'look',
    focus: 'pixels',
    visibleControls: ['out1', 'knobs', 'pixels'],
    narration: 'Fewer shades, more repeats: the pair packs it far smaller. The difference score says how far it moved.',
    act: 'Compare in the Pixels tab.',
    predicate: s => s.view === 'detail',
  },
  {
    id: 'budget',
    focus: 'knobs',
    visibleControls: ['knobs', 'goal', 'blocks'],
    narration: 'Larkspur sets a budget for the picture: a size, and how far it may differ.',
    act: 'Find a setting that fits both.',
    say: { block: 'parcel', text: 'Fit this' },
    predicate: s => fits(s),
    hint: 'Blocks blur fast; try fewer shades with blocks of 1.',
    solution: s => ({ ...s, ...FITS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['knobs', 'fact', 'quiz'],
    narration: 'JPEG works the same way, more cleverly: it drops detail eyes miss, then packs the rest losslessly.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which file has to come back exactly right?',
  },
];

function Knobs({ s, set }: { s: S; set: (s: S) => void }) {
  const x = lossOf(PICTURE, s);
  return (
    <div className="cz-knobs">
      <div className="cz-field">
        <label htmlFor="cz-levels">Shades per colour</label>
        <Select id="cz-levels" value={s.levels} onChange={e => set({ ...s, levels: Number(e.target.value) })}>
          {LEVELS.map(l => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
      </div>
      <div className="cz-field">
        <label htmlFor="cz-block">Block size (pixels)</label>
        <Select id="cz-block" value={s.block} onChange={e => set({ ...s, block: Number(e.target.value) })}>
          {BLOCKS.map(b => (
            <option key={b} value={b}>
              {`${b} × ${b}`}
            </option>
          ))}
        </Select>
      </div>
      <p className="cz-headline" role="status" data-size={x.size} data-diff={x.diff}>
        <strong>{bytes(x.size)}</strong>
        {` · ${x.diff}% different`}
      </p>
      <FilesNote />
    </div>
  );
}

export default function ThrowingSomeAway() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...NO_LOSS, view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const x = lossOf(PICTURE, state);
        return (
          <CompressionStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              table: { piles: pilesOf(x.pic.rgb), parcel: { raw: FILE.bytes.length, packed: x.size } },
              detail: { name: 'Pixels', view: <PixelView before={PICTURE} after={x.pic} /> },
              caption: `${state.levels} shades, blocks of ${state.block}: ${bytes(x.size)}, ${x.diff}% different.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        // turning a knob is an attempt only while it is the step's own control
        knobs: ({ state, apply, sync, focused }) => <Knobs s={state} set={focused ? apply : sync} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        pixels: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, view: 'detail' })}>
            Open the Pixels tab
          </button>
        ),
        goal: () => (
          <p className="tc-status">{`Budget: at most ${bytes(BUDGET.picture)}, at most ${BUDGET.diff}% different. A planning number for this site.`}</p>
        ),
        blocks: () => (
          <>
            <Fact id="jpeg-blocks" />
            <p className="note">
              Our blocks are a cruder cut: each takes its average colour. Our fewer shades stand for JPEG’s rounding.
            </p>
          </>
        ),
        fact: () => (
          <>
            <Fact id="jpeg" />
            <p className="note">
              Models read pictures in patches, a cut of their own: see <a href="/multimodal/">Multimodal</a>.
            </p>
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
