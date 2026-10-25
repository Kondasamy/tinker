// Locks and keys chapter 7's workbench: for each message from the supplier, lock it, sign it, both or neither, against
// the attackers on the line (data/encryption/workbench.json). A lock stops the eavesdropper reading; only a signature
// stops a tamperer or an impostor, because anyone can close the supplier's open padlock; and a locked message is no
// use to the shops that must all read it. WINNERS (every plan with nothing lost) is pinned in
// data/encryption/pinned.json and recomputed by tests/unit/encryption-workbench.test.ts (KTD12).
import bench from '../../../data/encryption/workbench.json' with { type: 'json' };
import pinned from '../../../data/encryption/pinned.json' with { type: 'json' };

export const MESSAGES = bench.messages;
export const ATTACKERS = bench.attackers;
export type MessageId = 'prices' | 'bank' | 'delivery' | 'discount';
export type Choice = 'none' | 'lock' | 'sign' | 'both';
export const CHOICES: Choice[] = ['none', 'lock', 'sign', 'both'];
export const CHOICE_NAME: Record<Choice, string> = {
  none: 'Send it as it is',
  lock: 'Lock it',
  sign: 'Sign it',
  both: 'Lock and sign',
};
export type Plan = Record<MessageId, Choice>;
const IDS = MESSAGES.map(m => m.id as MessageId);

/** Who wins against one message sent one way: each a short reason, empty when nothing is lost. */
export function lossesOf(id: MessageId, c: Choice): string[] {
  const m = MESSAGES.find(x => x.id === id)!,
    locked = c === 'lock' || c === 'both',
    signed = c === 'sign' || c === 'both';
  return [
    ...(m.secret && !locked ? ['Eavesdropper reads it'] : []),
    ...(m.genuine && !signed ? ['Tamperer changes it', 'Impostor fakes it'] : []),
    ...(m.public && locked ? ['Other shops can’t open it'] : []),
  ];
}

export const PLANS: Plan[] = IDS.reduce<Plan[]>(
  (ps, id) => ps.flatMap(p => CHOICES.map(c => ({ ...p, [id]: c }))),
  [{} as Plan],
);
/** Everything a plan loses, message by message. */
export const runPlan = (p: Plan) => IDS.map(id => ({ id, choice: p[id], losses: lossesOf(id, p[id]) }));
export const lostBy = (p: Plan) => runPlan(p).reduce((a, r) => a + r.losses.length, 0);
/** Every plan that loses nothing, over the whole domain (the test checks the pin). */
export const solve = () => PLANS.filter(p => lostBy(p) === 0);

export const planKey = (p: Plan) => IDS.map(id => `${id}:${p[id]}`).join(',');
export const WINNERS: Plan[] = pinned.winners.map(k => Object.fromEntries(k.split(',').map(x => x.split(':'))) as Plan);
const WIN = new Set(pinned.winners);
export const wins = (p: Plan) => WIN.has(planKey(p));

/** Where the bench starts: everything sent as it is. */
export const START = Object.fromEntries(IDS.map(id => [id, 'none'])) as Plan;
/** The plan in a saved run's state; anything unknown falls back to START's. */
export const benchPlan = (s: Partial<Plan>): Plan =>
  Object.fromEntries(IDS.map(id => [id, CHOICES.includes(s[id] as Choice) ? s[id] : 'none'])) as Plan;
