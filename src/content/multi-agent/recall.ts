// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // the module's edge (pinned, first in the bank)
  {
    id: 'edge',
    chapter: '07-workbench',
    pin: true,
    question: 'Your manager wants every job run by a team of agents from now on. What do you advise?',
    options: [
      'Split work only where the parts don’t need to talk, and check every helper’s answer',
      'Yes: more agents always do better work',
      'Never split: one agent is always cheaper',
    ],
    correct: 0,
    why: [
      'Right: helpers pay off on big jobs with separate parts, and only with every answer checked.',
      'More agents cost more and wait on each other where parts must talk.',
      'On a job too big for one window, one agent leaves gaps however cheap it is.',
    ],
  },
  // 1. One agent, one desk
  {
    id: 'window-limit',
    chapter: '01-one-desk',
    question: 'An agent must compare 400 contracts, far more than its context window holds. What goes wrong?',
    options: [
      'Contracts that don’t fit are never read',
      'It reads them all, just slowly',
      'It compresses them perfectly',
    ],
    correct: 0,
    why: [
      'Right: the window is fixed, so whatever doesn’t fit is left out.',
      'Speed isn’t the limit; how much it can hold at once is.',
      'Squeezing text loses detail; nothing makes 400 contracts fit whole.',
    ],
  },
  {
    id: 'window-where',
    chapter: '01-one-desk',
    question: 'Where does a single agent keep everything it is working on?',
    options: ['In its one context window', 'In a shared memory every agent sees', 'In the model’s training'],
    correct: 0,
    why: [
      'Right: one agent, one window; that is its whole desk.',
      'A single agent has no others to share with; its window is all it has.',
      'Training is fixed before the job; the job’s papers live in the window.',
    ],
  },
  {
    id: 'window-sign',
    chapter: '01-one-desk',
    question: 'A long report from one agent quietly skips the last few sources. What is the likely cause?',
    options: ['It ran out of room before reaching them', 'Those sources were wrong', 'The agent chose to be brief'],
    correct: 0,
    why: [
      'Right: past its room, later sources never get read.',
      'Nothing says the sources were wrong; they were simply never read.',
      'Skipping whole sources is a room problem, not a style choice.',
    ],
  },
  // 2. A lead and helpers
  {
    id: 'helpers-cost',
    chapter: '02-lead-and-helpers',
    question: 'Moving from one agent to a lead with five helpers, what happens to the token bill?',
    options: [
      'It rises: every helper brings its own instructions and reply',
      'It falls: each reads less',
      'It stays the same',
    ],
    correct: 0,
    why: [
      'Right: helpers buy room and speed with extra tokens.',
      'Each reads less, but together they read as much, plus their own overhead.',
      'The overhead per helper makes the bill grow with every hire.',
    ],
  },
  {
    id: 'helpers-buy',
    chapter: '02-lead-and-helpers',
    question: 'What do helpers give a lead that one agent can’t have?',
    options: ['More room, each with its own window, working side by side', 'A smarter model', 'A lower bill'],
    correct: 0,
    why: [
      'Right: separate windows hold more, and they work at the same time.',
      'Helpers may run the same model; the gain is room and parallel work.',
      'The bill goes up, not down.',
    ],
  },
  {
    id: 'helpers-worth',
    chapter: '02-lead-and-helpers',
    question: 'When is a lead with helpers worth its extra cost?',
    options: [
      'When the job is valuable and too big for one agent',
      'Always: more agents are better',
      'Never: one agent is cheaper',
    ],
    correct: 0,
    why: [
      'Right: the extra tokens pay off only on big, valuable work.',
      'More agents cost more; on a small job they only add to the bill.',
      'On a job too big for one window, one agent leaves gaps.',
    ],
  },
  // 3. The hand-off
  {
    id: 'brief-vague',
    chapter: '03-the-hand-off',
    question: 'Two helpers told to “research competitors” both study the same company. Why?',
    options: ['Neither brief said which share was theirs', 'One helper is broken', 'Two helpers are too many'],
    correct: 0,
    why: [
      'Right: a helper knows only its brief, so a vague one invites overlap.',
      'Both did what they were told; the brief didn’t say enough.',
      'Two helpers can split it well, once each knows its share.',
    ],
  },
  {
    id: 'brief-says',
    chapter: '03-the-hand-off',
    question: 'What should a good brief to a helper say?',
    options: ['Its share of the work and what to send back', 'Only the overall goal', 'As little as possible'],
    correct: 0,
    why: [
      'Right: its share stops overlap, and the reply it owes keeps answers mergeable.',
      'The goal alone lets every helper pick the same easy part.',
      'Less said means more guessing, which is how gaps appear.',
    ],
  },
  {
    id: 'brief-gap',
    chapter: '03-the-hand-off',
    question: 'With vague briefs, what besides repeated work goes wrong?',
    options: ['Some of the work is never done', 'The helpers argue', 'The lead runs out of room'],
    correct: 0,
    why: [
      'Right: while two helpers overlap, a share nobody picked is left undone.',
      'Helpers don’t argue; they simply guess the same way.',
      'The lead’s room isn’t the issue; the split is.',
    ],
  },
  // 4. Agreed shapes
  {
    id: 'shape-bounce',
    chapter: '04-agreed-shapes',
    question:
      'A helper returns a quantity as “a dozen or so”, but the agreed shape wants a number. What should happen?',
    options: [
      'It goes back to the helper to send a number',
      'The lead writes 12 and carries on',
      'It is merged as written',
    ],
    correct: 0,
    why: [
      'Right: a reply that doesn’t fit the shape is sent back, not guessed at.',
      'A guess hides the problem; only the helper knows the real count.',
      'Words where a number belongs break whatever merges the replies.',
    ],
  },
  {
    id: 'shape-why',
    chapter: '04-agreed-shapes',
    question: 'Why agree a reply’s shape before the helpers start?',
    options: [
      'So the lead can check each reply as it arrives',
      'So helpers write longer replies',
      'So the lead can skip reading them',
    ],
    correct: 0,
    why: [
      'Right: a shape agreed up front is something every reply can be checked against.',
      'Length doesn’t matter; the fields and their kinds do.',
      'The lead still merges the replies; the shape makes them mergeable.',
    ],
  },
  {
    id: 'shape-cost',
    chapter: '04-agreed-shapes',
    question: 'A reply bounced and was resent. What did that cost?',
    options: ['A little time for the resend', 'A wrong report', 'Nothing at all'],
    correct: 0,
    why: [
      'Right: the bounce costs a resend, and the report stays right.',
      'The bounce is what kept the report right.',
      'The resend takes time; it is a small, worthwhile cost.',
    ],
  },
  // 5. Waiting on each other
  {
    id: 'deadlock-what',
    chapter: '05-waiting',
    question: 'Agent A waits for B’s figures; B waits for A’s list. Neither moves. What is this?',
    options: ['A deadlock', 'A slow network', 'A vague brief'],
    correct: 0,
    why: [
      'Right: a circle of waits where nobody can go first.',
      'Nothing is slow; both are waiting on each other.',
      'Their briefs may be clear; the trouble is what each needs from the other.',
    ],
  },
  {
    id: 'deadlock-fix',
    chapter: '05-waiting',
    question: 'What gets two deadlocked helpers moving again?',
    options: ['A timeout, after which the lead steps in', 'Waiting longer', 'Adding a third helper'],
    correct: 0,
    why: [
      'Right: a timeout breaks the circle, and the lead does the missing part.',
      'Neither can move first, so waiting never ends it.',
      'A third helper can only wait too.',
    ],
  },
  {
    id: 'deadlock-split',
    chapter: '05-waiting',
    question: 'A job’s parts all depend on each other. Should you split it across helpers?',
    options: [
      'Usually not: one agent avoids the waiting',
      'Yes: more helpers are always faster',
      'Yes, with vaguer briefs',
    ],
    correct: 0,
    why: [
      'Right: parts that must talk spend their time waiting; one agent just does them in order.',
      'Waiting helpers aren’t faster; the timeout made the split slower than one agent.',
      'Vaguer briefs add overlap; they don’t remove the waiting.',
    ],
  },
  // 6. Trusting a helper
  {
    id: 'trust-check',
    chapter: '06-trusting-a-helper',
    question: 'A helper reports a stock count with total confidence. What should the lead do before merging it?',
    options: ['Check it against the source', 'Trust it: it sounded sure', 'Ask the helper whether it is sure'],
    correct: 0,
    why: [
      'Right: only the source can show the number is right.',
      'Confidence isn’t evidence; sure helpers still misread.',
      'The helper will just say yes; it can’t see its own slip.',
    ],
  },
  {
    id: 'trust-shape',
    chapter: '06-trusting-a-helper',
    question: 'A reply fits the agreed shape perfectly. Is its number right?',
    options: [
      'Not necessarily: a good shape can hold a wrong value',
      'Yes: the shape guarantees it',
      'Yes, if the helper is confident',
    ],
    correct: 0,
    why: [
      'Right: the shape checks the kind of value, not whether it is true.',
      'A misread price is still a number, so the shape can’t tell it from the right one.',
      'Confidence says nothing about the value.',
    ],
  },
  {
    id: 'trust-cost',
    chapter: '06-trusting-a-helper',
    question: 'Checking every reply costs time and tokens. When is it worth it?',
    options: [
      'Whenever a wrong answer would reach the result',
      'Only for helpers that were wrong before',
      'Never: helpers rarely err',
    ],
    correct: 0,
    why: [
      'Right: a small, steady cost against a wrong result.',
      'A helper that was right yesterday can slip today.',
      'Missing and wrong checks are among the commonest failures studied.',
    ],
  },
  // 7. Workbench
  {
    id: 'bench-small',
    chapter: '07-workbench',
    question: 'A job reads four short catalogues on a tight budget. How many helpers?',
    options: ['None: the lead alone fits it and costs least', 'Five, to finish fastest', 'Two, to be safe'],
    correct: 0,
    why: [
      'Right: a small job fits one window, and every helper adds tokens.',
      'Five helpers blow the budget on overhead for a tiny job.',
      'Helpers aren’t a safety net; checks are.',
    ],
  },
  {
    id: 'bench-check',
    chapter: '07-workbench',
    question: 'Which setting mattered on every job in the workbench?',
    options: ['Checking the replies', 'Hiring the most helpers', 'One-line briefs'],
    correct: 0,
    why: [
      'Right: every job hid a misread number only a check could catch.',
      'The most helpers passed no job.',
      'One-line briefs made helpers repeat each other.',
    ],
  },
];
