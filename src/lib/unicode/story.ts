// What the Text and Unicode chapters say, read off the data (R13): the company, the customer and her garbled name, the
// characters on the chips, and the lookalike addresses.
import names from '../../../data/unicode/names.json' with { type: 'json' };
import lookalikes from '../../../data/unicode/lookalikes.json' with { type: 'json' };
import { bytesOf } from './bytes';
import { readAs } from './mojibake';

export const COMPANY = names.company;
export const CUSTOMER = names.customer;
/** The customer's name as the old label printer reads it: UTF-8 bytes through Latin-1. */
export const MOJI = readAs(bytesOf(CUSTOMER), 'windows-1252');
export const FIRST = names.first;
export const PLAIN = names.plain;
export const SCRIPTS = names.scripts;
export const WIDTHS = names.widths;
export const FAMILY = names.family;
export const THUMBS = names.thumbs;
export const ACCENT = names.accent;
export const SEARCHED = names.searched;
export const NAMES = names.names;
export const LOOKALIKES = lookalikes.pairs;
/** n with its noun, singular or plural. */
export const count = (n: number, noun: string) => `${n.toLocaleString('en')} ${noun}${n === 1 ? '' : 's'}`;
