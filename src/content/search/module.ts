// Search before AI: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-reading-every-page',
    title: 'Reading every page',
    short: 'Every page',
    intro: {
      story:
        'Before its AI assistant, Larkspur’s staff searched the company’s documents with a plain search box. A warehouse lead types “forklift”.',
      goal: 'How does a search box with no index find the pages?',
      learn: ['Documents are cut into pages', 'A scan reads every page', 'Why its cost grows with the pages'],
      terms: [
        ['Page', 'One short, fixed-length piece of a document: what the search box finds and ranks.'],
        ['Scan', 'Reading every page, one by one, to find the ones with the search’s words.'],
      ],
    },
  },
  {
    id: '02-the-index',
    title: 'The index, word to pages',
    short: 'The index',
    intro: {
      story:
        'Reading every page for every search is slow. The team builds an index: a cabinet with a drawer per word, each listing its pages.',
      goal: 'How does an index answer a search without reading the pages?',
      learn: [
        'An index files each page under its words',
        'A search opens one drawer per word',
        'The reading is done once, ahead of time',
      ],
      terms: [
        ['Index', 'A list from each word to the pages it is on, built once before any search.'],
        ['Drawer', 'One word’s place in the index, holding the pages that word is on.'],
        ['Postings', 'A drawer’s list: the pages a word is on, and how often it is on each.'],
      ],
    },
  },
  {
    id: '03-rare-words-count-more',
    title: 'Rare words count more',
    short: 'Rare words',
    intro: {
      story:
        'The index is fast. A warehouse lead searches “Larkspur forklift”, and the top result is about security, not forklifts.',
      goal: 'Why should a rare word count more than a common one?',
      learn: [
        'Counting every word the same lets common words win',
        'Rarity: fewer pages, more weight',
        'A score adds up its words',
      ],
      terms: [
        ['Score', 'A number per page for how well it matches the search; the highest comes first.'],
        ['Rarity', 'How few pages a word is on. Rare words tell pages apart, so they weigh more.'],
      ],
    },
  },
  {
    id: '04-long-pages-and-repeats',
    title: 'Long pages and repeats',
    short: 'Repeats',
    intro: {
      story:
        'Rarity fixed the forklift search. Now someone searches “price”, and the winner is simply the page that says it most.',
      goal: 'Should a page that repeats a word, or a long page, win?',
      learn: ['Each repeat adds less than the last', 'Long pages are scored down', 'BM25 does both'],
      terms: [
        [
          'BM25',
          'The scoring most keyword search uses: rarity, repeats that help less each time, and a fair share for length.',
        ],
        ['Saturation', 'Each repeat of a word adding less to the score than the one before.'],
      ],
    },
  },
  {
    id: '05-cleaning-words',
    title: '“Refund” and “refunds”',
    short: 'Cleaning words',
    intro: {
      story:
        'Someone searches “Refunds” with a capital R and finds a single page, though the refund policy says “refund” on page after page.',
      goal: 'How can a search match a word’s other forms?',
      learn: ['Lower case folds capitals', 'A stemmer folds endings', 'Stop words are too common to help'],
      terms: [
        ['Lower case', 'Folding every capital, so “Refunds” and “refunds” are one word.'],
        ['Stemmer', 'A rule that cuts a word’s endings, so “refunds” and “refunded” share the drawer “refund”.'],
        ['Stop word', 'A word on nearly every page, like “the” or “for”, left out of the index.'],
      ],
    },
  },
  {
    id: '06-words-vs-meaning',
    title: 'Words versus meaning',
    short: 'Meaning',
    intro: {
      story: 'Cleaning helped, but a new hire searches “logging in without a password” and gets nothing useful back.',
      goal: 'When do keywords miss, and when do they beat meaning?',
      learn: ['Keywords match words, not meaning', 'Embeddings match meaning, not exact codes', 'A blend keeps both'],
      terms: [
        ['Embedding', 'A list of numbers standing for a text’s meaning: texts that mean alike get close lists.'],
        ['Hybrid search', 'Ranking pages by keywords and by meaning together.'],
      ],
    },
  },
  {
    id: '07-tune-the-search-box',
    title: 'Tune the search box',
    short: 'Tune it',
    intro: {
      story:
        'The team wrote test searches, each with the pages that answer it. Now every setting of the search box is on the bench.',
      goal: 'Which settings put the most right pages in the top five?',
      learn: ['Precision and recall', 'Why a blend beats either half', 'Why test searches beat hunches'],
      terms: [
        ['Precision', 'Of the pages a search returns, the share that are right.'],
        ['Recall', 'Of the right pages, the share the search returns.'],
      ],
    },
  },
];

export const SEARCH_MODULE: Module = {
  id: 'search',
  title: 'Search before AI',
  description:
    'How a search box finds a page with no AI: an index from words to pages, rare words, repeats, cleaning, and where words fall short of meaning.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Before Larkspur Supply Co.’s AI assistant, staff found answers with a search box over the company’s documents; the team builds its index, tunes its scoring and finds where words stop working.',
  chapters: CHAPTERS,
  recall: RECALL,
};
