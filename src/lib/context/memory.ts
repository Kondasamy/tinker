// Memory outside the window (R10.6): a small file set the host keeps between sessions. The model's choice to write a
// note is part of its recorded turn; the host writes it, and reads every note into the next session's window.
import type { Memo } from './turns';

export type Notes = Record<string, string>;
export const MEMORY_DIR = '/memories/';

/** The host writes only inside the memory directory (facts: path traversal is the application's job to stop). */
export function writeNote(notes: Notes, memo: Memo): Notes {
  if (!memo.file.startsWith(MEMORY_DIR) || memo.file.includes('..')) return notes;
  return { ...notes, [memo.file]: memo.text };
}

/** The notes a session starts with: all of them when memory is on, none when it is off. */
export const readNotes = (notes: Notes, on: boolean): Notes => (on ? notes : {});
