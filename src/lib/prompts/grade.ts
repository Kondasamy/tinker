// Live grades for a reply (KTD2, KTD4): Evals' code graders against Larkspur's references, plus a format check and
// the house rule. Grades are computed here, never recorded.
import { exactMatchOf, keyFactOf, type Reference } from '../evals/graders';
import references from '../../../data/prompts/references.json' with { type: 'json' };
import { QUIRK, SIGNOFF, ticketOf, type Setup } from './cards';

export const REFERENCES: Record<string, Reference & { team: string }> = references;

export interface Grade {
  /** the reply's words: the JSON's `reply` when it parsed, else the whole reply */
  text: string;
  /** every key fact of the ticket's reference is in the reply (Evals' keyFactOf) */
  facts: boolean;
  /** the format card was followed; null when no format card is clipped */
  format: boolean | null;
  /** the JSON's team is the reference's (Evals' exactMatchOf); null unless the JSON format parsed */
  routed: boolean | null;
  /** the reply ends with the ticket reference; null when no rules card is clipped */
  rule: boolean | null;
  /** the examples' quirk turned up */
  quirk: boolean;
  /** the examples' sign-off turned up */
  signed: boolean;
  words: number;
}

/** The JSON a program would read, or null: the whole reply must parse, with a string team and reply. */
export function parseJson(reply: string): { team: string; reply: string } | null {
  try {
    const j = JSON.parse(reply.trim());
    return j && typeof j.team === 'string' && typeof j.reply === 'string' ? j : null;
  } catch {
    return null;
  }
}
/** Exactly three lines, each a `- ` item. */
export const isList = (reply: string) => {
  const lines = reply.trim().split('\n');
  return lines.length === 3 && lines.every(l => l.startsWith('- ') && l.length > 2);
};
/** Ends with `[ref]`, a final full stop aside. */
export const endsWithRef = (text: string, ref: string) =>
  text
    .trim()
    .replace(/[.\s]+$/, '')
    .endsWith(`[${ref}]`);

export function gradeReply(s: Pick<Setup, 'ticket' | 'format' | 'rules'>, reply: string): Grade {
  const ref = REFERENCES[s.ticket],
    json = s.format === 'json' ? parseJson(reply) : null,
    text = json ? json.reply : reply;
  return {
    text,
    facts: keyFactOf(ref, text),
    format: s.format === 'none' ? null : s.format === 'json' ? json !== null : isList(reply),
    routed: json ? exactMatchOf({ answer: ref.team }, json.team) : null,
    rule: s.rules === 'none' ? null : endsWithRef(text, ticketOf(s.ticket).ref),
    quirk: text.includes(QUIRK.replace(/!$/, '')),
    signed: text.includes(SIGNOFF.replace(/^\W+/, '')),
    words: text.split(/\s+/).filter(Boolean).length,
  };
}
/** What the workbench and chapter 6 count as a pass: the key fact, a reply the router can read, and the house rule. */
export const passes = (g: Grade) => g.facts && g.format === true && g.routed === true && g.rule === true;
