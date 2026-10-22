// Node only (build time and tests): reads the committed index from disk. Kept out of load.ts so the browser bundle
// never imports node:fs.
import { readFileSync } from 'node:fs';
import type { Loader } from './load';

export const diskLoader: Loader = async f => {
  const b = readFileSync('public/data/index/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
