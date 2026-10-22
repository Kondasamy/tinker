// Real tokenizers' output, recorded once by scripts/record-tokenizers.mjs (KTD4): the site never ships their vocabularies.
import data from '../../../data/tokens/encodings.json' with { type: 'json' };
import sentences from '../../../data/tokens/sentences.json' with { type: 'json' };

export interface Sentence {
  id: string;
  kind: 'english' | 'numbers' | 'code' | 'language';
  lang: string;
  text: string;
}
export interface Tokenizer {
  id: string;
  name: string;
  model: string;
  vocabSize: number;
}
/** The token's text, or its bytes when they are only part of a character (show them as byte chips). */
export type Piece = string | number[];
export interface Encoding {
  ids: number[];
  pieces: Piece[];
}

export const ENCODINGS = data as {
  recorded: string;
  library: string;
  tokenizers: Tokenizer[];
  sentences: Record<string, Record<string, Encoding>>;
  /** tokens per corpus document, per tokenizer */
  corpus: Record<string, Record<string, number>>;
};
export const SENTENCES = sentences as Sentence[];
export const TOKENIZERS = ENCODINGS.tokenizers;

export function encodingOf(sentence: string, tokenizer: string): Encoding {
  const e = ENCODINGS.sentences[sentence]?.[tokenizer];
  if (!e) throw new Error(`no recording of ${sentence} for ${tokenizer}`);
  return e;
}

/** A real tokenizer's count over every corpus document. */
export const realCorpusTokens = (tokenizer: string) =>
  Object.values(ENCODINGS.corpus[tokenizer]).reduce((a, b) => a + b, 0);
