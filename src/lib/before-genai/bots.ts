// Larkspur's three help-desk bots on one fixed message (KTD4). One run feeds the scene, the flat view and the story
// column, so they never disagree. The scripted bot's keyword rules and the intent bot's word counts run live; the
// GenAI bot's reply is a recording (data/before-genai/replies.json, scripts/record/before-genai.mjs), never typed.
import messages from '../../../data/before-genai/messages.json' with { type: 'json' };
import replies from '../../../data/before-genai/replies.json' with { type: 'json' };
import rules from '../../../data/before-genai/rules.json' with { type: 'json' };
import { type Intent, INTENT_IDS, TICKETS } from '../labelling/story';
import { margin, scores, train } from '../labelling/triage';

export interface Message {
  id: string;
  text: string;
  /** the ids of the chapters that show it */
  chapters: string[];
}
export interface Rule {
  id: string;
  keywords: string[];
  reply: string;
}

export const MESSAGES = messages.messages as Message[];
export const messageOf = (id: string) => {
  const m = MESSAGES.find(m => m.id === id);
  if (!m) throw new Error(`unknown message: ${id}`);
  return m;
};
export const RULES = rules.rules as Rule[];
export const FALLBACK = rules.fallback;

/** A message's words, lower case, apostrophes kept ("hasn't"), as the scripted bot sees them. */
export const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/’/g, "'")
    .match(/[\p{L}\p{N}']+/gu) ?? [];

/** The first rule with a keyword (a word or a run of words) in the message; none means the fallback card. */
export function matchRule(text: string, list: readonly Rule[] = RULES) {
  const said = ` ${words(text).join(' ')} `;
  return list.find(r => r.keywords.some(k => said.includes(` ${words(k).join(' ')} `)));
}

/** The intent bot: Labelling's triage model, counted from Larkspur's labelled tickets with Labelling's intents. Counted
 * on first use, so a page that only draws the kiosk (the home hero) never trains it. */
let triage: ReturnType<typeof train> | undefined;
const TRIAGE = () => (triage ??= train(TICKETS, INTENT_IDS));
/**
 * Below this lead of its top intent over the next, the intent bot falls back. A message with no word the tickets use
 * scores 0 (every intent has the same share of tickets) and off-list ones stay near it; "Where is my order?" leads
 * by about 0.56, so the floor sits between.
 */
export const MARGIN_FLOOR = 0.25;
const INTENT_REPLIES = rules.intentReplies as Record<Intent, string>;

export type GenaiRun = { recorded: false } | { recorded: true; reply: string; model: string; date: string };
export interface Run {
  message: Message;
  scripted: { answered: boolean; rule?: string; reply: string };
  intent: { answered: boolean; intent: Intent; margin: number; reply: string };
  genai: GenaiRun;
}

/** One message through all three bots; `list` swaps in other keyword rules (chapter 1's fix). */
export function run(message: Message, list: readonly Rule[] = RULES): Run {
  const rule = matchRule(message.text, list),
    top = scores(TRIAGE(), message.text)[0][0],
    lead = margin(TRIAGE(), message.text),
    sure = lead >= MARGIN_FLOOR,
    reply = (replies.replies as Record<string, string>)[message.id];
  return {
    message,
    scripted: rule ? { answered: true, rule: rule.id, reply: rule.reply } : { answered: false, reply: FALLBACK },
    intent: { answered: sure, intent: top, margin: lead, reply: sure ? INTENT_REPLIES[top] : rules.intentFallback },
    genai:
      reply && replies.model && replies.recorded
        ? { recorded: true, reply, model: replies.model, date: replies.recorded }
        : { recorded: false },
  };
}

// Chapter 1's fix (KTD7): add one word of the missed message to the rule it should hit. A word wins if the message
// then matches that rule and every message that matched before still matches the same rule.
export const MISSED = 'parcel';
export const MISSED_RULE = 'track';
/** The words chapter 1's Select offers: the missed message's own, once each, in order. */
export const CANDIDATES = [...new Set(words(messageOf(MISSED).text))];
/** The rules with `word` added to the rule the missed message should hit. */
export const withWord = (word: string) =>
  RULES.map(r => (r.id === MISSED_RULE ? { ...r, keywords: [...r.keywords, word] } : r));
/** The first message another rule answered that `word` would take over, if any. */
export const stolen = (word: string) =>
  MESSAGES.find(m => {
    const was = matchRule(m.text)?.id;
    return was && matchRule(m.text, withWord(word))?.id !== was;
  });
export const wins = (word: string) =>
  matchRule(messageOf(MISSED).text, withWord(word))?.id === MISSED_RULE && !stolen(word);
export const WINNERS = CANDIDATES.filter(wins);
