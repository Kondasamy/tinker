/**
 * record-narration: speaks every entry of data/watch/<module>.script.json (built from the chapters' STEPS by
 * tests/unit/narration.test.ts, `pnpm narration:script`) with ElevenLabs text-to-speech and writes
 *   public/data/watch/<module>/<chapter>/<step>.mp3  (mono, 32 kbps, through the local ffmpeg)
 *   data/watch/<module>.json                         ({ [chapter]: { [step]: { text, ms } } }: the text each clip was
 *                                                     recorded from, so a later copy edit shows as stale, and its length)
 * With --music it instead generates Watch's one music loop with the ElevenLabs Music API into
 *   public/data/watch/music.mp3                      (encoded at its final low level: the player only ducks it)
 *
 * Run by hand, with the key only in the command's environment (never in a file):
 *   ELEVENLABS_API_KEY=... pnpm record:narration [module] [--music]
 * Requests are cached in .cache/watch (keyed by everything sent), so a rerun after a copy edit only pays for the
 * changed steps. The service is not promised to return identical audio twice: the clips are committed and never
 * regenerated in CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { apiKey, compose, decode, encodeMp3, speak } from './lib/elevenlabs.mjs';

/** One calm narrator for every module (the voice module's callers use other voices). */
const TTS = { voice: 'SAz9YHcvj6GT2YYXdXww', voiceName: 'River', model: 'eleven_multilingual_v2', seed: 17 };
const OUTPUT = 'mp3_44100_128';
const MUSIC = {
  prompt:
    'A quiet, warm instrumental bed for a calm educational explainer: soft felt piano, warm analogue pads and a gentle ' +
    'plucked acoustic guitar, slow tempo around 80 BPM, no drums, no vocals, steady low dynamics with no build or ' +
    'climax, sitting unobtrusively under a narrator, ending where it began so it loops seamlessly.',
  music_length_ms: 60000,
  model_id: 'music_v1',
  force_instrumental: true,
};
const MUSIC_LUFS = -28;
const FADE_IN = 0.5,
  FADE_OUT = 2; // s, so the loop seam dips softly instead of clicking

const KEY = apiKey('record-narration');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, '.cache/watch');
const SR = 22050;
const args = process.argv.slice(2);
const id = args.find(a => !a.startsWith('--')) ?? 'rag';
const ms = file => Math.round((decode(file, SR).length / SR) * 1000);
/** A file's integrated loudness (LUFS) once mixed to mono, from ffmpeg's EBU R128 meter. */
const lufs = file =>
  Number(
    spawnSync('ffmpeg', ['-nostats', '-i', file, '-af', 'aformat=channel_layouts=mono,ebur128', '-f', 'null', '-'], {
      encoding: 'utf8',
    })
      .stderr.match(/I:\s+(-?[\d.]+) LUFS/g)
      .at(-1)
      .match(/-?[\d.]+/)[0],
  );

if (args.includes('--music')) {
  const raw = await compose({ key: KEY, cache: CACHE, outputFormat: OUTPUT, ...MUSIC });
  const s = ms(raw) / 1000,
    out = path.join(ROOT, 'public/data/watch/music.mp3');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  encodeMp3(raw, out, {
    bitrate: '64k',
    // one fixed gain (not loudnorm's dynamic one), so the music keeps its own soft dynamics
    filter: `volume=${(MUSIC_LUFS - lufs(raw)).toFixed(2)}dB,afade=t=in:d=${FADE_IN},afade=t=out:st=${s - FADE_OUT}:d=${FADE_OUT},aresample=44100`,
  });
  console.log(`music: ${s.toFixed(1)} s, ${lufs(out)} LUFS, ${fs.statSync(out).size} bytes`);
  process.exit(0);
}

const script = JSON.parse(fs.readFileSync(path.join(ROOT, `data/watch/${id}.script.json`), 'utf8'));
const OUT_MP3 = path.join(ROOT, `public/data/watch/${id}`);
const OUT_JSON = path.join(ROOT, `data/watch/${id}.json`);

// every clip is made in a staging folder and moved into place only once all of them are done, so a run that fails
// halfway leaves the committed clips as they were
fs.mkdirSync(CACHE, { recursive: true });
const STAGE = fs.mkdtempSync(path.join(CACHE, 'out-'));
const clips = {};
let total = 0;
for (const { chapter, step, text } of script) {
  const raw = await speak({ key: KEY, cache: CACHE, ...TTS, outputFormat: OUTPUT, text });
  const mp3 = path.join(STAGE, chapter, `${step}.mp3`);
  fs.mkdirSync(path.dirname(mp3), { recursive: true });
  encodeMp3(raw, mp3, { filter: 'aresample=22050' }); // as the voice clips: 32 kbps suits 22 kHz speech
  clips[chapter] ??= {};
  clips[chapter][step] = { text, ms: ms(mp3) };
  total += clips[chapter][step].ms;
  console.log(`${chapter}/${step}: ${clips[chapter][step].ms} ms, ${fs.statSync(mp3).size} bytes`);
}
fs.rmSync(OUT_MP3, { recursive: true, force: true });
fs.mkdirSync(path.dirname(OUT_MP3), { recursive: true });
fs.renameSync(STAGE, OUT_MP3);
fs.writeFileSync(OUT_JSON, `${JSON.stringify(clips, null, 2)}\n`);
const bytes = fs
  .readdirSync(OUT_MP3, { recursive: true })
  .reduce((n, f) => n + (f.endsWith('.mp3') ? fs.statSync(path.join(OUT_MP3, f)).size : 0), 0);
console.log(`wrote ${script.length} clips, ${(total / 1000).toFixed(1)} s, ${bytes} bytes of MP3`);
