// Facts about text and Unicode (R5), each checked against its source. Copy quotes them from here, never by hand.
import data from '../../../data/unicode/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
/** ASCII's size, Unicode's version and its codespace, as numbers the copy prints. */
export const ASCII_SIZE = Number(fact('ascii').value);
export const VERSION = fact('version').value!;
export const TOTAL = Number(
  fact('version')
    .claim.match(/total of ([\d,]+)/)![1]
    .replace(/,/g, ''),
);
export const CODESPACE = Number(fact('codespace').value);
export const WEB_SHARE = fact('web').value!;
