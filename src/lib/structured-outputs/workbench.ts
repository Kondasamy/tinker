// Chapter 7's workbench: the reader designs Larkspur's order-status schema field by field, and every order is decoded
// live under it on Larkspur mini. A field is free text, a pick from a list (an enum, or an integer for days), or left
// out of the schema for the order system to fill. The answer is valid when it finished and passes the schema check,
// and right when every field matches the order system's record (data/structured-outputs/orders.json).
import data from '../../../data/structured-outputs/orders.json' with { type: 'json' };
import type { Model } from '../lm/model';
import { decode } from './decode';
import { checkText, compile, type FieldSchema, type ObjectSchema } from './grammar';

export type FieldId = 'team' | 'status' | 'days';
export type Choice = 'free' | 'list' | 'number' | 'system';
export type Policy = Record<FieldId, Choice>;
export interface Order { id: number; status: string; days: number }

export const ORDERS: Order[] = data.orders;
export const TEAM = data.team;

/** Each field's choices, first the one the bench starts on. */
export const FIELDS: { id: FieldId; label: string; choices: Choice[] }[] = [
  { id: 'team', label: 'Team', choices: ['free', 'list', 'system'] },
  { id: 'status', label: 'Status', choices: ['free', 'list', 'system'] },
  { id: 'days', label: 'Days to arrive', choices: ['number', 'free', 'system'] },
];
const LISTS: Partial<Record<FieldId, string[]>> = { team: ['billing', 'shipping', 'returns'], status: ['on time', 'delayed'] };
/** Free strings get this cap, so they always close inside the window. */
export const FREE_MAX = 8;

export const choiceLabel = (f: FieldId, c: Choice) =>
  c === 'free' ? `Model writes free text (up to ${FREE_MAX} characters)`
    : c === 'list' ? `Model picks from a list: ${LISTS[f]!.join(', ')}`
      : c === 'number' ? 'Model writes a whole number'
        : 'Leave it out: the order system fills it';

const fieldSchema = (f: FieldId, c: Choice): FieldSchema =>
  c === 'free' ? { type: 'string', maxLength: FREE_MAX } : c === 'list' ? { type: 'string', enum: LISTS[f]! } : { type: 'integer' };

/** The schema the model fills: the fields not left to the order system, in order. Null when it fills none. */
export function schemaFor(p: Policy): ObjectSchema | null {
  const ids = FIELDS.map((f) => f.id).filter((id) => p[id] !== 'system');
  if (!ids.length) return null;
  return { type: 'object', properties: Object.fromEntries(ids.map((id) => [id, fieldSchema(id, p[id])])), required: ids, additionalProperties: false };
}

export const promptFor = (o: Order) => `Where is order ${o.id}?`;

export interface Row {
  order: Order;
  output: string;
  status: 'done' | 'cut-off' | 'none';
  valid: boolean;
  right: boolean;
  /** each field's final value and where it came from */
  fields: { id: FieldId; value: unknown; from: 'model' | 'system' | 'missing'; right: boolean }[];
  reason: string;
}

function row(model: Model, p: Policy, o: Order): Row {
  const s = schemaFor(p);
  const d = s ? decode(model, promptFor(o), compile(s)) : null;
  const check = d && d.status === 'done' ? checkText(s!, d.text) : null;
  const valid = !d || (!!check && check.ok);
  const got = (check?.value ?? {}) as Record<string, unknown>;
  const truth: Record<FieldId, unknown> = { team: TEAM, status: o.status, days: o.days };
  const fields = FIELDS.map(({ id }) => {
    const from: Row['fields'][number]['from'] = p[id] !== 'system' ? 'model' : id === 'team' ? 'missing' : 'system';
    const value = from === 'model' ? got[id] : from === 'system' ? truth[id] : undefined;
    return { id, value, from, right: valid && value === truth[id] };
  });
  const right = valid && fields.every((f) => f.right);
  const wrong = fields.find((f) => !f.right);
  const reason = !valid
    ? d!.status === 'cut-off' ? 'cut off: the answer ran out of room before it closed' : `invalid: ${check!.errors[0]}`
    : !wrong ? 'valid and right'
      : wrong.from === 'missing' ? `${wrong.id} is missing: the order system doesn’t know the team`
        : `${wrong.id}: the model wrote ${JSON.stringify(wrong.value)}, the order system says ${JSON.stringify(truth[wrong.id])}`;
  return { order: o, output: d ? d.text : '', status: d ? d.status : 'none', valid, right, fields, reason };
}

const cache = new WeakMap<Model, Map<string, { rows: Row[]; score: number }>>();
const keyOf = (p: Policy) => FIELDS.map((f) => p[f.id]).join('/');

/** Every order decoded under the policy's schema, with its verdict; the score counts valid, right answers. */
export function bench(model: Model, p: Policy): { rows: Row[]; score: number } {
  let m = cache.get(model);
  if (!m) cache.set(model, (m = new Map()));
  const k = keyOf(p), hit = m.get(k);
  if (hit) return hit;
  const rows = ORDERS.map((o) => row(model, p, o));
  const out = { rows, score: rows.filter((r) => r.valid && r.right).length };
  m.set(k, out);
  return out;
}

/** Every policy the controls can make. */
export const POLICIES: Policy[] = FIELDS.reduce<Policy[]>(
  (ps, f) => ps.flatMap((p) => f.choices.map((c) => ({ ...p, [f.id]: c }))), [{} as Policy]);

/** Every policy that gives a valid, right answer for every order: each one is a right answer to the puzzle. */
export const WINNERS = (model: Model) => POLICIES.filter((p) => bench(model, p).score === ORDERS.length);

/** WINNERS over the committed weights, precomputed: decoding all 27 policies froze the page for seconds. A test keeps it
 * equal to WINNERS on model.bin; a retrain changes both. */
export const SOLVED: Policy[] = [{ team: 'list', status: 'system', days: 'system' }];
