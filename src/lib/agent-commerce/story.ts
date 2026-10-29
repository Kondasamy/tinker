// Names, the shop and its sellers for When the buyer is an agent (R13), read from data/agent-commerce/, never typed into
// copy. Every shop, seller and domain is fictional (.example); the orders and sellers are hand-written (R6).
import sellers from '../../../data/agent-commerce/sellers.json' with { type: 'json' };
import shop from '../../../data/agent-commerce/shop.json' with { type: 'json' };

export interface Item {
  sku: string;
  name: string;
  category: string;
  /** US cents */
  price: number;
  currency: string;
}
export interface Line {
  sku: string;
  qty: number;
  /** US cents a unit */
  unit: number;
}
export interface Seller {
  id: string;
  name: string;
  domain: string;
  message: string;
  lines: Line[];
  currency: string;
  /** hours after the offer that the seller charges */
  delayHours: number;
  /** whether Dana Reyes would want this order filled */
  wanted: boolean;
}

export const COMPANY = shop.company;
export const DOMAIN = shop.domain;
/** the story's clock: every chapter happens at this moment */
export const TODAY = shop.today;
export const BUILDER = shop.builder;
export const BUYER_AGENT = shop.buyerAgent;
export const SELLER_AGENT = shop.sellerAgent;
export const REQUEST = shop.request;
export const VAGUE_REQUEST = shop.vagueRequest;
/** the buying agent's answer when the seller asks back (chapter 3) */
export const ANSWER = shop.answer;
/** the terms Dana signs: for Larkspur alone (chapter 4), or for any shop (chapter 5) */
export const SLIPS: Record<
  'larkspur' | 'shop-around',
  { merchants: string[]; items: string[]; cap: number; hours: number }
> = shop.slips;
/** chapter 1–2's orders, by item */
export const ASKS: Record<string, { text: string; qty: number }> = shop.asks;
/** the shop's page for people (chapter 1) */
export const PAGE = shop.page;
/** the agent card as published, unparsed (chapter 2) */
export const CARD_JSON: unknown = shop.card;
export const CATALOGUE: Item[] = shop.catalogue;
export const SELLERS: Seller[] = sellers.sellers;

export const itemOf = (sku: string) => CATALOGUE.find(i => i.sku === sku);
export const sellerOf = (id: string) => {
  const s = SELLERS.find(s => s.id === id);
  if (!s) throw new Error(`unknown seller: ${id}`);
  return s;
};
export const totalOf = (lines: Line[]) => lines.reduce((t, l) => t + l.qty * l.unit, 0);
/** Cents as "$568.00". */
export const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
