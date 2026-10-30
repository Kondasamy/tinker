// Choosing a model's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 1. The leaderboard
  {
    id: 'own-test-decides',
    chapter: '01-the-leaderboard',
    pin: true,
    question: 'Your manager wants the model at the top of this month’s leaderboard. What do you say?',
    options: [
      'It ranks models on someone else’s test; our own questions, the price per answer and the wait decide',
      'Agreed: the top model is the best choice for any job',
      'Pick it, but only if it is also the newest',
    ],
    correct: 0,
    why: [
      'Right: a leaderboard is a start, and your questions, bill and wait settle the pick.',
      'The board asked its own questions, and orders change on yours.',
      'Newer isn’t better on your questions either; only testing them tells.',
    ],
  },
  {
    id: 'arena-votes',
    chapter: '01-the-leaderboard',
    question: 'A leaderboard is built from people voting between two anonymous replies. What does a high rank measure?',
    options: [
      'Which replies those voters preferred, on the questions they asked',
      'How accurate the model is on facts',
      'How well it will do on your company’s tasks',
    ],
    correct: 0,
    why: [
      'Right: votes measure preference on the voters’ own questions.',
      'Voters judge which reply they like, which isn’t the same as checking facts.',
      'The voters never asked your company’s questions.',
    ],
  },
  {
    id: 'private-variants',
    chapter: '01-the-leaderboard',
    question: 'A provider tests many private versions on a leaderboard and publishes only the best. What does that do?',
    options: [
      'It lifts their published score above what a typical version would get',
      'Nothing: each score is still a fair measurement',
      'It lowers their rank, since bad versions count too',
    ],
    correct: 0,
    why: [
      'Right: picking the best of many tries inflates the one score you see.',
      'Each score was measured, but publishing only the best one biases the board.',
      'The retracted versions don’t count, so only the best one shows.',
    ],
  },
  // 2. Your own questions
  {
    id: 'order-changes',
    chapter: '02-your-own-questions',
    question: 'Two models swap places between a public test and your 50 checked questions. Which order do you trust?',
    options: ['Your own questions’ order', 'The public test’s: it has more questions', 'Neither: average the two'],
    correct: 0,
    why: [
      'Right: your questions are the job, so their order is the one that counts.',
      'More questions on a different job don’t make it a better guide to yours.',
      'Averaging mixes in a test of someone else’s job.',
    ],
  },
  {
    id: 'reference-answers',
    chapter: '02-your-own-questions',
    question: 'You collect 30 real customer questions to compare models. What else does each one need?',
    options: [
      'A reference answer someone checked',
      'A difficulty rating from 1 to 10',
      'Nothing: read the replies and decide',
    ],
    correct: 0,
    why: [
      'Right: a checked answer lets every model’s reply be graded the same way.',
      'A difficulty rating doesn’t say what a right reply is.',
      'Reading without an answer key turns into taste, and changes from day to day.',
    ],
  },
  {
    id: 'contamination',
    chapter: '02-your-own-questions',
    question: 'A model scores far better on an old public test than on fresh questions just like it. Likeliest reason?',
    options: [
      'The old test’s questions leaked into its training',
      'The fresh questions were harder by chance',
      'The model got worse since the old test',
    ],
    correct: 0,
    why: [
      'Right: that is contamination, a public test learned rather than solved.',
      'Fresh questions written to match the old ones should be about as hard.',
      'It is the same model on both, so it can’t have changed between them.',
    ],
  },
  // 3. Price per answer
  {
    id: 'price-sum',
    chapter: '03-price-per-answer',
    question: 'What sets the price of one answer?',
    options: [
      'Input tokens times their price, plus output tokens times theirs',
      'A flat fee per question',
      'The number of words in the question only',
    ],
    correct: 0,
    why: [
      'Right: both what the model reads and what it writes are paid for, at their own prices.',
      'Models are priced per token, not per question.',
      'The reply’s tokens are charged too, usually at a higher price.',
    ],
  },
  {
    id: 'volume',
    chapter: '03-price-per-answer',
    question: 'Model X costs a tenth of a cent more per answer than Y. When does that matter?',
    options: ['When you send many answers a month', 'Never: it is under a cent', 'Only on long questions'],
    correct: 0,
    why: [
      'Right: a small difference times a large volume is a large bill.',
      'A fraction of a cent times hundreds of thousands of answers is real money.',
      'It is per answer, so every answer adds it, long or short.',
    ],
  },
  {
    id: 'output-price',
    chapter: '03-price-per-answer',
    question: 'You can shorten the question or shorten the reply by the same number of tokens. Which saves more?',
    options: ['The reply, when output tokens cost more', 'The question, always', 'Both save exactly the same'],
    correct: 0,
    why: [
      'Right: output tokens are usually priced several times higher than input.',
      'Input tokens are usually the cheaper kind, so trimming them saves less.',
      'They are priced apart, so equal token cuts don’t save equal money.',
    ],
  },
  // 4. The wait
  {
    id: 'first-word',
    chapter: '04-the-wait',
    question: 'A chat assistant streams replies. What does the customer feel most?',
    options: ['The time to the first word', 'The model’s size', 'Its price per answer'],
    correct: 0,
    why: [
      'Right: with streaming, the first word ends the empty wait.',
      'Size shows only through speed and quality; the customer never sees it.',
      'The customer doesn’t pay per answer, so price isn’t felt in the chat.',
    ],
  },
  {
    id: 'whole-reply',
    chapter: '04-the-wait',
    question: 'A reply starts after 1 s and has 200 words at 50 words a second. When is it finished?',
    options: ['After about 5 s', 'After about 1 s', 'After about 4 s, the words alone'],
    correct: 0,
    why: [
      'Right: the first-word wait plus 4 s of words.',
      'That is only when it starts.',
      'The wait for the first word comes before the words.',
    ],
  },
  {
    id: 'batch-wait',
    chapter: '04-the-wait',
    question: 'A job tags 10,000 product photos overnight. How much should the wait weigh?',
    options: [
      'Little: nobody is watching, as long as it finishes',
      'A lot: speed always matters',
      'Only the first word’s',
    ],
    correct: 0,
    why: [
      'Right: with no one waiting, cost and quality matter more.',
      'Speed matters when someone waits; overnight, nobody does.',
      'Nobody watches the first word of an overnight job.',
    ],
  },
  // 5. Good enough
  {
    id: 'cheapest-clears',
    chapter: '05-good-enough',
    question: 'Three models clear your bar; the best costs ten times the cheapest. Which do you ship?',
    options: [
      'The cheapest that clears it, if its wait is fine',
      'The best: quality first',
      'The middle one, to be safe',
    ],
    correct: 0,
    why: [
      'Right: past the bar, more quality buys nothing the job needs.',
      'Past the bar, the extra quality costs ten times as much for nothing you need.',
      'Splitting the difference pays for quality you said you don’t need.',
    ],
  },
  {
    id: 'set-bar',
    chapter: '05-good-enough',
    question: 'Who should set the quality bar for drafting support replies?',
    options: [
      'The support team, from what an agent can send after a quick check',
      'The model’s maker',
      'The leaderboard',
    ],
    correct: 0,
    why: [
      'Right: the people who use the drafts know what good enough is.',
      'The maker doesn’t know your customers or your agents.',
      'A leaderboard’s score is on someone else’s questions.',
    ],
  },
  {
    id: 'under-bar',
    chapter: '05-good-enough',
    question: 'A model is the cheapest of all, but under your bar. Do you ship it?',
    options: [
      'No: under the bar, it isn’t good enough at any price',
      'Yes: the savings are worth it',
      'Yes, and fix the replies by hand',
    ],
    correct: 0,
    why: [
      'Right: the bar comes first; price only decides among those that clear it.',
      'Replies that fail customers cost more than the bill saves.',
      'Fixing every reply by hand undoes the reason to use a model.',
    ],
  },
  // 6. Models change
  {
    id: 'pin-version',
    chapter: '06-models-change',
    question: 'Your app calls a model by a name that always points to its newest version. What is the risk?',
    options: [
      'A new version can answer differently, and arrives without your tests',
      'None: newer versions are always better',
      'It costs more each month',
    ],
    correct: 0,
    why: [
      'Right: pin the exact version, and switch only after your questions pass.',
      'Better on average can still break some of your questions.',
      'The risk is changed answers, not the price.',
    ],
  },
  {
    id: 'rerun-on-switch',
    chapter: '06-models-change',
    question: 'What should happen before you move to a model’s new version?',
    options: [
      'Run your question set on it and check it still clears the bar',
      'Read the release notes',
      'Check its new public score',
    ],
    correct: 0,
    why: [
      'Right: only your own questions show whether it still does your job.',
      'Release notes say what changed in general, not on your questions.',
      'A public score can rise while yours falls.',
    ],
  },
  {
    id: 'retirement',
    chapter: '06-models-change',
    question: 'Your pinned version will be retired in two months. Best plan?',
    options: [
      'Test the replacement on your questions now, and switch once it clears the bar',
      'Wait until it stops answering',
      'Switch on the last day, untested',
    ],
    correct: 0,
    why: [
      'Right: testing early leaves time to pick another model if the replacement fails.',
      'Waiting turns a planned switch into an outage.',
      'Switching untested risks the drop you’d have caught in testing.',
    ],
  },
  // 7. Workbench
  {
    id: 'needs-to-weights',
    chapter: '07-workbench',
    question:
      'Two teams share one model contract. One drafts live chat; one writes reports overnight. One model for both?',
    options: [
      'Not necessarily: their needs differ, so their best machines may too',
      'Yes: the best model is best for both',
      'Yes: the cheapest model is enough for both',
    ],
    correct: 0,
    why: [
      'Right: wait matters for chat and not overnight, so the weights and the pick can differ.',
      'There is no best for all; it depends on each team’s questions, budget and wait.',
      'The cheapest may miss one team’s quality bar.',
    ],
  },
  {
    id: 'weights-written',
    chapter: '07-workbench',
    question: 'Why write a team’s weights down before comparing models?',
    options: [
      'So the pick follows the team’s needs, not the most impressive number',
      'Because the weights make the models faster',
      'To get a higher score for the favourite',
    ],
    correct: 0,
    why: [
      'Right: written needs keep the comparison honest.',
      'Weights change how you choose, not how a model runs.',
      'Setting weights to suit a favourite defeats the point.',
    ],
  },
  {
    id: 'meets-every-need',
    chapter: '07-workbench',
    question: 'A model has the best quality but blows the team’s budget. Is it the team’s machine?',
    options: [
      'No: a machine must meet every need',
      'Yes: quality outweighs everything',
      'Yes, if it is on the leaderboard',
    ],
    correct: 0,
    why: [
      'Right: a budget is a need like the quality bar, and it fails it.',
      'The team set a budget because it matters to them.',
      'A leaderboard rank doesn’t pay the bill.',
    ],
  },
];
