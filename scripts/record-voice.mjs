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
import { fileURLToPath } from 'node:url';
import { apiKey, decode as decodeAt, encodeMp3, speak as tts, wavOf as wavAt } from './lib/elevenlabs.mjs';

const KEY = apiKey('record-voice');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_MP3 = path.join(ROOT, 'public/data/voice');
const OUT_ENV = path.join(ROOT, 'data/voice/envelopes.json');
const CACHE = path.join(ROOT, '.cache/voice');
const SR = 22050;
const FRAME_MS = 20,
  SPEECH = 0.01; // a frame with RMS above SPEECH (linear) counts as speech when timing parts
const MARGIN = 100,
  LEAD = 200,
  TAIL = 400; // ms kept round each part's speech, and of quiet before and after a clip

const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/voice/script.json'), 'utf8'));
const { model, seed, outputFormat } = script.tts;

/** One part's speech as an MP3, from the cache or the API. */
const speak = (text, voice) => tts({ key: KEY, cache: CACHE, voice, model, seed, outputFormat, text });
const decode = file => decodeAt(file, SR);
const wavOf = x => wavAt(x, SR);

// a seeded line hum (white noise), so a re-record mixes the same noise
let noiseSeed = 1;
const rand = () => ((noiseSeed = (noiseSeed * 1103515245 + 12345) >>> 0) / 2 ** 32) * 2 - 1;

const frames = x => {
  const n = Math.round((SR * FRAME_MS) / 1000),
    out = [];
  for (let i = 0; i < x.length; i += n) {
    let s = 0;
    const end = Math.min(x.length, i + n);
    for (let j = i; j < end; j++) s += x[j] * x[j];
    out.push(Math.sqrt(s / (end - i)));
  }
  return out;
};

// every clip is made in a staging folder beside the cache and moved into place only once all of them (and the
// envelopes) are done, so a run that fails halfway leaves the committed clips and envelopes as they were
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-'));
fs.mkdirSync(path.dirname(CACHE), { recursive: true });
const STAGE = fs.mkdtempSync(path.join(path.dirname(CACHE), 'voice-out-'));
const clips = {};
for (const line of script.lines) {
  const voice = script.speakers[line.speaker].voice;
  let pcm = [];
  const parts = [];
  for (const [i, p] of line.parts.entries()) {
    // the service pads speech with silence; trim it to MARGIN ms either side, so `pause` is the real gap (+ 2 × MARGIN)
    const raw = decode(await speak(p.text, voice)).map(v => v * (p.gain ?? 1));
    const f = frames(raw),
      loud = f
        .map((v, i) => [v, i])
        .filter(([v]) => v > SPEECH * (p.gain ?? 1))
        .map(([, i]) => i);
    if (!loud.length)
      throw new Error(
        `record-voice: ${line.id} part ${i + 1} (“${p.text}”) came back with no speech above the threshold`,
      );
    const k = (SR * FRAME_MS) / 1000,
      m = (SR * MARGIN) / 1000;
    const x = raw.slice(Math.max(0, loud[0] * k - m), Math.min(raw.length, (loud.at(-1) + 1) * k + m));
    if (!parts.length) pcm = new Array((SR * LEAD) / 1000).fill(0);
    const at = (pcm.length / SR) * 1000 + MARGIN;
    parts.push({ start: Math.round(at), end: Math.round(at + (loud.at(-1) + 1 - loud[0]) * FRAME_MS) });
    pcm = pcm.concat(x, new Array(Math.round((SR * (p.pause ?? 0)) / 1000)).fill(0));
  }
  pcm = pcm.concat(new Array((SR * TAIL) / 1000).fill(0));
  if (line.noise) pcm = pcm.map(v => v + rand() * line.noise);
  const wav = path.join(tmp, `${line.id}.wav`),
    mp3 = path.join(STAGE, `${line.id}.mp3`);
  fs.writeFileSync(wav, wavOf(pcm));
  encodeMp3(wav, mp3);
  clips[line.id] = { ms: Math.round((pcm.length / SR) * 1000), parts, env: frames(pcm).map(v => Math.round(v * 1000)) };
  console.log(`${line.id}: ${clips[line.id].ms} ms, ${fs.statSync(mp3).size} bytes`);
}
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(
  path.join(STAGE, 'envelopes.json'),
  JSON.stringify({ provider: script.tts.provider, model, frameMs: FRAME_MS, clips }) + '\n',
);
fs.mkdirSync(OUT_MP3, { recursive: true });
for (const id of Object.keys(clips)) fs.renameSync(path.join(STAGE, `${id}.mp3`), path.join(OUT_MP3, `${id}.mp3`));
fs.renameSync(path.join(STAGE, 'envelopes.json'), OUT_ENV);
fs.rmSync(STAGE, { recursive: true, force: true });
const total = fs.readdirSync(OUT_MP3).reduce((n, f) => n + fs.statSync(path.join(OUT_MP3, f)).size, 0);
console.log(`wrote ${Object.keys(clips).length} clips, ${total} bytes of MP3`);
