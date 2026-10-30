// Mixture of experts' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line. The
// pinned item is the module's one-line edge: the model holds many experts but pays for a few per word, and a router
// picks them.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-one-big-kitchen',
  C2 = '02-rooms-and-a-doorman',
  C3 = '03-what-the-experts-learned',
  C4 = '04-send-it-elsewhere',
  C5 = '05-the-busy-room',
  C6 = '06-total-versus-active',
  C7 = '07-workbench';

export const RECALL: RecallItem[] = [
  {
    id: 'many-held-few-paid',
    chapter: C6,
    pin: true,
    question:
      'A sales deck says: “Our experts model has 200B parameters but costs like a 20B one.” What is true and what isn’t?',
    options: [
      'Each token runs about 20B, so the work is like 20B, but memory still holds all 200B',
      'It is a 20B model in every way, memory included',
      'It is a 200B model in every way: a token runs all of it',
    ],
    correct: 0,
    why: [
      'Right: a router picks a few experts per token, so the work is the active count, while every expert sits in memory.',
      'Experts a token skips still have to be loaded, so memory follows the 200B total.',
      'Only the chosen experts run on a token, so the work per token follows the active count.',
    ],
  },
  // 1. One big kitchen
  {
    id: 'dense-every-weight',
    chapter: C1,
    question: 'A dense model has 8B weights. How many work on the word “invoice”?',
    options: ['All 8B', 'Only the weights that know about invoices', 'About a tenth, picked at random'],
    correct: 0,
    why: [
      'Right: in a dense model every weight works on every token.',
      'A dense model has no way to skip weights; that is what experts add.',
      'Nothing is skipped at random; a dense model runs everything each time.',
    ],
  },
  {
    id: 'dense-grows',
    chapter: C1,
    question: 'Why do dense models get slower per word as they grow?',
    options: [
      'Each word runs through every weight, and there are more of them',
      'Bigger models read more words before each answer',
      'Bigger models check their answers twice',
    ],
    correct: 0,
    why: [
      'Right: the work per word grows with the number of weights.',
      'The prompt is the same length; the model is what grew.',
      'Nothing is checked twice; every weight simply runs on every word.',
    ],
  },
  {
    id: 'moe-changes',
    chapter: C1,
    question: 'What does a mixture of experts change about a dense model?',
    options: [
      'Each layer’s one big block of weights becomes many experts, and each token runs only a few',
      'It adds a second model that checks the first',
      'It removes attention to save work',
    ],
    correct: 0,
    why: [
      'Right: that block is split into experts, and a router picks a few per token.',
      'That describes a judge or a draft model, not experts.',
      'Attention stays; only that block is split into experts.',
    ],
  },
  // 2. Rooms and a doorman
  {
    id: 'router-scores',
    chapter: C2,
    question: 'In an experts layer, what does the router do for each token?',
    options: [
      'Scores every expert and sends the token to the best few',
      'Writes the token’s answer itself',
      'Picks experts at random to share the load',
    ],
    correct: 0,
    why: [
      'Right: the router is a small layer that scores experts; the chosen ones do the work.',
      'The router only chooses; the experts it picks compute the output.',
      'The choice is learned and depends on the token, not a coin toss.',
    ],
  },
  {
    id: 'top-k-count',
    chapter: C2,
    question: 'A layer has 16 experts and uses top-4. How many run on one token there?',
    options: ['4', '16', '12: the ones not in the top'],
    correct: 0,
    why: [
      'Right: top-4 runs the four best-scored experts.',
      'All 16 are scored, but only four run.',
      'The top four run; the other twelve are skipped.',
    ],
  },
  {
    id: 'per-layer',
    chapter: C2,
    question: 'A token went to experts 2 and 5 in layer 1. Where does it go in layer 2?',
    options: [
      'Wherever layer 2’s own router sends it',
      'Experts 2 and 5 again: the choice is made once',
      'To every expert: only layer 1 routes',
    ],
    correct: 0,
    why: [
      'Right: each layer has its own router and its own experts.',
      'Each layer chooses again, from what the token has become by then.',
      'Every experts layer routes; none runs all its experts.',
    ],
  },
  // 3. What the experts learned
  {
    id: 'split-by-kind',
    chapter: C3,
    question: 'A team inspects its experts model. What split should they expect to find?',
    options: [
      'Mostly by kind of token, like punctuation or word endings',
      'One expert per subject: law, medicine, code',
      'No pattern at all, since routing is random',
    ],
    correct: 0,
    why: [
      'Right: both Larkspur’s toy and Mixtral’s authors found splits that follow kinds of token.',
      'Nobody assigns subjects; the router learns its own split, which rarely follows topics.',
      'Routing is learned and repeatable, so patterns do appear.',
    ],
  },
  {
    id: 'not-labelled',
    chapter: C3,
    question: 'Who decides what each expert specialises in?',
    options: [
      'Training: the router and experts learn it together',
      'The engineers, who assign a topic to each',
      'The user, through the prompt',
    ],
    correct: 0,
    why: [
      'Right: specialisation comes out of training; nobody labels the experts.',
      'Engineers set how many experts, not what each one does.',
      'A prompt changes which experts its tokens visit, not what they learned.',
    ],
  },
  {
    id: 'toy-vs-large',
    chapter: C3,
    question: 'Larkspur’s toy split its experts by kind of token. What does that prove about a production model?',
    options: [
      'Nothing on its own; a large model’s authors have to report their own',
      'That every model splits exactly the same way',
      'That large models split by topic instead',
    ],
    correct: 0,
    why: [
      'Right: the toy shows what it measured; a large model’s split is its own finding.',
      'A toy is a different model; its rooms are no proof of another’s.',
      'Nothing in the toy says the opposite holds at scale; Mixtral’s authors found syntax too.',
    ],
  },
  // 4. Send it elsewhere
  {
    id: 'rooms-hold-work',
    chapter: C4,
    question: 'An engineer forces a word to two experts the router didn’t pick. What can happen?',
    options: [
      'The model’s next-word guess can change',
      'Nothing: experts are interchangeable copies',
      'The model refuses the word',
    ],
    correct: 0,
    why: [
      'Right: each expert learned different work, so other experts change the result.',
      'Experts learn different things; they are not copies of one another.',
      'Any expert can run on any word; it just does work that may not fit.',
    ],
  },
  {
    id: 'router-only-picks',
    chapter: C4,
    question: 'Where does the work on a token happen in an experts layer?',
    options: ['In the chosen experts', 'In the router', 'In every expert, weighted'],
    correct: 0,
    why: [
      'Right: the router only picks; the chosen experts compute the output.',
      'The router is a small scorer; it doesn’t transform the token.',
      'Only the chosen few run; the rest are skipped.',
    ],
  },
  {
    id: 'wrong-rooms',
    chapter: C4,
    question: 'Why does sending a word to the wrong experts usually make the guess worse?',
    options: [
      'Those experts learned other kinds of token, so their work doesn’t fit it',
      'The wrong experts are switched off',
      'The router punishes the word',
    ],
    correct: 0,
    why: [
      'Right: experts specialise, so ones that rarely saw such tokens do poorer work on them.',
      'Every expert can run; it just isn’t suited to that token.',
      'The router doesn’t act after choosing; the experts’ work is what changes.',
    ],
  },
  // 5. The busy room
  {
    id: 'capacity-drop',
    chapter: C5,
    question: 'An expert can seat 4 tokens of a batch, and 7 are sent to it. What happens to the extra 3?',
    options: [
      'They skip that expert’s work and carry on without it',
      'They wait in line for the next batch',
      'The expert stretches to fit them',
    ],
    correct: 0,
    why: [
      'Right: tokens past capacity are dropped from that expert and pass on through the layer.',
      'A batch runs together; dropped tokens don’t wait, they lose that expert’s work.',
      'Capacity is fixed per batch; that is why tokens get dropped.',
    ],
  },
  {
    id: 'factor-trade',
    chapter: C5,
    question: 'Raising the capacity factor from 1 to 2 does what?',
    options: [
      'Gives each expert more seats, so fewer tokens are dropped',
      'Sends each token to twice as many experts',
      'Halves the number of experts',
    ],
    correct: 0,
    why: [
      'Right: seats scale with the factor, so fewer tokens overflow.',
      'Each token still goes to its best two experts; only the seats change.',
      'The experts stay; each just has more room.',
    ],
  },
  {
    id: 'balance-loss',
    chapter: C5,
    question: 'Why do experts models add a load-balancing loss in training?',
    options: [
      'To push the router to spread tokens, so no expert is swamped',
      'To make every expert learn the same thing',
      'To make the model smaller',
    ],
    correct: 0,
    why: [
      'Right: even loads mean fewer dropped tokens and every expert in use.',
      'Balance spreads the tokens; the experts still learn different things.',
      'It changes where tokens go, not how many weights there are.',
    ],
  },
  // 6. Total versus active
  {
    id: 'memory-total',
    chapter: C6,
    question: 'A model card says 141B total, 39B active. What does the server’s memory have to hold?',
    options: ['All 141B weights', 'Only the 39B active weights', 'Whichever experts were used last'],
    correct: 0,
    why: [
      'Right: any token may need any expert, so every weight stays loaded.',
      'The active set changes with every token, so all experts must be ready.',
      'Swapping experts in and out per token would be far too slow; all stay loaded.',
    ],
  },
  {
    id: 'active-work',
    chapter: C6,
    question:
      'Two models each run 13B weights per token; one is dense, one holds 47B in experts. How does their work per token compare?',
    options: [
      'About the same: work follows the active weights',
      'The 47B one does about 3.6× the work',
      'The dense one does more: it can’t skip',
    ],
    correct: 0,
    why: [
      'Right: each token runs through about 13B weights in both.',
      'The experts model holds more, but each token runs only its chosen experts.',
      'Both run 13B per token; the dense one just has nothing else to skip.',
    ],
  },
  {
    id: 'moe-vs-dense-toy',
    chapter: C6,
    question: 'Larkspur’s experts toy and a dense toy run the same weights per token. What did the experts toy buy?',
    options: [
      'Better guesses, paid for in memory',
      'Less memory, at the cost of worse guesses',
      'Nothing: same work, same results',
    ],
    correct: 0,
    why: [
      'Right: the experts toy guessed better on unseen text but holds more weights.',
      'It holds more weights, not fewer; the extra experts are the price.',
      'The measured scores differed, so the extra experts did buy something.',
    ],
  },
  // 7. Workbench
  {
    id: 'precision-memory',
    chapter: C7,
    question: 'A model is too big for memory at 16 bits. What does moving to 8 bits change?',
    options: [
      'Its weights take half the memory; the work per token stays the same',
      'It runs half as many weights per token',
      'Nothing: precision only changes the answers',
    ],
    correct: 0,
    why: [
      'Right: fewer bits per weight shrink memory, while a token still runs every active weight.',
      'The active count is set by the routing, not by the bits per weight.',
      'Bytes per weight halve, so memory changes too.',
    ],
  },
  {
    id: 'two-budgets',
    chapter: C7,
    question: 'A team checks only that a model fits in memory. What have they missed?',
    options: [
      'Whether its active weights fit the work they can afford per token',
      'Nothing: memory is the only cost',
      'Whether it has more experts than layers',
    ],
    correct: 0,
    why: [
      'Right: memory follows the total; speed follows the active weights, a second budget.',
      'A dense model that fits in memory can still be too slow per token.',
      'The count of experts matters only through total and active weights.',
    ],
  },
  {
    id: 'dense-fails-work',
    chapter: C7,
    question: 'A dense 70B model fits a server’s memory but not its work-per-token budget. Which change can help?',
    options: [
      'An experts model with similar total but fewer active weights',
      'The same dense model at 4 bits',
      'A dense model with more layers',
    ],
    correct: 0,
    why: [
      'Right: fewer active weights per token is exactly what experts buy.',
      'Fewer bits shrink memory, but a token still runs all 70B weights.',
      'More layers mean more weights per token, not fewer.',
    ],
  },
];
