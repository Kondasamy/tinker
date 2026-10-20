// Chapter 4: judging the judge. The model judge grades every answer the team labelled by hand, under rubric r1 and then
// r2, and agreement with the people is computed (graders.ts agreement). The disagreements left under r2 are mostly the
// people's mistakes; the reader finds the one where the judge was wrong. Then side-by-side judging: a pair whose winner
// changes when the order swaps shows position bias, and the fix (judge both orders) is quoted from facts.json.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { PAIRS, QUESTIONS, VERSIONS, type Rubric, type Row, type VersionId } from '../../lib/evals/suite';
import { RUBRICS, REFERENCES, agreement, isCorrect, judged, label, pairwise, positionBias, type PairRows } from '../../lib/evals/graders';
import { fact } from '../../lib/evals/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Chips } from '../agents/kit';
import { EvalStage, Fact, Mark, WithSuite, suiteNow, useSuite, type Shown, type Suite } from './kit';

const MODULE = 'evals', ID = '04-judge-the-judge';
const VS: VersionId[] = ['v0', 'v1', 'v2'];
const RUBRIC_IDS: Rubric[] = ['r1', 'r2'];
const at = (id: string) => QUESTIONS.findIndex(q => q.id === id);

/** One labelled answer: a question and the evidence a version handed the model, once even if two versions share it. */
export interface Labelled { row: Row; key: string; versions: VersionId[] }
export function labelledOf(s: Suite): Labelled[] {
  const out = new Map<string, Labelled>();
  for (const v of VS) for (const r of s[v]) {
    const key = `${r.question}|${r.signature}`;
    if (!label(r.question, r.signature)) continue;
    const l = out.get(key);
    if (l) l.versions.push(v); else out.set(key, { row: r, key, versions: [v] });
  }
  return [...out.values()];
}
const agreeOf = (s: Suite, rb: Rubric) => agreement(labelledOf(s).map(l => l.row), rb);
const pass = (l: Labelled, rb: Rubric) => judged(l.row.question, l.row.signature, rb)!.pass;
const person = (l: Labelled) => label(l.row.question, l.row.signature)!;
const disagreements = (s: Suite, rb: Rubric) => labelledOf(s).filter(l => pass(l, rb) !== person(l).pass);
/** under r2, a disagreement where the judge, not the person, missed the right verdict */
const judgeWrong = (l: Labelled) => pass(l, 'r2') !== isCorrect(l.row.verdict);

export const pairRowsOf = (s: Suite): PairRows[] => PAIRS.map(p => ({
  ...p, sigA: s[p.a].find(r => r.question === p.question)!.signature, sigB: s[p.b].find(r => r.question === p.question)!.signature,
}));
/** the pair shown side by side: the first whose winner changes with the order, under the rubric the team now uses */
const PAIR_RUBRIC: Rubric = 'r2';
const pairOf = (s: Suite) => { const rows = pairRowsOf(s), q = positionBias(rows, PAIR_RUBRIC).flipped[0]; return rows.find(p => p.question === q)!; };
const verdicts = (p: PairRows, rb: Rubric) => ({ ab: pairwise(p.question, p.sigA, p.sigB, rb, 'ab')!, ba: pairwise(p.question, p.sigA, p.sigB, rb, 'ba')! });

interface S { p1: number | null; ran: boolean; rubric: Rubric; pick: string | null; p2: number | null; swapped: boolean; quiz: number | null }

const P1 = {
  question: `The judge grades every answer the team labelled, with rubric r1: “${RUBRICS.r1}” How often will it agree with the people?`,
  options: [
    'Nearly always: a clear, confident answer is usually a right one',
    'About half the time: the rubric asks how an answer sounds, not whether the documents back it',
    'Hardly ever: a model can’t grade another model',
  ],
};
// read off the computed agreement: three bands, so the reveal names the band the number fell in
const band = (agree: number, total: number) => (agree * 4 >= total * 3 ? 0 : agree * 4 >= total ? 1 : 2);

const P2 = {
  question: 'Now the same two answers go to the judge with B shown first. What will it pick?',
  options: [
    'The same answer as before: the answers didn’t change',
    'The other answer: it favours whichever one it reads first',
    'It calls them a tie',
  ],
};

const QUIZ = {
  question: 'The team tries a new prompt for the returns assistant. A judge compares each new reply with the old one, the new reply always shown first, and the new prompt wins most pairs. What should they do before believing it?',
  options: [
    'Nothing: the judge read both replies in full',
    'Judge every pair again with the old reply first, and count a win only when it holds both ways',
    'Ask the judge to explain each pick',
    'Make the new replies longer, so the judge has more to go on',
  ],
  correct: 1,
  explanation: fact('swap-orders').claim,
  why: [
    'Reading both doesn’t stop it favouring the one it read first. Here the new reply was always first, so position alone could explain the wins.',
    `Right. ${fact('swap-orders').claim}`,
    'An explanation is written after the pick, and reads as reasonable either way. The swapped run showed the same judge give a reason for each winner.',
    `That adds a second bias. ${fact('verbosity-bias').claim}`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict-agree', focus: 'p1', visibleControls: ['p1'],
    narration: 'The model judge is cheap and fast, but is it right? The team labelled every answer the first three versions gave: a person read each one and marked it pass or fail. That mark is a label. Agreement is how often the judge’s verdict matches the label. Before you run the judge over them:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-r1', focus: 'run', visibleControls: ['p1', 'run'],
    narration: 'Run the judge over every labelled answer. The Results tab lists each answer with the person’s verdict and the judge’s.',
    predicate: s => s.ran && !!suiteNow(),
  },
  {
    id: 'rubric', focus: 'rubric', visibleControls: ['out1', 'agree', 'rubric'],
    narration: `The judge passed answers the people failed: made-up policies that sound sure of themselves. Its rubric only asked how the answer sounds. The team rewrites it. Rubric r2: “${RUBRICS.r2}” Switch the judge to r2.`,
    predicate: s => s.rubric === 'r2',
    hint: 'Press “Rubric r2”.',
  },
  {
    id: 'who-was-wrong', focus: 'disagree', visibleControls: ['agree', 'disagree'],
    narration: 'Agreement rose. A few answers still split the judge and the people. Agreement treats the people as right, but people make mistakes too. Read each one against its reference answer, and find the one where the judge was wrong.',
    predicate: s => { const suite = suiteNow(); return !!suite && disagreements(suite, 'r2').some(l => l.key === s.pick && judgeWrong(l)); },
    hint: 'Compare each answer with its reference answer. Where the answer is wrong, did the person or the judge pass it?',
    solution: s => { const suite = suiteNow(); return suite ? { ...s, pick: disagreements(suite, 'r2').find(judgeWrong)!.key } : s; },
  },
  {
    id: 'predict-swap', focus: 'p2', visibleControls: ['found', 'pair', 'p2'],
    narration: 'So the labels get checked too. A judge can also compare. In side-by-side grading it sees two answers to the same question and picks the better one. Here A is v1’s answer and B is v2’s, A shown first, under rubric r2.',
    predicate: s => s.p2 !== null,
  },
  {
    id: 'swap', focus: 'swap', visibleControls: ['pair', 'p2', 'swap'],
    narration: 'Swap the order: B first, A second. Nothing else changes.',
    predicate: s => s.swapped,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['out2', 'pair', 'pairs', 'quiz'],
    narration: 'The answers didn’t change, only their order. A judge that picks by position is not grading the answers. The fix is to judge every pair both ways, and count a win only when it holds. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which choice would show whether the order decided the wins?',
  },
];

/** The agreement for each rubric run so far, as the engine computes it. */
function Agree({ s }: { s: S }) {
  const { suite } = useSuite();
  if (!suite) return null;
  const shown = s.rubric === 'r2' ? RUBRIC_IDS : ['r1' as Rubric];
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }}>
      <caption>Judge vs. people</caption>
      <thead><tr><th scope="col">Rubric</th><th scope="col">Agrees</th><th scope="col">Agreement</th></tr></thead>
      <tbody>
        {shown.map(rb => { const a = agreeOf(suite, rb); return (
          <tr key={rb} data-rubric={rb} data-changed={rb === s.rubric ? '' : undefined}>
            <th scope="row">{rb}</th><td>{a.agree} of {a.total}</td><td data-agreement>{a.text}</td>
          </tr>
        ); })}
      </tbody>
    </table>
  );
}

/** The labelled answers the judge and the people split on under r2: pick the one where the judge was wrong. */
function Disagree({ s, apply }: { s: S; apply: (n: S) => void }) {
  const { suite } = useSuite();
  if (!suite) return null;
  const rows = disagreements(suite, 'r2'), picked = rows.find(l => l.key === s.pick);
  return (
    <>
      <div role="group" aria-label="Where was the judge wrong?" className="ev-disagree">
        {rows.map(l => {
          const q = at(l.row.question);
          return (
            <button key={l.key} type="button" className="chip ev-split" aria-pressed={s.pick === l.key} onClick={() => apply({ ...s, pick: l.key })}>
              <span className="lbl">Q{q + 1} · {l.versions.map(v => VERSIONS[v].label).join(', ')}</span> {QUESTIONS[q].query}
              <span className="ev-said">Answer: “{l.row.answer.text}”</span>
              <span className="ev-said">Reference: {REFERENCES[l.row.question].answer}</span>
              <span className="ev-said">Person: {person(l).pass ? 'PASS' : 'FAIL'}{person(l).note ? ` (“${person(l).note}”)` : ''} · Judge: {pass(l, 'r2') ? 'PASS' : 'FAIL'}</span>
            </button>
          );
        })}
      </div>
      {picked && !judgeWrong(picked) && (
        <p className="tc-status" role="status">Here the person was wrong: the answer {isCorrect(picked.row.verdict) ? 'is right' : 'is wrong'}, and the judge said so. {judged(picked.row.question, picked.row.signature, 'r2')!.why}</p>
      )}
    </>
  );
}

/** The judge's pick for the shown pair: A first, and (once swapped) B first. */
function Pair({ s }: { s: S }) {
  const { suite } = useSuite();
  if (!suite) return null;
  const p = pairOf(suite), v = verdicts(p, PAIR_RUBRIC), text = (sig: string) => suite[p.a].concat(suite[p.b]).find(r => r.question === p.question && r.signature === sig)!.answer.text;
  const name = (w: 'a' | 'b') => (w === 'a' ? `A (${VERSIONS[p.a].label})` : `B (${VERSIONS[p.b].label})`);
  return (
    <div className="tc-def ev-pair" data-question={p.question}>
      <p className="lbl">Q{at(p.question) + 1}</p><p>{QUESTIONS[at(p.question)].query}</p>
      <p className="lbl">A, {VERSIONS[p.a].label}</p><p>“{text(p.sigA)}”</p>
      <p className="lbl">B, {VERSIONS[p.b].label}</p><p>“{text(p.sigB)}”</p>
      <p data-order="ab"><strong>A shown first:</strong> the judge picks {name(v.ab.winner)}. “{v.ab.why}”</p>
      {s.swapped && <p data-order="ba"><strong>B shown first:</strong> the judge picks {name(v.ba.winner)}. “{v.ba.why}”</p>}
    </div>
  );
}

/** Every side-by-side pair judged both ways: a win counts only when it holds, otherwise a tie. */
function Pairs() {
  const { suite } = useSuite();
  if (!suite) return null;
  const rows = pairRowsOf(suite);
  return (
    <div className="tc-def">
      <table className="tc-ledger">
        <caption>Every pair, judged both ways (rubric {PAIR_RUBRIC})</caption>
        <thead><tr><th scope="col">Question</th><th scope="col">A first</th><th scope="col">B first</th><th scope="col">Counts as</th></tr></thead>
        <tbody>
          {rows.map(p => { const v = verdicts(p, PAIR_RUBRIC), same = v.ab.winner === v.ba.winner; return (
            <tr key={p.question} data-changed={same ? undefined : ''}>
              <th scope="row">Q{at(p.question) + 1}</th><td>{v.ab.winner.toUpperCase()}</td><td>{v.ba.winner.toUpperCase()}</td><td>{same ? `${v.ab.winner.toUpperCase()} wins` : 'a tie'}</td>
            </tr>
          ); })}
        </tbody>
      </table>
      <p>{RUBRIC_IDS.map(rb => { const b = positionBias(rows, rb); return `Under ${rb}, ${b.flipped.length} of ${b.total} pairs change winner when the order swaps.`; }).join(' ')}</p>
      <Fact id="position-bias" />
      <Fact id="swap-orders" />
    </div>
  );
}

const show = (s: S) => (suite: Suite): Shown => {
  const ls = labelledOf(suite), a = agreeOf(suite, s.rubric);
  return {
    scene: s.ran
      ? { results: ls.map(l => pass(l, s.rubric) === person(l).pass), board: `${s.rubric} AGREES ${a.agree}/${a.total}` }
      : { results: ls.map(() => true), graded: 0, board: `${ls.length} LABELLED ANSWERS` },
    cols: [],
    caption: s.ran
      ? `The judge under rubric ${s.rubric} agrees with the people on ${a.agree} of ${a.total} labelled answers (${a.text}). A pass here means they agree.`
      : `${ls.length} answers the people labelled, waiting for the judge.`,
    table: (
      <table className="tc-ledger ev-table ev-labels">
        <caption>Labelled answers: the person and the judge{s.ran ? ` (rubric ${s.rubric})` : ''}</caption>
        <thead><tr><th scope="col">Question</th><th scope="col">Answer</th><th scope="col">Person</th><th scope="col">Judge</th></tr></thead>
        <tbody>
          {ls.map(l => { const split = s.ran && pass(l, s.rubric) !== person(l).pass; return (
            <tr key={l.key} data-changed={split ? '' : undefined}>
              <th scope="row">Q{at(l.row.question) + 1} · {l.versions.map(v => VERSIONS[v].label).join(', ')}</th>
              <td>{l.row.answer.text}</td>
              <td><Mark ok={person(l).pass} /></td>
              <td>{s.ran ? <><Mark ok={pass(l, s.rubric)} />{split && <span className="ev-wrong"> split</span>}</> : 'not run'}</td>
            </tr>
          ); })}
        </tbody>
      </table>
    ),
  };
};

export default function JudgeTheJudge() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, ran: false, rubric: 'r1', pick: null, p2: null, swapped: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => <EvalStage show={show(state)} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        run: ({ state, sync }) => (
          <WithSuite>{() => <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>Run the judge (rubric r1) over every labelled answer</button>}</WithSuite>
        ),
        out1: ({ state }) => <WithSuite>{suite => { const a = agreeOf(suite, 'r1'); return <Outcome {...P1} prediction={state.p1} outcome={band(a.agree, a.total)} />; }}</WithSuite>,
        agree: ({ state }) => <Agree s={state} />,
        rubric: ({ state, apply }) => <Chips label="The judge’s rubric" values={RUBRIC_IDS} value={state.rubric} name={v => `Rubric ${v}`} pick={v => apply({ ...state, rubric: v })} />,
        disagree: ({ state, apply }) => <Disagree s={state} apply={apply} />,
        found: ({ state }) => <WithSuite>{suite => { const l = disagreements(suite, 'r2').find(x => x.key === state.pick); return l && (
          <div className="tc-def"><p className="tc-status">The judge was wrong on Q{at(l.row.question) + 1}. It passed an answer the reference doesn’t back: {l.row.answer.why}</p><Fact id="agreement-imbalance" /></div>
        ); }}</WithSuite>,
        pair: ({ state }) => <Pair s={state} />,
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        swap: ({ state, sync }) => <button type="button" className="big" onClick={() => sync({ ...state, swapped: true })}>Swap the order: B first</button>,
        out2: ({ state }) => <WithSuite>{suite => { const v = verdicts(pairOf(suite), PAIR_RUBRIC); return <Outcome {...P2} prediction={state.p2} outcome={v.ab.winner === v.ba.winner ? 0 : 1} />; }}</WithSuite>,
        pairs: () => <Pairs />,
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
