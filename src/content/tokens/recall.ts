// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three to five items per chapter, each asking
// the chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 1. What the model reads
  {
    id: 'model-reads-tokens', chapter: '01-what-the-model-reads', pin: true,   // the module's single most important idea: exactly one pin
    question: 'A support lead asks why the assistant’s limits are given in “tokens” rather than words. What is a token?',
    options: [
      'Another name for a word',
      'A piece of text the tokenizer cut out, a whole word or part of one, given a number; the model reads only those numbers',
      'A single letter',
      'A unit of payment, like a credit, with no link to the text',
    ],
    correct: 1,
    why: [
      'Some words are one token, but many are cut into pieces, and spaces and punctuation are tokens too. A count in words is only a guess.',
      'Right. The tokenizer cuts text into pieces from its vocabulary and gives each an id. The model reads the ids, and limits and bills are counted in them.',
      'Most tokens hold several letters. Only rare text falls back to single characters or bytes.',
      'Bills are counted in tokens, but a token is a piece of the text itself: more text, more tokens.',
    ],
  },
  {
    id: 'same-length-different-count', chapter: '01-what-the-model-reads',
    question: 'Two customer messages have the same number of words. One is plain English; the other is full of part numbers like “KX-4471B”. Which takes more tokens?',
    options: [
      'They take the same: same words, same tokens',
      'The plain English one, because its words are longer',
      'The one with part numbers: codes and numbers are rare text, so they are cut into more pieces',
      'Neither: numbers are not counted as tokens',
    ],
    correct: 2,
    why: [
      'Words and tokens only line up for common words. A part number is one “word” but several tokens.',
      'Common English words, even long ones, are often a single token. Rare strings are what get cut up.',
      'Right. The tokenizer keeps common words whole and cuts rare text, codes and numbers into smaller pieces.',
      'Every character the model reads is in some token, numbers included.',
    ],
  },
  {
    id: 'what-the-model-gets', chapter: '01-what-the-model-reads',
    question: 'An engineer says: “The model reads the customer’s email just like we do, letter by letter.” What does the model really receive?',
    options: [
      'The email’s letters, one at a time',
      'A list of token ids, numbers the tokenizer made from the text',
      'A picture of the email',
      'A summary of the email made by the tokenizer',
    ],
    correct: 1,
    why: [
      'The model never sees letters. The tokenizer turns the text into ids before the model gets anything.',
      'Right. Text in, ids out: the ids are all the model reads.',
      'Text models read token ids, not images of the text.',
      'A tokenizer doesn’t summarise or drop anything: it cuts all of the text into tokens, and the text can be rebuilt from them exactly.',
    ],
  },
  // 2. How the vocabulary is learned
  {
    id: 'merges-from-training', chapter: '02-how-the-vocabulary-is-learned',
    question: 'A tokenizer was trained mostly on English web pages. Larkspur sends it a German supplier contract. Why might the contract take more tokens than an English one of the same length?',
    options: [
      'German is a harder language for computers',
      'The merges were learned from the training text, so common German pieces were seldom glued together and the text stays in smaller pieces',
      'The tokenizer translates German into English first',
      'It won’t: every language takes the same number of tokens',
    ],
    correct: 1,
    why: [
      'Nothing about the language is harder; what matters is what the tokenizer saw while it learned its merges.',
      'Right. A merge is learned only for pairs that were common in the training text. Text unlike it is cut finer.',
      'A tokenizer only cuts text into pieces; it never translates.',
      'Merges follow the training text, so text unlike it gets fewer whole pieces and more tokens.',
    ],
  },
  {
    id: 'no-unknown-text', chapter: '02-how-the-vocabulary-is-learned',
    question: 'A customer’s email contains an emoji the tokenizer has never seen. What does a byte-level tokenizer do with it?',
    options: [
      'It drops the emoji, because it isn’t in the vocabulary',
      'It cuts the emoji into its bytes, each a token, so nothing is lost',
      'It stops and returns an error',
      'It replaces the emoji with a question mark',
    ],
    correct: 1,
    why: [
      'Nothing is dropped: every byte is already in the vocabulary, so every text can be cut.',
      'Right. The first 256 tokens are single bytes. Text no merge covers stays as bytes: more tokens, but never unreadable.',
      'A byte-level tokenizer can cut any text, so there is nothing for it to fail on.',
      'The bytes are kept exactly, so the text decodes back to the same emoji.',
    ],
  },
  {
    id: 'merge-order', chapter: '02-how-the-vocabulary-is-learned',
    question: 'In a short note, the pair “e” + “d” appears ten times and “t” + “h” appears twice. Which does the tokenizer merge first?',
    options: [
      '“e” + “d”, because it appears more often in this note',
      'Whichever came earlier in the list of merges learned during training, however often it appears here',
      '“t” + “h”, because the tokenizer always starts with the rarest pair',
      'Both at once, because every merge happens together',
    ],
    correct: 1,
    why: [
      'How often a pair appears in the text you send doesn’t matter. The order was fixed when the tokenizer was trained.',
      'Right. The tokenizer replays its merges in the order it learned them on its training text.',
      'Rarity in your text doesn’t decide it either. Only the learned order does.',
      'Merges run one after another, in order: a later merge can glue tokens an earlier one made.',
    ],
  },
  // 3. Tokens are the meter
  {
    id: 'bill-follows-tokenizer', chapter: '03-tokens-are-the-meter',
    question: 'Two providers charge the same price per million input tokens. Larkspur sends both the same product catalogue. Will the two bills be the same?',
    options: [
      'Yes: same price, same text, same bill',
      'Not necessarily: each counts tokens with its own tokenizer, and the counts can differ',
      'Yes, as long as the catalogue is in English',
      'No: the provider with the bigger model always charges more',
    ],
    correct: 1,
    why: [
      'The price per token is the same, but the number of tokens may not be: each tokenizer cuts the text its own way.',
      'Right. Same text, different meters. Count with the tokenizer you will be billed by.',
      'Even in English, two real tokenizers counted Larkspur’s documents differently.',
      'Model size isn’t on the bill here. The token count is, and it depends on the tokenizer.',
    ],
  },
  {
    id: 'rule-of-thumb', chapter: '03-tokens-are-the-meter',
    question: 'A product manager plans a budget with “1 token ≈ 4 characters”. When is that good enough?',
    options: [
      'Always: it is how tokenizers are built',
      'For a rough plan for English text; for a real bill or a tight limit, count with the actual tokenizer',
      'Never: it is wrong by a factor of ten',
      'Only for code',
    ],
    correct: 1,
    why: [
      'Tokenizers learn their pieces from data; the rule is just an average someone measured on English.',
      'Right. On Larkspur’s documents it was close but off, and in different directions for different tokenizers. Fine for planning, not for the bill.',
      'On Larkspur’s English documents the rule was within about a quarter of the real counts, not ten times off.',
      'Code usually tokenizes worse than plain English, so the rule fits it less well, not better.',
    ],
  },
  {
    id: 'in-sample', chapter: '03-tokens-are-the-meter',
    question: 'A team trains a small tokenizer on its own documents, then reports how few tokens those same documents take. What is wrong with quoting that number?',
    options: [
      'Nothing: it is the true count',
      'It is in-sample: counted on the text it learned from, so it says little about new text',
      'Tokenizers can’t be trained on your own documents',
      'The number is always too high',
    ],
    correct: 1,
    why: [
      'It is the true count for those documents, but it doesn’t carry over to text the tokenizer never saw.',
      'Right. A tokenizer fits the text it learned from. New text, like a customer email, may cut much worse.',
      'You can, as this site did. The catch is only in what the count shows.',
      'It can be high or low. This site’s small tokenizer counted more than the real ones even in-sample, because its vocabulary is tiny.',
    ],
  },
];
