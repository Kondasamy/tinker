// Node only (build time): the toy masked model and Larkspur mini read from disk, for pictures drawn at build time (the
// home card, the intro, share images, the dev page). Kept out of the kit so the browser bundle never imports node:fs.
import { readFileSync } from 'node:fs';
import { parseModel, type Meta } from '../lm/load';
import type { Model } from '../lm/model';
import { diskModel } from '../transformers/diskModel';

let mlm: Model | undefined;
export function diskMlm(): Model {
  if (mlm) return mlm;
  const bin = readFileSync('public/data/diffusion-llms/mlm.bin');
  return (mlm = parseModel(
    JSON.parse(readFileSync('public/data/diffusion-llms/meta.json', 'utf8')) as Meta,
    bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer,
    'mlm.bin',
  ));
}
/** Larkspur mini, the left-to-right baseline. */
export const diskMini = diskModel;
