// Fine-tuning's recall bank (KTD7): the recap and the warm-up ask from it. Each item asks a chapter's idea in a new
// situation; every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 1. Three ways to change an answer
  {
    id: 'lever-for-the-job',
    chapter: '01-three-ways',
    pin: true,
    question:
      'A bank’s assistant must quote today’s interest rates, which change weekly, in the bank’s formal tone. Which levers fit which need?',
    options: [
      'Fine-tune for both: train on the rates and the tone together',
      'Documents for the rates, which change; the prompt or the weights for the tone, which doesn’t',
      'The prompt for both: paste this week’s rates and the tone into every question',
      'Documents for both: a document can describe the tone',
    ],
    correct: 1,
    why: [
      'Rates learnt in the weights go stale the next week, and only a new training run fixes them.',
      'Right. Facts that change go where the assistant reads them fresh; a steady style can live in the prompt or the weights.',
      'It works until the list of rates outgrows the prompt, and someone must remember to edit it every week. Documents are fetched only when they match.',
      'A passage about tone is read as a fact, not followed as a habit. A prompt or training sets the style more reliably.',
    ],
  },
  {
    id: 'what-a-prompt-changes',
    chapter: '01-three-ways',
    question: 'A colleague edits the system prompt so the assistant answers in Spanish. What changed?',
    options: [
      'The model’s weights, a little',
      'The words sent with every question; the model itself is the same',
      'The documents the assistant can read',
    ],
    correct: 1,
    why: [
      'A prompt is sent with each question; it never changes the weights. Only training does.',
      'Right. Remove the line and the next answer is back to English: the change lives in the request.',
      'The documents are the passages fetched per question. A system prompt is a separate set of words.',
    ],
  },
  {
    id: 'weights-carry-facts',
    chapter: '01-three-ways',
    question:
      'A fine-tuned assistant answers a policy question correctly with no documents at all. Where did the answer come from?',
    options: [
      'Its weights: the policy was in the replies it was trained on',
      'It looked the policy up while answering',
      'It guessed, and got lucky',
    ],
    correct: 0,
    why: [
      'Right. Training can store facts in the weights as well as style. They stay as trained, which is the trouble when they change.',
      'A fine-tuned model without documents looks nothing up; it answers from its weights.',
      'Possible for one answer, but a fine-tuned model that gets a policy right again and again learnt it in training.',
    ],
  },
  // 2. What training does
  {
    id: 'loss-falls',
    chapter: '02-what-training-does',
    question: 'During a fine-tune, the training loss drops steadily. What does that tell you?',
    options: [
      'The model is getting better at everything',
      'The model is less and less surprised by the training examples',
      'The model is reading the examples while it answers',
    ],
    correct: 1,
    why: [
      'Training loss measures only the training examples. Text outside them can get worse at the same time.',
      'Right. Loss is how surprised the model is by each next piece of the examples; training nudges the weights to lower it.',
      'Training uses the examples once, to change the weights. Answering reads only the question and the weights.',
    ],
  },
  {
    id: 'new-question-new-habit',
    chapter: '02-what-training-does',
    question:
      'A model fine-tuned on replies that end with a sign-off is asked a question none of them covered. What should you expect?',
    options: [
      'No sign-off: it only learnt the exact questions',
      'The sign-off: the habit is in the weights, so it carries to new questions',
      'A training reply, copied whole',
    ],
    correct: 1,
    why: [
      'Larkspur mini signed off on questions that were not in its training set. A habit trained into the weights carries over.',
      'Right. The weights changed, and every question goes through the same weights.',
      'A small model can parrot, but the style set’s replies were not what it wrote; it wrote its own words, then the sign-off.',
    ],
  },
  {
    id: 'same-weights-same-reply',
    chapter: '02-what-training-does',
    question:
      'You ask Larkspur mini the same question twice, with the same weights. Why is the reply the same both times?',
    options: [
      'It caches the first reply and plays it back',
      'It always picks its most likely next piece, so the same weights give the same words',
      'Tiny models only know one reply',
    ],
    correct: 1,
    why: [
      'Nothing is stored between asks: it works the reply out again, and lands on the same words.',
      'Right. Always taking the most likely piece makes the reply depend only on the question and the weights.',
      'It writes different replies to different questions, and different ones again once its weights are swapped.',
    ],
  },
  // 3. Small adapters
  {
    id: 'adapter-size',
    chapter: '03-small-adapters',
    question:
      'A matrix in a model is 1,000 × 1,000. LoRA adds a rank-8 adapter beside it. How many weights does LoRA train for it?',
    options: ['1,000,000', '16,000', '8'],
    correct: 1,
    why: [
      'That is the matrix itself, which a full fine-tune trains. LoRA leaves it frozen.',
      'Right. Two thin matrices: 8 × 1,000 and 1,000 × 8, so 8 × (1,000 + 1,000).',
      'Rank 8 is the thin side of each matrix, not the count; each thin matrix is still 1,000 long.',
    ],
  },
  {
    id: 'base-unchanged',
    chapter: '03-small-adapters',
    question: 'After training a LoRA adapter, the team unclips it. What does the model do now?',
    options: [
      'Exactly what the base model did before training',
      'A weaker version of the fine-tuned style',
      'Nothing: the base was overwritten',
    ],
    correct: 0,
    why: [
      'Right. LoRA never touched the base weights; the change lived only in the adapter.',
      'The style lived in the adapter alone. Without it, nothing of it is left.',
      'LoRA freezes the base weights; nothing in them was overwritten.',
    ],
  },
  {
    id: 'many-adapters',
    chapter: '03-small-adapters',
    question: 'A company serves five teams, each wanting its own style. What does LoRA let them keep?',
    options: [
      'Five whole copies of the model, one per team',
      'One base model and five small adapters',
      'One model trained on all five styles at once, with no way to choose between them',
    ],
    correct: 1,
    why: [
      'That is what five full fine-tunes would cost. LoRA avoids it.',
      'Right. Each adapter is a small file; swap it in for the team asking.',
      'Five adapters keep the styles apart: pick the one for the team asking.',
    ],
  },
  // 4. Facts move, style stays
  {
    id: 'stale-fact',
    chapter: '04-facts-move-style-stays',
    question: 'A fine-tuned assistant still quotes last year’s shipping fee, in perfect house style. Why?',
    options: [
      'The prompt is out of date',
      'The fee is in its weights, from training, and nothing told them it changed',
      'The key-fact check is broken',
    ],
    correct: 1,
    why: [
      'The fee was never in the prompt; it came from the training replies.',
      'Right. Weights keep what they were trained on. The style is right because it didn’t change; the fee did.',
      'The check found a real problem: the answer lacks the new fee.',
    ],
  },
  {
    id: 'docs-move-first',
    chapter: '04-facts-move-style-stays',
    question: 'A part’s warranty changes from one year to two. Which version answers two years the next morning?',
    options: [
      'The fine-tuned one, once it has had a night to adjust',
      'The RAG one, once the warranty document is updated',
      'Neither, until both are retrained',
    ],
    correct: 1,
    why: [
      'A model changes only when it is trained. Time alone does nothing to the weights.',
      'Right. RAG reads the documents for every question, so the update is in the next answer.',
      'RAG needs no training to read an updated document.',
    ],
  },
  {
    id: 'grade-the-fact',
    chapter: '04-facts-move-style-stays',
    question: 'Two answers both read well and sign off nicely; one has the old price. What catches it?',
    options: [
      'A check that the answer contains the key fact, the new price',
      'A check that the answer signs off',
      'Reading it: if it sounds right, it is right',
    ],
    correct: 0,
    why: [
      'Right. The key-fact check looks for the one phrase that must be there, so a stale price fails.',
      'Both sign off; the sign-off check can’t tell them apart.',
      'A stale answer sounds as sure as a fresh one. Only a check against the reference catches it.',
    ],
  },
  // 5. What training costs you
  {
    id: 'measure-forgetting',
    chapter: '05-what-training-costs',
    question: 'How would you check whether a fine-tune made a model worse at what it knew before?',
    options: [
      'Score it on text it never trained on, before and after, and compare',
      'Look at the training loss: if it fell, nothing was lost',
      'Ask the model whether it forgot anything',
    ],
    correct: 0,
    why: [
      'Right. Held-out text shows what training did to everything outside the training set.',
      'Training loss measures only the training examples. It can fall while held-out loss rises.',
      'A model can’t report what its weights lost. Only a score on held-out text shows it.',
    ],
  },
  {
    id: 'adapter-forgets-less',
    chapter: '05-what-training-costs',
    question:
      'A LoRA adapter and a full fine-tune learn the same style. Which usually keeps more of what the base model knew?',
    options: [
      'The full fine-tune: it has more weights to hold both',
      'The adapter: the base weights stay as they were, and it changes less',
      'Both keep exactly the same: they trained on the same examples',
    ],
    correct: 1,
    why: [
      'Changing every weight is what moves the model furthest from what it knew. It usually forgets more, not less.',
      'Right. It learns less and forgets less; on Larkspur mini its held-out loss rose less than the full fine-tune’s.',
      'Same examples, different reach: the full fine-tune changes every weight, the adapter only a small share.',
    ],
  },
  {
    id: 'narrow-training-cost',
    chapter: '05-what-training-costs',
    question:
      'A team fine-tunes on 50 short replies until the training loss is nearly zero. What should they expect on other text?',
    options: [
      'It gets better at everything: a lower loss is a better model',
      'It may get worse: training hard on a narrow set can pull the weights away from what they knew',
      'Nothing changes: other text was never in training',
    ],
    correct: 1,
    why: [
      'A low training loss says the model fits those 50 replies. It says nothing about everything else.',
      'Right. That is forgetting; check it on held-out text before shipping.',
      'The same weights answer everything, so a change for the 50 replies reaches other text too.',
    ],
  },
  // 6. Measure before you train
  {
    id: 'baseline-first',
    chapter: '06-measure-before-you-train',
    question: 'Why score the version you ship today before you fine-tune?',
    options: [
      'So the fine-tune has a baseline to beat, on the same tests',
      'Because the evals tool needs a warm-up run',
      'You don’t need to: a fine-tune is better by design',
    ],
    correct: 0,
    why: [
      'Right. Without a score from before, nobody can say whether training helped, or broke something.',
      'The point is the comparison, not a warm-up: the same questions, before and after.',
      'A fine-tune can forget and carry stale facts. Chapter 6’s fine-tune failed the gate.',
    ],
  },
  {
    id: 'sounds-right-fails',
    chapter: '06-measure-before-you-train',
    question:
      'Every reply from the fine-tuned version signs off in the house voice. The release gate still holds it back. How can that be?',
    options: [
      'The gate grades the facts in each answer, and it got more of them wrong than the baseline',
      'The gate is broken: a version that sounds right should ship',
      'The gate only ships the version that was trained most recently',
    ],
    correct: 0,
    why: [
      'Right. The voice is one thing; the key fact is another, and the gate checks it question by question.',
      'Sounding right is exactly what a fine-tune is good at. The gate looks past it to the facts.',
      'The gate compares pass rates and questions that used to pass and now fail. When a version was trained doesn’t count.',
    ],
  },
  {
    id: 'regression-rule',
    chapter: '06-measure-before-you-train',
    question:
      'A candidate passes more questions than the baseline overall, but fails two the baseline passed. The gate says no question that passed may fail. What happens?',
    options: [
      'It ships: the total went up',
      'It is held back until those two questions pass again',
      'It ships, and the two questions are dropped from the test set',
    ],
    correct: 1,
    why: [
      'A higher total can hide a break. The rule exists so a customer who got a right answer doesn’t start getting a wrong one.',
      'Right. The no-regressions rule holds it back, however good the total is.',
      'Dropping the questions it fails hides the problem instead of fixing it.',
    ],
  },
  // 7. Larkspur's decision
  {
    id: 'lever-per-request',
    chapter: '07-larkspurs-decision',
    question:
      'An assistant answers questions about stock levels, which change hourly. Which lever should carry the stock levels?',
    options: [
      'The weights: fine-tune on this week’s stock levels',
      'Documents or a lookup, read fresh for each question',
      'The prompt: write the stock levels into it once',
    ],
    correct: 1,
    why: [
      'Within the hour the trained levels are stale, and only a new run fixes them.',
      'Right. A fact that changes belongs where it is read fresh for each question.',
      'A prompt holds what was typed into it; someone would have to edit it every hour.',
    ],
  },
  {
    id: 'tied-plans',
    chapter: '07-larkspurs-decision',
    question:
      'For replies with no facts in them, a prompt and a fine-tune both get the voice right every time. How do you choose?',
    options: [
      'On cost and upkeep: words sent with every request against a training run and retraining',
      'Always fine-tune: training is the more advanced choice',
      'Always the prompt: training never pays off',
    ],
    correct: 0,
    why: [
      'Right. When quality ties, what each costs to run and keep decides, and either can win.',
      'Advanced isn’t better. A fine-tune adds a training run, evals and retraining to the plan.',
      'Fine-tuning can pay off, for example for a fixed output format, or a smaller model that is cheaper per request.',
    ],
  },
  {
    id: 'fine-tune-when',
    chapter: '07-larkspurs-decision',
    question: 'When does fine-tuning earn its place in a plan?',
    options: [
      'When a steady skill or format matters, the prompt and documents fall short on the evals, and the team can keep retraining',
      'Whenever the assistant gets a fact wrong',
      'Whenever a new model comes out',
    ],
    correct: 0,
    why: [
      'Right. Measure the cheaper levers first; train for what they can’t do, and budget the upkeep.',
      'A wrong fact usually belongs in the documents, which update in one place without a training run.',
      'A new model is a reason to re-run the evals, not to train by default.',
    ],
  },
];
