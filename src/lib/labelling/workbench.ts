// Chapter 7's workbench (KTD9): a labelling budget for the 80 unchecked pool tickets. Labels per ticket (one person,
// or a vote of every kept labeller), how many gold tickets each person labels first (a person scoring under the gold
// bar is dropped), and who labels chapter 6's twenty hardest tickets: people, the main model, or both models with
// people only where the models disagree. Costs are planning numbers (data/labelling/workbench.json). Results and
// WINNERS are pinned in pinned.json and recomputed by measure() and solve() in a test, never at import.
import pinned from '../../../data/labelling/pinned.json' with { type: 'json' };
import bench from '../../../data/labelling/workbench.json' with { type: 'json' };
import { accuracy } from './agree';
import { fact } from './facts';
import { simulateLabels } from './simulate';
import {
  GOLD,
  HARD,
  INTENT_IDS,
  type Intent,
  indexOf,
  LABELLERS,
  type LabellerId,
  labelsOf,
  MODELS,
  type ModelKey,
  TRUTH,
  ticketOf,
  UNCHECKED,
} from './story';
import { majority } from './vote';

export const BENCH = bench;
/** A model's label costs what Gilardi et al. measured (matched); a person's is a planning number. */
export const COSTS = { ...bench.costs, model: Number(fact('model-labellers').value) };
/** A labeller whose gold score falls below this is dropped (chapter 4). */
export const GOLD_BAR = bench.goldBar;
export type Hard = 'people' | 'model' | 'check';
export interface Setup {
  votes: number;
  /** gold tickets each person labels first */
  gold: number;
  hard: Hard;
}
export interface Result extends Setup {
  right: number;
  tickets: number;
  personLabels: number;
  modelLabels: number;
  /** dollars, rounded to the cent */
  cost: number;
  dropped: LabellerId[];
}
export const START = bench.start as Setup;
export const SETUPS: Setup[] = bench.votes.flatMap(votes =>
  bench.gold.flatMap(gold => (bench.hard as Hard[]).map(hard => ({ votes, gold, hard }))),
);

/** A model labeller's label for a ticket: recorded, or simulated where the recording has none (KTD13). */
export function modelLabel(k: ModelKey, id: string): Intent {
  return MODELS[k].labels[id] ?? simulateLabels([ticketOf(id)], INTENT_IDS)[id];
}

/** Gold score of each labeller on the first n gold tickets. */
export const goldScores = (n: number) =>
  Object.fromEntries(
    LABELLERS.map(l => [
      l.id,
      accuracy(
        labelsOf(l.id),
        TRUTH,
        GOLD.slice(0, n).map(t => indexOf(t.id)),
      ),
    ]),
  ) as Record<LabellerId, number>;

export function measure(s: Setup): Result {
  const scores = s.gold ? goldScores(s.gold) : null;
  const kept = LABELLERS.map(l => l.id).filter(id => !scores || scores[id] >= GOLD_BAR);
  let personLabels = s.gold * LABELLERS.length,
    modelLabels = 0,
    right = 0,
    turn = 0;
  const people = (i: number) => {
    if (s.votes === 1) {
      personLabels++;
      return labelsOf(kept[turn++ % kept.length])[i];
    }
    personLabels += kept.length;
    return majority(kept.map(id => labelsOf(id)[i]));
  };
  for (const t of UNCHECKED) {
    const i = indexOf(t.id);
    let label: Intent;
    if (!HARD.includes(t.id) || s.hard === 'people') label = people(i);
    else if (s.hard === 'model') {
      modelLabels++;
      label = modelLabel('main', t.id);
    } else {
      modelLabels += 2;
      const a = modelLabel('main', t.id);
      label = a === modelLabel('check', t.id) ? a : people(i);
    }
    if (label === t.intent) right++;
  }
  const cost = Math.round((personLabels * COSTS.person + modelLabels * COSTS.model) * 100) / 100;
  return {
    ...s,
    right,
    tickets: UNCHECKED.length,
    personLabels,
    modelLabels,
    cost,
    dropped: LABELLERS.map(l => l.id).filter(id => !kept.includes(id)),
  };
}

export const share = (r: Result) => r.right / r.tickets;
export const passes = (r: Result) => share(r) >= bench.bar;

/** Of the setups that reach the bar, the cheapest (every one tied). */
export function solve(results: readonly Result[]): Setup[] {
  const ok = results.filter(passes),
    least = Math.min(...ok.map(r => r.cost));
  return ok.filter(r => r.cost === least).map(({ votes, gold, hard }) => ({ votes, gold, hard }));
}

const same = (a: Setup, b: Setup) => a.votes === b.votes && a.gold === b.gold && a.hard === b.hard;
export const RESULTS = ((pinned as { workbench?: { results: Result[] } }).workbench?.results ?? []) as Result[];
export const resultOf = (s: Setup) => RESULTS.find(r => same(r, s))!;
/** the pinned solution (KTD9): the test fails if solve() drifts from it */
export const WINNERS = ((pinned as { workbench?: { winners: Setup[] } }).workbench?.winners ?? []) as Setup[];
export const wins = (s: Setup) => WINNERS.some(w => same(w, s));
