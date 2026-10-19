// Final challenge (R18): one enterprise problem at a time; only its best RAG type is accepted, and every pick explains itself.
// Controlled: the chapter owns the Challenge state so Back, Reset and the saved run all cover it.
import { CHAPTERS, chapterHref } from '../../lib/chapters';

export const CHOICES = [
  { id: 'advanced', label: 'Naive / advanced' },
  { id: 'agentic', label: 'Agentic' },
  { id: 'graph', label: 'GraphRAG' },
  { id: 'selfcheck', label: 'Self-correcting' },
  { id: 'multimodal', label: 'Multimodal' },
] as const;
export type Choice = (typeof CHOICES)[number]['id'];

export interface Problem { id: string; text: string; best: Choice; why: string; weaker: Record<Choice, string> }

export const PROBLEMS: Problem[] = [
  {
    id: 'approver', best: 'graph',
    text: 'Procurement asks: who approves purchases for the team that owns the Kestrel K2 scanner integration?',
    why: 'The answer is a chain, scanner → owning team → approver, spread over two documents, and no single passage links them. A graph follows the relations hop by hop.',
    weaker: {
      advanced: 'One search matches one passage, and neither passage answers on its own.',
      agentic: 'More searches still match words. The approver’s sentence never mentions the scanner, so the agent reached only half the chain.',
      graph: '',
      selfcheck: 'Grading can say retrieval is weak, but it cannot find the missing link.',
      multimodal: 'Nothing here sits in a table, PDF or image.',
    },
  },
  {
    id: 'retired', best: 'advanced',
    text: 'HR says: answers about the travel policy keep citing a version that was retired years ago.',
    why: 'Retrieval works; the retired document simply outranks the current one. A metadata filter on status = current, an advanced-RAG lever, removes it in a single pass.',
    weaker: {
      advanced: '',
      agentic: 'Searching again fetches the retired version again, at the cost of an extra call.',
      graph: 'The problem is which version is current, not how people, teams or products relate.',
      selfcheck: 'The retired policy is relevant to the question, so it passes a relevance grade.',
      multimodal: 'The policies are already plain text.',
    },
  },
  {
    id: 'scanned', best: 'multimodal',
    text: 'Facilities says: the answer they need is only in a scanned vendor PDF.',
    why: 'A text-only pipeline never sees the PDF. Parsing it to text (and tables and images likewise) puts it in reach of retrieval.',
    weaker: {
      advanced: 'No filter or reranker helps with a file the pipeline cannot read.',
      agentic: 'Every extra search runs over the same text-only index.',
      graph: 'The graph is built from text the pipeline can read, so the PDF is not in it either.',
      selfcheck: 'The Evaluator will rightly say “I don’t know”, but it cannot read the PDF.',
      multimodal: '',
    },
  },
  {
    id: 'lookalike', best: 'selfcheck',
    text: 'Security says: the bot sometimes answers confidently from a look-alike document that uses the same words.',
    why: 'An evaluator grades what came back before the model answers. A weak match is thrown away, the question is retried as a rewrite, and if nothing passes the bot says “I don’t know”.',
    weaker: {
      advanced: 'Tuning can help for one question, but nothing checks the next look-alike before it is used.',
      agentic: 'An agent searches more, but it does not grade whether a match really answers the question.',
      graph: 'The look-alike is a single passage, not a missing relation.',
      selfcheck: '',
      multimodal: 'Both documents are plain text.',
    },
  },
  {
    id: 'lookups', best: 'agentic',
    text: 'Support says: some questions need a search, a look at what came back, and sometimes a follow-up search.',
    why: 'An agent sits between the retriever and the model, reads each result, and decides whether and how to search again, within a call budget.',
    weaker: {
      advanced: 'One pass searches once; it cannot react to what it found.',
      agentic: '',
      graph: 'A graph walk follows fixed relations; it does not decide what to look up next.',
      selfcheck: 'The Evaluator retries only with a rewrite of the same question, not a new lookup.',
      multimodal: 'The problem is the number of lookups, not the file format.',
    },
  },
];

export interface Challenge { at: number; picks: Record<string, Choice[]> }
export const START: Challenge = { at: 0, picks: {} };

export const solved = (c: Challenge, p: Problem) => (c.picks[p.id] ?? []).includes(p.best);
export const complete = (c: Challenge) => PROBLEMS.every(p => solved(c, p));
/** A pick on a solved problem changes nothing: the card accepts its best type once and stays solved. */
export function choose(c: Challenge, type: Choice): Challenge {
  const p = PROBLEMS[c.at];
  if (solved(c, p)) return c;
  return { ...c, picks: { ...c.picks, [p.id]: [...(c.picks[p.id] ?? []), type] } };
}
export const advance = (c: Challenge): Challenge =>
  solved(c, PROBLEMS[c.at]) && c.at < PROBLEMS.length - 1 ? { ...c, at: c.at + 1 } : c;

const label = (id: Choice) => CHOICES.find(t => t.id === id)!.label;
const ch = (id: string) => ({ href: chapterHref(id), n: CHAPTERS.findIndex(c => c.id === id) + 1 });
const CAN = [
  { text: 'Explain why a terabyte-scale knowledge base cannot simply go into the prompt.', chapters: ['02-why-not-stuff-it'] },
  { text: 'Tell whether a wrong answer came from retrieval missing the fact or the model mishandling it, and name the lever that fixes it.', chapters: ['04-layers', '05-accuracy'] },
  { text: 'Choose between naive/advanced, agentic, GraphRAG, self-correcting and multimodal RAG for a described problem.', chapters: ['06-types'] },
];

export default function TypeChallenge({ value: c, onChange }: { value: Challenge; onChange: (next: Challenge) => void }) {
  const p = PROBLEMS[c.at];
  const picks = c.picks[p.id] ?? [];
  const last = picks[picks.length - 1];
  const done = solved(c, p);
  return (
    <div className="challenge">
      <p className="count" aria-hidden="true">{PROBLEMS.map((q, i) => <span key={q.id} data-solved={solved(c, q) || undefined} data-current={i === c.at || undefined}>{solved(c, q) ? '✓' : i + 1}</span>)}</p>
      <fieldset className="quiz">
        <legend>Problem {c.at + 1} of {PROBLEMS.length}. {p.text}</legend>
        <div className="opts">
          {CHOICES.map(t => (
            <button key={t.id} type="button" className="chip" aria-pressed={picks.includes(t.id)} disabled={done && t.id !== p.best}
              data-wrong={(t.id !== p.best && picks.includes(t.id)) || undefined}
              onClick={() => onChange(choose(c, t.id))}>{t.label}</button>
          ))}
        </div>
        {last && (
          <div className="feedback" role="status">
            {done ? <>
              <span className="stamp correct">RIGHT</span>
              <p>{p.why}</p>
              <details>
                <summary>Why not the others?</summary>
                <ul>{CHOICES.filter(t => t.id !== p.best).map(t => <li key={t.id}><b>{t.label}:</b> {p.weaker[t.id]}</li>)}</ul>
              </details>
            </> : <>
              <span className="stamp wrong">NOT QUITE</span>
              <p>{label(last)}: {p.weaker[last]}</p>
            </>}
          </div>
        )}
      </fieldset>
      {done && c.at < PROBLEMS.length - 1 && <button type="button" className="big" onClick={() => onChange(advance(c))}>Next problem →</button>}
      {complete(c) && (
        <section className="closing" aria-label="Module complete">
          <h2>Module complete</h2>
          <p>You can now:</p>
          <ul>
            {CAN.map(x => <li key={x.text}>{x.text} {x.chapters.map(id => <a key={id} href={ch(id).href}>Chapter {ch(id).n}</a>)}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
