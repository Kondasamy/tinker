// The simulated writer (KTD13): replies written by stated rules from Larkspur's references and templates, never a
// model. It fills any signature a recording lacks, and stands in for a chapter whose recording doesn't show its
// effect. Each rule names the fact (facts.json) it follows. Effects here are true because a rule makes them so.
import references from '../../../data/prompts/references.json' with { type: 'json' };
import { GENERIC, QUIRK, SIGNOFF, ticketOf, type Setup } from './cards.ts';

export const VERSION = 'prompts-sim-1';

/** The rules, each with the fact it follows. */
export const RULES = [
  { id: 'vague', fact: 'clear-and-direct', rule: 'A vague task gets a generic reply with none of the policy in it.' },
  { id: 'examples', fact: 'few-shot', rule: 'Replies copy the examples’ sign-off.' },
  { id: 'quirk', fact: 'example-bias', rule: 'Replies copy a quirk every example shares.' },
  {
    id: 'buried',
    fact: 'lost-in-the-middle',
    rule: 'A rule on top, with examples after it, is missed; at the end it is kept.',
  },
  { id: 'format', fact: 'openai-guide', rule: 'A format card is followed.' },
] as const;

const REFS: Record<string, { answer: string; team: string }> = references;

/** The simulated reply to one setup. The same setup always gives the same words. */
export function simulateReply(s: Setup): string {
  const t = ticketOf(s.ticket),
    ref = REFS[s.ticket];
  let body = s.task === 'clear' ? ref.answer : GENERIC;
  if (s.examples === '2q') body = `${QUIRK} ${body}`;
  if (s.examples !== 0) body = `${body} ${SIGNOFF}`;
  // a rule on top is kept only when nothing after it shows a different ending
  if (s.rules === 'last' || (s.rules === 'first' && s.examples === 0)) body = `${body} [${t.ref}]`;
  if (s.format === 'json') return JSON.stringify({ team: ref.team, reply: body });
  if (s.format === 'list') {
    const lines = body.split(/(?<=[.!?])\s+/);
    while (lines.length < 3) lines.push(lines.at(-1)!);
    return [...lines.slice(0, 2), lines.slice(2).join(' ')].map(l => `- ${l}`).join('\n');
  }
  return body;
}
