// Post-training's toy policy (KTD4): a categorical distribution over one question's written answers, not a language
// model. Two updates run live:
// - DPO: a Bradley–Terry reward fitted to the reader's chosen/rejected pairs, then the KL-regularised optimum DPO
//   targets, π(y) ∝ π_ref(y)·exp(r(y)/β). Iterating the DPO loss on a table-shaped policy with firm preferences ignores
//   β, so the closed form is what makes "β keeps it near the reference" true; dpoLoss is shown in the maths fold-away.
// - GRPO: a seeded group of drafts, each graded; advantage (r − group mean) / group std; a clipped policy-gradient step
//   on the logits (PPO's ratio clip). A group with no reward spread has zero advantage and no update.
//   shortcut: no KL penalty to the reference inside the GRPO step (DeepSeekMath adds one); the maths fold-away says so.
import { mulberry32 } from '../transformers/sample';
import { fact } from './facts';

export type Policy = number[];
/** A preference: [chosen, rejected], as answer indices. */
export type Pair = [number, number];

/** The strengths (β) chapter 3's slider steps over: low lets the policy stray far, high keeps it near the reference. */
export const BETAS = [0.25, 0.5, 1, 2, 4];
/** Drafts per group, rounds per run, PPO's clip range (the PPO paper's best, matched to its fact), inner steps and step
 * size of the GRPO update. Group, rounds and steps are toy-sized (docs/modules/post-training.md, Toy vs real). */
export const GROUP = 6,
  ROUNDS = 10,
  CLIP = Number(fact('ppo-clip').value),
  INNER = 4,
  LR = 1.5;

const softmax = (z: number[]) => {
  const m = Math.max(...z),
    e = z.map(x => Math.exp(x - m)),
    s = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / s);
};
export const winnerOf = (p: Policy) => p.indexOf(Math.max(...p));
/** KL(p ‖ q): how far p has moved from q. */
export const kl = (p: Policy, q: Policy) => p.reduce((s, x, i) => (x > 0 ? s + x * Math.log(x / q[i]) : s), 0);
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Bradley–Terry rewards for n answers from the pairs, by gradient ascent with a small L2 pull to 0 (firm preferences
 * would otherwise run to infinity). Answers in no pair keep reward 0. */
export function fitRewards(n: number, pairs: Pair[], l2 = 0.1, steps = 400, lr = 0.2): number[] {
  const r = new Array<number>(n).fill(0);
  for (let t = 0; t < steps; t++) {
    const g = r.map(x => -l2 * x);
    for (const [w, l] of pairs) {
      const s = sigmoid(-(r[w] - r[l]));
      g[w] += s;
      g[l] -= s;
    }
    for (let i = 0; i < n; i++) r[i] += lr * g[i];
  }
  return r;
}

/** The policy DPO targets: the reference reweighted by exp(reward / β). */
export const dpoPolicy = (ref: Policy, rewards: number[], beta: number): Policy =>
  softmax(ref.map((p, i) => Math.log(p) + rewards[i] / beta));

/** DPO's loss on the pairs: −mean log σ(β·log(π_w/ref_w) − β·log(π_l/ref_l)). */
export const dpoLoss = (p: Policy, ref: Policy, pairs: Pair[], beta: number) =>
  pairs.length
    ? -pairs.reduce(
        (s, [w, l]) => s + Math.log(sigmoid(beta * Math.log(p[w] / ref[w]) - beta * Math.log(p[l] / ref[l]))),
        0,
      ) / pairs.length
    : 0;

/** A fixed seed per question, so a chapter's groups are the same on every visit. */
export const seedOf = (id: string) => [...id].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

export interface Round {
  /** the drafts drawn, as answer indices */
  group: number[];
  rewards: number[];
  advantages: number[];
  before: Policy;
  after: Policy;
}

const draw = (p: Policy, rng: () => number) => {
  let u = rng(),
    i = 0;
  while (i < p.length - 1 && u >= p[i]) u -= p[i++];
  return i;
};

/** One GRPO round: draw a group, grade each draft (`reward` per answer), normalise within the group, and take INNER
 * clipped policy-gradient steps on the logits from the policy that drew the group. */
export function grpoRound(p: Policy, reward: number[], rng: () => number): Round {
  const group = Array.from({ length: GROUP }, () => draw(p, rng)),
    rewards = group.map(i => reward[i]);
  const mean = rewards.reduce((a, b) => a + b, 0) / GROUP,
    std = Math.sqrt(rewards.reduce((a, r) => a + (r - mean) ** 2, 0) / GROUP);
  const advantages = rewards.map(r => (std > 0 ? (r - mean) / std : 0));
  if (std === 0) return { group, rewards, advantages, before: p, after: p };
  const theta = p.map(Math.log);
  for (let k = 0; k < INNER; k++) {
    const pi = softmax(theta),
      g = new Array<number>(p.length).fill(0);
    group.forEach((y, j) => {
      const a = advantages[j],
        ratio = pi[y] / p[y];
      if ((a > 0 && ratio > 1 + CLIP) || (a < 0 && ratio < 1 - CLIP)) return; // clipped: no push past the range
      for (let i = 0; i < p.length; i++) g[i] += (a * ratio * ((i === y ? 1 : 0) - pi[i])) / GROUP;
    });
    for (let i = 0; i < p.length; i++) theta[i] += LR * g[i];
  }
  return { group, rewards, advantages, before: p, after: softmax(theta) };
}

/** `rounds` GRPO rounds from p, seeded: the same seed always gives the same groups and updates. */
export function grpoRun(p: Policy, reward: number[], seed: number, rounds = ROUNDS): Round[] {
  const rng = mulberry32(seed),
    out: Round[] = [];
  for (let i = 0; i < rounds; i++) out.push(grpoRound(out.at(-1)?.after ?? p, reward, rng));
  return out;
}
