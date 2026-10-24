// Pre-training's recall bank: the recap and the warm-up ask from it. Each item asks a chapter's idea in a new situation;
// every wrong option is a real misconception, and every option has a `why` line. The pinned item is the module's edge:
// a model is judged on text it never trained on.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  {
    id: 'judge-on-unseen',
    chapter: '03-held-out',
    pin: true,
    question:
      'Two checkpoints of the same run: one has the lower training loss, the other the lower held-out loss. Which should the team ship to answer new customer questions?',
    options: [
      'The one with the lower held-out loss',
      'The one with the lower training loss',
      'Either: the two losses always agree',
    ],
    correct: 0,
    why: [
      'Right. Customer questions are new text, and held-out loss is the score on text the model never trained on.',
      'Training loss can keep falling as the model memorises its own documents, which does nothing for new questions.',
      'They split apart as training goes on; that widening gap is what memorising looks like.',
    ],
  },
  // 1. Before training
  {
    id: 'random-start',
    chapter: '01-before-training',
    question: 'What are a language model’s weights before its first training step?',
    options: ['Random numbers', 'A compressed copy of a dictionary', 'All zeros, waiting to be filled in'],
    correct: 0,
    why: [
      'Right. Training starts from random weights, which is why an untrained model writes noise.',
      'Nothing is loaded in: every word a model knows, it learns in training.',
      'Weights start random, not empty; all zeros would leave every part of the model doing the same thing.',
    ],
  },
  {
    id: 'checkpoint-is',
    chapter: '01-before-training',
    question: 'A team says it “rolled back to the checkpoint from Tuesday”. What did it roll back?',
    options: [
      'The model’s weights, to a copy saved partway through training',
      'The training data, to Tuesday’s documents',
      'The prompt the model is given',
    ],
    correct: 0,
    why: [
      'Right. A checkpoint is a saved copy of the weights at one step of a run.',
      'A checkpoint saves the model, not the data; the documents stay as they are.',
      'Prompts are sent with each request; a checkpoint is the model itself.',
    ],
  },
  {
    id: 'one-job',
    chapter: '01-before-training',
    question: 'During pre-training, what is the model actually asked to do, over and over?',
    options: ['Guess the next piece of text', 'Answer customers’ questions', 'Sort documents by topic'],
    correct: 0,
    why: [
      'Right. Every training step scores its guesses at the next piece and nudges the weights toward better ones.',
      'Answering questions comes later, if at all; pre-training is only next-piece guessing on plain text.',
      'No labels or topics are given: the text itself is the only teacher.',
    ],
  },
  // 2. Watch it learn
  {
    id: 'loss-means',
    chapter: '02-watch-it-learn',
    question: 'A run’s loss drops from 7.1 to 3.4. What got better?',
    options: [
      'The model is less surprised, on average, by the real next piece',
      'The model now gets 3 answers wrong instead of 7',
      'The model got smaller and faster',
    ],
    correct: 0,
    why: [
      'Right. Loss measures surprise at each next piece; lower means the guesses fit the text better.',
      'Loss isn’t a count of mistakes; it is an average of how surprised the model was.',
      'Training changes the values of the weights, never their number, so size and speed stay the same.',
    ],
  },
  {
    id: 'same-prompt-changes',
    chapter: '02-watch-it-learn',
    question:
      'The same prompt is given to every checkpoint of one run. The question and the code never change. Why do the replies change?',
    options: [
      'The weights changed between checkpoints',
      'The model is shown more examples in the prompt each time',
      'Each checkpoint looks the answer up in a different document',
    ],
    correct: 0,
    why: [
      'Right. Each checkpoint is the same model with different weights, and the weights decide what it writes.',
      'The prompt stays the same; only the weights differ.',
      'A model looks nothing up while it writes; what it learnt is in its weights.',
    ],
  },
  {
    id: 'not-monotone',
    chapter: '02-watch-it-learn',
    question: 'A middle checkpoint finishes a prompt worse than an earlier one did. Does that mean training failed?',
    options: [
      'No: loss falls on average, and single replies can wobble',
      'Yes: every checkpoint must beat the last on every prompt',
      'Yes: the run should be restarted from step 0',
    ],
    correct: 0,
    why: [
      'Right. Loss is an average over lots of text, so one prompt can get worse for a while as others improve.',
      'No run improves every prompt at every step; judge it on a score over many texts.',
      'One worse reply isn’t evidence the run is broken; the loss curve is.',
    ],
  },
  // 3. Held out
  {
    id: 'held-out-why',
    chapter: '03-held-out',
    question: 'Why keep some documents out of training entirely?',
    options: [
      'To score the model on text it has never seen',
      'To save training time',
      'To hide private documents from the model',
    ],
    correct: 0,
    why: [
      'Right. Only text kept out of training tells you how the model does on new text.',
      'Saving time is a side effect; the point is an honest score.',
      'Privacy is a separate decision; held-out documents are chosen to measure, not to protect.',
    ],
  },
  {
    id: 'gap-grows',
    chapter: '03-held-out',
    question:
      'Late in a run, training loss keeps falling while held-out loss barely moves. What is the extra training mostly doing?',
    options: [
      'Memorising the training text',
      'Learning general patterns faster than before',
      'Nothing at all: the weights have stopped changing',
    ],
    correct: 0,
    why: [
      'Right. Gains that show only on the training text are the model learning that text itself.',
      'General patterns would show up on held-out text too, and here it barely moves.',
      'The weights still change, which is why training loss is still falling.',
    ],
  },
  // 4. Data is the curriculum
  {
    id: 'repeats-memorised',
    chapter: '04-data-is-the-curriculum',
    question:
      'A forum post appears 500 times in a model’s training data. Later the model writes that post word for word when asked about something else. Why?',
    options: [
      'Repeated text gets memorised, and memorised text leaks out',
      'The model decided the post was the best answer',
      'The post must have been in the prompt',
    ],
    correct: 0,
    why: [
      'Right. The more often text appears, the more training fits those exact words, until they come out unprompted.',
      'The model doesn’t judge answers; it continues text the way its training made most likely.',
      'Nothing needs to be in the prompt: the words are in the weights.',
    ],
  },
  {
    id: 'dedup-before',
    chapter: '04-data-is-the-curriculum',
    question: 'What is a cheap step that makes a model copy less training text word for word?',
    options: ['Remove duplicate documents before training', 'Train for more steps', 'Use a longer prompt'],
    correct: 0,
    why: [
      'Right. Deduplicated data gets memorised far less, and the same steps go to more varied text.',
      'More steps on the same repeats deepens the memorising.',
      'The prompt can’t undo what training put in the weights.',
    ],
  },
  {
    id: 'data-decides',
    chapter: '04-data-is-the-curriculum',
    question:
      'Two runs use the same model, settings and number of steps, but different documents. What explains their different replies?',
    options: ['The data mix', 'Luck: training is random', 'The model size'],
    correct: 0,
    why: [
      'Right. With everything else the same, what the model reads is what it learns.',
      'Runs with the same seed and settings repeat exactly; the difference came from the data.',
      'The size was the same in both runs.',
    ],
  },
  // 5. A leaked test
  {
    id: 'leak-flatters',
    chapter: '05-a-leaked-test',
    question: 'A model scores 95% on a quiz whose questions were in its training data. What does the 95% tell you?',
    options: [
      'Mostly that it saw the questions; not how well it handles new ones',
      'That it will score about 95% on new questions too',
      'That the quiz is too easy',
    ],
    correct: 0,
    why: [
      'Right. A leaked test rewards memory, so the score stops predicting how the model does on anything else.',
      'Held-out text tells a different story: the leaked run did no better on it.',
      'The quiz may be fine; the problem is that the model had already seen it.',
    ],
  },
  {
    id: 'check-for-leak',
    chapter: '05-a-leaked-test',
    question: 'How can a team catch a leaked test before trusting its score?',
    options: [
      'Search the training data for the test questions',
      'Run the test twice and compare',
      'Ask the model whether it has seen the questions',
    ],
    correct: 0,
    why: [
      'Right. Checking for overlap between the test and the training data is the direct way to find contamination.',
      'The same model gives the same score twice; repeating the test can’t reveal a leak.',
      'The model has no record of what it trained on, so its answer means nothing.',
    ],
  },
  {
    id: 'held-out-tells-truth',
    chapter: '05-a-leaked-test',
    question: 'After a leak, which score still says how the model handles new text?',
    options: ['Its score on text that was never in training', 'Its score on the leaked test', 'Its training loss'],
    correct: 0,
    why: [
      'Right. Truly held-out text stayed out, so its score is still honest.',
      'That is the score the leak inflated.',
      'Training loss is measured on text it trained on, so it says least of all about new text.',
    ],
  },
  // 6. Bigger or longer
  {
    id: 'grow-both',
    chapter: '06-bigger-or-longer',
    question:
      'Hoffmann and colleagues (2022) were asked: double the model size, keep the data the same? What would their fit say?',
    options: ['Double the training data too', 'Fine: size is what counts', 'Halve the data to keep compute the same'],
    correct: 0,
    why: [
      'Right. Their fit scales parameters and training tokens equally: double one, double the other.',
      'That was closer to the 2020 reading; the 2022 fit found such models undertrained.',
      'Cutting data starves the bigger model further, the opposite of what their fit recommends.',
    ],
  },
  {
    id: 'scaling-law-is',
    chapter: '06-bigger-or-longer',
    question: 'What is a scaling law?',
    options: [
      'A curve fitted to many training runs that predicts how loss falls as size, data or compute grows',
      'A rule that bigger models are always better',
      'A legal limit on how big a model may be',
    ],
    correct: 0,
    why: [
      'Right. It is an empirical fit, and two fits on different runs gave different advice.',
      'The fits say how much better, and for how much compute, which is how they caught oversized models.',
      'It is a pattern in measurements, not a regulation.',
    ],
  },
  {
    id: 'units-differ',
    chapter: '06-bigger-or-longer',
    question: 'Why isn’t Larkspur mini drawn on the published scaling curves?',
    options: [
      'Its losses are on different text, so the numbers don’t compare',
      'It is too small to have a loss',
      'The published curves are secret',
    ],
    correct: 0,
    why: [
      'Right. Loss depends on the text it is measured on, so a number from Larkspur’s documents can’t sit on a curve from another data set.',
      'It has a loss like any model; it just comes from different text.',
      'Both papers publish their fits; the issue is comparing across data sets.',
    ],
  },
  // 7. Larkspur's run
  {
    id: 'early-stop',
    chapter: '07-larkspurs-run',
    question:
      'With a small data set, held-out loss is lowest at step 8,000 of 40,000 and rises after. Which checkpoint should ship?',
    options: ['Step 8,000', 'Step 40,000: it trained longest', 'Any: they all saw the same data'],
    correct: 0,
    why: [
      'Right. Early stopping keeps the checkpoint that did best on unseen text.',
      'After step 8,000 the extra training went into memorising, so later checkpoints do worse on new text.',
      'They saw the same data, but different numbers of times, and the held-out score shows the difference.',
    ],
  },
  {
    id: 'more-data-wins',
    chapter: '07-larkspurs-run',
    question: 'A run on half the documents, stopped at its best step, still loses to the full set. What does that say?',
    options: [
      'Stopping early limits the damage; more data does better still',
      'Early stopping doesn’t work',
      'The half run needed more steps',
    ],
    correct: 0,
    why: [
      'Right. Stopping at the best step avoids memorising, but only more varied text teaches more.',
      'It worked: the half run’s best step beats its own last one.',
      'More steps made the half run worse after its best step; it ran out of new text, not of time.',
    ],
  },
  {
    id: 'ties-ok',
    chapter: '07-larkspurs-run',
    question: 'Two plans reach the same best held-out score. Is one of them wrong?',
    options: [
      'No: either can ship, and other concerns can decide',
      'Yes: there is always exactly one best plan',
      'Yes: the later stopping step is always right',
    ],
    correct: 0,
    why: [
      'Right. A tie on the score that matters leaves room for cost or time to break it.',
      'Real problems often have several equally good answers, as the workbench showed.',
      'Later isn’t better by itself; only the held-out score decides.',
    ],
  },
];
