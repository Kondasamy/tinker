// What a model remembers' recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each
// asking the chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a
// `why` line.
import type { RecallItem } from '../../lib/recall';
import { RUNS, scoreOf } from '../../lib/memorisation/story';

const DEDUP = scoreOf('dedup', 64).rank,
  N = RUNS.candidates.toLocaleString('en'),
  LEAKS = RUNS.runs.canary.canaries.filter(c => c.extracted).length;

export const RECALL: RecallItem[] = [
  // 6. Keep it out: the module's one pinned idea, first in the bank
  {
    id: 'scrub-before-training',
    chapter: '06-keep-it-out',
    pin: true,
    question: 'A clinic will train a model on patient letters that contain phone numbers. What keeps the numbers safe?',
    options: [
      'Replace the numbers in the letters before training',
      'Filter replies for anything shaped like a phone number',
      'Train for fewer steps so it memorises less',
    ],
    correct: 0,
    why: [
      'Right: a number that never reaches training can’t be memorised or leaked.',
      'A filter only catches the shapes it knows, and a number split up slips past.',
      'Fewer steps may lower memorisation, but a repeated number can still be stored.',
    ],
  },
  // 1. Seen once, seen often
  {
    id: 'repeats-recited',
    chapter: '01-seen-once-seen-often',
    question: 'A model’s training text holds the same legal disclaimer in every one of 5,000 pages. What will it do?',
    options: [
      'Recite the disclaimer word for word, even unprompted',
      'Learn the idea of a disclaimer but never its exact words',
      'Skip it, because repeated text teaches nothing',
    ],
    correct: 0,
    why: [
      'Right: text seen thousands of times is memorised and comes back exactly.',
      'Models do learn patterns, but text seen this often they also store exactly.',
      'Each copy is trained on, so a repeated text weighs more, not less.',
    ],
  },
  {
    id: 'memorisation-meaning',
    chapter: '01-seen-once-seen-often',
    question: 'What does it mean that a model has memorised a sentence?',
    options: [
      'It can give back that exact sentence from its training text',
      'It understands what the sentence means',
      'It stores a copy of the sentence in a database',
    ],
    correct: 0,
    why: [
      'Right: memorisation is the exact training text coming back out.',
      'Understanding is about meaning; memorisation is about the exact words.',
      'There is no database inside; the words are stored in the weights.',
    ],
  },
  {
    id: 'unasked-recital',
    chapter: '01-seen-once-seen-often',
    question: 'Why can a memorised line show up in a reply about something else?',
    options: [
      'The line became the likeliest next words after many openings',
      'The model chose to repeat its favourite line',
      'Someone wrote the line into the prompt',
    ],
    correct: 0,
    why: [
      'Right: seen often enough, its words win the next-word guess in other places too.',
      'A model has no favourites; it picks the likeliest next words.',
      'The prompt in the duplicated run was about what Larkspur sells, not the policy.',
    ],
  },
  // 2. A planted secret
  {
    id: 'canary-is-fake',
    chapter: '02-a-planted-secret',
    question: 'A security team plants made-up API keys in training text before training. What are those keys for?',
    options: [
      'To test, safely, whether the model leaks secrets it saw',
      'To give the model working keys for its tools',
      'To confuse attackers with fake keys',
    ],
    correct: 0,
    why: [
      'Right: they are canaries, fake secrets whose leaking shows the risk without harm.',
      'Canaries are made up; they open nothing.',
      'Canaries measure the model’s memory; they are not a decoy for attackers.',
    ],
  },
  {
    id: 'canary-copies',
    chapter: '02-a-planted-secret',
    question: 'Why plant canaries with 1, 4, 16 and 64 copies instead of one copy each?',
    options: [
      'To see how the leak risk grows with copies',
      'To make sure at least one is memorised',
      'Because the training text has room for 85 lines',
    ],
    correct: 0,
    why: [
      'Right: real data repeats unevenly, and the test shows what each level of repetition does.',
      'The goal is to measure, not to force a leak.',
      'The counts are chosen to span repetition, not to fill space.',
    ],
  },
  {
    id: 'canary-not-real',
    chapter: '02-a-planted-secret',
    question: 'Why not test for leaks with real customers’ secrets from the tickets?',
    options: [
      'If the test leaks them, it causes the harm it tests for',
      'Real secrets are too long for the model',
      'Real secrets are never repeated',
    ],
    correct: 0,
    why: [
      'Right: a fake secret can leak without hurting anyone.',
      'Length is not the issue; the risk to real people is.',
      'Real secrets repeat too, in forwarded and quoted tickets.',
    ],
  },
  // 3. Ask it to finish
  {
    id: 'extraction-prefix',
    chapter: '03-ask-it-to-finish',
    question: 'An attacker knows a customer’s name. How might they pull that customer’s secret from a model?',
    options: [
      'Type the start of the sentence the secret was in, and let the model finish',
      'Ask the model to list every secret it knows',
      'Read the secret out of the model’s weights file',
    ],
    correct: 0,
    why: [
      'Right: a prefix from the training line invites the model to finish it.',
      'A model has no list of secrets; it only finishes text.',
      'The weights hold no readable text; extraction works through prompts.',
    ],
  },
  {
    id: 'wrong-secret',
    chapter: '03-ask-it-to-finish',
    question: 'Asked for a customer seen once, the model gives another customer’s PIN. Why?',
    options: [
      'That PIN was the one it saw most in that sentence',
      'It mixed up the two names',
      'It made up a random number',
    ],
    correct: 0,
    why: [
      'Right: the most-copied PIN is the likeliest finish for any name in that line.',
      'It doesn’t match names to PINs; it finishes with the likeliest digits.',
      'Its reply was not random: it was a planted PIN, exactly.',
    ],
  },
  {
    id: 'greedy-pick',
    chapter: '03-ask-it-to-finish',
    question: 'What does greedy decoding do at each step?',
    options: [
      'Takes the model’s single likeliest next piece',
      'Takes a random piece, weighted by likelihood',
      'Takes the longest piece in the vocabulary',
    ],
    correct: 0,
    why: [
      'Right: greedy always takes the top guess, so a memorised line comes straight out.',
      'That is sampling, not greedy decoding.',
      'Length doesn’t matter; likelihood does.',
    ],
  },
  // 4. How sure is it?
  {
    id: 'rank-not-said',
    chapter: '04-how-sure-is-it',
    question: 'A model never says a planted password, but ranks it 2nd of 100,000 guesses. What does that show?',
    options: [
      'It memorised the password: two guesses find it',
      'It is safe, because it never says it',
      'Nothing: ranks are random',
    ],
    correct: 0,
    why: [
      'Right: a high rank means high exposure, even without the model saying it.',
      'An attacker can rank guesses by likelihood instead of waiting for the model to say it.',
      'A random password would rank near the middle, around 50,000.',
    ],
  },
  {
    id: 'exposure-meaning',
    chapter: '04-how-sure-is-it',
    question: 'What does a higher exposure mean for a secret?',
    options: [
      'It ranks further above chance, so it is easier to guess',
      'It was shown to more users',
      'It is longer and harder to guess',
    ],
    correct: 0,
    why: [
      'Right: exposure is the rank turned into bits above chance.',
      'Exposure is about the model’s ranking, not about users.',
      'Exposure measures the model, not the secret’s length.',
    ],
  },
  {
    id: 'exposure-tops-out',
    chapter: '04-how-sure-is-it',
    question: 'Two planted PINs both rank 1st of 10,000. What does exposure say about which is better memorised?',
    options: [
      'Nothing: both hit the top, so exposure can’t tell them apart',
      'The one with more copies has higher exposure',
      'The one planted later has higher exposure',
    ],
    correct: 0,
    why: [
      'Right: rank 1 is the ceiling, so both get the same exposure.',
      'Exposure comes from rank alone, and both ranks are 1.',
      'Order of planting doesn’t enter the measure.',
    ],
  },
  // 5. Copies make it worse
  {
    id: 'dedup-helps',
    chapter: '05-copies-make-it-worse',
    question: 'A team removes duplicate lines from its training text. What happens to memorisation?',
    options: [
      'It drops: fewer copies, less reciting',
      'Nothing: each line is still in the text',
      'It rises: each line now stands out',
    ],
    correct: 0,
    why: [
      'Right: copies drive memorisation, so one copy is far less likely to come back.',
      'Being there once is not the same as being there many times.',
      'A model doesn’t notice rarity; it learns most from what repeats.',
    ],
  },
  {
    id: 'dedup-not-enough',
    chapter: '05-copies-make-it-worse',
    question: `After deduplication, a planted PIN is never recited but ranks ${DEDUP} of ${N}. Is it gone?`,
    options: ['No: it still ranks far above chance', 'Yes: never recited means forgotten', 'Yes: that is a low rank'],
    correct: 0,
    why: [
      'Right: a random PIN would rank near the middle; this one is still guessable.',
      'Not reciting is not the same as forgetting; the rank shows what remains.',
      `Rank ${DEDUP} of ${N} is near the top, not low.`,
    ],
  },
  {
    id: 'dedup-quality',
    chapter: '05-copies-make-it-worse',
    question: 'Does deduplicating training text cost much model quality?',
    options: [
      'Little: Larkspur’s held-out top-5 barely moved',
      'A lot: the model loses half its text',
      'It always makes the model worse at everything',
    ],
    correct: 0,
    why: [
      'Right: removing copies drops repeats, not new information.',
      'Only the repeated lines go; the rest of the text stays.',
      'Larkspur’s deduplicated model scored about the same on held-out text.',
    ],
  },
  // 6. Keep it out
  {
    id: 'filter-bypass',
    chapter: '06-keep-it-out',
    question: 'An output filter hides any 16-digit card number. How could a card number still leak?',
    options: [
      'Asked a few digits at a time, no reply holds 16 in a row',
      'It can’t: the filter reads every reply',
      'Only if the attacker can switch the filter off',
    ],
    correct: 0,
    why: [
      'Right: split up, the number never matches the filter’s shape.',
      'The filter reads every reply, but only for the shape it knows.',
      'No switch is needed; the attacker just asks differently.',
    ],
  },
  {
    id: 'placeholder',
    chapter: '06-keep-it-out',
    question: 'After scrubbing, what does a model say where a secret used to be?',
    options: ['The placeholder, like [PIN]', 'The real secret, from memory', 'Nothing at all'],
    correct: 0,
    why: [
      'Right: it learned the placeholder, since that is what the text held.',
      'The secret never reached training, so it can’t come from memory.',
      'It still finishes the line, with what it saw there: the placeholder.',
    ],
  },
  // 7. Workbench
  {
    id: 'policy-winners',
    chapter: '07-workbench',
    question: 'Which data policy leaked no PIN on Larkspur’s bench?',
    options: [
      'Any policy that scrubbed the PINs',
      'An output filter on its own',
      'Training on the tickets as they are',
    ],
    correct: 0,
    why: [
      'Right: every scrubbing policy leaked nothing.',
      `The filter alone leaked ${LEAKS} PINs, one digit at a time.`,
      'Unchanged tickets let the two most-copied PINs be recited.',
    ],
  },
  {
    id: 'filter-on-top',
    chapter: '07-workbench',
    question: 'Is an output filter worth keeping on top of scrubbing?',
    options: [
      'It costs nothing here, but scrubbing does the work',
      'No: a filter makes the model worse',
      'Yes: it is what stops the leak',
    ],
    correct: 0,
    why: [
      'Right: with scrubbing, the filter neither helped nor hurt on the bench.',
      'The filter changes replies, not the model, so quality was unchanged.',
      'On its own the filter leaked; scrubbing is what stopped it.',
    ],
  },
  {
    id: 'two-winners',
    chapter: '07-workbench',
    question: 'Scrubbing alone and scrubbing with deduplication both won. Why two?',
    options: [
      'One had lower exposure, the other higher top-5',
      'They gave the same numbers',
      'The bench picks two at random',
    ],
    correct: 0,
    why: [
      'Right: each beat the other on one measure, so neither beats both.',
      'Their exposure and top-5 differ, one better on each.',
      'Winners are computed from the recorded runs, not picked.',
    ],
  },
];
