// The green list (KTD3, Kirchenbauer et al. 2023): a keyed hash of the previous token splits the vocabulary,
// with a share γ of it green. Only the key and the previous token decide it, so a checker needs no model.
import { VOCAB_SIZE } from '../lm/bpe';
import { mulberry32 } from '../transformers/sample';

/** Larkspur's secret key. The chapters show it can be anything; changing it changes every list. */
export const KEY = 0x1a5c5e7;

/** Mixes the key and the previous token id into one 32-bit seed (a murmur3-style finaliser). */
export function hashPair(key: number, prev: number): number {
  let h = Math.imul(key ^ 0x9e3779b9, 0x85ebca6b) ^ prev;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

const cache = new Map<string, Uint8Array>();

/** 1 where a token is green after `prev`: exactly round(γ × vocab) of them, picked by a seeded shuffle. */
export function greenList(prev: number, gamma: number, key = KEY): Uint8Array {
  const k = `${key}:${prev}:${gamma}`;
  let mask = cache.get(k);
  if (mask) return mask;
  const rand = mulberry32(hashPair(key, prev)),
    ids = Array.from({ length: VOCAB_SIZE }, (_, i) => i),
    n = Math.round(gamma * VOCAB_SIZE);
  mask = new Uint8Array(VOCAB_SIZE);
  // The first n steps of a Fisher-Yates shuffle choose the green ids.
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (VOCAB_SIZE - i));
    [ids[i], ids[j]] = [ids[j], ids[i]];
    mask[ids[i]] = 1;
  }
  cache.set(k, mask);
  return mask;
}

export const isGreen = (prev: number, id: number, gamma: number, key = KEY) => greenList(prev, gamma, key)[id] === 1;
