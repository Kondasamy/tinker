// Chapter 7's workbench (KTD11, as the orchestrator redefined quality): tokens a pass (k) and a remasking rule for each
// kind of reply. A kind passes when every one of its pinned phrases' replies keeps the team's bars: enough tokens
// matching the careful fill, and few enough repeats. Cost is passes a reply, ⌈16 / k⌉, summed over the kinds. Every
// plan that passes every kind with the fewest passes wins (WINNERS). Replies are read from prompts.json, the fills
// train_mlm.py pinned (the decode test writes them again live); WINNERS is pinned in pinned.json and recomputed by a
// test (solve), never at import (KTD12).
import data from '../../../data/diffusion-llms/workbench.json' with { type: 'json' };
import PINNED from '../../../data/diffusion-llms/prompts.json' with { type: 'json' };
import pinned from '../../../data/diffusion-llms/pinned.json' with { type: 'json' };
import { KS, L, RULES, passesFor, type K, type Rule } from './decode';

export type KindId = 'answers' | 'release' | 'notes';
export interface Kind {
  id: KindId;
  label: string;
  /** the pinned phrases (by seed) a kind is tried on */
  cases: number[];
  /** the fewest tokens of 16 that must match the careful fill */
  agree: number;
  /** the most tokens that may repeat the one before */
  repeat: number;
  reason: string;
}
export const KINDS = data.kinds as Kind[];
export const KIND_IDS = KINDS.map(k => k.id);

export interface Choice {
  k: K;
  rule: Rule;
}
export type Plan = Record<KindId, Choice>;
export const CHOICES: Choice[] = KS.flatMap(k => RULES.map(rule => ({ k, rule })));

type Reply = { ids: number[]; agree: number; repeat: number };
export interface Phrase {
  seed: number;
  text: string;
  ids: number[];
  replies: Record<Rule, Record<string, Reply>>;
}
export const PHRASES = PINNED.prompts as unknown as Phrase[];
export const phrase = (seed: number) => PHRASES.find(p => p.seed === seed)!;

/** One case: a phrase's pinned reply under a choice, against its kind's bars. */
export interface Case {
  seed: number;
  reply: number[];
  agree: number;
  repeat: number;
  ok: boolean;
}
export function casesOf(kind: Kind, c: Choice): Case[] {
  return kind.cases.map(seed => {
    const r = phrase(seed).replies[c.rule][c.k];
    return { seed, reply: r.ids, agree: r.agree, repeat: r.repeat, ok: r.agree >= kind.agree && r.repeat <= kind.repeat };
  });
}
export const kindOk = (kind: Kind, c: Choice) => casesOf(kind, c).every(x => x.ok);
export const kindOf = (id: KindId) => KINDS.find(k => k.id === id)!;

/** Passes a plan takes: one reply of each kind. */
export const passesOf = (p: Plan) => KIND_IDS.reduce((s, id) => s + passesFor(p[id].k), 0);

/** Every plan that passes every kind at the fewest passes: each kind at one of its cheapest passing choices. */
export function solve(): Plan[] {
  return KINDS.reduce<Partial<Plan>[]>(
    (plans, kind) => {
      const ok = CHOICES.filter(c => kindOk(kind, c)),
        min = Math.min(...ok.map(c => passesFor(c.k)));
      return plans.flatMap(p => ok.filter(c => passesFor(c.k) === min).map(c => ({ ...p, [kind.id]: c })));
    },
    [{}],
  ) as Plan[];
}
/** Pinned (pinned.json); diffusion-llms-workbench.test.ts keeps it equal to solve(). */
export const WINNERS = pinned.winners as Plan[];
export const BEST = passesOf(WINNERS[0]);
export const solved = (p: Plan) => KINDS.every(k => kindOk(k, p[k.id])) && passesOf(p) === BEST;
/** Passes the careful fill takes for one reply. */
export const CAREFUL = L;
