// Watermarks and made-by-AI's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking
// the chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

const C = {
  tell: '01-can-you-tell',
  pattern: '02-a-hidden-pattern',
  leaning: '03-leaning-green',
  counting: '04-counting-green',
  reword: '05-rewording',
  pictures: '06-pictures-and-labels',
  bench: '07-workbench',
};

export const RECALL: RecallItem[] = [
  // 1. Can you tell? (pinned: the module's one idea)
  {
    id: 'mark-not-guess',
    chapter: C.tell,
    pin: true,
    question: 'A bank wants to prove later which letters its own model wrote. What should it rely on?',
    options: [
      'A watermark its model puts in as it writes, checked with the bank’s key',
      'An AI-text detector run over each letter',
      'Staff who know the model’s writing style',
    ],
    correct: 0,
    why: [
      'Right: a pattern put in on purpose can be checked; without one, anyone can only guess.',
      'A detector without a mark guesses from style, and has misjudged people’s own writing.',
      'Good model text has no tell a reader can rely on; style is a guess, not proof.',
    ],
  },
  {
    id: 'detector-misjudges',
    chapter: C.tell,
    question:
      'A hiring team runs cover letters through an AI-text detector. Whose letters are most at risk of a false flag?',
    options: [
      'Plain, careful writing, often by non-native English writers',
      'Long letters with many details',
      'Letters with typing mistakes',
    ],
    correct: 0,
    why: [
      'Right: detectors have flagged non-native writers’ plain style as AI-made.',
      'Length is not what detectors were found to misjudge; plain style was.',
      'Mistakes tend to look human to a detector, not machine-made.',
    ],
  },
  {
    id: 'fluent-no-tell',
    chapter: C.tell,
    question: 'A colleague says they can always spot a model’s email by reading it. What is the catch?',
    options: [
      'A good model writes like a careful person, so there is often no tell',
      'Models always sign their emails',
      'Model emails are always longer than people’s',
    ],
    correct: 0,
    why: [
      'Right: side by side, a strong model’s reply and a person’s can read the same.',
      'A model writes whatever it is asked to, sign-off or not.',
      'Length is set by the prompt; it is no fingerprint.',
    ],
  },
  // 2. A hidden pattern
  {
    id: 'green-from-previous',
    chapter: C.pattern,
    question: 'In a green-list watermark, what decides whether a token counts as green?',
    options: ['The token before it and a secret key', 'How common the word is', 'Where the token sits in the sentence'],
    correct: 0,
    why: [
      'Right: the key and the previous token pick a fresh green list for each position.',
      'Common and rare words land green or red alike; the split is random.',
      'Position plays no part; only the token before it and the key do.',
    ],
  },
  {
    id: 'key-to-see',
    chapter: C.pattern,
    question: 'A marked reply is posted publicly. Who can see its pattern?',
    options: ['Whoever holds the key', 'Anyone who reads it closely', 'Only the model that wrote it'],
    correct: 0,
    why: [
      'Right: with the key, anyone can rebuild every green list and count; no model is needed.',
      'The text reads normally; without the key the green lists are invisible.',
      'The checker needs only the key, not the model.',
    ],
  },
  {
    id: 'writer-prefers-green',
    chapter: C.pattern,
    question: 'Why do far more than half of a marked reply’s pairs land green?',
    options: [
      'The writer boosted green tokens before each pick',
      'Green tokens are the better words',
      'The checker counts red tokens as green',
    ],
    correct: 0,
    why: [
      'Right: green tokens got a boost at each pick, so they won more often than chance.',
      'Green is a random half; it says nothing about which word is better.',
      'The checker counts honestly; the excess green came from the writer.',
    ],
  },
  // 3. Leaning green
  {
    id: 'nudge-tradeoff',
    chapter: C.leaning,
    question: 'A team raises the watermark’s nudge. What do they gain and lose?',
    options: [
      'A stronger mark, at the cost of less likely words',
      'A stronger mark, at no cost',
      'Better text, at the cost of a weaker mark',
    ],
    correct: 0,
    why: [
      'Right: a bigger boost wins more picks for green, even where the model preferred red.',
      'Every extra bit of boost overrules the model somewhere, and quality pays.',
      'A bigger nudge pushes away from the model’s favourite words, not toward them.',
    ],
  },
  {
    id: 'nudge-zero',
    chapter: C.leaning,
    question: 'A reply is written with the nudge set to 0. What will the checker find?',
    options: ['About as much green as chance gives', 'A weak mark', 'Every pair green'],
    correct: 0,
    why: [
      'Right: with no boost the writer ignores the green list, so green lands at chance.',
      'There is no mark at all at 0, not a weak one.',
      'Nothing pushes toward green at 0, so about half stays red.',
    ],
  },
  {
    id: 'mark-at-writing',
    chapter: C.leaning,
    question: 'When does a green-list watermark go into the text?',
    options: [
      'At each pick, while the model writes',
      'After the reply is finished, by a second pass',
      'When the reader opens it',
    ],
    correct: 0,
    why: [
      'Right: the boost tilts each choice as it is made, so the mark is woven through.',
      'Nothing is added afterwards; the words themselves carry the pattern.',
      'The text is fixed once written; reading changes nothing.',
    ],
  },
  // 4. Counting green
  {
    id: 'short-unsure',
    chapter: C.counting,
    question: 'The checker is given a marked reply of ten words. Why might it say too short to say?',
    options: [
      'With so few pairs, chance alone could look like a mark',
      'Short replies are never marked',
      'The key only works on long text',
    ],
    correct: 0,
    why: [
      'Right: a handful of green pairs can happen by chance, so it waits for more evidence.',
      'Every token is marked; there are just too few to tell from chance.',
      'The key works on any length; the evidence is what runs short.',
    ],
  },
  {
    id: 'unsure-not-human',
    chapter: C.counting,
    question: 'A support lead’s checker says an email is unsure. What can they conclude?',
    options: ['Only that their mark isn’t in it', 'A person wrote it', 'Another company’s model wrote it'],
    correct: 0,
    why: [
      'Right: the checker finds one pattern or doesn’t; who wrote unmarked text stays unknown.',
      'Unmarked text could be from a person or any unmarked model.',
      'Nothing in the score points to any other writer.',
    ],
  },
  {
    id: 'line-false-alarms',
    chapter: C.counting,
    question: 'Why not call text marked at a z-score of 1 instead of 4?',
    options: [
      'Some people’s text would be flagged by chance',
      'The checker can’t count past 1',
      'Marked text never scores above 4',
    ],
    correct: 0,
    why: [
      'Right: chance pushes some unmarked text above 1, so a low line raises false alarms.',
      'The score runs as high as the evidence goes; the line is a choice.',
      'Marked text often scores well above 4; the line keeps chance out.',
    ],
  },
  // 5. Rewording
  {
    id: 'paraphrase-removes',
    chapter: C.reword,
    question: 'Someone runs a marked article through a rewording tool. What happens to the mark?',
    options: [
      'It fades toward chance, because the token pairs change',
      'It stays, because the meaning stays',
      'It grows stronger, because two models touched it',
    ],
    correct: 0,
    why: [
      'Right: the mark lives in which token follows which, and rewording rebuilds those pairs.',
      'The checker never reads meaning; it counts green pairs.',
      'The second tool has no key, so its tokens are green only by chance.',
    ],
  },
  {
    id: 'swap-two-pairs',
    chapter: C.reword,
    question: 'Why can one swapped word drop the score by two green pairs?',
    options: [
      'It changes its own pair and the next word’s pair',
      'The checker punishes edits',
      'Every swap turns the whole sentence red',
    ],
    correct: 0,
    why: [
      'Right: each token’s colour depends on the one before, so a swap touches two pairs.',
      'The checker just counts; it doesn’t know an edit happened.',
      'Only the two pairs touching the swap change.',
    ],
  },
  {
    id: 'few-swaps',
    chapter: C.reword,
    question: 'A short marked reply scores just over the line. How many careful swaps might take it under?',
    options: ['A handful', 'Most of the words', 'None: a mark can’t be removed'],
    correct: 0,
    why: [
      'Right: near the line, a few green-to-red swaps are enough.',
      'Only text far above the line needs heavy rewording.',
      'Swapping words is exactly how a mark is washed out.',
    ],
  },
  // 6. Pictures and labels
  {
    id: 'screenshot-label',
    chapter: C.pictures,
    question: 'A marked, labelled image is screenshotted and reposted. What survives?',
    options: ['The pixel mark, not the label', 'The label, not the pixel mark', 'Both'],
    correct: 0,
    why: [
      'Right: a screenshot copies the pixels into a new file and leaves the label behind.',
      'The label rides beside the old file; a screenshot doesn’t copy it.',
      'Only the pixels travel in a screenshot.',
    ],
  },
  {
    id: 'label-hash',
    chapter: C.pictures,
    question: 'An editor brightens one pixel of a labelled picture. What does a label check say?',
    options: ['The label no longer matches the picture', 'The label is still valid', 'The label’s signature is forged'],
    correct: 0,
    why: [
      'Right: the label carries a hash of the pixels, and any change gives a different hash.',
      'The hash covers every pixel, so one change shows.',
      'The signature still checks; it’s the hash inside it that no longer matches.',
    ],
  },
  {
    id: 'crop-mark',
    chapter: C.pictures,
    question: 'Why can a crop defeat a simple pixel mark?',
    options: [
      'It shifts the picture off the pattern the checker lines up',
      'Cropping deletes the label',
      'Cropping makes pictures darker',
    ],
    correct: 0,
    why: [
      'Right: the checker compares pixel by pixel from the corner, and a crop moves every pixel.',
      'The label is a separate check; a crop leaves it there but mismatched.',
      'A crop removes edges; it doesn’t change brightness.',
    ],
  },
  // 7. Workbench
  {
    id: 'bench-rule',
    chapter: C.bench,
    question: 'Choosing a watermark setting, what three things should a team weigh?',
    options: ['Detection, text quality and false alarms on people’s writing', 'Detection alone', 'Text quality alone'],
    correct: 0,
    why: [
      'Right: a strong mark that ruins the text, or flags people, fails either way.',
      'Maximum detection would wreck the text and could flag people.',
      'No mark at all has the best quality and catches nothing.',
    ],
  },
  {
    id: 'smaller-share',
    chapter: C.bench,
    question:
      'Two settings both pass the team’s rule. One uses a smaller green share. Why might it survive edits better?',
    options: [
      'Green is rarer by chance, so the green that survives stands further above it',
      'Smaller lists make the model write better',
      'The checker’s line drops for smaller shares',
    ],
    correct: 0,
    why: [
      'Right: with fewer tokens green by chance, each green token is stronger evidence.',
      'A smaller list overrules the model more often, so quality usually falls.',
      'The line stays the same; only chance’s share changes.',
    ],
  },
  {
    id: 'no-free-lunch',
    chapter: C.bench,
    question: 'A vendor says its text watermark survives any rewording. What should you ask?',
    options: [
      'How it scores on paraphrased text, and what it costs in quality',
      'Which colour its green list is',
      'Nothing: watermarks can’t be removed',
    ],
    correct: 0,
    why: [
      'Right: stronger marks cost quality, and heavy rewording weakens every green-list mark.',
      'The colours are a picture of the idea; the numbers are what matter.',
      'Paraphrasing has been shown to weaken text watermarks.',
    ],
  },
];
