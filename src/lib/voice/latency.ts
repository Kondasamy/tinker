// The latency budget (KTD11): how long after the caller's turn ends the first sound of the reply plays. The stage times
// are Larkspur's illustrative planning numbers (data/voice/calls.json `host`), not any provider's; the token counts are
// the site's BPE, live, and the reply's length is its clip's, from the committed envelope. Pure sums, so the chapters
// and the tests read the same numbers.
import { encode } from '../lm/bpe';
import calls from '../../../data/voice/calls.json' with { type: 'json' };
import { clipOf } from './turns';
import { textOf } from './script';

export const HOST = calls.host;

/** The first thing a streamed reply can speak: its first sentence. */
export const firstSentence = (text: string) => text.match(/^.*?[.?!](\s|$)/)?.[0].trim() ?? text;

export interface Latency {
  /** speech-to-text's final transcript, after the turn ends */
  stt: number;
  /** the model's first token */
  modelFirst: number;
  /** the model has written the whole reply: the same with or without streaming */
  modelDone: number;
  /** the caller hears the first sound */
  firstSound: number;
  tokens: number;
  firstTokens: number;
  /** how long the reply takes to say */
  speechMs: number;
}

/** Times from the end of the caller's turn, for one reply clip. Without streaming each stage waits for the one before
 * to finish; with streaming the voice starts on the first sentence while the model keeps writing. */
export function latency(reply: string, streaming: boolean): Latency {
  const text = textOf(reply),
    c = clipOf(reply),
    tokens = encode(text).length,
    firstTokens = encode(firstSentence(text)).length;
  const speechMs = c.parts[c.parts.length - 1].end - c.parts[0].start;
  const stt = HOST.sttMs,
    modelFirst = stt + HOST.modelFirstMs,
    modelDone = modelFirst + tokens * HOST.msPerToken;
  const firstSound = streaming
    ? modelFirst + firstTokens * HOST.msPerToken + HOST.ttsFirstMs
    : modelDone + HOST.ttsFirstMs + Math.round(HOST.ttsRealtime * speechMs);
  return { stt, modelFirst, modelDone, firstSound, tokens, firstTokens, speechMs };
}

export const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`);
