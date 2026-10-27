/**
 * The ElevenLabs client the recorders share: text-to-speech and music, each cached in a folder keyed by everything
 * sent (so a rerun after a small edit only pays for what changed), plus the local ffmpeg decode and encode.
 * The key comes only from the command's environment, never from or to a file.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const API = 'https://api.elevenlabs.io/v1';

/** The key from the environment, or exit with a hint naming the script. */
export function apiKey(script) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.error(`${script}: set ELEVENLABS_API_KEY in the environment (it is never read from or written to a file).`);
    process.exit(1);
  }
  return key;
}

const cacheFile = (cache, request) =>
  path.join(cache, `${crypto.createHash('sha256').update(JSON.stringify(request)).digest('hex').slice(0, 16)}.mp3`);

/** POST `body` and cache the audio it returns as `file`, retrying a busy or failing service a few times. */
async function fetchAudio(key, url, body, file, what) {
  if (fs.existsSync(file)) return file;
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    });
    if ((r.status === 429 || r.status >= 500) && attempt < 4) {
      const wait = 1000 * 2 ** attempt;
      console.warn(`ElevenLabs ${r.status}, retrying in ${wait} ms`);
      await new Promise(ok => setTimeout(ok, wait));
      continue;
    }
    if (!r.ok) throw new Error(`ElevenLabs ${r.status} for “${what}”: ${(await r.text()).slice(0, 200)}`);
    const type = r.headers.get('content-type') ?? '';
    if (!type.startsWith('audio/'))
      throw new Error(`ElevenLabs sent ${type || 'no content type'} for “${what}”, not audio`);
    // write then rename, so a run killed mid-write never leaves a truncated file the cache would reuse
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.tmp`, Buffer.from(await r.arrayBuffer()));
    fs.renameSync(`${file}.tmp`, file);
    return file;
  }
}

/** One piece of speech as an MP3 file, from the cache or the API. */
export function speak({ key, cache, voice, model, seed, outputFormat, text }) {
  const body = { text, model_id: model, seed };
  return fetchAudio(
    key,
    `${API}/text-to-speech/${voice}?output_format=${outputFormat}`,
    body,
    cacheFile(cache, { voice, outputFormat, ...body }),
    text,
  );
}

/** One generated music track as an MP3 file, from the cache or the API. */
export function compose({ key, cache, outputFormat, ...body }) {
  return fetchAudio(
    key,
    `${API}/music?output_format=${outputFormat}`,
    body,
    cacheFile(cache, { music: true, outputFormat, ...body }),
    body.prompt,
  );
}

/** Decode an audio file to mono float samples at `sr`. */
export const decode = (file, sr) => {
  const raw = execFileSync(
    'ffmpeg',
    ['-loglevel', 'error', '-i', file, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'],
    { maxBuffer: 1 << 28 },
  );
  return Array.from(new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4));
};

/** Mono samples as a 16-bit WAV. */
export const wavOf = (x, sr) => {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + x.length * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(x.length * 2, 40);
  x.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return b;
};

/** Encode to a mono MP3 with no metadata, so the same input gives the same bytes. `filter` is an ffmpeg -af chain. */
export function encodeMp3(input, mp3, { bitrate = '32k', filter } = {}) {
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    input,
    ...(filter ? ['-af', filter] : []),
    '-ac',
    '1',
    '-codec:a',
    'libmp3lame',
    '-b:a',
    bitrate,
    '-map_metadata',
    '-1',
    '-fflags',
    '+bitexact',
    '-flags:a',
    '+bitexact',
    mp3,
  ]);
}
