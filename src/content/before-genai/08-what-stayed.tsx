// Chapter 8: what GenAI didn't fix (R7). Four gaps, one step each: the reader picks the later module that fixes it
// from the registry (made-up answer → Evals, no company knowledge → RAG, can't act → Tool calling, says what it
// shouldn't → Guardrails). Each step shows its message and GenAI's recorded reply, or that none is recorded yet; the copy
// names the gap, never what the reply says (R13). The last step hands the reader to RAG's intro.
import StepRunner from '../../components/story/StepRunner';
import Select from '../../components/story/Select';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { KIOSK_PARTS, outcomes } from '../../components/scenes/kioskScene';
import { messageOf, type Run, run } from '../../lib/before-genai/bots';
import { FIXERS, type Fixer, GAPS, HANDOFF } from './lessons';
import { moduleOf, nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { BeforeGenaiStage, Fact, Transcript } from './kit';

const MODULE = 'before-genai',
  ID = '08-what-stayed';
export const PARTS = KIOSK_PARTS;

export { FIXERS, type Fixer, GAPS, HANDOFF };
type Gap = (typeof GAPS)[number];
const RUNS = Object.fromEntries(GAPS.map(g => [g.id, run(messageOf(g.message))])) as Record<Gap['id'], Run>;

export interface S {
  picks: Partial<Record<Gap['id'], Fixer>>;
  quiz: number | null;
}
export const INITIAL: S = { picks: {}, quiz: null };

export const QUIZ = {
  question: 'Larkspur’s website bot tells a customer about a refund rule that doesn’t exist. Who answers for it?',
  options: ['Larkspur, which runs the bot', 'The company that made the model', 'No one: a bot’s reply is no promise'],
  correct: 0,
  explanation: 'A tribunal held Air Canada responsible for what the chatbot on its website told a customer.',
  why: [
    'Right: a tribunal held Air Canada responsible for what its website’s chatbot told a customer.',
    'The tribunal held the airline answerable, since its chatbot is part of its own website.',
    'The tribunal treated the chatbot’s words as the airline’s, like any other page on its site.',
  ],
};

const fixed = (g: Gap) => (s: S) => s.picks[g.id] === g.fix;
const ACT = 'Pick the module that fixes it.';
export const STEPS: Step<S>[] = [
  {
    id: GAPS[0].id,
    focus: GAPS[0].id,
    visibleControls: [GAPS[0].id],
    narration:
      'Larkspur has no Price Promise, and never told the assistant its policies. Any detail it gives is a guess.',
    act: 'Which module catches a made-up answer?',
    say: { block: 'model', text: 'Had to guess' },
    predicate: fixed(GAPS[0]),
    hint: 'Which module checks the answers?',
  },
  {
    id: GAPS[1].id,
    focus: GAPS[1].id,
    visibleControls: [GAPS[0].id, GAPS[1].id],
    narration:
      'Tests on its answers catch made-up ones. Larkspur’s refund policy answers this next one; the assistant never read it.',
    act: ACT,
    say: { block: 'model', text: 'Never read it' },
    predicate: fixed(GAPS[1]),
    hint: 'Which module hands it Larkspur’s documents?',
  },
  {
    id: GAPS[2].id,
    focus: GAPS[2].id,
    visibleControls: [GAPS[1].id, GAPS[2].id],
    narration: 'Larkspur’s documents fix that. This customer wants a refund paid; the assistant can only write words.',
    act: ACT,
    say: { block: 'model', text: 'Only writes' },
    predicate: fixed(GAPS[2]),
    hint: 'Which module lets it do things?',
  },
  {
    id: GAPS[3].id,
    focus: GAPS[3].id,
    visibleControls: [GAPS[2].id, GAPS[3].id],
    narration: 'Tools let it act. Here it refused risky wiring advice, but no Larkspur rule made it.',
    act: ACT,
    say: { block: 'model', text: 'No rule made it' },
    predicate: fixed(GAPS[3]),
    hint: 'Which module makes the refusal a rule?',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: [GAPS[3].id, 'facts', 'handoff', 'quiz'],
    narration:
      'Guardrails make the refusal a rule, every time. And when a bot gets it wrong, the company answers for it.',
    act: 'One question to finish.',
    say: { block: 'kiosk', text: 'Larkspur’s bot' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Whose website is the bot on?',
  },
];

/** One gap: the message and GenAI's reply (or that it isn't recorded), the module Select, and what the pick does. */
function GapPick({ g, s, apply, focused }: { g: Gap; s: S; apply: (s: S) => void; focused: boolean }) {
  const pick = s.picks[g.id],
    right = pick === g.fix,
    mod = moduleOf(g.fix);
  return (
    <>
      <Transcript run={RUNS[g.id]} bots={['genai']} />
      <p className="bg-pick">
        <label>
          Which module fixes it?{' '}
          <Select
            value={pick ?? ''}
            disabled={!focused || right}
            onChange={e => apply({ ...s, picks: { ...s.picks, [g.id]: e.target.value as Fixer } })}
          >
            <option value="">Choose a module</option>
            {(Object.keys(FIXERS) as Fixer[]).map(id => (
              <option key={id} value={id}>
                {moduleOf(id).title}
              </option>
            ))}
          </Select>
        </label>
      </p>
      {pick && (
        <p className="note" role="status">
          {right ? `${mod.title}: it ${FIXERS[g.fix]}.` : `Not ${moduleOf(pick).title}: it ${FIXERS[pick]}.`}
        </p>
      )}
      {right && 'cite' in g && <Fact id={g.cite} />}
    </>
  );
}

export default function WhatStayed() {
  const next = moduleOf(HANDOFF);
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={INITIAL}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        // the gap being worked on: the first one not yet fixed, else the last
        const g = GAPS.find(g => !fixed(g)(state)) ?? GAPS[GAPS.length - 1],
          r = RUNS[g.id];
        return <BeforeGenaiStage run={r} say={say} caption={`“${r.message.text}”: GenAI ${outcomes(r).genai}.`} />;
      }}
      controls={{
        ...Object.fromEntries(
          GAPS.map(g => [
            g.id,
            (p: { state: S; apply: (s: S) => void; focused: boolean }) => (
              <GapPick g={g} s={p.state} apply={p.apply} focused={p.focused} />
            ),
          ]),
        ),
        facts: () => <Fact id="air-canada" />,
        handoff: () => (
          <p>
            <a href={`/${next.id}/`}>{`Continue the story: ${next.title} →`}</a>
          </p>
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
