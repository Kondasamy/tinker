// Names, messages and settings for Watermarks and made-by-AI (R13), read from data/watermarks/, never typed into copy.
// The mark's γ and δ are U2's chosen setting (spike.json); the recorded replies name their model and date (R6).
import human from '../../../data/watermarks/human.json' with { type: 'json' };
import machine from '../../../data/watermarks/machine.json' with { type: 'json' };
import spike from '../../../data/watermarks/spike.json' with { type: 'json' };
import story from '../../../data/watermarks/story.json' with { type: 'json' };
import { KEY } from './greenlist';
import { mark, PICTURE } from './pixels';
import type { Mark } from './sample';

export const COMPANY = story.company;
export const CUSTOMER = story.customer;
/** The "Larkspur" email the customer forwards, which the assistant never wrote. */
export const FORWARDED = story.forwarded;

/** U2's chosen setting: green share γ and nudge δ, with Larkspur's key. */
export const MARK: Required<Mark> = { gamma: spike.chosen.gamma, delta: spike.chosen.delta, key: KEY };
/** Replies run this many tokens; the model reads only its last 32. */
export const STEPS = spike.steps;
export const CTX = spike.ctx;

/** The reply chapters 3–5 write, check and reword. */
export const REPLY = story.reply;
export const PREFIXES = story.prefixes;
export const DELTAS = story.deltas;
/** A lower line than 4, to show what it costs in false alarms. */
export const LOWER_LINE = story.lowerLine;

export interface Human {
  id: string;
  by: string;
  question: string;
  reply: string;
}
/** Hand-written support replies (labelled hand-written wherever shown). */
export const HUMAN: Human[] = human.replies;
/** The same questions answered by a real model in one recorded run (labelled with MACHINE_META's model and date). */
export const MACHINE: { id: string; question: string; reply: string }[] = machine.replies;
export const MACHINE_META = machine.meta;

/** The toy picture, before and after its pixel mark. */
export const PICTURE_INFO = story.picture;
export { PICTURE };
export const MARKED_PICTURE = mark(PICTURE, story.picture.seed, story.picture.strength);
export const GENERATOR = `${COMPANY} image tool (demo)`;
