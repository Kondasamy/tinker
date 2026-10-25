// Calibration's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's
// idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';
import { fact } from '../../lib/calibration/facts';

const [GPT4_PRE, GPT4_POST] = fact('gpt4').value!.split(',');

const C = {
  meaning: '01-what-70-should-mean',
  jars: '02-honest-jars',
  polish: '03-after-the-polish',
  dial: '04-one-dial',
  score: '05-keeping-score',
  hand: '06-when-to-hand-over',
  bench: '07-workbench',
};

export const RECALL: RecallItem[] = [
  // 1. What 70% should mean (pinned: the module's one idea)
  {
    id: 'seventy-means',
    chapter: C.meaning,
    pin: true,
    question: 'A fraud model flags 200 payments as “70% likely fraud”. If it is calibrated, how many are fraud?',
    options: ['About 140', 'All 200: it flagged them', 'About 70', 'You can’t say anything about a group'],
    correct: 0,
    why: [
      'Right: 70% means right seven times in ten, so about 140 of 200.',
      'A flag at 70% admits about three in ten are not fraud.',
      '70 would be 35%; the percentage applies to the 200 flagged.',
      'Calibration is exactly a claim about groups: of the cases given 70%, about seven in ten.',
    ],
  },
  {
    id: 'one-case',
    chapter: C.meaning,
    question: 'The assistant said “95% sure” and was wrong once. Does that show it is badly calibrated?',
    options: [
      'No: one case can’t; you count how often its 95% answers are right',
      'Yes: a 95% answer should never be wrong',
      'Yes: it should have said 0%',
    ],
    correct: 0,
    why: [
      'Right: 95% allows one miss in twenty; only many cases show whether it keeps that rate.',
      '95% promises about one wrong in twenty, not none.',
      'It can’t know which answers will miss; it states how often answers like this one are right.',
    ],
  },
  {
    id: 'jar-below-ring',
    chapter: C.meaning,
    question: 'In a jar of answers stated at 90%, only half the marbles are mint. What does that jar say?',
    options: [
      'Those answers are overconfident: they claim 90% and are right 50%',
      'Those answers are underconfident',
      'The jar is honest: half of 90% is close enough',
    ],
    correct: 0,
    why: [
      'Right: mint below the ring means it claims more than it gets right.',
      'Underconfident is the opposite: mint above the ring.',
      'Honest means the mint reaches the ring: 90% stated, about 90% right.',
    ],
  },
  // 2. Honest jars
  {
    id: 'held-out',
    chapter: C.jars,
    question: 'Why check a model’s calibration on text it never trained on?',
    options: [
      'On its training text it has seen the answers, so it looks surer and righter than it is',
      'Training text is too long to check',
      'It makes no difference which text you use',
    ],
    correct: 0,
    why: [
      'Right: fresh text shows how it does on what it will meet next.',
      'Length is not the issue; the model has already learned that text.',
      'It does: on its own training text a model is flattered.',
    ],
  },
  {
    id: 'often-wrong-honest',
    chapter: C.jars,
    question: 'A model is right only a quarter of the time. Can it still be well calibrated?',
    options: [
      'Yes, if it knows when: low confidence on its guesses that miss',
      'No: calibration needs high accuracy',
      'No: it must be right at least half the time',
    ],
    correct: 0,
    why: [
      'Right: Larkspur mini’s top guess is often wrong, and its confidence says so.',
      'Calibration compares stated and actual; it says nothing about how high either is.',
      'There is no such cut-off: a 20% forecast that comes true one time in five is honest.',
    ],
  },
  {
    id: 'diagonal',
    chapter: C.jars,
    question: 'On a reliability diagram, where does a perfectly calibrated model’s line run?',
    options: ['Along the diagonal', 'Flat along the top', 'Flat along the bottom'],
    correct: 0,
    why: [
      'Right: on the diagonal, each stated level equals how often it was right.',
      'Along the top every jar is always right, whatever it states: underconfident below 100%.',
      'Along the bottom every jar is always wrong: overconfident wherever it states more than 0%.',
    ],
  },
  // 3. After the polish
  {
    id: 'polish-moves',
    chapter: C.polish,
    question: 'A model is tuned only to be more polite. Should you re-check its confidence?',
    options: [
      'Yes: tuning for style can move confidence too',
      'No: politeness and confidence are unrelated',
      'Only if its accuracy fell',
    ],
    correct: 0,
    why: [
      'Right: Larkspur mini’s style fine-tune became overconfident on text that had nothing to do with style.',
      'Tuning changes all the weights a little, and confidence comes from the same weights.',
      'Confidence can drift even when accuracy holds; check both.',
    ],
  },
  {
    id: 'overconfident-def',
    chapter: C.polish,
    question: 'A model says 80% on average and is right 50% of the time. Which word fits?',
    options: ['Overconfident', 'Underconfident', 'Calibrated'],
    correct: 0,
    why: [
      'Right: it claims more than it delivers.',
      'Underconfident would claim less than it delivers.',
      'Calibrated would claim about what it delivers.',
    ],
  },
  {
    id: 'post-training',
    chapter: C.polish,
    question: 'What did OpenAI’s GPT-4 report show about calibration after post-training?',
    options: [
      'The pre-trained model was well calibrated; after post-training it was less so',
      'Post-training made it perfectly calibrated',
      'Calibration was not measured',
    ],
    correct: 0,
    why: [
      `Right: OpenAI reports an ECE of ${GPT4_PRE} before and ${GPT4_POST} after, on part of MMLU.`,
      'It went the other way: the post-trained model was worse calibrated.',
      'It was measured, on a subset of the MMLU test.',
    ],
  },
  // 4. One dial
  {
    id: 'temperature-order',
    chapter: C.dial,
    question: 'After temperature scaling, does the model choose different answers?',
    options: [
      'No: dividing every score by one number keeps their order, so the top pick stays',
      'Yes: a higher temperature picks a different top answer',
      'Yes, but only for unsure answers',
    ],
    correct: 0,
    why: [
      'Right: only how sure it says it is changes.',
      'The order of the scores is kept, so the top pick can’t change.',
      'Every answer’s scores are divided by the same number; none reorders.',
    ],
  },
  {
    id: 'which-way',
    chapter: C.dial,
    question: 'A model is overconfident. Which way should its temperature go?',
    options: ['Above 1, to soften its confidence', 'Below 1, to sharpen it', 'Leave it at 1 and retrain'],
    correct: 0,
    why: [
      'Right: above 1 pulls every confidence toward the middle.',
      'Below 1 makes it surer, and an overconfident model worse.',
      'Temperature scaling exists so you don’t have to retrain.',
    ],
  },
  {
    id: 'fit-and-check',
    chapter: C.dial,
    question: 'Why fit the temperature on one half of the data and check it on the other?',
    options: [
      'A check on the same data as the fit flatters it',
      'The model only allows half the data at a time',
      'To make the fit run faster',
    ],
    correct: 0,
    why: [
      'Right: the setting was chosen to look good on the fit half; only fresh data can confirm it.',
      'Any amount of data works; the split is about a fair check.',
      'Speed has nothing to do with it.',
    ],
  },
  // 5. Keeping score
  {
    id: 'always-base-rate',
    chapter: C.score,
    question: 'A weather service says “30% rain” every day, and it rains on 30% of days. What is wrong with it?',
    options: [
      'Nothing on ECE, but it is no help: it never says which days',
      'It is badly calibrated',
      'Its Brier score is perfect',
    ],
    correct: 0,
    why: [
      'Right: honest on average, yet it tells you nothing about any one day.',
      'Its 30% comes true 30% of the time: that is calibrated.',
      'Its Brier score is poor: it is never sure, so every day leaves a big gap.',
    ],
  },
  {
    id: 'brier-lower',
    chapter: C.score,
    question: 'Is a lower Brier score better or worse?',
    options: ['Better: smaller gaps between confidence and what happened', 'Worse', 'It depends on the model size'],
    correct: 0,
    why: [
      'Right: 0 is sure and right every time.',
      'It measures error, so lower is better.',
      'Size doesn’t change what the score means.',
    ],
  },
  {
    id: 'ece-weighting',
    chapter: C.score,
    question: 'In ECE, why does a jar holding many answers count for more than a nearly empty one?',
    options: [
      'Its gap affects more answers, and it is measured more surely',
      'Full jars are always more wrong',
      'It doesn’t: every jar counts the same',
    ],
    correct: 0,
    why: [
      'Right: ECE weights each jar’s gap by its share of the answers.',
      'Size says nothing about which way a jar is off.',
      'ECE weights by size, so a handful of answers can’t swing it.',
    ],
  },
  // 6. When to hand over
  {
    id: 'raise-line',
    chapter: C.hand,
    question: 'You raise the hand-over line. What happens?',
    options: [
      'Fewer answers go out, more of them right, and more reach a person',
      'More answers go out',
      'Nothing changes for customers',
    ],
    correct: 0,
    why: [
      'Right: coverage falls, accuracy rises, and the desk gets busier.',
      'A higher line can only hold answers back.',
      'Customers with unsure questions now talk to a person.',
    ],
  },
  {
    id: 'set-from-limit',
    chapter: C.hand,
    question: 'How should a team pick its hand-over line?',
    options: [
      'Start from the wrong-answer rate it can accept, and take the lowest line that keeps it',
      'Always hand over below 50%',
      'Hand over nothing: people are expensive',
    ],
    correct: 0,
    why: [
      'Right: the limit sets the line; every notch higher costs staff time.',
      'A fixed 50% ignores how the assistant really does.',
      'Then every wrong answer reaches a customer.',
    ],
  },
  {
    id: 'order-matters',
    chapter: C.hand,
    question: 'What must a confidence get right for a hand-over line to work?',
    options: [
      'Its order: answers it calls surer must be right more often',
      'Its exact values, to the percent',
      'Nothing: any number works',
    ],
    correct: 0,
    why: [
      'Right: the line keeps the top and hands over the rest, so the top must be the better part.',
      'Exact values matter for showing customers; the line only needs the order.',
      'A random number hands over right and wrong answers alike.',
    ],
  },
  // 7. Workbench
  {
    id: 'per-kind',
    chapter: C.bench,
    question: 'Why can’t one hand-over line suit every kind of question?',
    options: [
      'The assistant is more reliable on some kinds than others',
      'Every kind uses a different model',
      'One line always suits every kind',
    ],
    correct: 0,
    why: [
      'Right: a reliable kind needs a low line, a shaky one a high line.',
      'It is the same assistant; its reliability differs by kind.',
      'On the workbench, one line for all overflows the desk.',
    ],
  },
  {
    id: 'two-dials',
    chapter: C.bench,
    question: 'On the workbench, what are the temperature and the line each for?',
    options: [
      'The temperature makes shown confidence honest; the line keeps wrong answers in check',
      'Both do the same job',
      'The temperature decides who is handed over',
    ],
    correct: 0,
    why: [
      'Right: two jobs, two dials.',
      'They act on different things: one on the numbers shown, one on who meets a person.',
      'Here the line reads the stated confidence, which the dial never reorders.',
    ],
  },
  {
    id: 'desk-limit',
    chapter: C.bench,
    question: 'Every kind is safe with a high line, but the desk is overwhelmed. What next?',
    options: [
      'Lower the line on the kinds that stay safe with less',
      'Remove the wrong-answer rule',
      'Turn every temperature down',
    ],
    correct: 0,
    why: [
      'Right: spend hand-overs where they prevent wrong answers.',
      'The rule protects customers; the fix is where the line sits.',
      'The temperature changes what customers see, not how many are handed over.',
    ],
  },
];
