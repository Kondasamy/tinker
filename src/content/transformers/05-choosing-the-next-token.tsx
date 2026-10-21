// Chapter 5: choosing the next token. Larkspur mini writes on from a prompt with the seeded sampler: greedy at
// temperature 0, then the reader predicts what raising the temperature does to the bar, moves the temperature and
// top-p sliders (native range inputs over TEMPERATURES and TOP_PS) and rolls seeds. Every continuation is a pure
// function of the saved settings and seed, so a reload shows the same text. The prediction's answer is read off the
// live entropy, never typed.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { encode } from '../../lib/lm/bpe';
import { forward, type Model } from '../../lib/lm/model';
import { PROMPTS, topK } from '../../lib/transformers/trace';
import { TEMPERATURES, TOP_PS, distribution, entropy, sample } from '../../lib/transformers/sample';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };
import '../../components/scenes/scenes.css';
import { Fact, TransformersStage, Waiting, useModel, whenLoaded, type View } from './kit';

const MODULE = 'transformers', ID = '05-choosing-the-next-token';
export const PROMPT = PROMPTS.find(p => p.id === 'delivery')!;
/** Tokens written per draw. */
export const STEPS_WRITTEN = 8;
/** The slider positions the chapter starts and reveals at. */
const T0 = TEMPERATURES.indexOf(0), T1 = TEMPERATURES.indexOf(1), HOT = TEMPERATURES.indexOf(1.5), P_ALL = TOP_PS.indexOf(1);
/** How many temperatures and top-p values the reader tries. */
const TRY_T = 3, TRY_P = 2;

/** A slider position's value, clamped into the list (a run saved before the list changed). */
const at = (xs: number[], i: number) => xs[Math.max(0, Math.min(xs.length - 1, i))];
const tempOf = (i: number) => at(TEMPERATURES, i), topOf = (i: number) => at(TOP_PS, i);

const logitsOf = (m: Model) => forward(m, encode(PROMPT.text)).logits.at(-1)!;
/** The next-token distribution after the prompt under a temperature and top-p. */
export const distOf = (m: Model, t: number, p: number) => distribution(logitsOf(m), t, p);
/** The prompt's continuation for the saved settings and seed: the same inputs always give the same text. */
export const continuation = (m: Model, s: { t: number; p: number; seed: number }) => sample(m, PROMPT.text, tempOf(s.t), topOf(s.p), s.seed, STEPS_WRITTEN).text;
/** 0 when raising the temperature from 1 to 1.5 flattens the bar (entropy rises), else 1: read off the model. */
export function outcomeOf(m: Model): number {
  return entropy(distOf(m, 1.5, 1)) > entropy(distOf(m, 1, 1)) ? 0 : 1;
}
/** How many tokens top-p keeps at a setting. */
export const keptOf = (m: Model, t: number, p: number) => distOf(m, tempOf(t), topOf(p)).filter(x => x > 0).length;

interface S { t: number; p: number; seed: number; drawn: boolean; temps: number[]; tops: number[]; p1: number | null; revealed: boolean; view: View; quiz: number | null }

const P1 = {
  question: 'Next you’ll raise the temperature from 1 to 1.5. What will happen to the bar of next-token probabilities?',
  options: [
    'It flattens: the likeliest token loses some share, the unlikely ones gain',
    'It sharpens: the likeliest token gets even more',
    'Nothing: temperature only changes which token is picked, not the probabilities',
  ],
};

const QUIZ = {
  question: 'Larkspur’s order-status bot must quote the same delivery promise word for word every time. A teammate turns the temperature up to 1.5 “so it sounds less robotic”. What happens?',
  options: [
    'The promise comes out the same, just with friendlier words around it',
    'The replies vary from run to run, and unlikely tokens get picked more often, so the promise can come out wrong',
    'The model gets more creative, so it knows more ways to say the promise correctly',
    'Nothing changes unless top-p is changed too',
  ],
  correct: 1,
  explanation: 'A higher temperature flattens the probabilities, so the sampler picks unlikely tokens more often. For text that must not change, keep the temperature low (0 always picks the likeliest).',
  why: [
    'The temperature applies to every token, the promise’s too. You saw the continuation drift off the documents at 1.5.',
    'Right. Temperature changes the probabilities the sampler draws from; a flatter bar means more surprising tokens, wanted or not.',
    'Temperature adds no knowledge. It reshapes the same probabilities; the model knows exactly what it knew before.',
    'Temperature works on its own: you saw the bar flatten with top-p left at 1.',
  ],
};

const tName = (i: number) => `${tempOf(i)}`;
/** A continuation in quotes, its line breaks shown as ↵. */
const shown = (text: string) => `“${text.replace(/\n/g, '↵')}”`;

export const STEPS: Step<S>[] = [
  {
    id: 'greedy', focus: 'write', visibleControls: ['write'],
    narration: `Larkspur mini gives every token a probability. Something still has to pick one. Picking the likeliest every time is called greedy, and it is what a temperature of 0 does. Let it write ${STEPS_WRITTEN} tokens after “${PROMPT.text}”.`,
    predicate: whenLoaded(s => s.drawn),
    hint: 'Press the button. If the model is still loading, wait for the picture to settle.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: 'Greedy writes the same thing every time. Most assistants sample instead: they pick at random, in proportion to each token’s probability. The temperature reshapes the probabilities first. Before you move it:',
    setup: s => ({ ...s, t: T1 }),
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal', focus: 'reveal', visibleControls: ['p1', 'reveal'],
    narration: 'Locked in. The bar under the attention grid shows the probabilities the sampler draws from.',
    predicate: s => s.revealed,
  },
  {
    id: 'temperature', focus: 'temperature', visibleControls: ['out1', 'temperature', 'write'],
    narration: 'The model’s raw scores for each token are called logits. Temperature divides them before they become probabilities: below 1 the gaps widen and the bar sharpens, above 1 it flattens. Try other temperatures, and roll a new seed to see another draw at the same setting.',
    predicate: s => s.temps.length >= TRY_T,
    hint: `Move the temperature slider to ${TRY_T} different settings.`,
  },
  {
    id: 'top-p', focus: 'top-p', visibleControls: ['temperature', 'top-p', 'write'],
    narration: 'At high temperatures the sampler sometimes picks a token from the long tail, and the text goes off the rails. Top-p cuts the tail first: it keeps only the likeliest tokens whose probabilities add up to p, and draws from those. Lower top-p and watch how many tokens it keeps.',
    predicate: s => s.tops.length >= TRY_P && s.p !== P_ALL,
    hint: 'Move the top-p slider below 1.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['quiz'],
    narration: 'The seed is why your draws repeat: the same seed and settings always give the same text, here and after a reload. A real assistant draws a new seed each time, which is why the same question can get different replies. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a higher temperature do to the unlikely tokens?',
  },
];

function Slider({ label, value, max, text, valueText, onChange, ends }: { label: string; value: number; max: number; text: string; valueText: string; onChange: (i: number) => void; ends: [string, string] }) {
  return (
    <label className="slider">
      <span>{label}: <strong>{text}</strong></span>
      <input type="range" min={0} max={max} step={1} value={value} aria-valuetext={valueText} onChange={e => onChange(Number(e.target.value))} />
      <span className="ends"><span>{ends[0]}</span><span>{ends[1]}</span></span>
    </label>
  );
}

export default function ChoosingTheNextToken() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ t: T0, p: P_ALL, seed: 1, drawn: false, temps: [], tops: [], p1: null, revealed: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => (
        <TransformersStage prompt={PROMPT.text} view={state.view} onView={v => sync({ ...state, view: v })}
          next={model ? topK(distOf(model, tempOf(state.t), topOf(state.p)), 5) : undefined}
          caption={`The bar: what the sampler draws from at temperature ${tName(state.t)}, top-p ${topOf(state.p)}. Computed live from Larkspur mini.`} />
      )}
      controls={{
        write: ({ state, apply, sync }) => {
          if (!model) return <Waiting />;
          if (!state.drawn) return <button type="button" className="big" onClick={() => apply({ ...state, drawn: true })}>Write {STEPS_WRITTEN} tokens</button>;
          return (
            <>
              <p className="tc-status" role="status" data-continuation>{`Temperature ${tName(state.t)}, top-p ${topOf(state.p)}, seed ${state.seed}. Larkspur mini wrote: ${shown(continuation(model, state))}`}</p>
              {state.t !== T0 && <button type="button" className="chip" onClick={() => sync({ ...state, seed: state.seed + 1 })}>Roll a new seed</button>}
            </>
          );
        },
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => <button type="button" className="chip" onClick={() => apply({ ...state, revealed: true, t: HOT, temps: [T1, HOT], view: 'attn' })}>Raise the temperature to {tName(HOT)}</button>,
        out1: ({ state }) => model ? <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(model)} /> : <Waiting />,
        temperature: ({ state, sync }) => {
          const top = model ? Math.max(...distOf(model, tempOf(state.t), topOf(state.p))) : 0;
          const read = `the likeliest token gets ${top.toFixed(2)}`;
          return (
            <>
              <Slider label="Temperature" value={state.t} max={TEMPERATURES.length - 1} text={tName(state.t)} valueText={`${tName(state.t)}: ${read}`} ends={['0, always the likeliest', 'Flatter']}
                onChange={t => sync({ ...state, t, view: 'attn', temps: [...new Set([...state.temps, t])] })} />
              <p className="tc-status">{`At ${tName(state.t)}, ${read}.`}</p>
            </>
          );
        },
        'top-p': ({ state, sync }) => {
          const kept = model ? keptOf(model, state.t, state.p) : 0;
          return (
            <>
              <Slider label="Top-p" value={state.p} max={TOP_PS.length - 1} text={`${topOf(state.p)}`} valueText={`${topOf(state.p)}: keeps ${kept} tokens`} ends={['Only the likeliest', 'Keep every token']}
                onChange={p => sync({ ...state, p, view: 'attn', tops: [...new Set([...state.tops, p])] })} />
              <p className="tc-status">{state.t === T0 ? 'At temperature 0 only the likeliest token is ever picked, so top-p changes nothing. Raise the temperature to see it work.' : `Top-p ${topOf(state.p)} keeps ${kept} of the ${META.model.vocab} tokens.`}</p>
            </>
          );
        },
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
            <Fact id="temperature-logits" />
            <Fact id="top-p" />
          </>
        ),
      }}
    />
  );
}
