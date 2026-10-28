// Writes the trailer's WebVTT captions from the recorded word timings, placed where index.html starts each line.
// Usage: node videos/<folder>/vtt.mjs  → public/video/<folder>.vtt
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const words = JSON.parse(readFileSync(join(DIR, 'assets/voice/words.json'), 'utf8'));
// each line's start in the film, read off its <audio id="vo-NN" … data-start>
const html = readFileSync(join(DIR, 'index.html'), 'utf8');
const start = id => Number(html.match(new RegExp(`id="vo-${id}"[^>]*data-start="([\\d.]+)"`))[1]);

const ts = s => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 60000))}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`;
};
const cues = [];
for (const [id, { words: ws }] of Object.entries(words)) {
  const at = start(id);
  // a cue is a sentence, cut at a comma or colon once it holds four words; one still over eight words halves
  const parts = [];
  let cue = [];
  ws.forEach((w, i) => {
    cue.push(w);
    if (/[.?!]$/.test(w.text) || (cue.length >= 4 && /[,:]$/.test(w.text)) || i === ws.length - 1) {
      if (cue.length > 8) parts.push(cue.slice(0, Math.ceil(cue.length / 2)), cue.slice(Math.ceil(cue.length / 2)));
      else parts.push(cue);
      cue = [];
    }
  });
  for (const p of parts) cues.push({ from: at + p[0].start, to: at + p.at(-1).end, text: p.map(c => c.text).join(' ') });
}
// hold each cue 0.3 s past its last word, but never into the next cue
const vtt = `WEBVTT\n\n${cues
  .map((c, i) => `${ts(c.from)} --> ${ts(Math.min(c.to + 0.3, cues[i + 1]?.from ?? Infinity))}\n${c.text}`)
  .join('\n\n')}\n`;
writeFileSync(join(DIR, `../../public/video/${basename(DIR)}.vtt`), vtt);
console.log(`${cues.length} cues`);
