// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three to five items per chapter, each asking
// the chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 1. First step
  {
    id: 'core-idea', chapter: '01-first-step', pin: true,   // the module's single most important idea: exactly one pin
    question: 'A colleague asks what the system does when it gets a question. What do you tell them?',
    options: ['The right answer, in the reader’s new situation', 'A plausible misconception', 'Another plausible misconception'],
    correct: 0,
    why: ['Right. Say why it holds.', 'Name the misconception, and the cue the reader missed.', 'Name this misconception too.'],
  },
  {
    id: 'second-idea', chapter: '01-first-step',
    question: 'A second question on the same chapter, in another setting?',
    options: ['A plausible misconception', 'The right answer', 'Another plausible misconception'],
    correct: 1,
    why: ['Why this is wrong.', 'Right. Why it holds.', 'Why this is wrong.'],
  },
  {
    id: 'third-idea', chapter: '01-first-step',
    question: 'A third question, asking the idea a new way?',
    options: ['A plausible misconception', 'Another plausible misconception', 'The right answer'],
    correct: 2,
    why: ['Why this is wrong.', 'Why this is wrong.', 'Right. Why it holds.'],
  },
];
