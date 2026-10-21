/**
 * record-voice: speaks every line of data/voice/script.json with ElevenLabs text-to-speech (KTD11) and writes
 *   public/data/voice/<line id>.mp3  (mono, 32 kbps, through the local ffmpeg)
 *   data/voice/envelopes.json        (a 20 ms energy envelope per clip, and where each part's speech starts and ends)
 *
 * Run once by hand, with the key only in the command's environment (never in a file):
 *   ELEVENLABS_API_KEY=... node scripts/record-voice.mjs
 * Needs ffmpeg on the PATH. The voices, model, seed and output format are in script.json `tts` and `speakers`, so a
 * rerun asks for the same thing. Each part's audio is cached in .cache/voice (keyed by everything sent), so a rerun after
 * a small edit only pays for the changed parts. The service is not promised to return identical audio twice: the clips
 * and envelopes are committed and never regenerated in CI.
 *
 * Envelope units: the frame's RMS level × 1000, rounded (a full-scale sine is about 707). Part times are in ms, read
 * off the clean speech before any line noise is mixed in, so "where the caller really stopped" is known exactly.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('record-voice: set ELEVENLABS_API_KEY in the environment (it is never read from or written to a file).');
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_MP3 = path.join(ROOT, 'public/data/voice');
const OUT_ENV = path.join(ROOT, 'data/voice/envelopes.json');
const CACHE = path.join(ROOT, '.cache/voice');
const SR = 22050;
const FRAME_MS = 20, SPEECH = 0.01;   // a frame with RMS above SPEECH (linear) counts as speech when timing parts
const MARGIN = 100, LEAD = 200, TAIL = 400;   // ms kept round each part's speech, and of quiet before and after a clip

const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voice/script.json'), 'utf8'));
const { model, seed, outputFormat } = script.tts;

/** One part's speech as an MP3, from the cache or the API. */
async function speak(text, voice) {
  const body = { text, model_id: model, seed };
  const id = crypto.createHash('sha256').update(JSON.stringify({ voice, outputFormat, ...body })).digest('hex').slice(0, 16);
  const file = path.join(CACHE, `${id}.mp3`);
  if (fs.existsSync(file)) return file;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=${outputFormat}`, {
    method: 'POST', headers: { 'xi-api-key': KEY, 'content-type': 'application/json', accept: 'audio/mpeg' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status} for “${text}”: ${(await r.text()).slice(0, 200)}`);
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return file;
}

/** Decode an MP3 to mono float samples at SR. */
const decode = (file) => {
  const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return Array.from(new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4));
};

// a seeded line hum (white noise), so a re-record mixes the same noise
let noiseSeed = 1;
const rand = () => ((noiseSeed = (noiseSeed * 1103515245 + 12345) >>> 0) / 2 ** 32) * 2 - 1;

const frames = (x) => {
  const n = Math.round(SR * FRAME_MS / 1000), out = [];
  for (let i = 0; i < x.length; i += n) {
    let s = 0;
    const end = Math.min(x.length, i + n);
    for (let j = i; j < end; j++) s += x[j] * x[j];
    out.push(Math.sqrt(s / (end - i)));
  }
  return out;
};

const wavOf = (x) => {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  x.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return b;
};

fs.mkdirSync(OUT_MP3, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-'));
const clips = {};
for (const line of script.lines) {
  const voice = script.speakers[line.speaker].voice;
  let pcm = [];
  const parts = [];
  for (const p of line.parts) {
    // the service pads speech with silence; trim it to MARGIN ms either side, so `pause` is the real gap (+ 2 × MARGIN)
    const raw = decode(await speak(p.text, voice)).map((v) => v * (p.gain ?? 1));
    const f = frames(raw), loud = f.map((v, i) => [v, i]).filter(([v]) => v > SPEECH * (p.gain ?? 1)).map(([, i]) => i);
    const k = SR * FRAME_MS / 1000, m = SR * MARGIN / 1000;
    const x = raw.slice(Math.max(0, loud[0] * k - m), Math.min(raw.length, (loud.at(-1) + 1) * k + m));
    if (!parts.length) pcm = new Array(SR * LEAD / 1000).fill(0);
    const at = pcm.length / SR * 1000 + MARGIN;
    parts.push({ start: Math.round(at), end: Math.round(at + (loud.at(-1) + 1 - loud[0]) * FRAME_MS) });
    pcm = pcm.concat(x, new Array(Math.round(SR * (p.pause ?? 0) / 1000)).fill(0));
  }
  pcm = pcm.concat(new Array(SR * TAIL / 1000).fill(0));
  if (line.noise) pcm = pcm.map((v) => v + rand() * line.noise);
  const wav = path.join(tmp, `${line.id}.wav`), mp3 = path.join(OUT_MP3, `${line.id}.mp3`);
  fs.writeFileSync(wav, wavOf(pcm));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '32k', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', mp3]);
  clips[line.id] = { ms: Math.round(pcm.length / SR * 1000), parts, env: frames(pcm).map((v) => Math.round(v * 1000)) };
  console.log(`${line.id}: ${clips[line.id].ms} ms, ${fs.statSync(mp3).size} bytes`);
}
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(OUT_ENV, JSON.stringify({ provider: script.tts.provider, model, frameMs: FRAME_MS, clips }) + '\n');
const total = fs.readdirSync(OUT_MP3).reduce((n, f) => n + fs.statSync(path.join(OUT_MP3, f)).size, 0);
console.log(`wrote ${Object.keys(clips).length} clips, ${total} bytes of MP3`);
