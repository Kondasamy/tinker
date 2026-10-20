// Module 4's recall bank (KTD7): the recap and the warm-up ask from it. Each item asks a chapter's idea in a new
// situation, not the chapter's own question. Claims about evals come from data/evals/facts.json (R5).
// The registry imports this bank and the e2e specs import the registry in Node, so it reads facts only, not the engine.
import type { RecallItem } from '../../lib/recall';
import { fact } from '../../lib/evals/facts';

export const RECALL: RecallItem[] = [
  // 1. It worked when I tried it
  {
    id: 'whole-set-not-tries', chapter: '01-it-worked-when-i-tried-it', pin: true,
    question: 'Larkspur’s team swaps the model behind the assistant for a newer one. The support lead asks it five questions, and every answer is better than before. What shows the swap is safe to ship?',
    options: [
      'The five better answers: they came from someone who knows the questions',
      'Running the whole test set on the old and the new setup, and finding no question that passed before and fails now',
      'The newer model’s higher score on a public benchmark',
      'Asking the new model whether its answers improved',
    ],
    correct: 1,
    why: [
      'Five questions are the ones someone thought to ask. A change can fix those and break one nobody asked, as v2 did.',
      `Right. The same questions, run on both setups, show what got fixed and what broke. ${fact('eval').claim}`,
      'A public benchmark tests other tasks, not Larkspur’s questions over Larkspur’s documents. It cannot tell you which of your answers broke.',
      'The model cannot see its old answers or the answers they should be. Grading needs the expected answer, outside the model.',
    ],
  },
  {
    id: 'totals-hide-regressions', chapter: '01-it-worked-when-i-tried-it',
    question: 'A new version of the warehouse assistant passes more test questions than the old one. Can the team say nothing got worse?',
    options: [
      'Yes: a higher total means every question did at least as well',
      'No: it can fix some questions and break others, so compare them one by one',
      'Yes, as long as the total went up by more than one question',
      'No: totals mean nothing, only the questions someone tried count',
    ],
    correct: 1,
    why: [
      'A total adds fixes and breaks together. Two fixes and one break still show a higher total.',
      'Right. Only a question-by-question comparison shows a question that used to pass and now fails.',
      'The size of the gain does not matter: any number of fixes can hide a break.',
      'The total is useful, it just is not enough. Tried questions are the weaker evidence: they cover what someone thought to ask.',
    ],
  },
  {
    id: 'what-is-a-regression', chapter: '01-it-worked-when-i-tried-it',
    question: 'The team shortens the assistant’s instructions. Which of these is a regression?',
    options: [
      'A question that failed before the change and still fails',
      'A question that passed before the change and fails after it',
      'A new question added to the test set that fails',
      'A question that failed before the change and passes now',
    ],
    correct: 1,
    why: [
      'Something that never worked did not get worse. It is a failure to fix, not a regression.',
      'Right. A regression is something that used to work and stopped, because of the change.',
      'A new question has no “before”. It shows a gap, not something the change broke.',
      'That is a fix: the change made it work.',
    ],
  },
  {
    id: 'keep-the-set-fixed', chapter: '01-it-worked-when-i-tried-it',
    question: 'Why does the team run the same test questions on every version, instead of fresh questions each time?',
    options: [
      'So two versions’ results compare, question by question',
      'Because a test set, once written, should never change',
      'So the model learns the right answers',
      'It doesn’t matter which questions run, as long as there are enough of them',
    ],
    correct: 0,
    why: [
      'Right. A question run on both versions shows whether that question got better or worse. Fresh questions only give two unrelated scores.',
      `The set grows: ${fact('look-at-data').claim} It stays the same between two versions you compare.`,
      'Running a test does not teach the model anything. The model is the same before and after the test.',
      'With different questions, a lower score could mean harder questions, not a worse version.',
    ],
  },
];
