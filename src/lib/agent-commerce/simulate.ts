// The simulated agents (KTD13): stand-ins for any turn the recording run could not get. Each behaviour is a stated
// rule citing the finding it comes from, so a simulated effect is true by construction and the copy says so. Turns
// carry `simulated: true` wherever they show. Imports only data, so the recording script can load it with plain node.
import sellers from '../../../data/agent-commerce/sellers.json' with { type: 'json' };
import shop from '../../../data/agent-commerce/shop.json' with { type: 'json' };
import type { BuyerTurn, ReadTurn, Request, SellerTurn, View } from './seen';

export const SIMULATOR = 'agent-commerce-sim 1';

/** Each rule, and the fact (data/agent-commerce/facts.json) it rests on. */
export const RULES = [
  {
    id: 'first-price',
    fact: 'webarena',
    rule: 'Reading a page for people, the agent takes the first price on the item’s line.',
  },
  { id: 'price-field', fact: 'a2a-card', rule: 'Reading the catalogue, the agent copies the item’s price field.' },
  {
    id: 'ask-back',
    fact: 'a2a-states',
    rule: 'The seller asks back when the order names no size, and finishes once it has one.',
  },
  {
    id: 'obeys-seller',
    fact: 'indirect-injection',
    rule: 'The buying agent sends on every offer, doing what the seller’s message says.',
  },
] as const;

const itemOf = (sku: string) => {
  const i = shop.catalogue.find(i => i.sku === sku);
  if (!i) throw new Error(`unknown item: ${sku}`);
  return i;
};
/** "Deck screws 5×60 mm, box of 100" → "Deck screws": the words a page line starts with */
const lead = (name: string) => name.split(/ \d|,/)[0];

export function simRead(view: View, sku: string): ReadTurn {
  const { qty } = shop.asks[sku as keyof typeof shop.asks];
  const item = itemOf(sku);
  if (view === 'menu') return { text: `${item.name}: price field read.`, total: qty * item.price, simulated: true };
  const line = shop.page.split('\n').find(l => l.startsWith(lead(item.name)));
  const first = line?.match(/\$(\d+(?:\.\d\d)?)/);
  if (!first) throw new Error(`no price on the page for ${sku}`);
  const unit = Math.round(Number(first[1]) * 100);
  return { text: `First price on the line: $${first[1]}.`, total: qty * unit, simulated: true };
}

export function simSeller(request: Request, hist: string[]): SellerTurn {
  if (request === 'vague' && !hist.includes('asked'))
    return { text: 'Which screw size, and how many boxes?', state: 'input-required', simulated: true };
  return {
    text: 'Order placed: 40 boxes of 5×60 mm deck screws.',
    state: 'completed',
    sku: 'screws-5x60',
    qty: 40,
    simulated: true,
  };
}

export function simBuyer(seller: string): BuyerTurn {
  if (!sellers.sellers.some(s => s.id === seller)) throw new Error(`unknown seller: ${seller}`);
  return { text: 'Sending the order as the seller says.', accept: true, simulated: true };
}
