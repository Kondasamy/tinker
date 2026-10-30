// Search's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's idea
// in a new situation. Every wrong option is a real misconception, and every option has a `why` line. The pinned item is
// the module's one-line edge: an index is a list of pages per word, and words aren't meaning.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  {
    id: 'words-not-meaning',
    chapter: '06-words-vs-meaning',
    pin: true,
    question:
      'A colleague says: “Our keyword search has an index of every word, so it understands what people are asking.” What do you tell them?',
    options: [
      'The index lists the pages each word is on; it matches words, so a question in other words can miss its answer',
      'Right: an index of every word covers every meaning',
      'An index only helps with long questions',
    ],
    correct: 0,
    why: [
      'Right: a drawer per word finds pages that share the words, and a page saying the same thing differently stays out.',
      'Words and meaning differ: the sign-on page answered the password question without sharing its words.',
      'An index helps any search that shares words with its pages, short or long.',
    ],
  },
  // 1. Reading every page
  {
    id: 'scan-every-time',
    chapter: '01-reading-every-page',
    question: 'A wiki with no search index gets twice as many articles. What happens to each search?',
    options: [
      'It reads about twice as many pages: a scan reads all of them',
      'Nothing: a search reads only the articles it needs',
      'It gets faster, since popular articles are read first',
    ],
    correct: 0,
    why: [
      'Right: with nothing filed by word, every search must read every page, so the cost grows with the wiki.',
      'Knowing which articles are needed is what a scan has to find out by reading them all.',
      'Nothing orders the pages by need, so reading popular ones first still leaves the rest to read.',
    ],
  },
  {
    id: 'scan-no-memory',
    chapter: '01-reading-every-page',
    question: 'A scan for “invoice” just ran. Someone now searches “invoice” again. What does a plain scan do?',
    options: [
      'Reads every page again: a scan keeps nothing between searches',
      'Returns the last answer without reading',
      'Reads only the pages that matched last time',
    ],
    correct: 0,
    why: [
      'Right: the scan stores nothing, so each search starts from the first page again.',
      'Keeping answers between searches needs a saved copy or an index, which a plain scan doesn’t have.',
      'Remembering which pages matched would be the start of an index.',
    ],
  },
  {
    id: 'scan-cost',
    chapter: '01-reading-every-page',
    question: 'What sets how long a scan takes?',
    options: ['How many pages there are to read', 'How many pages match the search', 'How long the search is'],
    correct: 0,
    why: [
      'Right: a scan reads every page whatever it finds, so the collection’s size sets its cost.',
      'A search that matches one page still reads them all to know it is the only one.',
      'The search’s words are checked on each page; the number of pages is what adds up.',
    ],
  },
  // 2. The index
  {
    id: 'index-built-once',
    chapter: '02-the-index',
    question: 'When does an index do its reading?',
    options: [
      'Once, ahead of time: every page is filed under its words before anyone searches',
      'At each search, faster than a scan',
      'Never: it guesses which pages match',
    ],
    correct: 0,
    why: [
      'Right: filing each page once lets every later search read a word’s list instead of the pages.',
      'Reading at search time is exactly the scan the index replaces.',
      'An index doesn’t guess: its lists say exactly which pages hold each word.',
    ],
  },
  {
    id: 'index-two-words',
    chapter: '02-the-index',
    question: 'A search has two words. How does the index answer it?',
    options: [
      'Opens the two words’ drawers and combines their lists of pages',
      'Opens one drawer for the whole phrase',
      'Reads the pages in both drawers word by word',
    ],
    correct: 0,
    why: [
      'Right: each word has its own drawer, and the search joins the lists it finds there.',
      'Drawers hold single words; a phrase isn’t filed as one.',
      'The lists already say where the words are, so no page needs reading.',
    ],
  },
  {
    id: 'index-new-page',
    chapter: '02-the-index',
    question: 'A new help page is added. What must happen before searches can find it?',
    options: [
      'It is filed in the drawer of every word on it',
      'Nothing: searches read new pages anyway',
      'The whole index is thrown away and rebuilt from scratch every time',
    ],
    correct: 0,
    why: [
      'Right: a page no drawer lists is invisible to a search through the index.',
      'Searches read the drawers, not the pages, so an unfiled page is never seen.',
      'Filing one page adds it to its words’ drawers; nothing else has to change.',
    ],
  },
  // 3. Rare words count more
  {
    id: 'rare-the',
    chapter: '03-rare-words-count-more',
    question: 'A search for “return the scanner”: which word should count least?',
    options: [
      '“the”: it is on nearly every page, so it tells pages apart least',
      '“scanner”: it is the longest word',
      'All three equally: each is in the search once',
    ],
    correct: 0,
    why: [
      'Right: rarity weighs a word by how few pages it is on, and “the” is on almost all of them.',
      'A word’s length says nothing about how well it picks out the right page.',
      'Counting each word the same is how a common word took the forklift search.',
    ],
  },
  {
    id: 'rare-company-name',
    chapter: '03-rare-words-count-more',
    question: 'Every page of a company’s docs says the company’s name. A search includes it. What does rarity do?',
    options: [
      'Weighs the name near zero, since it is on every page',
      'Weighs the name most, since it appears most',
      'Drops every page that says the name',
    ],
    correct: 0,
    why: [
      'Right: a word on every page can’t help choose between them, so its weight falls toward zero.',
      'Appearing everywhere is the reason it tells you nothing, not a reason to weigh it more.',
      'Rarity changes a word’s weight; it never removes pages.',
    ],
  },
  {
    id: 'rare-score',
    chapter: '03-rare-words-count-more',
    question: 'What is a page’s score for a search, in the rarity version?',
    options: [
      'For each search word on it: how often it says it, times how rare the word is, added up',
      'How many pages link to it',
      'How recently it was written',
    ],
    correct: 0,
    why: [
      'Right: that is the rarity score the podium ranks by.',
      'Links are another signal some web search uses, not part of this score.',
      'Age isn’t in the score; only the words are.',
    ],
  },
  // 4. Long pages and repeats
  {
    id: 'repeat-stuffing',
    chapter: '04-long-pages-and-repeats',
    question: 'A seller repeats “cheap” fifty times on a listing. Under BM25, what does it gain?',
    options: [
      'A little over a listing saying it a few times: repeats saturate',
      'Fifty times the score of one mention',
      'Nothing at all: repeats are ignored',
    ],
    correct: 0,
    why: [
      'Right: each extra mention adds less than the one before, so stuffing buys little.',
      'That is plain counting, which BM25 replaced so repeats can’t buy the top spot.',
      'Repeats still add something; they add less each time.',
    ],
  },
  {
    id: 'length-dense',
    chapter: '04-long-pages-and-repeats',
    question: 'Two pages each mention “warranty” twice: one is short, one is long. Which does BM25 rank higher?',
    options: [
      'The short one: the same mentions in fewer words make it more about warranties',
      'The long one: more words mean more information',
      'They tie: the mentions are equal',
    ],
    correct: 0,
    why: [
      'Right: BM25 scores a page against its length, so a dense short page wins.',
      'A long page has more room to mention anything, so its mentions count for less.',
      'They tie only when length doesn’t count, which BM25 lets you choose.',
    ],
  },
  {
    id: 'bm25-two-dials',
    chapter: '04-long-pages-and-repeats',
    question: 'What do BM25’s two settings control?',
    options: [
      'How fast repeats stop helping, and how much a page’s length counts against it',
      'How many pages to return, and in what order',
      'Which words are stop words, and which are stemmed',
    ],
    correct: 0,
    why: [
      'Right: one sets how fast repeats saturate, the other how much length counts, the two dials on the bench.',
      'Those are what any ranking returns; BM25’s settings shape the scores themselves.',
      'Cleaning happens before scoring, when the pages are filed.',
    ],
  },
  // 5. Cleaning words
  {
    id: 'stem-forms',
    chapter: '05-cleaning-words',
    question: 'A search for “shipments” misses a page that only says “shipment”. What fixes it?',
    options: ['A stemmer, filing both forms in one drawer', 'Lower case', 'Dropping stop words'],
    correct: 0,
    why: [
      'Right: the stemmer cuts the ending so both forms share the drawer “shipment”.',
      'Both words are already in lower case; the ending is what differs.',
      'Neither word is a stop word, so dropping stop words changes nothing here.',
    ],
  },
  {
    id: 'lower-case',
    chapter: '05-cleaning-words',
    question: 'Without lower case, a search for “Invoice” finds one page. Why?',
    options: [
      'Only one page writes it with a capital I; the rest are in another drawer',
      'Only one page is about invoices',
      'Capitals make a word rarer, so it scores higher',
    ],
    correct: 0,
    why: [
      'Right: as typed, “Invoice” and “invoice” are different words with different drawers.',
      'Many pages mention invoices; they just spell it with a small i.',
      'The capital split the drawer, so the rest weren’t found at all.',
    ],
  },
  {
    id: 'stem-blind',
    chapter: '05-cleaning-words',
    question: 'A stemmer files “organ” and “organisation” together. What does this show?',
    options: [
      'Stemmers cut letters by rule, not by meaning',
      'The two words mean the same',
      'The stemmer is broken and should be off',
    ],
    correct: 0,
    why: [
      'Right: words that look alike can share a stem without sharing a meaning.',
      'They share letters, not meaning, which a rule on letters can’t tell apart.',
      'It still helps more searches than it hurts; this is its known trade-off.',
    ],
  },
  // 6. Words versus meaning
  {
    id: 'meaning-paraphrase',
    chapter: '06-words-vs-meaning',
    question: 'A search for “my parcel never came” should find a page titled “Lost shipments”. Which finds it?',
    options: [
      'Meaning: the words differ but the idea is the same',
      'Keywords: they match the most words',
      'Neither can find it',
    ],
    correct: 0,
    why: [
      'Right: embeddings place texts that mean alike close together, whatever their words.',
      'The search and the page share almost no words, so keywords miss it.',
      'Meaning is built for exactly this, a question in other words.',
    ],
  },
  {
    id: 'meaning-codes',
    chapter: '06-words-vs-meaning',
    question: 'A search for the order code “KX-209” by meaning returns pages about other codes. Why?',
    options: [
      'An embedding blurs exact spellings: codes that look alike seem to mean alike',
      'The code isn’t in any page',
      'Meaning search ignores numbers on purpose',
    ],
    correct: 0,
    why: [
      'Right: the embedding sees “a code like this”, so near-miss codes rank too.',
      'Keywords would find the exact code if it is there, as the part number showed.',
      'Numbers go into the embedding; they just don’t keep their exact identity.',
    ],
  },
  {
    id: 'hybrid',
    chapter: '06-words-vs-meaning',
    question: 'Why do search teams blend keywords and meaning?',
    options: [
      'They fail in opposite places: exact codes and words vs. the same idea in other words',
      'Meaning is too slow to use alone',
      'Keywords are needed to load the embeddings',
    ],
    correct: 0,
    why: [
      'Right: each catches what the other misses, so the blend finds both kinds of answer.',
      'Speed isn’t the reason here; the two simply miss different searches.',
      'Embeddings don’t need keywords; the blend is about results, not loading.',
    ],
  },
  // 7. Tune the search box
  {
    id: 'precision-recall',
    chapter: '07-tune-the-search-box',
    question:
      'A search returns five pages; two are right, and there were four right pages in all. Precision and recall?',
    options: ['Precision 2 of 5, recall 2 of 4', 'Precision 2 of 4, recall 2 of 5', 'Both 2 of 5'],
    correct: 0,
    why: [
      'Right: precision is the right share of what came back; recall is the found share of what was right.',
      'That swaps them: precision looks at the returned pages, recall at the right ones.',
      'Recall counts against the four right pages, not the five returned.',
    ],
  },
  {
    id: 'test-set',
    chapter: '07-tune-the-search-box',
    question: 'Why tune a search box on many labelled test searches rather than a favourite few?',
    options: [
      'A setting that helps a few searches can push other answers out',
      'Labels make the search faster',
      'Many searches make the index smaller',
    ],
    correct: 0,
    why: [
      'Right: only a wide set of searches shows a change’s cost along with its gain.',
      'Labels say which pages are right; they don’t change the search’s speed.',
      'The test searches score settings; the index stays the same size.',
    ],
  },
  {
    id: 'many-winners',
    chapter: '07-tune-the-search-box',
    question: 'Several settings tie for the best score on the test searches. What does that tell you?',
    options: [
      'The test searches can’t tell them apart: more or different searches would be needed to choose',
      'One of them must be wrong',
      'The scoring is broken',
    ],
    correct: 0,
    why: [
      'Right: ties mean the labels don’t separate those settings, so any of them is a fair pick.',
      'They are all equally right on this set; nothing marks one as wrong.',
      'Ties are normal when settings change only a few rankings.',
    ],
  },
];
