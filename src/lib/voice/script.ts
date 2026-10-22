// The call script (data/voice/script.json): who says each line, in what voice, and the words of each part. Captions read
// the words from here, never typed by hand.
import script from '../../../data/voice/script.json' with { type: 'json' };

export type SpeakerId = keyof typeof script.speakers;
export interface Part {
  text: string;
  pause?: number;
  gain?: number;
}
export interface Line {
  id: string;
  speaker: SpeakerId;
  parts: Part[];
  noise?: number;
}

export const SPEAKERS = script.speakers;
export const LINES = script.lines as Line[];
export const lineOf = (id: string): Line => {
  const l = LINES.find(x => x.id === id);
  if (!l) throw new Error(`no line ${id}`);
  return l;
};
/** The words of a line, or of its first `n` parts. */
export const textOf = (id: string, n?: number) =>
  lineOf(id)
    .parts.slice(0, n)
    .map(p => p.text)
    .join(' ');
export const speakerOf = (id: string) => SPEAKERS[lineOf(id).speaker];
