// Who labels the data's recall bank: the recap and the warm-up ask from it. Two or three items per chapter, each asking
// the chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

const C = {
  decide: '01-someone-has-to-decide',
  agree: '02-how-often-do-they-agree',
  rule: '03-write-the-rule-down',
  gold: '04-check-the-checkers',
  votes: '05-many-votes',
  hard: '06-label-the-hard-ones-first',
  bench: '07-workbench',
};

export const RECALL: RecallItem[] = [
  // 3. Write the rule down (pinned: the module's one idea)
  {
    id: 'rule-fixes-disagreement',
    chapter: C.rule,
    pin: true,
    question: 'Two careful labellers keep splitting the same kind of ticket between two labels. What fixes most of it?',
    options: [
      'Write down where one label ends and the other begins',
      'Replace one of the labellers',
      'Let a vote decide every such ticket',
      'Drop that kind of ticket from the data',
    ],
    correct: 0,
    why: [
      'Right. Careful people split because the rule was never written; once it is, they read it the same way.',
      'Both are careful; a new person would face the same unwritten rule.',
      'A vote picks a side each time, but the next labeller still has no rule to follow.',
      'Customers keep sending those tickets, so the model must learn them.',
    ],
  },
  // 1. Someone has to decide
  {
    id: 'label-is-judgement',
    chapter: C.decide,
    question: 'A manager says the labels are “just the facts”. What is a fairer description?',
    options: [
      'Each label is a person’s judgement of what the item means',
      'Labels are measured by the system that made the item',
      'Labels are always right once two people have looked',
    ],
    correct: 0,
    why: [
      'Right. Someone read each item and decided; on unclear items, careful people decide differently.',
      'A support ticket carries no intent field; a person reads it and decides.',
      'Two people can agree and both be wrong, or split on a ticket that reads two ways.',
    ],
  },
  {
    id: 'labels-are-answer-key',
    chapter: C.decide,
    question: 'Why do a team’s labels matter beyond training the model?',
    options: [
      'They become the answer key the model is graded against',
      'They are only needed while the model trains',
      'Graders write their own answers, so labels don’t matter there',
    ],
    correct: 0,
    why: [
      'Right. A test set’s reference answers are labels too, so a bad label makes a right answer look wrong.',
      'Every eval run grades against labels, long after training ends.',
      'Graders compare against reference answers, which are people’s labels.',
    ],
  },
  // 2. How often do they agree?
  {
    id: 'kappa-above-luck',
    chapter: C.agree,
    question: 'Two labellers agree on 80% of items. Why might that still be weak?',
    options: [
      'If one label is very common, they would agree often by luck alone',
      'Agreement under 90% always means the labels are wrong',
      'Agreement can’t be measured between two people',
    ],
    correct: 0,
    why: [
      'Right. Kappa takes away the agreement luck explains, and only what’s left is real.',
      'What counts is how far agreement rises above luck, not a fixed line.',
      'It can: the share of items both labelled the same is agreement.',
    ],
  },
  {
    id: 'kappa-zero',
    chapter: C.agree,
    question: 'Two labellers’ kappa comes out near 0. What does that mean?',
    options: [
      'They agree about as often as they would by luck',
      'They never agree on any item',
      'They agree perfectly',
    ],
    correct: 0,
    why: [
      'Right. Kappa 0 is agreement no better than luck; 1 is perfect.',
      'They may agree often, but no more often than luck would give.',
      'Perfect agreement is a kappa of 1.',
    ],
  },
  // 3. Write the rule down
  {
    id: 'edge-case-into-rule',
    chapter: C.rule,
    question: 'A new edge case keeps coming up in the labelling queue. What should happen to it?',
    options: [
      'It goes into the guideline, with an example',
      'Each labeller decides it their own way',
      'It is skipped until the model can label it',
    ],
    correct: 0,
    why: [
      'Right. Written once, it is read the same way by everyone after.',
      'That is how disagreements start: the same ticket, different holes.',
      'A model given no rule guesses too, and the guess becomes the label.',
    ],
  },
  // 4. Check the checkers
  {
    id: 'gold-catches-careless',
    chapter: C.gold,
    question: 'How can a team catch a careless labeller without checking every label?',
    options: [
      'Mix in items with checked answers, and score each labeller on them',
      'Ask each labeller how careful they were',
      'Check only the items labellers flag as hard',
    ],
    correct: 0,
    why: [
      'Right. Gold items score everyone on answers checked ahead, at the cost of a few extra labels.',
      'People who rush rarely know how many they got wrong.',
      'A careless labeller slips on easy items too, and flags few.',
    ],
  },
  {
    id: 'noisy-labels-hurt',
    chapter: C.gold,
    question: 'What happens to a model trained on a careless labeller’s labels?',
    options: [
      'It learns their mistakes and scores worse on new items',
      'Nothing: a model ignores wrong labels',
      'It only gets slower to train',
    ],
    correct: 0,
    why: [
      'Right. Larkspur’s toy triage model scored far lower on new tickets when counted on the rushed labeller’s labels.',
      'A model has no way to tell a wrong label from a right one; it learns both.',
      'The cost is wrong answers, not time.',
    ],
  },
  // 5. Many votes
  {
    id: 'vote-beats-one',
    chapter: C.votes,
    question: 'Why does a majority vote of three labellers usually beat one?',
    options: [
      'Their slips rarely land on the same item, so two outvote one',
      'Three people always agree',
      'A vote checks the label against the answer',
    ],
    correct: 0,
    why: [
      'Right. A slip by one is outvoted by the other two, as long as their slips fall on different items.',
      'They split often; the vote settles the splits.',
      'A vote counts labels; it never sees the answer.',
    ],
  },
  {
    id: 'minority-right',
    chapter: C.votes,
    question: 'On one ticket two labellers outvote the third. Can the third be right?',
    options: [
      'Yes: a vote can be wrong when two make the same mistake',
      'No: the majority is right by definition',
      'Only if the third is the team lead',
    ],
    correct: 0,
    why: [
      'Right. Split votes are worth a closer look for exactly this reason.',
      'A vote is a guess that’s usually right, not a proof.',
      'Anyone can be the one who read it right; seniority isn’t the test.',
    ],
  },
  // 6. Label the hard ones first
  {
    id: 'least-sure-first',
    chapter: C.hard,
    question: 'Labels are costly. Which items should people label first to improve a model fastest?',
    options: ['The ones the model is least sure of', 'The ones the model is most sure of', 'The oldest items first'],
    correct: 0,
    why: [
      'Right. A label where the model is unsure teaches it most; Larkspur’s toy model needed fewer labels that way.',
      'The model already gets those right, so their labels teach it little.',
      'Age says nothing about what the model still needs to learn.',
    ],
  },
  {
    id: 'hard-for-whom',
    chapter: C.hard,
    question:
      'Tickets a small word-counting model finds hard go to a big model labeller. What happened in Larkspur’s recorded run?',
    options: [
      'The big model got them all right: hard for one model isn’t hard for every model',
      'The big model failed on the same tickets',
      'The big model refused to label them',
    ],
    correct: 0,
    why: [
      'Right. Both recorded models labelled all twenty right; what stumps word counting can be easy for a model that reads.',
      'In this run it made no mistakes on them.',
      'It labelled every one; the recording has a label for each.',
    ],
  },
  // 7. Workbench
  {
    id: 'cheapest-passing',
    chapter: C.bench,
    question: 'Two labelling setups both clear the accuracy bar. Which does the team pick?',
    options: ['The cheaper one', 'The one with more votes per ticket', 'The one with more labels'],
    correct: 0,
    why: [
      'Right. Past the bar, extra labels buy nothing the team asked for.',
      'More votes cost more, and past the bar they add nothing needed.',
      'More labels cost more for the same result.',
    ],
  },
  {
    id: 'gold-pays',
    chapter: C.bench,
    question: 'Gold tickets cost extra labels. Why can they make a labelling budget cheaper overall?',
    options: [
      'They drop a careless labeller, so one label a ticket is enough',
      'Gold labels are free',
      'Gold tickets replace the need for any other labels',
    ],
    correct: 0,
    why: [
      'Right. With the careless labeller gone, one person a ticket clears the bar without paying for votes.',
      'Each gold label costs the same as any other label.',
      'Gold scores the labellers; the other tickets still need labels.',
    ],
  },
];
