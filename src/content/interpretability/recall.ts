// Interpretability's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. The pinned item tests the module's one-line edge: to learn what a part of a model
// does, change it and watch the output; looking at it only describes.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 1. Why did it say that?
  {
    id: 'change-it-to-know',
    chapter: '01-why-did-it-say-that',
    pin: true,
    question:
      'Your team must show a regulator which part of a model drives its loan decisions. Which evidence is strongest?',
    options: [
      'A heatmap of where the model’s attention went on each application',
      'Switching a candidate part off, or changing it, and showing the decisions change',
      'The model’s own written explanation of its decision',
    ],
    correct: 1,
    why: [
      'A heatmap describes where heads looked; very different patterns can give the same decision.',
      'Right: an intervention that changes the output is evidence of cause, not just of where attention went.',
      'A model’s account of itself is more output, not a look inside; it can sound right and be wrong.',
    ],
  },
  {
    id: 'what-interpretability-asks',
    chapter: '01-why-did-it-say-that',
    question: 'A product manager asks what “interpretability” work on a model would produce. What do you say?',
    options: [
      'A better score on the team’s benchmark',
      'An account of which parts inside the model produce an output, and how',
      'A shorter prompt that gives the same answer',
    ],
    correct: 1,
    why: [
      'Scores say how well a model does, not how it does it inside.',
      'Right: interpretability opens the model and ties outputs to the parts that make them.',
      'Prompt work changes the input; interpretability studies what happens inside.',
    ],
  },
  {
    id: 'map-is-a-lead',
    chapter: '01-why-did-it-say-that',
    question:
      'An attention map shows a translation model looking hard at the word “not” when it flips a sentence’s meaning. What is the map good for?',
    options: [
      'Proof that “not” caused the flip',
      'A lead worth testing: change or remove “not”’s path and see if the flip goes',
      'Nothing: attention maps are random',
    ],
    correct: 1,
    why: [
      'Where a head looks and what changed the output can differ, so the map alone isn’t proof.',
      'Right: the map points at a suspect, and an experiment tests it.',
      'Maps are computed from the model’s own weights; they describe something real, just not cause.',
    ],
  },
  // 2. Pull a fuse
  {
    id: 'one-prompt-misleads',
    chapter: '02-pull-a-fuse',
    question:
      'Switching off one part of a chatbot breaks its answer to one test question. A colleague calls it “the part that answers questions”. What do you check first?',
    options: [
      'Nothing: one broken answer proves it',
      'How often answers change over lots of held-out text with that part off',
      'Whether the part has the largest weights',
    ],
    correct: 1,
    why: [
      'One prompt can be one of the few where a part matters; the word-start head bit on one prompt and cost about one in ten over text.',
      'Right: a count over held-out text shows the part’s real share of the work.',
      'Big weights don’t say what a part does; switching it off and counting does.',
    ],
  },
  {
    id: 'ablation-meaning',
    chapter: '02-pull-a-fuse',
    question: 'What does an ablation of one attention head do?',
    options: [
      'Retrains the head on new data',
      'Switches the head’s output off for a run, to see what changes',
      'Deletes the head’s attention map from the picture only',
    ],
    correct: 1,
    why: [
      'Ablation changes no weights for good; it silences a part for one run.',
      'Right: the head is silenced and the output is compared with the plain run.',
      'The head still computes its pattern; its output is what is zeroed.',
    ],
  },
  {
    id: 'spread-out',
    chapter: '02-pull-a-fuse',
    question:
      'Every one of a small model’s heads, switched off alone, costs a few percent of right guesses and none breaks it. What does that suggest?',
    options: [
      'The heads are useless',
      'The work is spread across parts, each adding a little',
      'One hidden head does all the work',
    ],
    correct: 1,
    why: [
      'Each one cost something, so none is useless.',
      'Right: small costs from every part mean the work is shared.',
      'If one part did it all, switching that one off would break the model.',
    ],
  },
  // 3. The guess forming
  {
    id: 'lens-reads-early',
    chapter: '03-the-guess-forming',
    question: 'What does the logit lens let you see?',
    options: [
      'The model’s guess as it would be if it stopped at an earlier layer',
      'Which training document taught each fact',
      'How long each layer takes to run',
    ],
    correct: 0,
    why: [
      'Right: it reads an earlier layer through the model’s own last step.',
      'The lens reads activations on one run; it says nothing about training documents.',
      'It reads guesses, not timings.',
    ],
  },
  {
    id: 'embedding-echoes',
    chapter: '03-the-guess-forming',
    question: 'Through the lens, a model’s guess before any block has run is mostly the token it is sitting on. Why?',
    options: [
      'Before any block, each token knows only itself, so its best guess is itself',
      'The model is broken at that stage',
      'The lens always repeats the input',
    ],
    correct: 0,
    why: [
      'Right: no attention has run yet, so nothing from the other tokens has arrived.',
      'It is working as built; the blocks that mix in context haven’t run yet.',
      'At later stages the lens shows real next-word guesses, not the input.',
    ],
  },
  {
    id: 'early-not-idle',
    chapter: '03-the-guess-forming',
    question: 'The right answer shows up through the lens at layer 10 of 24. Can the team delete layers 11 to 24?',
    options: [
      'Yes: the answer is already there',
      'Not on that evidence: the lens shows when a guess becomes readable, not that later layers add nothing',
      'Yes, but only layers 20 to 24',
    ],
    correct: 1,
    why: [
      'Later layers may still sharpen or correct the guess; only switching them off would show they don’t.',
      'Right: readable early is a reading, and removing layers is a separate experiment.',
      'The lens gives no reason to pick those layers over any others.',
    ],
  },
  // 4. Patching
  {
    id: 'patch-finds-place',
    chapter: '04-patching',
    question:
      'You copy one activation from a run on “The capital of Italy is” into a run on “The capital of France is”, and the answer becomes “Rome”. What did you learn?',
    options: [
      'Where, at that stage, the model held the country’s information',
      'That the model has no facts',
      'That the two prompts are the same',
    ],
    correct: 0,
    why: [
      'Right: the answer followed the copied activation, so that is where the information sat.',
      'The answer changed to the other right fact, which shows the model holds facts somewhere.',
      'They answer differently, which is why the patch could move the answer at all.',
    ],
  },
  {
    id: 'information-moves',
    chapter: '04-patching',
    question:
      'Patching the subject word flips the answer in early layers; later only patching the last token does. What does that show?',
    options: [
      'Attention carried the information from the subject word to the last token between those layers',
      'The subject word stopped mattering',
      'The last token always held the answer',
    ],
    correct: 0,
    why: [
      'Right: the information moved, and the patch grid shows when.',
      'It still mattered; its information had moved to the last token.',
      'Early on, patching the last token changed nothing, so it didn’t hold it yet.',
    ],
  },
  {
    id: 'same-length',
    chapter: '04-patching',
    question: 'Why do the two prompts in a patching experiment need the same number of tokens?',
    options: [
      'So each position in one run lines up with the same position in the other',
      'Because models can only read prompts of one length',
      'To make the run faster',
    ],
    correct: 0,
    why: [
      'Right: patching swaps one position’s activation for the one at the same place in the other run.',
      'Models read prompts of many lengths; the matching is for the experiment.',
      'Speed isn’t the reason; lining up the positions is.',
    ],
  },
  // 5. Steering
  {
    id: 'steer-no-retrain',
    chapter: '05-steering',
    question: 'How does steering change what a model says?',
    options: [
      'By retraining its weights on new examples',
      'By adding a direction to its activations during the run',
      'By rewriting the prompt',
    ],
    correct: 1,
    why: [
      'Steering changes no weight; the model is the same after the run.',
      'Right: a vector is added inside the run, pushing the output one way.',
      'The prompt stays as it is; the change happens inside.',
    ],
  },
  {
    id: 'direction-from-sets',
    chapter: '05-steering',
    question: 'A team wants to steer toward formal replies. How do they make the direction?',
    options: [
      'Average the activations on formal prompts and subtract the average on casual ones',
      'Pick one random neuron and turn it up',
      'Add the word “formal” to every prompt',
    ],
    correct: 0,
    why: [
      'Right: the difference of two sets’ averages points from casual toward formal.',
      'One neuron usually means many things, so turning it up pushes several ways at once.',
      'That changes the prompt, not the activations.',
    ],
  },
  {
    id: 'too-strong',
    chapter: '05-steering',
    question: 'A steering direction works at a small strength. What happens if they turn it up a lot?',
    options: ['The effect just keeps growing, cleanly', 'The output can stop making sense', 'Nothing more changes'],
    correct: 1,
    why: [
      'You saw a big push turn the top guess into a scrap of a word.',
      'Right: pushed far from anything it saw in training, the model’s later layers stop making sense of it.',
      'The output kept changing as the strength rose.',
    ],
  },
  // 6. One neuron, many meanings
  {
    id: 'polysemantic',
    chapter: '06-one-neuron-many-meanings',
    question: 'A neuron fires on “invoice”, on commas and on “-ing”. What is that called?',
    options: ['Polysemantic: one neuron, several unrelated meanings', 'A broken neuron', 'A feature'],
    correct: 0,
    why: [
      'Right: most neurons mix several unrelated jobs.',
      'It works as trained; mixing meanings is the norm, not a fault.',
      'A feature is closer to one meaning; this neuron has several.',
    ],
  },
  {
    id: 'why-features',
    chapter: '06-one-neuron-many-meanings',
    question: 'Why do researchers look for features instead of reading neurons one by one?',
    options: [
      'Features are directions closer to one idea each, while neurons mix many',
      'Neurons can’t be measured',
      'Features are faster to compute',
    ],
    correct: 0,
    why: [
      'Right: a model packs more ideas than it has neurons, so ideas spread across them.',
      'Neurons are easy to measure, as you saw; they are just hard to read.',
      'The reason is meaning, not speed.',
    ],
  },
  {
    id: 'top-tokens',
    chapter: '06-one-neuron-many-meanings',
    question: 'How are a neuron’s top tokens found?',
    options: [
      'By running the model over lots of text and keeping the tokens where it fired highest',
      'By asking the model what the neuron means',
      'By reading the neuron’s weights as words',
    ],
    correct: 0,
    why: [
      'Right: its firing is read on every token of the training text and the highest are kept.',
      'The model can’t report on its own neurons.',
      'Weights are numbers; the tokens come from running text through the model.',
    ],
  },
  // 7. The smallest set
  {
    id: 'circuit',
    chapter: '07-the-smallest-set',
    question: 'What is a circuit, in this sense?',
    options: [
      'The smallest set of a model’s parts that still produces one behaviour',
      'The wiring of the computer the model runs on',
      'Every part of the model',
    ],
    correct: 0,
    why: [
      'Right: switch everything else off and the behaviour survives.',
      'The term is about the model’s own parts, not the hardware.',
      'A circuit is a subset; for some behaviours it is most of the model.',
    ],
  },
  {
    id: 'many-winners',
    chapter: '07-the-smallest-set',
    question: 'Two engineers find different two-part sets that each keep an answer. Who is right?',
    options: [
      'Both can be: several smallest sets can keep the same answer',
      'Only the one who found it first',
      'Neither: there must be one true set',
    ],
    correct: 0,
    why: [
      'Right: “days” had several two-part sets that kept it.',
      'Order of discovery doesn’t matter; each set either keeps the answer or doesn’t.',
      'You found more than one set that worked for the same answer.',
    ],
  },
  {
    id: 'spread-behaviour',
    chapter: '07-the-smallest-set',
    question: 'A behaviour needs five of a model’s six parts. What does that mean for fixing it?',
    options: [
      'There is no small part to change: the behaviour is spread through the model',
      'Remove the sixth part and it gets better',
      'It must be a bug in the search',
    ],
    correct: 0,
    why: [
      'Right: when most parts are needed, no single part is the handle.',
      'The sixth part wasn’t needed, so removing it changes nothing about this behaviour.',
      'The search tried every set; some behaviours really are spread out.',
    ],
  },
];
