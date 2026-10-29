// Larkspur's shop for the Recommendations module (KTD9): the catalogue and the made-up orders
// (data/recommendations/orders.json, made up, labelled wherever they show). Each customer's orders are one product each,
// oldest first; the last is held out, the order every method tries to guess, and the rest is what the methods learn
// from. The Kestrel K3 has just launched and has no orders yet: the cold-start product.
import data from '../../../data/recommendations/orders.json' with { type: 'json' };

export type Aisle = keyof typeof data.aisles;
export interface Product {
  id: string;
  name: string;
  /** a short name for phone pills */
  short: string;
  aisle: Aisle;
}
export interface Customer {
  id: string;
  name: string;
  orders: string[];
}

export const AISLES = data.aisles as Record<Aisle, string>;
export const PRODUCTS = data.products as Product[];
export const CUSTOMERS = data.customers as Customer[];
export const NEW_PRODUCT = data.newProduct;
export const ORDERS_NOTE = data.note;
/** How many products a shelf shows (KTD13). */
export const SHELF = 5;

const byId = new Map(PRODUCTS.map(p => [p.id, p]));
/** A product by id; an unknown id throws, so copy can't name a product that isn't there. */
export function productOf(id: string): Product {
  const p = byId.get(id);
  if (!p) throw new Error(`unknown product: ${id}`);
  return p;
}
export function customerOf(id: string): Customer {
  const c = CUSTOMERS.find(c => c.id === id);
  if (!c) throw new Error(`unknown customer: ${id}`);
  return c;
}

/** What a set of shoppers bought: customer id → products, oldest first. */
export type History = Record<string, string[]>;
/** Every order but each customer's last: what the methods learn from. */
export const TRAIN: History = Object.fromEntries(CUSTOMERS.map(c => [c.id, c.orders.slice(0, -1)]));
/** Each customer's last order: the one the shelf should have shown. */
export const HELD_OUT: Record<string, string> = Object.fromEntries(CUSTOMERS.map(c => [c.id, c.orders.at(-1)!]));

/** Who place the new product's first orders in chapter 5, and the orders once they have. */
export const FIRST_BUYERS = ['c03', 'c07', 'c11'];
export const TRAIN_FIRST: History = {
  ...TRAIN,
  ...Object.fromEntries(FIRST_BUYERS.map(c => [c, [...TRAIN[c], NEW_PRODUCT]])),
};

/** "Wood glue, Clamp set and Sandpaper" */
export const listOf = (xs: string[]) =>
  xs.length < 2 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
export const namesOf = (ids: string[]) => listOf(ids.map(id => productOf(id).name));
