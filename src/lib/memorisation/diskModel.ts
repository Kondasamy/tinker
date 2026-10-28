// Node only (build time): the canary model read from disk, for pictures drawn at build time (the intro, the dev page)
// and the tests. Kept out of the kit so the browser bundle never imports node:fs.
import { readFileSync } from 'node:fs';
import { parseModel, type Meta } from '../lm/load';
import type { Model } from '../lm/model';

let canary: Model | undefined;
export function diskCanary(): Model {
  if (canary) return canary;
  const bin = readFileSync('public/data/memorisation/canary.bin');
  return (canary = parseModel(
    JSON.parse(readFileSync('public/data/memorisation/meta.json', 'utf8')) as Meta,
    bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer,
    'canary.bin',
  ));
}
