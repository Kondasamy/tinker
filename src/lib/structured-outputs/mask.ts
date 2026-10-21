// The mask (KTD4): a token is allowed when every one of its bytes keeps the grammar live. 768 tokens of a few
// bytes each per step is cheap, so there is no precomputed index.
import { VOCAB_SIZE, pieceBytes } from '../lm/bpe';
import { run, type Grammar, type State } from './grammar';

/** The state after a token's bytes, or null when the token is blocked. */
export const after = (g: Grammar, s: State, bytes: ArrayLike<number>) => run(g, s, bytes);

/** Every token id allowed from this state, in id order. */
export function allowed(g: Grammar, s: State): number[] {
  const ids: number[] = [];
  for (let id = 0; id < VOCAB_SIZE; id++) if (after(g, s, pieceBytes(id))) ids.push(id);
  return ids;
}
