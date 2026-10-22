// Inference engineering, module 13: its chapters and module facts. Chapter ids are a contract with readers' saved
// progress: never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-prefill-and-decode',
    title: 'Prefill and decode',
    short: 'Prefill and decode',
    intro: {
      story:
        'Larkspur’s assistant is live, and Monday mornings are slow: customers wait before the first word appears, then watch the reply trickle out. The team runs its own model server, so the waiting is theirs to fix. First, what does one request cost?',
      goal: 'Why does the first token of a reply take a different time from every token after it?',
      learn: [
        'Prefill: the model reads the whole prompt in one pass',
        'Decode: the model writes the reply one token per pass',
        'Why time to first token grows with the prompt, while time per token barely does',
      ],
      terms: [
        ['Forward pass', 'One run of the model over its input, ending in a score for every possible next token.'],
        [
          'Prefill',
          'The first pass of a request: the model reads every prompt token at once and picks the first reply token.',
        ],
        ['Decode', 'Every pass after that: the model adds one token to the reply.'],
        ['Time to first token', 'How long a customer waits before the reply starts: the queue plus the prefill.'],
        ['Time per token', 'How long each later token of the reply takes: one decode pass.'],
      ],
    },
  },
  {
    id: '02-kv-cache-at-scale',
    title: 'The KV cache at scale',
    short: 'KV cache at scale',
    intro: {
      story:
        'Decoding is fast because the model keeps every token’s keys and values instead of recomputing them. Larkspur mini’s cache is tiny. The team’s server runs a real open model, and serves many customers at once.',
      goal: 'How much memory does the KV cache take on a real server, and what does that limit?',
      learn: [
        'The KV cache, from the Transformers module, in one step',
        'Its size for a real open model, from its published shape',
        'Why memory, not compute, caps how many requests a server can hold at once',
      ],
      terms: [
        [
          'KV cache',
          'The keys and values the model keeps for every token it has read, so each new token computes only its own.',
        ],
        ['KV room', 'The memory left for the KV cache once the model’s weights are loaded.'],
        ['In flight', 'Requests the server is working on right now, each holding its own cache.'],
      ],
    },
  },
  {
    id: '03-batching',
    title: 'Batching',
    short: 'Batching',
    intro: {
      story:
        'The server can work on several requests in one pass, a batch, because every decode pass reads all the weights anyway. Larkspur’s first server batched the simple way. Monday’s traffic shows the cost.',
      goal: 'How should a server group requests so none of them waits for the others?',
      learn: [
        'Why batching makes a server serve more for nearly the same cost per pass',
        'Static batching: a batch starts together and runs until its longest reply ends',
        'Continuous batching: requests join and leave at every pass',
      ],
      terms: [
        ['Batch', 'The requests a server runs in the same pass.'],
        [
          'Static batching',
          'Requests are grouped when the server is free, and the group runs until every reply in it is done.',
        ],
        [
          'Continuous batching',
          'Also called iteration-level scheduling: after every pass, finished requests leave and waiting ones join.',
        ],
        ['Throughput', 'Reply tokens the server writes per second, across every request.'],
      ],
    },
  },
  {
    id: '04-smaller-numbers',
    title: 'Smaller numbers',
    short: 'Smaller numbers',
    intro: {
      story:
        'The server’s memory is mostly weights. Every weight is stored as a 16-bit number. Someone asks whether 8 bits, or even 4, would do.',
      goal: 'What does storing the weights in fewer bits save, and what does it cost?',
      learn: [
        'Quantization: rounding each weight to one of a few levels',
        'How much memory 8 and 4 bits save, counted from the model’s shape',
        'How to check what it costs: held-out text and the top 5 next tokens',
      ],
      terms: [
        ['Quantization', 'Storing numbers with fewer bits by rounding each to the nearest of a fixed set of levels.'],
        ['int8, int4', 'Whole numbers stored in 8 or 4 bits: 255 or 15 levels, scaled to each row of weights.'],
        ['Held-out text', 'Text kept out of training, used only to score the model.'],
        ['Loss', 'How surprised the model is by the next piece of text, on average: lower is better.'],
      ],
    },
  },
  {
    id: '05-guess-ahead',
    title: 'Guess ahead',
    short: 'Guess ahead',
    intro: {
      story:
        'Each decode pass writes one token and reads every weight to do it. Larkspur has a much smaller model, a student trained to copy Larkspur mini. What if the student guessed the next few tokens, and the big model only checked them?',
      goal: 'How can a small model make a big one faster without changing a word of its reply?',
      learn: [
        'Speculative decoding: a draft model guesses, the target model checks every guess in one pass',
        'Why the reply is exactly what the target would have written alone',
        'Acceptance rate and tokens per check, and why longer guesses stop paying',
      ],
      terms: [
        ['Draft model', 'A small, fast model that guesses the next few tokens.'],
        ['Target model', 'The model whose reply you want; it checks the draft.'],
        [
          'Speculative decoding',
          'Drafting k tokens with a small model and checking them with the target in one pass, keeping the ones it agrees with.',
        ],
        ['Acceptance rate', 'The share of drafted tokens the target agrees with.'],
      ],
    },
  },
  {
    id: '06-pace-or-throughput',
    title: 'Pace or throughput',
    short: 'Pace or throughput',
    intro: {
      story:
        'Continuous batching helped. Now the team argues about one number: the batch cap, the most requests the server runs at once. Sales wants more customers served; support wants replies that don’t crawl.',
      goal: 'What does a bigger batch buy, and what does each customer pay for it?',
      learn: [
        'How the batch cap raises throughput and cuts the queue',
        'Why every request in a bigger batch gets its tokens more slowly',
        'Why there is no free setting, only a trade-off to choose',
      ],
      terms: [
        ['Batch cap', 'The most requests the server runs in one pass. Others wait in the queue.'],
        ['Queue', 'Requests that have arrived but haven’t been let into the batch yet.'],
      ],
    },
  },
  {
    id: '07-serve-larkspur',
    title: 'Serve Larkspur’s Monday',
    short: 'Serve Monday',
    intro: {
      story:
        'Everything is on the bench: the batching mode, the batch cap and how much memory to keep for the KV cache. The support lead has set two targets for every customer.',
      goal: 'Which serving settings get the most of Monday’s customers their reply on target?',
      learn: [
        'How the settings pull against each other on a real burst of traffic',
        'How to read a server run request by request',
        'Why more than one setting can be equally good',
      ],
      terms: [
        [
          'Service target',
          'A limit the team sets for every request: here, the first token within a second, then each token within a set time.',
        ],
      ],
    },
  },
];

export const INFERENCE_MODULE: Module = {
  id: 'inference',
  title: 'Inference engineering',
  description:
    'What happens between the prompt and the reply on a server: batching, the KV cache, quantization and speculative decoding.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: ['transformers'],
  story:
    'Back at Larkspur Supply Co., the team now serves its own model, and has to keep Monday morning’s customers from waiting.',
  chapters: CHAPTERS,
  recall: RECALL,
};
