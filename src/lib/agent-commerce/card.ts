// A page for people and a menu for agents (chapters 1–2). The buying agent prices an order from Larkspur's page or from
// its catalogue (recorded turns); the host checks the price against the catalogue, live. The agent card and the
// catalogue are parsed as an agent would, field by field, so a missing field is named rather than guessed.
import { ASKS, CARD_JSON, type Item, itemOf } from './story';
import { type ReadTurn, type Recording, readSig, type View } from './turns';

export interface Skill {
  id: string;
  name: string;
  description: string;
}
export interface AgentCard {
  name: string;
  description: string;
  /** the first supported interface's address, the preferred one */
  url: string;
  version: string;
  skills: Skill[];
}
export type Parsed<T> = { ok: true; value: T } | { ok: false; missing: string[] };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown) => typeof x === 'string' && x.length > 0;

/** The card's required fields (A2A 1.0.0, fact `a2a-card`); anything missing is listed by name. */
export function parseCard(raw: unknown): Parsed<AgentCard> {
  if (!isObj(raw)) return { ok: false, missing: ['card'] };
  const missing = ['name', 'description', 'version'].filter(k => !str(raw[k]));
  const face = Array.isArray(raw.supportedInterfaces) ? raw.supportedInterfaces[0] : undefined;
  if (!isObj(face) || !str(face.url)) missing.push('supportedInterfaces');
  if (!isObj(raw.capabilities)) missing.push('capabilities');
  for (const k of ['defaultInputModes', 'defaultOutputModes'])
    if (!Array.isArray(raw[k]) || !raw[k].every(str)) missing.push(k);
  const skills = Array.isArray(raw.skills) ? raw.skills : [];
  if (!skills.length || !skills.every(s => isObj(s) && str(s.id) && str(s.name))) missing.push('skills');
  if (missing.length) return { ok: false, missing };
  return {
    ok: true,
    value: {
      name: raw.name as string,
      description: raw.description as string,
      url: (face as { url: string }).url,
      version: raw.version as string,
      skills: (skills as Record<string, unknown>[]).map(s => ({
        id: s.id as string,
        name: s.name as string,
        description: str(s.description) ? (s.description as string) : '',
      })),
    },
  };
}

/** Each catalogue row needs a sku, a name, a category, a whole-cent price and a three-letter currency. */
export function parseCatalogue(raw: unknown): Parsed<Item[]> {
  if (!Array.isArray(raw)) return { ok: false, missing: ['catalogue'] };
  const missing = raw.flatMap((r, n) => {
    if (!isObj(r)) return [`row ${n + 1}`];
    const bad = ['sku', 'name', 'category'].filter(k => !str(r[k]));
    if (!Number.isInteger(r.price) || (r.price as number) < 0) bad.push('price');
    if (typeof r.currency !== 'string' || !/^[A-Z]{3}$/.test(r.currency)) bad.push('currency');
    return bad.map(k => `row ${n + 1} ${k}`);
  });
  return missing.length ? { ok: false, missing } : { ok: true, value: raw as Item[] };
}

const card = parseCard(CARD_JSON);
if (!card.ok) throw new Error(`Larkspur's agent card is missing ${card.missing.join(', ')}`);
export const CARD = card.value;

/** What an order really costs: the ask's quantity times the catalogue price. */
export const truthOf = (sku: string) => {
  const item = itemOf(sku);
  if (!item || !ASKS[sku]) throw new Error(`no ask for ${sku}`);
  return ASKS[sku].qty * item.price;
};
export const READ_ITEMS = Object.keys(ASKS);

export interface Reading {
  view: View;
  sku: string;
  turn: ReadTurn | null;
  /** the catalogue's total */
  truth: number;
  right: boolean;
}
/** The agent's recorded reading for one order, checked against the catalogue. */
export function readShop(rec: Recording<ReadTurn>, view: View, sku: string): Reading {
  const turn = rec.turns[readSig(view, sku)] ?? null;
  const truth = truthOf(sku);
  return { view, sku, turn, truth, right: turn?.total === truth };
}
