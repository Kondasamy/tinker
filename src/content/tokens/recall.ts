// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three to five items per chapter, each asking
// the chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';
import { fact } from '../../lib/tokens/facts';

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
      'Right. On Larkspur’s documents it gave more tokens than both real tokenizers counted. Fine for planning, not for the bill.',
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
  // 4. Every tokenizer splits differently
  {
    id: 'language-token-tax', chapter: '04-every-tokenizer-splits-differently',
    question: 'Larkspur’s assistant answers customers in English and in Hindi. The Hindi replies cost far more per message, though they say the same thing. Why?',
    options: [
      'Hindi messages are always longer in meaning',
      'The tokenizer learned fewer merges for Hindi, so the same message is cut into many more, smaller pieces',
      'The provider charges a higher price per token for Hindi',
      'The model translates Hindi into English first and bills for both',
    ],
    correct: 1,
    why: [
      'The messages mean the same. The difference is in how the tokenizer cuts them.',
      'Right. A tokenizer trained mostly on English keeps few Hindi pieces whole, and some characters fall back to bytes. That extra cost is a token tax.',
      'The price per token is the same; the number of tokens is what grows.',
      'The model reads the tokens of the Hindi text as it is. Nothing is translated on the way in.',
    ],
  },
  {
    id: 'leading-space', chapter: '04-every-tokenizer-splits-differently',
    question: 'A developer notices that “shelf” at the start of a prompt and “ shelf” after a space come out as different tokens. Is the tokenizer broken?',
    options: [
      'Yes: the same word should always be the same token',
      'No: most words follow a space, so tokenizers learn the word with its space glued on, and the bare word is a different, rarer piece',
      'Yes: spaces should be removed before tokenizing',
      'No: the tokenizer picks between them at random',
    ],
    correct: 1,
    why: [
      'Tokens are pieces of text, spaces included, not dictionary words.',
      'Right. A leading space, a capital or a doubled space all change which tokens a word becomes.',
      'Spaces carry meaning the model needs, such as where words begin. Tokenizers keep them.',
      'Tokenizing is fixed: the same text always gives the same tokens.',
    ],
  },
  {
    id: 'numbers-split', chapter: '04-every-tokenizer-splits-differently',
    question: 'An analyst sees a five-digit order number cut into a three-digit piece and a two-digit piece. What does that tell them?',
    options: [
      'The model reads the number digit by digit, like a calculator',
      'Numbers are cut wherever the vocabulary has pieces, not at meaningful places, and each tokenizer cuts them differently',
      'The tokenizer rounded the number',
      'Order numbers are stored outside the prompt',
    ],
    correct: 1,
    why: [
      'Some tokenizers cut digit by digit, but many group digits by what was common in training. Neither is how a calculator works.',
      'Right. The pieces come from the learned vocabulary, which is one reason models can slip on arithmetic.',
      'Nothing is lost: the pieces rebuild the exact number.',
      'The number is in the prompt, as tokens like any other text.',
    ],
  },
  // 5. From token to vector
  {
    id: 'embedding-is', chapter: '05-from-token-to-vector',
    question: 'A product manager asks what an “embedding” of a support article is. What do you say?',
    options: [
      'The article’s token ids, in order',
      'A list of numbers an embedding model made from the whole text, so that texts with similar meaning get similar numbers',
      'A short summary of the article',
      'The article’s keywords',
    ],
    correct: 1,
    why: [
      'Token ids are row numbers in a list and say nothing about meaning. An embedding is made by a model trained for meaning.',
      `Right. RAG’s model gives ${fact('minilm').value} numbers per text, and similar meanings point the same way.`,
      'An embedding is numbers, not words: no one can read it as a summary.',
      'Keywords are words from the text. An embedding captures meaning even when the words differ.',
    ],
  },
  {
    id: 'ids-not-meaning', chapter: '05-from-token-to-vector',
    question: 'Token 500 and token 501 sit next to each other in the vocabulary. What does that say about their meanings?',
    options: [
      'They mean nearly the same thing',
      'Nothing: an id is only a position in the tokenizer’s list',
      'They are opposites',
      'Token 501 was made by merging token 500 with something',
    ],
    correct: 1,
    why: [
      'Ids are given in the order merges were learned, not by meaning.',
      'Right. Ids carry no meaning. That is why search needs embeddings.',
      'Neighbouring ids have no link in meaning at all, opposite or otherwise.',
      'Merges can glue any two earlier tokens; the ids next to each other need not be related.',
    ],
  },
  {
    id: 'map-bends', chapter: '05-from-token-to-vector',
    question: 'On RAG’s 2D map of meaning, one dot looks closer to the question than another, but scores a lower similarity. Which do you trust?',
    options: [
      'The map: what you see is what search uses',
      'The similarity score: the map squeezes hundreds of numbers onto two, which bends distances',
      'Neither: both are random',
      'Whichever dot is bigger',
    ],
    correct: 1,
    why: [
      'Search compares the full vectors, not the flat picture.',
      'Right. Flattening keeps the rough shape but bends distances. The true similarity is the one search ranks by.',
      'Both come from the same vectors; the score is exact, the map is an approximation.',
      'Dot size marks what was retrieved, not how close it is.',
    ],
  },
  // 6. Meaning by neighbours
  {
    id: 'cosine-meaning', chapter: '06-meaning-by-neighbours',
    question: 'Two pieces: one shares five words with a customer’s question, the other shares two but answers it. Which will an embedding search rank higher?',
    options: [
      'The one sharing five words: more words in common, higher score',
      'Usually the one that answers it: cosine similarity compares meaning, not shared words',
      'They tie, because both share some words',
      'Neither: embedding search only finds exact phrases',
    ],
    correct: 1,
    why: [
      'Shared words like “a” or a product name say little about whether a piece answers the question.',
      'Right. In chapter 6 the piece that answered the question scored highest, though another piece shared more words.',
      'Scores come from the vectors, so a tie is rare and has nothing to do with word counts.',
      'Exact phrases are keyword search. Embeddings match meaning.',
    ],
  },
  {
    id: 'nearest-neighbours', chapter: '06-meaning-by-neighbours',
    question: 'What are a question’s “nearest neighbours” in RAG’s search?',
    options: [
      'The pieces next to each other in the same document',
      'The pieces whose embeddings have the highest cosine similarity with the question’s',
      'The most recently added pieces',
      'The pieces with the fewest tokens',
    ],
    correct: 1,
    why: [
      'Position in a document doesn’t matter; closeness in meaning does.',
      'Right. Search ranks every piece by cosine with the question and hands the top ones to the model.',
      'When a piece was added has no effect on its score.',
      'Length isn’t the measure; similarity of meaning is.',
    ],
  },
  {
    id: 'cosine-range', chapter: '06-meaning-by-neighbours',
    question: 'A piece scores a cosine similarity of 1 with a question. What does that mean?',
    options: [
      'It is the first piece in the index',
      'Their embeddings point in the same direction: as alike in meaning as the model can say',
      'It shares exactly one word with the question',
      'It is the worst match',
    ],
    correct: 1,
    why: [
      'The score is about direction, not position in the index.',
      'Right. Cosine runs from -1 to 1, and 1 means the same direction.',
      'Word counts don’t enter the score.',
      'Higher is closer: 1 is the best possible match.',
    ],
  },
  // 7. Workbench
  {
    id: 'budget-parts', chapter: '07-workbench',
    question: 'Larkspur’s prompt is over its token budget. Which part should go first?',
    options: [
      'The customer’s question: it is the shortest',
      'An optional part, like examples or earlier chat, never the rules, the documents or the question the answer needs',
      'The rules, since the model knows how to behave anyway',
      'Any part: they cost the same',
    ],
    correct: 1,
    why: [
      'Without the question there is nothing to answer.',
      'Right. Keep what the answer needs; trim what only helps.',
      'The rules keep the assistant to the documents. Dropping them risks made-up answers.',
      'Each part costs its own count of tokens; some are much bigger than others.',
    ],
  },
  {
    id: 'parts-add-up', chapter: '07-workbench',
    question: 'A teammate adds up each part’s token count separately to get the prompt’s total. Why can the real total differ a little?',
    options: [
      'It can’t: tokens always add up exactly',
      'Joining the parts adds text, such as the blank lines between them, and pieces can form across the joins, so count the assembled prompt',
      'The model removes duplicate tokens',
      'Totals are rounded to the nearest ten',
    ],
    correct: 1,
    why: [
      'Separators are text too, and the tokenizer cuts the whole prompt, not each part on its own.',
      'Right. Count the prompt you will actually send.',
      'Nothing is removed: every token sent is counted.',
      'Counts are exact whole numbers.',
    ],
  },
  {
    id: 'count-with-billing-tokenizer', chapter: '07-workbench',
    question: 'The prompt fits the budget on one tokenizer. The team switches provider. What should they do before going live?',
    options: [
      'Nothing: the prompt hasn’t changed',
      'Recount the prompt with the new provider’s tokenizer and leave a margin',
      'Halve the budget to be safe',
      'Count words instead, since they don’t change between providers',
    ],
    correct: 1,
    why: [
      'The same text can be a different number of tokens on a different tokenizer.',
      'Right. The bill and the limit follow the provider’s own count.',
      'A guess wastes budget or still misses. Count with the real tokenizer.',
      'Words are not what is billed or limited; tokens are.',
    ],
  },
];
