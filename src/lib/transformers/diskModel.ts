// Node only (build time): Larkspur mini read from disk, for pictures drawn at build time (the home card, the intro,
// share images). Kept out of the kit so the browser bundle never imports node:fs.
import { readFileSync } from 'node:fs';
import { parseModel, type Meta } from '../lm/load';
import type { Model } from '../lm/model';

let model: Model | undefined;
export function diskModel(): Model {
  if (model) return model;
  const bin = readFileSync('public/data/lm/model.bin');
  return (model = parseModel(
    JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta,
    bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer,
  ));
}
