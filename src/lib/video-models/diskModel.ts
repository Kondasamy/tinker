// Node only (tests, build time): the world models read from disk. Kept out of the kit so the browser never imports
// node:fs.
import { readFileSync } from 'node:fs';
import { type Net, type NetMeta, parseNet } from './net';
import type { ModelId } from './rollout';

const nets: Partial<Record<ModelId, Net>> = {};
export function diskNet(id: ModelId): Net {
  const hit = nets[id];
  if (hit) return hit;
  const meta = JSON.parse(readFileSync('public/data/video-models/meta.json', 'utf8')).models[id] as NetMeta;
  const bin = readFileSync(`public/data/video-models/${id}.bin`);
  return (nets[id] = parseNet(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer));
}
