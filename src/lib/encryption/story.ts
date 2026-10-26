// Names and messages for Locks and keys (R18), read from data/encryption/story.json, never typed into copy.
import story from '../../../data/encryption/story.json' with { type: 'json' };

export const COMPANY = story.company;
export const SUPPLIER = story.supplier;
export const IMPOSTOR = story.impostor;
export const ORDER = story.order;
export const INVOICE = story.invoice;
/** the invoice with one character changed */
export const EDITED = story.edited;
export const FORGED = story.forged;
export const ORDER_NUMBER = story.orderNumber;
export const TODAY = story.today;
