// Inference's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 1. Prefill and decode
  {
    id: 'two-phases',
    chapter: '01-prefill-and-decode',
    pin: true,
    question:
      'A chatbot shows a spinner for two seconds, then the reply streams in smoothly. A teammate wants to make the stream faster to fix the spinner. What do you tell them?',
    options: [
      'The spinner is the prefill, reading the prompt; the stream is decode, one token per pass. Speeding one doesn’t fix the other',
      'Right idea: the spinner is the model planning the whole reply, so a faster stream ends it sooner',
      'The spinner is the network; the model starts streaming the moment the request arrives',
    ],
    correct: 0,
    why: [
      'Right. Time to first token is the queue plus the prefill, which grows with the prompt; the stream’s pace is the decode pass.',
      'The model doesn’t plan ahead: the first token comes right after one pass over the prompt.',
      'Before the first token the model has to read the whole prompt, and that pass takes longer the longer the prompt.',
    ],
  },
  {
    id: 'prefill-parallel',
    chapter: '01-prefill-and-decode',
    question: 'Why can a model read a 500-token prompt in about the time it takes to write a handful of tokens?',
    options: [
      'It reads only the last few tokens of the prompt',
      'It reads all prompt tokens in one pass, sharing one read of the weights; each written token needs a pass of its own',
      'Prompts are compressed before the model sees them',
    ],
    correct: 1,
    why: [
      'It reads every token of the prompt, up to its window. They just go through together.',
      'Right. Prefill is mostly computing, done in parallel; decode reads all the weights for one token.',
      'The prompt arrives as tokens; nothing shrinks it on the way in.',
    ],
  },
  {
    id: 'long-reply',
    chapter: '01-prefill-and-decode',
    question: 'A support reply grows from 50 tokens to 500. What happens to the wait for the whole reply?',
    options: [
      'About ten times longer: each token is its own decode pass',
      'About the same: the reply is written in one pass',
      'Only the first token is slower',
    ],
    correct: 0,
    why: [
      'Right. Ten times the tokens, about ten times the decode passes.',
      'Only the prompt is read in one pass. A reply is written token by token.',
      'The first token waits for the prompt, which didn’t change. The extra tokens each add a pass.',
    ],
  },
  // 2. The KV cache at scale
  {
    id: 'kv-grows',
    chapter: '02-kv-cache-at-scale',
    question:
      'A server holds the KV cache for 10 conversations of 1,000 tokens each. How much cache does one conversation of 10,000 tokens need?',
    options: [
      'About the same as the ten together: the cache grows in step with the tokens',
      'A hundred times one conversation: it grows with the square',
      'The same as one short conversation: the cache is per model',
    ],
    correct: 0,
    why: [
      'Right. A key and a value per token per layer: ten times the tokens, ten times the cache.',
      'Attention’s work grows with the square; the cache grows with the tokens.',
      'Each conversation keeps its own cache, sized by its own tokens.',
    ],
  },
  {
    id: 'memory-caps',
    chapter: '02-kv-cache-at-scale',
    question: 'A server’s compute sits half idle, yet new requests wait. What is the likely limit?',
    options: [
      'The model is too small',
      'Memory: the KV room is full of the caches of requests in flight',
      'The prompts are too short',
    ],
    correct: 1,
    why: [
      'A bigger model would need more memory, not less.',
      'Right. Each request in flight holds its cache; when the room is full, newcomers queue even with compute to spare.',
      'Short prompts need less cache, which lets more in.',
    ],
  },
  {
    id: 'paged',
    chapter: '02-kv-cache-at-scale',
    question: 'What does storing the KV cache in small pages, as PagedAttention does, buy a server?',
    options: [
      'Smaller caches per token',
      'Less memory reserved for replies that never use it, so more requests fit',
      'Faster prefill',
    ],
    correct: 1,
    why: [
      'Each token’s keys and values are the same size; pages change how the memory is handed out.',
      'Right. Memory is given out as the reply grows, instead of reserved up front for the longest reply.',
      'Paging is about where the cache lives, not how fast the prompt is read.',
    ],
  },
  // 3. Batching
  {
    id: 'batch-why',
    chapter: '03-batching',
    question: 'Why does running eight requests in one pass cost little more than running one?',
    options: [
      'A decode pass mostly reads the weights, and the eight share that one read',
      'The eight requests share one reply',
      'The model skips layers when it is busy',
    ],
    correct: 0,
    why: [
      'Right. Reading the weights dominates a decode pass; batching shares it.',
      'Each request keeps its own tokens and cache; only the pass is shared.',
      'Every request goes through every layer, batch or not.',
    ],
  },
  {
    id: 'static-wait',
    chapter: '03-batching',
    question:
      'With static batching, a short request arrives just after a batch with one very long reply has started. When does it start?',
    options: [
      'At the next pass',
      'Only when the whole batch ends, with its longest reply',
      'Immediately, in a new batch beside the first',
    ],
    correct: 1,
    why: [
      'Joining at the next pass is continuous batching.',
      'Right. A static batch keeps its seats until its last reply is done.',
      'The server runs one batch at a time; the newcomer waits for it.',
    ],
  },
  {
    id: 'continuous',
    chapter: '03-batching',
    question: 'What does continuous batching change?',
    options: [
      'Requests join and leave the batch after every pass, so no seat sits idle while others wait',
      'The model writes several tokens per pass',
      'Every request gets its own copy of the model',
    ],
    correct: 0,
    why: [
      'Right. Scheduling per pass (Orca’s iteration-level scheduling) keeps the batch full.',
      'Each request still gets one token per pass; that would be speculative decoding.',
      'One copy of the weights serves the whole batch; that is the point of batching.',
    ],
  },
  // 4. Smaller numbers
  {
    id: 'quant-memory',
    chapter: '04-smaller-numbers',
    question: 'A 7-billion-parameter model is stored in 16 bits. Roughly how much weight memory does int4 need?',
    options: [
      'About a quarter: 4 bits instead of 16 per weight',
      'About half',
      'The same: the model still has 7 billion weights',
    ],
    correct: 0,
    why: [
      'Right. Memory is parameters × bits ÷ 8, plus a little for the scales.',
      'Half is 8 bits.',
      'The count stays, but each weight takes a quarter of the bits.',
    ],
  },
  {
    id: 'quant-measure',
    chapter: '04-smaller-numbers',
    question: 'How do you know what quantizing a model cost you?',
    options: [
      'You can’t: rounding is invisible',
      'Measure it: score held-out text, compare top choices, run your evals on the rounded model',
      'Take the memory saved as the quality lost',
    ],
    correct: 1,
    why: [
      'It shows in the numbers: loss rose and top-5 picks changed at 4 bits.',
      'Right. The saving is arithmetic; the cost has to be measured.',
      'Halving the memory didn’t halve the quality: at 8 bits it barely moved.',
    ],
  },
  {
    id: 'quant-room',
    chapter: '04-smaller-numbers',
    question:
      'A server quantizes its weights from 16 to 8 bits. Besides fitting a cheaper card, what can it do with the memory saved?',
    options: [
      'Nothing: the cache doesn’t use the same memory',
      'Hold more requests’ KV caches at once',
      'Use longer words',
    ],
    correct: 1,
    why: [
      'Weights and caches share the card’s memory; less for one is more for the other.',
      'Right. The memory freed becomes KV room, so more requests fit in flight.',
      'Words are tokens either way; bits change how weights are stored.',
    ],
  },
  // 5. Guess ahead
  {
    id: 'spec-same',
    chapter: '05-guess-ahead',
    question: 'Does speculative decoding with greedy picks change what the big model replies?',
    options: [
      'No: every kept token is one the big model checked and would have picked itself',
      'Slightly: the draft model’s style leaks in',
      'Yes, when the draft is wrong',
    ],
    correct: 0,
    why: [
      'Right. The target checks each guess; at the first disagreement it uses its own token.',
      'Only tokens the target agrees with are kept, so nothing of the draft’s own leaks in.',
      'A wrong guess is thrown away and replaced in the same pass.',
    ],
  },
  {
    id: 'spec-gain',
    chapter: '05-guess-ahead',
    question: 'Where does speculative decoding’s speed-up come from?',
    options: [
      'Fewer passes of the big model: one pass checks several guessed tokens',
      'The big model reads fewer weights per pass',
      'The draft model writes the final reply',
    ],
    correct: 0,
    why: [
      'Right. Checking k guesses costs about one pass, like a short prefill.',
      'Each check reads every weight once, as a decode pass does.',
      'The draft only proposes; the target decides every token.',
    ],
  },
  {
    id: 'spec-k',
    chapter: '05-guess-ahead',
    question: 'Why not let the draft model guess 20 tokens at a time?',
    options: [
      'Later guesses are rarely right, so most are thrown away, and drafting them is work too',
      'The reply would change',
      'The big model can only check one token per pass',
    ],
    correct: 0,
    why: [
      'Right. One wrong guess discards every guess after it.',
      'The reply never changes; only the speed does.',
      'One pass scores every position at once; that is why checking is cheap.',
    ],
  },
  // 6. Pace or throughput
  {
    id: 'cap-trade',
    chapter: '06-pace-or-throughput',
    question: 'Raising the batch cap made the server write more tokens a second. What did each customer notice?',
    options: ['Shorter queues, but each reply’s tokens came more slowly', 'Everything faster', 'No change at all'],
    correct: 0,
    why: [
      'Right. Fuller passes take longer, so each request waits longer between tokens.',
      'Throughput rose, but per-request pace fell: each token waits for a fuller pass.',
      'The queue and the pace both changed, in opposite directions.',
    ],
  },
  {
    id: 'cap-one',
    chapter: '06-pace-or-throughput',
    question: 'A server runs one request at a time. What is good and what is bad about it?',
    options: [
      'Good: each token comes as fast as it can. Bad: everyone else waits in the queue',
      'Good: highest throughput. Bad: nothing',
      'Good: least memory. Bad: replies are less accurate',
    ],
    correct: 0,
    why: [
      'Right. Each pass carries one request, so it is quick, but each read of the weights serves only one customer.',
      'Throughput is lowest at a cap of one: each pass serves a single request.',
      'Batching never changes what the model writes, only when.',
    ],
  },
  {
    id: 'cap-choose',
    chapter: '06-pace-or-throughput',
    question: 'How should a team pick its batch cap?',
    options: [
      'As high as memory allows',
      'From its targets: the pace and first-token waits its product needs, then the most throughput within them',
      'Always 1, to be safe',
    ],
    correct: 1,
    why: [
      'Memory sets the most that fit; the pace target may set a lower cap.',
      'Right. The cap is a trade-off; the targets decide where to sit on it.',
      'One at a time wastes the server and queues everyone.',
    ],
  },
  // 7. Serve Larkspur's Monday
  {
    id: 'bench-together',
    chapter: '07-serve-larkspur',
    question: 'A team tunes the batch cap and sees no change at all. What might be holding it back?',
    options: [
      'Memory: the KV room fills before the cap is reached, so requests queue anyway',
      'The model is too accurate',
      'Batching only works at night',
    ],
    correct: 0,
    why: [
      'Right. The settings interact: a cap only matters if the memory lets that many in.',
      'Accuracy doesn’t limit how many requests run at once.',
      'Traffic changes when the cap matters, but a full KV room blocks it at any hour.',
    ],
  },
  {
    id: 'bench-targets',
    chapter: '07-serve-larkspur',
    question: 'Why did the support lead set two targets, one for the first token and one per token?',
    options: [
      'Because a reply that starts fast and then crawls, or starts late and then flies, both feel broken',
      'Because providers require two',
      'Because one target is always met anyway',
    ],
    correct: 0,
    why: [
      'Right. The two numbers have different causes, so each needs its own target.',
      'They are the team’s choice, from what customers need.',
      'Either one can be missed: the bench showed late starts and slow paces.',
    ],
  },
  {
    id: 'bench-ties',
    chapter: '07-serve-larkspur',
    question: 'Two serving settings put the same number of requests on target. How do you choose?',
    options: [
      'Either works by the targets; choose on what else matters, such as memory cost',
      'Pick the one with the bigger cap, always',
      'Neither: a tie means the targets are wrong',
    ],
    correct: 0,
    why: [
      'Right. Equal on the targets, so other costs, like a bigger card for more KV room, decide.',
      'A bigger cap can slow each reply; on a tie it isn’t automatically better.',
      'Ties are normal when settings trade off: more than one setting can meet the same targets.',
    ],
  },
];
