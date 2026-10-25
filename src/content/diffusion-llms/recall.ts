// Diffusion LMs' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's
// idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

const C = {
  one: '01-one-word-at-a-time',
  blanks: '02-fill-the-blanks',
  sure: '03-sure-words-first',
  faster: '04-faster-and-worse',
  length: '05-the-length-is-fixed',
  speed: '06-reading-a-speed-claim',
  bench: '07-workbench',
};

export const RECALL: RecallItem[] = [
  // the module's one idea, pinned (chapter 4), first in the bank
  {
    id: 'fewer-passes-worse',
    chapter: C.faster,
    pin: true,
    question: 'A diffusion model can write a reply in 2 passes or in 32. What changes?',
    options: [
      '2 passes is faster, but the reply drifts and repeats itself; it fills the sure words first, and fewer passes means worse words',
      'Nothing but the speed: the reply is the same',
      '32 passes is slower and worse, because it second-guesses itself',
    ],
    correct: 0,
    why: [
      'Right: tokens stamped in the same pass are guessed without seeing each other.',
      'The reply changes: guesses made together can’t agree with each other.',
      'More passes let each guess see the ones stamped before it, so the reply improves.',
    ],
  },
  // 4. Faster and worse
  // 1. One word at a time
  {
    id: 'pass-per-token',
    chapter: C.one,
    question: 'Why does a longer reply take longer from a left-to-right model?',
    options: [
      'Each token needs its own pass, and each pass waits for the tokens before it',
      'Longer replies use a bigger model',
      'The model rereads the whole training data for every word',
    ],
    correct: 0,
    why: [
      'Right: one token a pass, so the reply’s length sets the number of passes.',
      'The same model writes short and long replies; only the passes change.',
      'A pass reads the prompt and the reply so far, never the training data.',
    ],
  },
  {
    id: 'what-a-pass-is',
    chapter: C.one,
    question: 'In this module, what is a pass?',
    options: ['One run of the model over everything it can see', 'One word of the reply', 'One training step'],
    correct: 0,
    why: [
      'Right: each pass costs about the same time, so passes measure speed.',
      'A word is often several tokens; a left-to-right pass adds just one token.',
      'Training happened once, before; a pass is the model being used.',
    ],
  },
  {
    id: 'left-to-right-order',
    chapter: C.one,
    question: 'Could a left-to-right model write the last word of a reply first?',
    options: [
      'No: each token is written after every token to its left',
      'Yes, if the last word is easy',
      'Yes, it picks the order itself',
    ],
    correct: 0,
    why: [
      'Right: it only ever adds a token on the right.',
      'Easy or not, the last word waits for the words before it.',
      'Choosing the order is what a masked model does, not a left-to-right one.',
    ],
  },
  // 2. Fill the blanks
  {
    id: 'both-sides',
    chapter: C.blanks,
    question: 'A form reads “Deliver to [blank] warehouse, dock 3.” What does a masked model use to fill the blank?',
    options: [
      'The words on both sides: “Deliver to” and “warehouse, dock 3”',
      'Only “Deliver to”, the words before',
      'Nothing: it picks a common word',
    ],
    correct: 0,
    why: [
      'Right: a masked model reads every slot at once, before and after the blank.',
      'Reading only the left is how a left-to-right model works.',
      'Its guess depends on the words around the blank, with a confidence for each token.',
    ],
  },
  {
    id: 'one-pass-every-blank',
    chapter: C.blanks,
    question: 'A reply has 20 blanks. What does one pass of a masked model give you?',
    options: [
      'A guess for every one of the 20 blanks, each with its own confidence',
      'A guess for the first blank only',
      'The finished reply',
    ],
    correct: 0,
    why: [
      'Right: one pass guesses every blank at once; the decoder then decides which to keep.',
      'Only a left-to-right model is limited to the next slot.',
      'Guesses made at once are not yet a reply: most are weak.',
    ],
  },
  {
    id: 'confidence-means',
    chapter: C.blanks,
    question: 'One blank’s best guess has confidence 0.9, another’s 0.1. What does that tell you?',
    options: [
      'The model is far surer of the first guess',
      'The first blank is earlier in the reply',
      'The second guess is wrong for certain',
    ],
    correct: 0,
    why: [
      'Right: confidence is the probability the model gives its best guess.',
      'Confidence says nothing about position; sure guesses can sit anywhere.',
      'A weak guess may still be right; it is just less likely.',
    ],
  },
  // 3. Sure words first
  {
    id: 'keep-the-surest',
    chapter: C.sure,
    question: 'A decoder keeps 3 guesses a pass. Which three does surest-first keep?',
    options: ['The three with the highest confidence', 'The three leftmost', 'Three at random'],
    correct: 0,
    why: [
      'Right: it keeps the guesses most likely to be right and re-guesses the rest.',
      'Position doesn’t decide it; the frame fills in any order.',
      'Random order is the weaker rule the LLaDA paper compared it with.',
    ],
  },
  {
    id: 'stamped-stays',
    chapter: C.sure,
    question: 'A pass stamps a weak guess. What happens to it on the next pass?',
    options: [
      'It stays: a stamped token is never masked again',
      'The next pass corrects it',
      'It is masked again if it reads badly',
    ],
    correct: 0,
    why: [
      'Right: that is why the choice of what to keep matters.',
      'Later passes only guess the blanks; stamped slots are fixed.',
      'This decoder never unstamps a slot.',
    ],
  },
  {
    id: 'any-order',
    chapter: C.sure,
    question: 'Why does a diffusion model’s reply often fill in out of order?',
    options: [
      'It stamps the surest slots first, wherever they are',
      'It reads the reply right to left',
      'It fills slots at random',
    ],
    correct: 0,
    why: [
      'Right: the easy tokens anywhere in the reply settle first, and help with the rest.',
      'It reads every slot at once, in no direction.',
      'With surest-first remasking, the order follows confidence, not chance.',
    ],
  },
  {
    id: 'stutter',
    chapter: C.faster,
    question: 'A reply at 16 tokens a pass reads “the the the a a”. Why?',
    options: [
      'Neighbouring slots were guessed in the same pass, each picking a common token',
      'The model has a bug that repeats words',
      'The prompt asked for repeats',
    ],
    correct: 0,
    why: [
      'Right: each slot’s safest guess is a common word, and none could see the others.',
      'The same model writes cleanly at one token a pass; the setting causes it.',
      'Repeats come from guessing together, not from the prompt.',
    ],
  },
  {
    id: 'tokens-a-pass-passes',
    chapter: C.faster,
    question: 'A 64-token reply at 8 tokens a pass takes how many passes?',
    options: ['8', '64', '512'],
    correct: 0,
    why: [
      'Right: passes are the reply’s length divided by tokens a pass.',
      '64 passes is one token a pass, the slow, careful setting.',
      'Tokens a pass divides the passes; it doesn’t multiply them.',
    ],
  },
  // 5. The length is fixed
  {
    id: 'length-first',
    chapter: C.length,
    question: 'When does a masked diffusion model decide how long its reply is?',
    options: [
      'Before the first pass: the frame’s size is set first',
      'When it writes an end token',
      'After the last pass',
    ],
    correct: 0,
    why: [
      'Right: it starts from a fixed number of blanks and fills every one.',
      'A real model can pad with an end-of-text token, but the frame was sized first.',
      'By the last pass every slot is already there to fill.',
    ],
  },
  {
    id: 'fits-a-shape',
    chapter: C.length,
    question: 'Which job suits a fixed-length frame best?',
    options: [
      'Filling a form with set fields, like a shipping label',
      'Writing a story of whatever length it needs',
      'Answering open questions of any size',
    ],
    correct: 0,
    why: [
      'Right: a set shape has a known length, so nothing is cut or padded.',
      'A story’s length isn’t known in advance, so a fixed frame cuts or pads it.',
      'Open answers vary in length; a fixed frame fits them badly.',
    ],
  },
  {
    id: 'end-early',
    chapter: C.length,
    question: 'Why can a diffusion model write a reply’s ending before its middle?',
    options: [
      'It knows where the frame ends, and the ending was its surest guess',
      'It reads the reply backwards',
      'The ending is copied from the prompt',
    ],
    correct: 0,
    why: [
      'Right: with the end of the frame fixed, closing tokens can be the surest.',
      'It reads every slot at once, in no direction.',
      'The ending is guessed like any other slot, not copied.',
    ],
  },
  // 6. Reading a speed claim
  {
    id: 'speed-split',
    chapter: C.speed,
    question: 'A model writes 600 tokens a second at 4 tokens a pass. How many passes a second is that?',
    options: ['150', '2,400', '600'],
    correct: 0,
    why: [
      'Right: tokens a second is tokens a pass times passes a second.',
      'That multiplies again; divide by tokens a pass instead.',
      'That would be one token a pass, a left-to-right model.',
    ],
  },
  {
    id: 'ask-quality',
    chapter: C.speed,
    question: 'Two vendors quote the same tokens a second. What could still differ?',
    options: [
      'The tokens a pass behind it, and so the quality of the replies',
      'Nothing: same speed, same model',
      'Only the price',
    ],
    correct: 0,
    why: [
      'Right: more tokens a pass can buy the same speed with worse replies.',
      'The same speed can come from different settings and different quality.',
      'Price may differ too, but the replies themselves can differ more.',
    ],
  },
  {
    id: 'whose-figure',
    chapter: C.speed,
    question: 'A speed figure appears on a vendor’s blog. How should you read it?',
    options: [
      'As the vendor’s own figure, on its setup, until you test it on your replies',
      'As an independent benchmark',
      'As a guaranteed speed for your traffic',
    ],
    correct: 0,
    why: [
      'Right: it was measured by the seller on the seller’s hardware.',
      'Nobody independent measured it.',
      'Your replies, hardware and quality bar may differ.',
    ],
  },
  // 7. Workbench
  {
    id: 'per-kind',
    chapter: C.bench,
    question: 'Support emails need care; internal summaries don’t. How many settings should you pick?',
    options: [
      'One per kind, each the fastest that passes its bar',
      'One for both: the fastest',
      'One for both: the slowest',
    ],
    correct: 0,
    why: [
      'Right: each kind gets the fewest passes its bar allows.',
      'The fastest setting fails the replies that need care.',
      'The slowest passes, but wastes passes on summaries.',
    ],
  },
  {
    id: 'tie-break',
    chapter: C.bench,
    question: 'Two plans both pass every bar. Which do you keep?',
    options: [
      'The one with fewer passes',
      'The one with more passes, to be safe',
      'Either: passing is all that counts',
    ],
    correct: 0,
    why: [
      'Right: once every bar is met, passes are the cost.',
      'Extra passes buy nothing the bars ask for.',
      'Passing is the floor; the cost still differs.',
    ],
  },
  {
    id: 'careful-where',
    chapter: C.bench,
    question: 'Where does the careful fill, one token a pass, still earn its cost?',
    options: [
      'Replies sent to customers as written',
      'Internal notes nobody reads closely',
      'Nowhere: it is always too slow',
    ],
    correct: 0,
    why: [
      'Right: when a reply must be the model’s best, speed comes second.',
      'Those can go faster: their bar allows more drift.',
      'It is slow, but some replies need it.',
    ],
  },
];
