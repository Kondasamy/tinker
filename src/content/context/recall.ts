// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three to five items per chapter, each asking
// the chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 1. What's in the window
  {
    id: 'one-budget', chapter: '01-whats-in-the-window', pin: true,   // the module's single most important idea: exactly one pin
    question: 'A team’s assistant has a window of 100,000 tokens. Their documents come to 90,000 tokens, so they plan to send all of them every turn. What have they forgotten?',
    options: [
      'Nothing: the documents fit, so the model will read them all',
      'The system prompt, the tool definitions, the conversation and the reply share the same window, so the room left may not be enough',
      'Only the reply: it is the one other thing that counts',
      'Tool definitions are free, so they only need to fit the rest',
    ],
    correct: 1,
    why: [
      'Fitting the documents is not the same as fitting the turn. Everything else in the turn takes its share first.',
      'Right. Every part of the turn counts against one budget, the reply included. In chapter 1 the order tools alone took more than the system prompt, the document and the question together.',
      'The reply counts, but so do the instructions, the tools and the history. They are all in the window too.',
      'Tool definitions are sent with every turn, as text the model reads. In chapter 1 they were the biggest part.',
    ],
  },
  {
    id: 'tools-cost', chapter: '01-whats-in-the-window',
    question: 'A product manager wants to give the assistant 40 tools “just in case”. What happens to every turn, even one that uses none of them?',
    options: [
      'Nothing: a tool costs only when the model calls it',
      'Every turn carries all 40 definitions, so each turn is bigger and costs more',
      'The model picks which definitions to read, so only the useful ones count',
    ],
    correct: 1,
    why: [
      'The definitions are text the model reads so it knows the tools exist. They are sent whether or not a tool is called.',
      'Right. The host sends every offered tool’s name, description and schema each turn. Offer the tools a task needs.',
      'The model cannot skip what is in its window: everything sent is read and counted.',
    ],
  },
  {
    id: 'history-grows', chapter: '01-whats-in-the-window',
    question: 'A customer has asked five questions in one chat. What does the model read when the sixth arrives?',
    options: [
      'Only the sixth question: the model remembers the earlier ones itself',
      'The instructions, the tools, all five earlier questions and answers with their documents, and the sixth question',
      'A summary the model wrote for itself after each answer',
    ],
    correct: 1,
    why: [
      'A model keeps nothing between calls. What it “remembers” is the history the host sends again.',
      'Right. The host re-sends the conversation every turn, so the window grows with each question.',
      'Nothing summarises the history unless the host does it; by default the full history is sent again.',
    ],
  },
  // 2. More isn't better
  {
    id: 'middle-is-worst', chapter: '02-more-isnt-better',
    question: 'A legal team sends a contract to the assistant with twenty other contracts around it. The clause they ask about sits in the tenth. What is the risk?',
    options: [
      'None: the clause is in the window, so the model reads it',
      'The model is more likely to miss a fact in the middle of a long input, and a similar clause from another contract can take its place',
      'The model reads from the end, so only the last contract counts',
    ],
    correct: 1,
    why: [
      'Being in the window is not the same as being found. Models find facts best at the start or end, and miss them more often in the middle.',
      'Right. In the middle, among related passages, the fact is easiest to miss, and a distractor fills the gap.',
      'Facts at the end are found well, but so are facts at the start. The weak spot is the middle.',
    ],
  },
  {
    id: 'related-hurts', chapter: '02-more-isnt-better',
    question: 'Which extra passages are most likely to pull an answer off: unrelated ones, or ones about the same topic that don’t hold the answer?',
    options: [
      'Unrelated ones: they are noise',
      'Related ones: they look like the answer, so the model can take one by mistake',
      'Neither: extra passages never change the answer',
    ],
    correct: 1,
    why: [
      'Unrelated text is easy to ignore. The trouble starts when a passage looks like it answers the question.',
      'Right. A distractor is dangerous because it is close: in chapter 2 the five-day limit for reporting shipping damage was given as the refund window.',
      'In chapter 2 the same fact with more distractors around it gave a wrong answer.',
    ],
  },
  {
    id: 'rot', chapter: '02-more-isnt-better',
    question: 'A newer model has a window ten times larger. A colleague says “now we can send everything and stop choosing”. What do you say?',
    options: [
      'Agreed: a bigger window means the model reads more just as well',
      'The window fits more, but answers still get worse as it fills, so choosing what goes in still matters',
      'Agreed, as long as the most important document goes last',
    ],
    correct: 1,
    why: [
      'Room is not attention. As the token count grows, accuracy and recall fall: context rot.',
      'Right. A bigger window raises the ceiling, not the quality. A small, focused window still answers best.',
      'Placement helps, but with many distractors even a fact at the end slipped in chapter 2.',
    ],
  },
  // 3. Fetch it when you need it
  {
    id: 'just-in-time', chapter: '03-fetch-when-needed',
    question: 'An HR assistant has 300 policy pages. What is the better default?',
    options: [
      'Send all 300 pages every turn, so nothing is ever missing',
      'Give the model a search tool and let it fetch the pages a question needs',
      'Send the 300 pages once at the start of the day and never again',
    ],
    correct: 1,
    why: [
      'Every page would be in every window, paid for every turn, and the right one buried among the rest.',
      'Right. The window stays small, the fact stays in view, and only the pages a question needs are paid for.',
      'The model keeps nothing between calls: what was sent this morning is gone by the next call.',
    ],
  },
  {
    id: 'two-calls', chapter: '03-fetch-when-needed',
    question: 'With a search tool, a question now takes two model calls instead of one. Doesn’t that cost more?',
    options: [
      'Yes, always: two calls cost twice one call',
      'Not necessarily: two small windows can add up to fewer tokens than one stuffed window',
      'No: the first call is free because it only asks for a search',
    ],
    correct: 1,
    why: [
      'Cost follows tokens, not calls. In chapter 3 both small calls together were smaller than one stuffed window.',
      'Right. Count the tokens of both calls; when the stuffed window is large, the two small ones win.',
      'The first call is a full model call with its own window; it is billed like any other.',
    ],
  },
  {
    id: 'smallest-set', chapter: '03-fetch-when-needed',
    question: 'Which window gives the model the best chance of a right answer?',
    options: [
      'The largest one that fits, so every fact is somewhere in it',
      'The smallest one that still holds what the question needs',
      'Any size: only the model’s quality matters',
    ],
    correct: 1,
    why: [
      'A large window buries the fact among distractors, as chapter 2 showed.',
      'Right. Find the smallest set of tokens that holds the answer; less to read, less to miss.',
      'The same model answered right or wrong depending on what was around the fact.',
    ],
  },
  // 4. Order for the cache
  {
    id: 'stable-first', chapter: '04-order-for-the-cache',
    question: 'An assistant’s turn starts with today’s date and time, then long instructions and a product catalogue. Its cache hits are near zero. Why?',
    options: [
      'Caching only works for short prompts',
      'The time changes every call and sits first, so no call shares a prefix with the last one',
      'The catalogue is too big to cache',
    ],
    correct: 1,
    why: [
      'Long, stable prompts are exactly what caching is for.',
      'Right. A hit needs the start to match exactly. Move the time to the end and the instructions and catalogue are read from the cache.',
      'Size is not the problem; what changes before it is.',
    ],
  },
  {
    id: 'cache-cost', chapter: '04-order-for-the-cache',
    question: 'On a cache hit, what happens to the cached tokens?',
    options: [
      'They are skipped: the model doesn’t read them',
      'The model still reads them, but they are billed at a small fraction of the normal input price',
      'They are free, and so is the reply',
    ],
    correct: 1,
    why: [
      'The model still reads every token in the window; caching saves the work of processing them again, not the reading.',
      'Right. Cached tokens count in the window as before; they cost a fraction of the price. Writing them to the cache costs a little extra once.',
      'Cache reads are cheap, not free, and the reply is billed as usual.',
    ],
  },
  {
    id: 'one-change', chapter: '04-order-for-the-cache',
    question: 'A developer edits one tool’s description between two calls. What happens to the cache?',
    options: [
      'Only that tool’s tokens are sent fresh',
      'Everything after the change is sent fresh, and since tools come first, that is the whole prompt',
      'Nothing: descriptions are not part of the prefix',
    ],
    correct: 1,
    why: [
      'A hit stops at the first difference; everything after it misses too.',
      'Right. A change invalidates its own part and every part after it. Keep stable parts stable.',
      'Tool definitions are sent as text at the very start, so they are the front of the prefix.',
    ],
  },
];
