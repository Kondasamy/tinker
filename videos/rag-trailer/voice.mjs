// Records the trailer's narration with ElevenLabs, one clip per line of SCRIPT.md, with word timings from the
// with-timestamps endpoint (no transcription pass). Key from ELEVENLABS_API_KEY only; never written anywhere.
// Usage: node videos/rag-trailer/voice.mjs  → assets/voice/NN.mp3 + assets/voice/words.json
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const VOICE = 'TX3LPaxmHKxFdv7VOQHJ'; // Liam, the voice of the earlier Tinker videos
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error('Set ELEVENLABS_API_KEY');

// the narration is the indented line under each "## Line NN" heading
const lines = [...readFileSync(join(DIR, 'SCRIPT.md'), 'utf8').matchAll(/^## Line (\d+)[^\n]*\n\n {4}([^\n]+)$/gm)].map(
  m => ({ id: m[1].padStart(2, '0'), text: m[2].trim() }),
);
mkdirSync(join(DIR, 'assets/voice'), { recursive: true });
const out = {};
for (const { id, text } of lines) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.25, speed: 1.05 },
    }),
  });
  if (!res.ok) throw new Error(`${id}: ${res.status} ${await res.text()}`);
  const { audio_base64, alignment } = await res.json();
  writeFileSync(join(DIR, `assets/voice/${id}.mp3`), Buffer.from(audio_base64, 'base64'));
  // characters → words: a word runs from its first character's start to its last character's end
  const words = [];
  let cur = null;
  alignment.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      cur = null;
      return;
    }
    if (!cur) words.push((cur = { text: '', start: alignment.character_start_times_seconds[i] }));
    cur.text += ch;
    cur.end = alignment.character_end_times_seconds[i];
  });
  out[id] = { text, words };
  console.log(id, words.length, 'words', words.at(-1).end.toFixed(2), 's');
}
writeFileSync(join(DIR, 'assets/voice/words.json'), `${JSON.stringify(out, null, 2)}\n`);
