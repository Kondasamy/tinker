// Fine-tuning's recall bank (KTD7): the recap and the warm-up ask from it. Each item asks a chapter's idea in a new
// situation; every wrong option is a real misconception, and every option has a `why` line. Chapters 5–7 add theirs in U21.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 1. Three ways to change an answer
  {
    id: 'lever-for-the-job', chapter: '01-three-ways', pin: true,
    question: 'A bank’s assistant must quote today’s interest rates, which change weekly, in the bank’s formal tone. Which levers fit which need?',
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
    id: 'what-a-prompt-changes', chapter: '01-three-ways',
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
    id: 'weights-carry-facts', chapter: '01-three-ways',
    question: 'A fine-tuned assistant answers a policy question correctly with no documents at all. Where did the answer come from?',
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
    id: 'loss-falls', chapter: '02-what-training-does',
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
    id: 'new-question-new-habit', chapter: '02-what-training-does',
    question: 'A model fine-tuned on replies that end with a sign-off is asked a question none of them covered. What should you expect?',
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
    id: 'same-weights-same-reply', chapter: '02-what-training-does',
    question: 'You ask Larkspur mini the same question twice, with the same weights. Why is the reply the same both times?',
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
    id: 'adapter-size', chapter: '03-small-adapters',
    question: 'A matrix in a model is 1,000 × 1,000. LoRA adds a rank-8 adapter beside it. How many weights does LoRA train for it?',
    options: ['1,000,000', '16,000', '8'],
    correct: 1,
    why: [
      'That is the matrix itself, which a full fine-tune trains. LoRA leaves it frozen.',
      'Right. Two thin matrices: 8 × 1,000 and 1,000 × 8, so 8 × (1,000 + 1,000).',
      'Rank 8 is the thin side of each matrix, not the count; each thin matrix is still 1,000 long.',
    ],
  },
  {
    id: 'base-unchanged', chapter: '03-small-adapters',
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
    id: 'many-adapters', chapter: '03-small-adapters',
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
    id: 'stale-fact', chapter: '04-facts-move-style-stays',
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
    id: 'docs-move-first', chapter: '04-facts-move-style-stays',
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
    id: 'grade-the-fact', chapter: '04-facts-move-style-stays',
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
];
