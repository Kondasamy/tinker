// Bias and fairness' recall bank: the recap and the warm-up ask from it. Two items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

const C = {
  average: '01-right-on-average',
  groups: '02-errors-by-group',
  skew: '03-where-skew-comes-from',
  drop: '04-dropping-the-column',
  bars: '05-one-bar-or-two',
  every: '06-every-kind',
  bench: '07-workbench',
};

export const RECALL: RecallItem[] = [
  // 2. Errors group by group (pinned: the module's one idea)
  {
    id: 'measure-each-group',
    chapter: C.groups,
    pin: true,
    question: 'A loan model is 90% accurate overall. How do you find out whether it treats a group fairly?',
    options: [
      'Measure its error rates, of each kind, for each group',
      'Trust the 90%: it already includes every group',
      'Check that the group field is not one of its inputs',
      'Ask the model how sure it is',
    ],
    correct: 0,
    why: [
      'Right. An average can hide a group that is wrongly turned down far more often.',
      'The average blends groups, so one can sit well below it unseen.',
      'Other fields can carry the group back in, so a missing field proves little.',
      'Confidence says how sure the model is, not who its errors land on.',
    ],
  },
  {
    id: 'false-decline',
    chapter: C.groups,
    question: 'Which error lands on an applicant who would have repaid?',
    options: ['A false decline', 'A false approval', 'Neither: only the lender bears errors'],
    correct: 0,
    why: [
      'Right. They were turned down though they would have repaid.',
      'A false approval is someone approved who then didn’t repay; the lender bears that one.',
      'A false decline costs the applicant the account they would have kept.',
    ],
  },
  // 1. Right on average
  {
    id: 'average-hides',
    chapter: C.average,
    question: 'A support bot answers 92% of questions right. One customer group gets 70% right. Is that possible?',
    options: [
      'Yes: a large group doing well can hide a small one doing badly',
      'No: every group must sit near the average',
      'Only if the 92% was measured wrongly',
    ],
    correct: 0,
    why: [
      'Right. The average weighs each group by its size, so a small group barely moves it.',
      'Groups can sit far from the average; it only says how they blend.',
      'Both numbers can be measured right; they answer different questions.',
    ],
  },
  {
    id: 'bar-decides',
    chapter: C.average,
    question: 'A check scores each applicant from 0 to 1. What turns the score into a yes or no?',
    options: ['A bar: approve at or above it', 'The score itself is the decision', 'The applicant’s region'],
    correct: 0,
    why: [
      'Right. Moving the bar changes who is approved and which mistakes are made.',
      'A score is a guess of the chance of repaying; someone still has to pick where yes begins.',
      'Here the decision rests on the score and the bar, though fields can carry a region in.',
    ],
  },
  // 3. Where the skew comes from
  {
    id: 'proxy',
    chapter: C.skew,
    question:
      'A model never sees which branch a customer uses, but its decisions still differ by branch. What is the likely cause?',
    options: [
      'A proxy: another field, like the postcode, goes with the branch',
      'The model guesses branches at random',
      'Branch differences can’t come from data',
    ],
    correct: 0,
    why: [
      'Right. A field that goes with the group lets the model find the group anyway.',
      'A trained model is not random; it follows whatever fields go with the outcome.',
      'Data carries groups in many fields at once, which is how proxies work.',
    ],
  },
  {
    id: 'thin-sample',
    chapter: C.skew,
    question:
      'A group has 40 repayers. One more is wrongly turned down. Roughly how far does its false-decline rate move?',
    options: ['About 2.5 points', 'About 0.25 points', 'Not at all: one person can’t move a rate'],
    correct: 0,
    why: [
      'Right. One in 40 is 2.5 points, so a small group’s rate jumps with luck.',
      'That would be one in 400; this group is ten times smaller.',
      'Every person is part of the rate, and in a small group each one counts for a lot.',
    ],
  },
  // 4. Dropping the column
  {
    id: 'blind-not-fair',
    chapter: C.drop,
    question: 'A team removes the group field and declares its model fair. What do you check first?',
    options: [
      'Each group’s error rates, since other fields can carry the group',
      'Nothing: without the field the model can’t tell groups apart',
      'Whether the model got faster',
    ],
    correct: 0,
    why: [
      'Right. Only the outcomes per group show whether the gap closed.',
      'Proxies, like a postcode, let the model tell groups apart without the field.',
      'Speed has nothing to do with who the model gets wrong.',
    ],
  },
  {
    id: 'proxy-cost',
    chapter: C.drop,
    question: 'Dropping both the group field and its proxy closed the gap. Why might wrong decisions rise?',
    options: [
      'The proxy also carried real signal about the outcome',
      'Fewer fields always mean a worse model',
      'The gap and the error are the same number',
    ],
    correct: 0,
    why: [
      'Right. If the postcode truly went with repaying, losing it costs accuracy.',
      'A field with no signal costs nothing to drop; this one had signal.',
      'The gap compares groups; the error counts every wrong decision.',
    ],
  },
  // 5. One bar or two
  {
    id: 'two-bars',
    chapter: C.bars,
    question: 'One group’s repayers are turned down more often. With a bar per group, what evens it out?',
    options: ['A lower bar for that group', 'A higher bar for that group', 'The same bar for both'],
    correct: 0,
    why: [
      'Right. A lower bar approves more of that group, so fewer repayers are turned down.',
      'A higher bar turns even more of that group down.',
      'One bar for both is where the gap came from.',
    ],
  },
  {
    id: 'two-bars-cost',
    chapter: C.bars,
    question: 'Per-group bars evened out false declines. What should the team weigh next?',
    options: [
      'More false approvals, and treating groups differently on purpose',
      'Nothing: equal false declines settle fairness',
      'Only whether overall accuracy went up',
    ],
    correct: 0,
    why: [
      'Right. The lower bar lets more non-repayers through, and with some groups the law has a say.',
      'Equal false declines is one kind of fairness; precision and false approvals can still differ.',
      'Overall accuracy usually falls a little, and it never shows who carries the errors.',
    ],
  },
  // 6. You can't have every kind
  {
    id: 'every-kind',
    chapter: C.every,
    question:
      'Two groups repay at different rates. Can any score give them equal precision and equal error rates of both kinds?',
    options: [
      'No, except in edge cases such as approving almost nobody',
      'Yes, with enough data',
      'Yes, by removing the group field',
    ],
    correct: 0,
    why: [
      'Right. With different base rates the three can’t all hold; a team picks which matters.',
      'The clash is arithmetic, so more data doesn’t remove it.',
      'Removing the field changes the score, not the arithmetic between the groups.',
    ],
  },
  {
    id: 'precision',
    chapter: C.every,
    question: 'What does a group’s precision measure here?',
    options: [
      'Of those approved, the share who repaid',
      'Of those who repaid, the share approved',
      'The share of all decisions that were right',
    ],
    correct: 0,
    why: [
      'Right. It asks how far an approval can be trusted.',
      'That is the share of repayers approved, the flip side of false declines.',
      'That is accuracy, across approvals and turn-downs alike.',
    ],
  },
  // 7. Workbench
  {
    id: 'held-out',
    chapter: C.bench,
    question: 'A setting met the fairness rule on the applicants the model learned from. What is still missing?',
    options: [
      'A check on applicants it never saw',
      'Nothing: meeting the rule once proves it',
      'A higher bar for everyone',
    ],
    correct: 0,
    why: [
      'Right. Rates measured on the data it learned from can flatter it.',
      'A rule met on training data may not hold on new applicants.',
      'Raising every bar changes the trade-off; it doesn’t test the setting.',
    ],
  },
  {
    id: 'rule-first',
    chapter: C.bench,
    question: 'Why does the credit team set its gap rule before looking for the fewest wrong decisions?',
    options: [
      'The fewest wrong decisions alone would bring the gap back',
      'Wrong decisions don’t matter once a rule exists',
      'The rule makes every setting equally good',
    ],
    correct: 0,
    why: [
      'Right. Without the rule, nothing stops the setting with the fewest errors from keeping a wide gap.',
      'They still matter: among settings that keep the rule, the fewest wins.',
      'Settings that keep the rule still differ in how many decisions they get wrong.',
    ],
  },
];
