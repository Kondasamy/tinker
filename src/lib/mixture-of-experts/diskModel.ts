// Node only (build time): the toy experts model read from disk, for pictures drawn at build time (the intro, the dev
// page). Kept out of the kit so the browser bundle never imports node:fs.
import { readFileSync } from 'node:fs';
import { parseModel, type Meta } from '../lm/load';
import type { Model } from '../lm/model';

let moe: Model | undefined;
export function diskMoe(): Model {
  if (moe) return moe;
  const bin = readFileSync('public/data/mixture-of-experts/moe.bin');
  return (moe = parseModel(
    JSON.parse(readFileSync('public/data/mixture-of-experts/meta.json', 'utf8')) as Meta,
    bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer,
    'moe.bin',
  ));
}
