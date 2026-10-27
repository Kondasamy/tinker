// Records the trailer's music bed with ElevenLabs Music. Key from ELEVENLABS_API_KEY only.
// Usage: node videos/rag-trailer/music.mjs  → assets/audio/bgm-raw.mp3
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error('Set ELEVENLABS_API_KEY');
const res = await fetch('https://api.elevenlabs.io/v1/music', {
  method: 'POST',
  headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
  body: JSON.stringify({
    prompt:
      'Quiet, warm instrumental bed for a calm explainer: soft felt piano, light brushed percussion, gentle plucked strings, 92 bpm, steady and unobtrusive, no vocals, no big drops, ends on a soft resolved chord',
    music_length_ms: 48000,
    force_instrumental: true,
  }),
});
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
mkdirSync(join(DIR, 'assets/audio'), { recursive: true });
writeFileSync(join(DIR, 'assets/audio/bgm-raw.mp3'), Buffer.from(await res.arrayBuffer()));
console.log('ok');
