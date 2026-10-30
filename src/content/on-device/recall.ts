// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 1. Will it fit?
  {
    id: 'fit-is-bytes',
    chapter: '01-will-it-fit',
    pin: true,
    question: 'Your team wants a model on a tablet with 4 GB free. What tells you first whether it can run there?',
    options: [
      'Its parameters times the bytes it stores per parameter, plus its working memory',
      'How well it scores on a public leaderboard',
      'How big the tablet’s storage is',
    ],
    correct: 0,
    why: [
      'Right: the weights and the cache must sit in working memory, and that is parameters times bytes, plus the cache.',
      'A score says how good it is, not whether it fits; a great model that doesn’t fit can’t run at all.',
      'Storage holds the file, but a model runs from working memory, which is far smaller.',
    ],
  },
  {
    id: 'sixteen-bits-two-bytes',
    chapter: '01-will-it-fit',
    question: 'A 2-billion-parameter model is stored at 16 bits. Roughly how much memory do its weights take?',
    options: ['About 2 GB', 'About 4 GB', 'About 32 GB'],
    correct: 1,
    why: [
      'That counts one byte per weight, which is 8 bits, not 16.',
      'Right: 16 bits is 2 bytes, and 2 billion times 2 bytes is about 4 GB.',
      'That counts 16 bytes per weight; 16 bits is only 2 bytes.',
    ],
  },
  {
    id: 'phones-ship-few-bits',
    chapter: '01-will-it-fit',
    question: 'How do phone makers fit multi-billion-parameter models into a few GB?',
    options: [
      'They store each weight in far fewer bits than 16',
      'They stream the weights from the internet as needed',
      'Phones have the same memory as servers',
    ],
    correct: 0,
    why: [
      'Right: fewer bits per weight shrinks memory in proportion, as Apple’s and Google’s phone models do.',
      'A model streamed from the internet would need the signal on-device models are meant to do without.',
      'A phone has a few GB for an app; a server card has tens of GB.',
    ],
  },
  // 2. Smaller numbers
  {
    id: 'saving-certain-cost-measured',
    chapter: '02-smaller-numbers',
    question: 'Moving a model from 8 to 4 bits per weight: which part can you know without testing?',
    options: [
      'The memory saved, which is arithmetic from the shape',
      'The quality lost, which is always under 1%',
      'Both: rounding is predictable',
    ],
    correct: 0,
    why: [
      'Right: halving the bits halves the weights’ bytes, but what it does to answers has to be measured.',
      'Larkspur mini’s answer changed at 4 bits, so the loss is not always small.',
      'The bytes are predictable; how rounding shifts each answer is not.',
    ],
  },
  {
    id: 'two-bits-plain',
    chapter: '02-smaller-numbers',
    question: 'A model is plainly rounded to 2 bits after training and starts repeating one word. Why?',
    options: [
      'Each weight keeps only a few levels, too coarse for what it learned',
      'The model ran out of memory',
      'Two bits can only store the letters a and b',
    ],
    correct: 0,
    why: [
      'Right: plain rounding to 2 bits leaves each row three levels, and the model’s choices fall apart.',
      'At 2 bits it takes less memory than ever, so memory isn’t the problem.',
      'Bits store numbers for the weights, not letters; the levels are what got too coarse.',
    ],
  },
  {
    id: 'trained-for-low-bits',
    chapter: '02-smaller-numbers',
    question: 'Apple runs its phone model at 2 bits, yet plain rounding broke Larkspur mini at 2. What explains it?',
    options: [
      'Apple trained its model to work at 2 bits, rather than rounding it afterwards',
      'Apple’s phones round more carefully in hardware',
      'Larkspur mini was too big',
    ],
    correct: 0,
    why: [
      'Right: quantization-aware training lets the model adapt to the coarse levels while it learns.',
      'The rounding is part of preparing the model, not something the phone’s chip fixes.',
      'Larkspur mini is tiny; size wasn’t what broke it, plain rounding was.',
    ],
  },
  // 3. The working memory
  {
    id: 'cache-grows',
    chapter: '03-working-memory',
    question: 'A model fits on a tablet with a short prompt but crashes on a long document. What grew?',
    options: ['The KV cache, which adds memory for every token read', 'The weights', 'The vocabulary'],
    correct: 0,
    why: [
      'Right: every token in the context keeps its keys and values, so a long document needs far more memory.',
      'Weights are fixed once the model is loaded; they don’t grow with the input.',
      'The vocabulary is part of the weights and fixed too.',
    ],
  },
  {
    id: 'cache-from-shape',
    chapter: '03-working-memory',
    question: 'Two models have the same number of parameters. What sets how much cache each needs per token?',
    options: [
      'Their shape: layers, key-value heads and head size',
      'Only the parameter count, so the same for both',
      'How long their replies are',
    ],
    correct: 0,
    why: [
      'Right: the cache keeps keys and values per layer and head, so the shape sets its bytes per token.',
      'Two models of the same size can be shaped differently, and keep very different caches.',
      'Reply length sets how many tokens there are, not how much each one costs.',
    ],
  },
  {
    id: 'trim-context',
    chapter: '03-working-memory',
    question: 'The handheld app runs out of memory late in long chats. The cheapest fix?',
    options: ['Keep less of the chat in context', 'Use a model with more parameters', 'Store the weights at more bits'],
    correct: 0,
    why: [
      'Right: fewer tokens kept means a smaller cache.',
      'More parameters means more weights in memory, which makes it worse.',
      'More bits makes the weights bigger, leaving even less room for the cache.',
    ],
  },
  // 4. The battery tank
  {
    id: 'energy-per-reply',
    chapter: '04-battery-tank',
    question: 'Two assistants run the same model on the same phone. One drains the battery twice as fast. Likely why?',
    options: [
      'Its replies are about twice as long',
      'Its questions are about twice as polite',
      'It was installed second',
    ],
    correct: 0,
    why: [
      'Right: a reply’s energy is its tokens times the energy per token, so twice the tokens is twice the drain.',
      'Politeness only matters as tokens, and questions cost far less than long replies.',
      'Install order has nothing to do with energy; tokens written do.',
    ],
  },
  {
    id: 'bigger-costs-more',
    chapter: '04-battery-tank',
    question: 'Why does a bigger model cost more battery per token on a phone?',
    options: [
      'Each token reads every weight, and a bigger model has more bytes to read',
      'Bigger models write longer words',
      'It doesn’t: energy depends only on the screen',
    ],
    correct: 0,
    why: [
      'Right: more weight bytes means more memory traffic and work for every token.',
      'Tokens are the same size whatever the model; it’s the weights read per token that grow.',
      'Running a model is heavy work for the chip, not just the screen, as the phone study measured.',
    ],
  },
  {
    id: 'replies-per-charge',
    chapter: '04-battery-tank',
    question: 'How do you work out how many replies one charge gives?',
    options: [
      'Battery energy divided by the energy per reply',
      'Battery percentage times reply length',
      'Hours of screen time divided by the model size',
    ],
    correct: 0,
    why: [
      'Right: the battery’s energy over what each reply spends is the number of replies it pays for.',
      'Multiplying makes longer replies look better, the opposite of what happens.',
      'Screen time is a different drain; the model’s cost is per reply.',
    ],
  },
  // 5. Heat and speed
  {
    id: 'hot-slows',
    chapter: '05-heat-and-speed',
    question: 'A phone model answers fast at first, then slower and slower during a long session. Why?',
    options: [
      'The phone heats up and throttles its own speed',
      'The model gets tired',
      'The weights are being downloaded again',
    ],
    correct: 0,
    why: [
      'Right: a phone sheds only so much heat, so sustained work makes it lower its speed.',
      'Models don’t tire; the same weights do the same work each token.',
      'The weights are already in memory; nothing is downloaded on-device.',
    ],
  },
  {
    id: 'speed-from-bytes',
    chapter: '05-heat-and-speed',
    question: 'On the same phone, which writes more tokens per second: a model at 4 bits or the same model at 8?',
    options: [
      'At 4 bits: half the bytes to read for every token',
      'At 8 bits: more precise numbers are faster',
      'The same: bits only change memory',
    ],
    correct: 0,
    why: [
      'Right: each token reads every weight, so half the bytes means about twice the speed.',
      'Precision costs bytes, and bytes cost time to read.',
      'Fewer bytes change both memory and the time each token takes to read them.',
    ],
  },
  {
    id: 'short-stays-cool',
    chapter: '05-heat-and-speed',
    question: 'During a rush, how can the handheld stay fast?',
    options: [
      'Shorter replies, so each burst of work ends before it heats up',
      'Longer replies, so there are fewer questions',
      'A brighter screen',
    ],
    correct: 0,
    why: [
      'Right: short bursts of work finish before the phone needs to throttle.',
      'Long replies keep the chip busy longer, so it heats sooner.',
      'The screen adds heat; it doesn’t make the model faster.',
    ],
  },
  // 6. What never leaves
  {
    id: 'on-device-private',
    chapter: '06-what-never-leaves',
    question:
      'A clinic asks if patient notes typed into an on-device assistant leave the tablet. With no fallback, what is true?',
    options: [
      'They stay on the tablet: the model runs there',
      'They go to the model maker to answer',
      'They leave, but encrypted',
    ],
    correct: 0,
    why: [
      'Right: on-device, the question and the reply never cross the network.',
      'The model is on the tablet, so there’s no maker’s server in the loop.',
      'Nothing leaves at all; encryption would matter only if it did.',
    ],
  },
  {
    id: 'fallback-leaks',
    chapter: '06-what-never-leaves',
    question: 'An on-device app falls back to the cloud for long questions. What should its privacy note say?',
    options: [
      'Which questions leave the device, and where they go',
      'Nothing leaves, since the model is on the device',
      'Nothing, because the fallback is rare',
    ],
    correct: 0,
    why: [
      'Right: a fallback sends some questions out, so say which ones and where.',
      'With a fallback on, some questions do leave, so “nothing leaves” is untrue.',
      'Rare or not, a question that leaves is one users should know about.',
    ],
  },
  {
    id: 'no-signal',
    chapter: '06-what-never-leaves',
    question: 'Besides privacy, what does on-device give a picker in a back aisle?',
    options: ['Answers with no signal at all', 'A bigger model than the cloud’s', 'Unlimited battery'],
    correct: 0,
    why: [
      'Right: with the model on the handheld, no network is needed.',
      'On-device models are smaller than cloud ones, to fit the phone.',
      'Running the model spends battery, as the tank showed.',
    ],
  },
  // 7. Pack the handheld
  {
    id: 'rule-not-one-number',
    chapter: '07-workbench',
    question: 'A setup has the most replies per charge. Why might it still be the wrong choice?',
    options: [
      'It may miss another line of the rule, such as answer quality',
      'More replies per charge is always best',
      'It uses too little memory',
    ],
    correct: 0,
    why: [
      'Right: the cheapest setup can still answer too few questions to be useful.',
      'Battery is one line of the rule; quality and fit count too.',
      'Using less memory is fine; it leaves more room for the cache.',
    ],
  },
  {
    id: 'bits-unlock-size',
    chapter: '07-workbench',
    question: 'A bigger model answers better but doesn’t fit. What can make it fit?',
    options: ['Fewer bits per weight, checked against your own questions', 'A longer context', 'Longer replies'],
    correct: 0,
    why: [
      'Right: fewer bits shrink the weights, as long as the answers hold up.',
      'A longer context adds cache memory, making the fit worse.',
      'Reply length changes battery, not whether the weights fit.',
    ],
  },
  {
    id: 'length-is-a-lever',
    chapter: '07-workbench',
    question: 'The model fits and answers well, but the battery runs out mid-shift. Which lever do you try first?',
    options: ['Shorter replies', 'More bits per weight', 'A longer context'],
    correct: 0,
    why: [
      'Right: fewer tokens per reply means less energy per reply, so more replies per charge.',
      'More bits means more bytes read per token, so more battery, not less.',
      'More context costs more memory and work per reply.',
    ],
  },
];
