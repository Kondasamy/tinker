// Post-training's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 6. You get what you check (pinned: the module's one idea)
  {
    id: 'grade-gets-gamed',
    chapter: '06-you-get-what-you-check',
    pin: true,
    question:
      'A model is trained to write product descriptions, rewarded whenever a description is over 100 words and mentions “durable”. What will training most likely produce?',
    options: [
      'Long descriptions that say “durable” whether or not it helps',
      'Better descriptions: the grader rewards detail',
      'No change: rewards only work for maths',
      'Short, accurate descriptions',
    ],
    correct: 0,
    why: [
      'Right: post-training trains on the grade, so the model learns exactly what the grade checks, padding and keyword included.',
      'The grader checks length and a word, not quality, so the cheapest way to score is padding.',
      'Any reward that tells drafts apart moves the model; these rules tell them apart easily.',
      'Short descriptions score zero under this grader, so training pushes away from them.',
    ],
  },
  {
    id: 'hack-definition',
    chapter: '06-you-get-what-you-check',
    question: 'Which of these is reward hacking?',
    options: [
      'A chatbot rewarded for “helpful” ratings learns to flatter users instead of answering',
      'A chatbot that gets a hard question wrong',
      'A chatbot trained on more data than another',
    ],
    correct: 0,
    why: [
      'Right: it scores on the rating without doing the job the rating stands for.',
      'A wrong answer is a plain mistake; hacking means scoring well while missing the point.',
      'Data size has nothing to do with gaming a reward.',
    ],
  },
  {
    id: 'fix-the-grader',
    chapter: '06-you-get-what-you-check',
    question: 'Your grader is being gamed by drafts that include a number but give the wrong one. What is the fix?',
    options: [
      'Check that the number is the right one, against a reference',
      'Train for more rounds so the right answer catches up',
      'Lower the reward for every draft equally',
    ],
    correct: 0,
    why: [
      'Right: checking the actual fact gives the wrong numbers no reward, so they stop winning.',
      'More rounds push harder toward whatever the grader rewards, so the gaming draft pulls further ahead.',
      'An equal change keeps the same ranking, so the gaming draft still wins.',
    ],
  },
  // 1. Base or assistant
  {
    id: 'base-continues',
    chapter: '01-base-or-assistant',
    question: 'A base model is given an email that ends “Best regards,”. What does it most likely write?',
    options: ['A name, then maybe the start of another email', 'A reply to the email', 'A refusal to answer'],
    correct: 0,
    why: [
      'Right: a base model continues the document, and after “Best regards,” a name usually follows.',
      'Replying is an assistant’s habit, taught in post-training; the base model only continues text.',
      'Refusing is also learnt in post-training; the base model has no such habit.',
    ],
  },
  {
    id: 'sft-teaches-style',
    chapter: '01-base-or-assistant',
    question:
      'A team fine-tunes a base model on 500 support replies that all start “Thanks for reaching out!”. What changes?',
    options: [
      'Its replies take on that style, opening line included',
      'It learns every product fact in those replies for good',
      'Nothing visible: 500 examples are too few',
    ],
    correct: 0,
    why: [
      'Right: supervised fine-tuning copies the examples’ style, as Larkspur mini’s sign-off showed.',
      'Facts stick less reliably than style, and go stale; the Fine-tuning module showed documents suit facts better.',
      'A few hundred examples were enough for Larkspur mini to learn its sign-off.',
    ],
  },
  {
    id: 'post-training-order',
    chapter: '01-base-or-assistant',
    question: 'In what order is an assistant usually made?',
    options: [
      'Pre-train on lots of text, then post-train with examples, preferences and graders',
      'Post-train first, then pre-train',
      'Train only on people’s preferences from the start',
    ],
    correct: 0,
    why: [
      'Right: pre-training gives the knowledge and the language; post-training shapes how it answers.',
      'Post-training shapes an existing model, so there has to be a base model first.',
      'Preferences alone can’t teach a model language; they adjust a model that already writes.',
    ],
  },
  // 2. Which is better?
  {
    id: 'pairs-not-scores',
    chapter: '02-which-is-better',
    question: 'Why do teams ask people to compare two replies rather than score one out of 10?',
    options: [
      'People agree more on which of two is better than on an exact score',
      'Pairs are cheaper to store',
      'A score out of 10 can’t be used for training',
    ],
    correct: 0,
    why: [
      'Right: one person’s 7 is another’s 5, but most pick the same winner of a pair.',
      'Storage is not the reason; consistency of the labels is.',
      'Scores can be used, but they are noisier labels than comparisons.',
    ],
  },
  {
    id: 'reward-model-scores',
    chapter: '02-which-is-better',
    question:
      'Draft X beat Y, and Y beat Z, in people’s picks. How will a reward model fitted to those picks score them?',
    options: ['X highest, then Y, then Z', 'All three the same', 'Z highest: it was compared least'],
    correct: 0,
    why: [
      'Right: a draft that wins its pairs scores higher, so the scores line up with the chain of wins.',
      'The picks separate them, so the fitted scores do too.',
      'Losing a comparison lowers a score; it never raises it.',
    ],
  },
  {
    id: 'pairs-for-tone',
    chapter: '02-which-is-better',
    question: 'Which quality is best taught with preference pairs rather than a checking program?',
    options: ['How polite a reply sounds', 'Whether a sum is right', 'Whether a reply is valid JSON'],
    correct: 0,
    why: [
      'Right: politeness has no right answer to check, but people can tell which of two is politer.',
      'A sum can be checked exactly by a program, which is cheaper and fairer than asking people.',
      'A parser checks JSON exactly, so no people are needed.',
    ],
  },
  // 3. Learning from preferences
  {
    id: 'beta-direction',
    chapter: '03-learning-from-preferences',
    question: 'A team raises DPO’s strength β. What happens to the trained model?',
    options: [
      'It stays closer to the reference model',
      'It strays further from the reference',
      'It ignores the preferences',
    ],
    correct: 0,
    why: [
      'Right: a higher β pulls the model back toward its reference, so the picks move it less.',
      'That is what a lower β does.',
      'It still leans toward the preferred drafts, only less far.',
    ],
  },
  {
    id: 'dpo-no-reward-model',
    chapter: '03-learning-from-preferences',
    question: 'What does DPO skip that the original preference training (RLHF) used?',
    options: [
      'A separate reward model and a reinforcement-learning loop',
      'People’s preference pairs',
      'A reference model',
    ],
    correct: 0,
    why: [
      'Right: DPO trains on the pairs directly with a classification-style loss.',
      'The pairs are DPO’s training data; without them there is nothing to learn from.',
      'DPO keeps a reference model: it measures every change against it.',
    ],
  },
  {
    id: 'reference-meaning',
    chapter: '03-learning-from-preferences',
    question: 'In preference training, what is the reference policy?',
    options: [
      'The model as it was before this training, which it is kept close to',
      'The best answer to each question',
      'The person who picked the preferences',
    ],
    correct: 0,
    why: [
      'Right: it is the starting model, and the strength β sets how far training may move from it.',
      'That would be a reference answer, which graders use; the reference policy is a model.',
      'People supply the pairs; the reference policy is the model’s own starting odds.',
    ],
  },
  // 4. Grade, don't judge
  {
    id: 'advantage-sign',
    chapter: '04-grade-dont-judge',
    question: 'In a group of 8 drafts, 6 pass the grader and 2 fail. Under GRPO, what happens to a passing draft?',
    options: [
      'It becomes more likely, but only a little: most drafts passed',
      'It becomes much more likely: it passed',
      'Nothing: only failing drafts are updated',
    ],
    correct: 0,
    why: [
      'Right: its advantage is reward minus the group average, and with most passing that gap is small.',
      'A pass in a group where nearly everyone passes is barely above average, so the push is small.',
      'Both move: passing drafts up, failing ones down.',
    ],
  },
  {
    id: 'grader-needs-answer',
    chapter: '04-grade-dont-judge',
    question: 'What does a checkable grader need for each question?',
    options: ['A known right answer it can compare against', 'A person to read each draft', 'A bigger model to judge'],
    correct: 0,
    why: [
      'Right: with a reference answer, a program can grade every draft the same way, at no cost.',
      'If a person must read each draft, it is human feedback, not a checkable grader.',
      'A model judge is another option, but it can be wrong; a checkable grader compares against a known answer.',
    ],
  },
  {
    id: 'clip-why',
    chapter: '04-grade-dont-judge',
    question: 'Why does GRPO clip each step?',
    options: [
      'So one lucky group can’t swing the model too far at once',
      'To make training slower on purpose',
      'To stop the grader from being wrong',
    ],
    correct: 0,
    why: [
      'Right: a group is a small sample, and the clip keeps one sample from moving the model too much.',
      'Slower is a side effect; the point is stability.',
      'Clipping limits the update; it can’t fix a wrong grader.',
    ],
  },
  // 5. Only what you can check
  {
    id: 'zero-spread',
    chapter: '05-only-what-you-can-check',
    question: 'Every draft in a group gets the same reward. What does GRPO do with that group?',
    options: ['Nothing: every advantage is zero', 'Pushes every draft up equally', 'Pushes the most likely draft down'],
    correct: 0,
    why: [
      'Right: with no spread, no draft beats the average, so nothing moves.',
      'Advantages are measured against the group average, so equal rewards give zero, not a shared push.',
      'No draft is below average either, so none is pushed down.',
    ],
  },
  {
    id: 'what-grader-misses',
    chapter: '05-only-what-you-can-check',
    question:
      'An assistant trained only with a “cites a source” grader gives cited answers that are rude. What will more training with that grader do about the rudeness?',
    options: [
      'Nothing: the grader can’t tell rude from polite',
      'Fix it: training improves everything',
      'Make it worse on purpose',
    ],
    correct: 0,
    why: [
      'Right: rude and polite cited answers score the same, so the grader never pushes toward polite.',
      'Training moves only what the grader tells apart; rudeness isn’t in it.',
      'The grader ignores tone entirely, so it neither rewards nor punishes rudeness.',
    ],
  },
  {
    id: 'mix-signals',
    chapter: '05-only-what-you-can-check',
    question: 'A team needs an assistant that is both correct and kind. What training signals fit?',
    options: [
      'A checkable grader for correctness, and preference pairs for kindness',
      'A checkable grader for both',
      'Preference pairs for correctness, and nothing for kindness',
    ],
    correct: 0,
    why: [
      'Right: each signal covers what it can tell apart, so together they cover both.',
      'No program can reliably check kindness, so the grader leaves it where it was.',
      'Correctness can be checked cheaply by program, and kindness needs people’s comparisons.',
    ],
  },
  // 7. Build a grader
  {
    id: 'test-the-grader',
    chapter: '07-build-a-grader',
    question: 'Before training with a new grader, what should a team check first?',
    options: [
      'That drafts built to game it score below the right answers',
      'That it gives every draft a high score',
      'That it runs fast',
    ],
    correct: 0,
    why: [
      'Right: if a gaming draft can tie the right answer, training may drift to it.',
      'A grader that passes everything gives no spread, so training learns nothing.',
      'Speed matters, but a fast grader that gets gamed trains the wrong thing quickly.',
    ],
  },
  {
    id: 'more-rules-risk',
    chapter: '07-build-a-grader',
    question:
      'A grader checks the right answer. Adding “signs off politely” as a second rule, worth the same, could do what?',
    options: [
      'Let a wrong answer with a sign-off tie a right answer without one',
      'Nothing: the right-answer rule still decides',
      'Make every answer right',
    ],
    correct: 0,
    why: [
      'Right: one point each means a wrong, signed-off draft scores the same as a right, unsigned one.',
      'Points add up, so the right-answer rule no longer decides alone.',
      'A rule only changes rewards; it can’t make a wrong answer right.',
    ],
  },
  {
    id: 'exact-vs-fact',
    chapter: '07-build-a-grader',
    question: 'Why might a team prefer “has the key fact” over “matches the reference word for word”?',
    options: ['A right answer in other words still passes', 'It is easier to game', 'It needs no reference'],
    correct: 0,
    why: [
      'Right: word-for-word matching fails right answers phrased differently, so it rewards copying a sentence.',
      'Being easier to game is a reason to avoid a rule, not to prefer it.',
      'Both rules need a reference: the key-fact check needs its short phrases.',
    ],
  },
];
