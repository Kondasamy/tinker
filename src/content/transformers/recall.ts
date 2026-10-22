// Transformers' recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 1. One token at a time
  {
    id: 'one-run-one-token',
    chapter: '01-one-token-at-a-time',
    pin: true,
    question:
      'Larkspur’s assistant answers a customer with a 40-token reply. How many times did the model run to write it?',
    options: [
      'Once: it wrote the reply in one pass, then streamed it out',
      'About 40 times: each run gives the next token, which is added before the next run',
      'Once per sentence: it plans a sentence, then writes it',
    ],
    correct: 1,
    why: [
      'A run only scores the next position. Streaming isn’t a finished reply being shown slowly; each token is new when it appears.',
      'Right. One run, one next token. The chosen token joins the text, and the model runs again on the longer text.',
      'Nothing in the model works in sentences. Each run scores one next token, whatever it is.',
    ],
  },
  {
    id: 'probabilities-not-answer',
    chapter: '01-one-token-at-a-time',
    question: 'What does one run of the model hand back, before anything is written?',
    options: [
      'The one right next word',
      'A probability for every token in its vocabulary, for the next position',
      'A short list of words that appear in its training documents',
    ],
    correct: 1,
    why: [
      'The model never says what is right; it says how likely each token is. Something else then picks one.',
      'Right. The bar you saw was the top of a list covering every token the model knows.',
      'The model keeps no documents, only numbers learned from them, and it scores every token, not a short list.',
    ],
  },
  {
    id: 'tiny-model-limits',
    chapter: '01-one-token-at-a-time',
    question:
      'You give Larkspur mini a sentence about the weather, a topic Larkspur’s documents never mention. What do you expect?',
    options: [
      'A sensible guess: a model knows about the world in general',
      'Poor guesses: it only learned the patterns in Larkspur’s documents',
      'An error: it refuses words it hasn’t seen',
    ],
    correct: 1,
    why: [
      'A model only knows what its training text taught it. Larkspur mini’s whole world is Larkspur’s documents.',
      'Right. It still gives every token a probability, as always, but the probabilities come from text about orders and returns.',
      'It never refuses: any text becomes tokens it knows, and it scores the next one. The scores will just be poor.',
    ],
  },

  // 2. Tokens become vectors
  {
    id: 'embedding-lookup',
    chapter: '02-tokens-become-vectors',
    question:
      'The token “refund” appears in two different customer emails. Before the model reads either, how do the two copies’ embeddings compare?',
    options: [
      'Identical: the embedding is one row of a table, looked up by the token’s id',
      'Different: each email’s meaning changes the embedding',
      'Different: embeddings are random each time',
    ],
    correct: 0,
    why: [
      'Right. The embedding table was learned in training and stays fixed; the same id always picks the same row.',
      'Context changes a token’s vector later, inside the model (attention). The lookup itself knows nothing about the email.',
      'The table is fixed after training. Nothing about it is drawn at random when you run the model.',
    ],
  },
  {
    id: 'position-added',
    chapter: '02-tokens-become-vectors',
    question: 'How does the model tell “ship before refund” from “refund before ship”?',
    options: [
      'Each token’s embedding already holds its place in the sentence',
      'A row from a position table is added to each token’s embedding, so the same token in another place starts from other numbers',
      'It can’t: order never matters to a model',
    ],
    correct: 1,
    why: [
      'The embedding table has one row per token, not per place: the same token gets the same row wherever it is.',
      'Right. The sum of the token row and the position row is what the model starts from.',
      'Order matters a great deal, which is why the model is given each token’s position.',
    ],
  },
  {
    id: 'vector-why',
    chapter: '02-tokens-become-vectors',
    question: 'Why does the model turn token ids into vectors at all?',
    options: [
      'An id is just a label; the model needs numbers it can multiply and add, and learned vectors can place related tokens alike',
      'To make the prompt shorter',
      'Because ids change from one prompt to the next',
    ],
    correct: 0,
    why: [
      'Right. Id 455 is no closer to id 456 in meaning; the learned rows carry what training found about each token.',
      'One token becomes one vector: the prompt is the same length, each token just carries more numbers.',
      'A token’s id is fixed by the vocabulary. The same text always gives the same ids.',
    ],
  },

  // 3. Attention
  {
    id: 'causal-mask',
    chapter: '03-attention',
    question: 'In the prompt “Your parcel ships on Monday”, how much weight can “parcel” give to “Monday”?',
    options: [
      'None: “Monday” comes later, and the causal mask makes that weight 0',
      'A lot: they are the two most related words',
      'Some, but only in the last layer',
    ],
    correct: 0,
    why: [
      'Right. A token weighs only itself and the tokens before it, in every head of every layer.',
      'They may be related, but the mask comes first: a token never sees what comes after it.',
      'The mask holds in every layer, not just some.',
    ],
  },
  {
    id: 'weights-sum',
    chapter: '03-attention',
    question:
      'In one row of an attention heatmap, the token puts 0.7 on one earlier token. What does that leave for every other token in the row?',
    options: [
      '0.3, shared among them: a row’s weights add up to 1',
      'Each can still have up to 1: weights are separate scores',
      'Nothing: a token can only look at one token',
    ],
    correct: 0,
    why: [
      'Right. The scores go through a softmax, so a row is a split of one whole. More on one token means less on the rest.',
      'The scores are turned into a split that adds up to 1, so they aren’t independent.',
      'A token mixes many tokens. Most weight can sit on one, but the rest is spread over the others.',
    ],
  },
  {
    id: 'attention-mixes',
    chapter: '03-attention',
    question: 'After attention, what has a token’s vector got that it didn’t have before?',
    options: [
      'A mix of the earlier tokens’ vectors, more from the ones it weighed heavily',
      'The next token’s vector',
      'Nothing new: attention only measures, it doesn’t change vectors',
    ],
    correct: 0,
    why: [
      'Right. The weights decide how much of each earlier token comes in, so the token now carries its context.',
      'Nothing after a token can reach it: the causal mask keeps the next token out.',
      'The weights are used: they mix the values into the token’s vector. That is how context gets in.',
    ],
  },

  // 4. Heads and layers
  {
    id: 'heads-learn',
    chapter: '04-heads-and-layers',
    question: 'An engineer finds a head in a model that tracks quotation marks. Who decided it should?',
    options: [
      'Nobody: training shaped it because tracking quotes helped predict the next token',
      'The model’s designers, who gave each head a job',
      'The prompt, which tells each head what to look for',
    ],
    correct: 0,
    why: [
      'Right. Like the word-start head in Larkspur mini, a head’s pattern is learned, not assigned.',
      'Designers set how many heads there are, not what each looks for.',
      'The prompt changes the weights in a run, but the head’s habit comes from its learned weights.',
    ],
  },
  {
    id: 'many-heads',
    chapter: '04-heads-and-layers',
    question: 'Why give each layer several heads instead of one?',
    options: [
      'So each can look for a different thing at the same time, such as where a word began and what was asked',
      'So the model can read longer prompts',
      'So that if one head fails, another gives the same answer',
    ],
    correct: 0,
    why: [
      'Right. One head has one pattern of weights per token; several heads let one layer gather several kinds of context.',
      'The window’s length is set by the position table, not the number of heads.',
      'Heads aren’t copies: you saw them look at different tokens on the same prompt.',
    ],
  },
  {
    id: 'residual-stream',
    chapter: '04-heads-and-layers',
    question: 'What happens to a token’s vector as it passes through each layer?',
    options: [
      'Each layer adds what it found to the running vector, so earlier findings stay in it',
      'Each layer replaces it with a new vector',
      'It stays the same; only the attention weights change',
    ],
    correct: 0,
    why: [
      'Right. That running vector is the residual stream: embedding plus position, then each layer’s additions.',
      'Layers add rather than replace, which is why a later layer can still use the embedding and the earlier layers’ findings.',
      'The vector changes in every layer; the weights are how a layer decides what to add.',
    ],
  },

  // 5. Choosing the next token
  {
    id: 'temperature-zero',
    chapter: '05-choosing-the-next-token',
    question: 'Larkspur’s returns bot must answer the same question the same way every time. Which setting does that?',
    options: [
      'Temperature 0: it always picks the likeliest token, so the same prompt gives the same reply',
      'Temperature 2: the model thinks harder about each token',
      'Top-p 1: it keeps every token, so nothing is left out',
    ],
    correct: 0,
    why: [
      'Right. At 0 there is no draw at all: the likeliest token wins every time.',
      'A high temperature adds no thinking; it flattens the probabilities, so replies vary more.',
      'Top-p 1 keeps the whole vocabulary in the draw, so unlikely tokens can still be picked.',
    ],
  },
  {
    id: 'top-p-tail',
    chapter: '05-choosing-the-next-token',
    question:
      'A marketing writer likes varied wording but keeps getting odd, off-topic words. What does lowering top-p change?',
    options: [
      'It drops the long tail of unlikely tokens before the draw, so odd picks get rarer while the likely ones still vary',
      'It makes every reply identical',
      'It raises the probability of every token equally',
    ],
    correct: 0,
    why: [
      'Right. Top-p keeps the smallest set of likeliest tokens that adds up to p and draws only from those.',
      'Only top-p small enough to keep a single token does that; above it the draw still varies among the kept tokens.',
      'Top-p removes tokens; the kept ones are rescaled to add up to 1, so the dropped ones go to 0, not up.',
    ],
  },
  {
    id: 'seed-repeat',
    chapter: '05-choosing-the-next-token',
    question:
      'Two engineers sample from the same model, prompt, temperature and top-p, and get different replies. Which detail most likely differs?',
    options: [
      'The seed: the same seed gives the same draws, a new one gives new draws',
      'The model learned something between the two runs',
      'The vocabulary changed between runs',
    ],
    correct: 0,
    why: [
      'Right. Sampling is random draws; fix the seed and the settings and the reply repeats.',
      'Running a model doesn’t change its weights: it only learns in training.',
      'The vocabulary is fixed with the model; it doesn’t change from run to run.',
    ],
  },

  // 6. Why long prompts cost more
  {
    id: 'pairs-square',
    chapter: '06-why-long-prompts-cost-more',
    question: 'A support prompt grows from 1,000 to 3,000 tokens. Roughly how do the attention pairs per head change?',
    options: [
      'About nine times: pairs grow with the square of the length',
      'About three times, like the tokens',
      'They stay the same: each token is still scored once',
    ],
    correct: 0,
    why: [
      'Right. Every token scores every token before it, so three times the tokens is about three squared, nine times, the pairs.',
      'That is the KV cache, which grows by the same amount per token. The pairs grow faster.',
      'Each token is scored against every token before it, so a longer prompt means more scores per token, not the same.',
    ],
  },
  {
    id: 'kv-cache-saves',
    chapter: '06-why-long-prompts-cost-more',
    question: 'While a model writes a long reply, what does the KV cache save it from doing?',
    options: [
      'Recomputing the keys and values of every earlier token for each new token',
      'Scoring the new token against the earlier ones',
      'Storing anything: the cache keeps the prompt short',
    ],
    correct: 0,
    why: [
      'Right. Earlier tokens’ keys and values never change, so they are kept and each new token computes only its own.',
      'The scoring still happens for every new token; the cache only holds what it scores against.',
      'The cache itself grows with every token, which is part of why long prompts cost memory.',
    ],
  },
  {
    id: 'window-limit',
    chapter: '06-why-long-prompts-cost-more',
    question: 'Why can’t a model simply read a prompt of any length?',
    options: [
      'It was trained on a fixed window of positions, and the work grows with the square of the length',
      'Long prompts use words it doesn’t know',
      'The window is a billing rule with nothing behind it',
    ],
    correct: 0,
    why: [
      'Right. Larkspur mini has a position row for each place in its window and no more, and every extra token makes every later one score more pairs.',
      'Any text becomes tokens the model knows; length is the limit, not the words.',
      'Providers do price by tokens, but the window comes from how the model was built and trained.',
    ],
  },

  // 7. Trace a prompt
  {
    id: 'oldest-dropped',
    chapter: '07-trace-a-prompt',
    question:
      'An agent keeps adding tool results to its prompt until it no longer fits, and the oldest tokens are dropped. What does the model lose first?',
    options: [
      'The start: often the instructions and the original question',
      'The newest tool result',
      'Nothing: the model remembers what it read on earlier runs',
    ],
    correct: 0,
    why: [
      'Right. When the oldest tokens are dropped, whatever was at the start is gone for this run, instructions included.',
      'The newest tokens are kept; it is the oldest that go.',
      'Each run reads only its window. Nothing carries over from earlier runs unless it is in the prompt.',
    ],
  },
  {
    id: 'trace-order',
    chapter: '07-trace-a-prompt',
    question: 'In what order does one run of the model work through a prompt?',
    options: [
      'Tokens, then vectors (embedding plus position), then layers of attention heads, then next-token probabilities',
      'Attention first, to pick the important words, then tokens, then vectors',
      'Next-token probabilities first, then attention to explain them',
    ],
    correct: 0,
    why: [
      'Right. The text becomes tokens, each token a vector, the layers add to those vectors, and the last token’s vector becomes the scores.',
      'Attention works on vectors, so the tokens must be turned into vectors first.',
      'The probabilities come out of the last layer; nothing explains them afterwards.',
    ],
  },
  {
    id: 'one-run-one-trace',
    chapter: '07-trace-a-prompt',
    question:
      'You trace “Expedited delivery takes two business” and then the same prompt with one word changed. What changes in the trace?',
    options: [
      'The tokens, so the vectors, the attention weights and the next-token probabilities can all change',
      'Only the next token; attention is fixed per model',
      'Nothing: the model’s weights didn’t change',
    ],
    correct: 0,
    why: [
      'Right. The weights are fixed, but everything they compute depends on the tokens read.',
      'Attention weights are computed from the tokens on every run; you saw them change with the prompt.',
      'The learned weights stay the same, but they act on different tokens, so what they compute differs.',
    ],
  },
];
