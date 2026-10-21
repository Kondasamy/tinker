/**
 * record-voice: speaks every line of data/voice/script.json with Kokoro (KTD11) and writes
 *   public/data/voice/<line id>.mp3  (mono, 32 kbps, through the local ffmpeg)
 *   data/voice/envelopes.json        (a 20 ms energy envelope per clip, and where each part's speech starts and ends)
 *
 * Run once by hand: node scripts/record-voice.mjs. Needs kokoro-js installed as a devDependency and ffmpeg on the
 * PATH. The model (onnx-community/Kokoro-82M-v1.0-ONNX, Apache-2.0) is cached in .cache/models, like
 * scripts/record-tokenizers.mjs. Kokoro's output is not promised byte-identical across runs or machines: the clips and
 * envelopes are committed and never regenerated in CI.
 *
 * Envelope units: the frame's RMS level × 1000, rounded (a full-scale sine is about 707). Part times are in ms, read
 * off the clean speech before any line noise is mixed in, so "where the caller really stopped" is known exactly.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { KokoroTTS } from 'kokoro-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_MP3 = path.join(ROOT, 'public/data/voice');
const OUT_ENV = path.join(ROOT, 'data/voice/envelopes.json');
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const FRAME_MS = 20, SPEECH = 0.01;   // a frame with RMS above SPEECH (linear) counts as speech when timing parts
const MARGIN = 100, LEAD = 200, TAIL = 400;   // ms kept round each part's speech, and of quiet before and after a clip

// kokoro-js brings its own @huggingface/transformers (v3); point that copy's cache at .cache/models
const req = createRequire(createRequire(import.meta.url).resolve('kokoro-js'));
const HF = req.resolve('@huggingface/transformers').replace(/(@huggingface[\\/]transformers)[\\/].*$/, '$1');
const { env } = await import(pathToFileURL(path.join(HF, JSON.parse(fs.readFileSync(path.join(HF, 'package.json'), 'utf8')).exports.node.import.default)).href);
env.cacheDir = path.join(ROOT, '.cache/models');

const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voice/script.json'), 'utf8'));
const tts = await KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'cpu' });
const version = JSON.parse(fs.readFileSync(path.join(path.dirname(req.resolve('kokoro-js')), '../package.json'), 'utf8')).version;

// a seeded line hum (white noise), so a re-record mixes the same noise
let seed = 1;
const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32) * 2 - 1;

const frames = (x, sr) => {
  const n = Math.round(sr * FRAME_MS / 1000), out = [];
  for (let i = 0; i < x.length; i += n) {
    let s = 0;
    const end = Math.min(x.length, i + n);
    for (let j = i; j < end; j++) s += x[j] * x[j];
    out.push(Math.sqrt(s / (end - i)));
  }
  return out;
};

const wavOf = (x, sr) => {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  x.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return b;
};

fs.mkdirSync(OUT_MP3, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-'));
const clips = {};
for (const line of script.lines) {
  const voice = script.speakers[line.speaker].voice;
  let sr = 24000, pcm = [];
  const parts = [];
  for (const p of line.parts) {
    const a = await tts.generate(p.text, { voice });
    sr = a.sampling_rate;
    // Kokoro pads each sentence with silence; trim it to MARGIN ms either side, so `pause` is the real gap (+ 2 × MARGIN)
    const raw = Array.from(a.audio, (v) => v * (p.gain ?? 1));
    const f = frames(raw, sr), loud = f.map((v, i) => [v, i]).filter(([v]) => v > SPEECH * (p.gain ?? 1)).map(([, i]) => i);
    const k = sr * FRAME_MS / 1000, m = sr * MARGIN / 1000;
    const x = raw.slice(Math.max(0, loud[0] * k - m), Math.min(raw.length, (loud.at(-1) + 1) * k + m));
    if (!parts.length) pcm = new Array(sr * LEAD / 1000).fill(0);
    const at = pcm.length / sr * 1000 + MARGIN;
    parts.push({ start: Math.round(at), end: Math.round(at + (loud.at(-1) + 1 - loud[0]) * FRAME_MS) });
    pcm = pcm.concat(x, new Array(Math.round(sr * (p.pause ?? 0) / 1000)).fill(0));
  }
  pcm = pcm.concat(new Array(sr * TAIL / 1000).fill(0));
  if (line.noise) pcm = pcm.map((v) => v + rand() * line.noise);
  const wav = path.join(tmp, `${line.id}.wav`), mp3 = path.join(OUT_MP3, `${line.id}.mp3`);
  fs.writeFileSync(wav, wavOf(pcm, sr));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '32k', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', mp3]);
  clips[line.id] = { ms: Math.round(pcm.length / sr * 1000), parts, env: frames(pcm, sr).map((v) => Math.round(v * 1000)) };
  console.log(`${line.id}: ${clips[line.id].ms} ms, ${fs.statSync(mp3).size} bytes`);
}
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(OUT_ENV, JSON.stringify({ model: MODEL, library: `kokoro-js ${version}`, frameMs: FRAME_MS, clips }) + '\n');
const total = fs.readdirSync(OUT_MP3).reduce((n, f) => n + fs.statSync(path.join(OUT_MP3, f)).size, 0);
console.log(`wrote ${Object.keys(clips).length} clips, ${total} bytes of MP3`);
