// Compression: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress: never
// rename one. Names come from the data (the price list names the company and its products).
import type { Chapter, Module } from '../../lib/modules';
import { fileOf } from '../../lib/compression/files';
import { COMPANY } from '../../lib/compression/story';
import { RECALL } from './recall';

const PRICE = fileOf('price').title,
  PRODUCT = fileOf('product').title,
  PICTURE = fileOf('picture').title.toLowerCase(),
  RANDOM = fileOf('random').title.toLowerCase();

const CHAPTERS: Chapter[] = [
  {
    id: '01-counting-the-bytes',
    title: 'Counting the bytes',
    short: 'Bytes',
    intro: {
      story: `${COMPANY} sends its price list and pictures to every warehouse each night, and the line is slow. First, count what a file holds.`,
      goal: 'What is a file made of, and where could it be smaller?',
      learn: [
        'A file is a row of bytes',
        'Some bytes are far more common than others',
        'Common bytes are what compression feeds on',
      ],
      terms: [
        ['Byte', 'A number from 0 to 255, eight bits; plain English text spends one per letter.'],
        ['Bit', 'A single 0 or 1, the smallest piece a file is made of.'],
      ],
    },
  },
  {
    id: '02-point-back',
    title: 'Point back',
    short: 'Pointers',
    intro: {
      story:
        'The price list repeats itself: both scanner rows spell out the same words. What if the second copy just pointed back at the first?',
      goal: 'How does pointing back at earlier bytes make a file smaller?',
      learn: [
        'A pointer says: go back this far, copy this many',
        'Long repeats shrink most',
        'Unpacking copies the bytes back exactly',
      ],
      terms: [
        ['Pointer', 'Go back this many bytes and copy this many: it stands in for a repeat.'],
        ['Literal', 'A byte written out as it is, because no repeat covers it.'],
        ['LZ77', 'Ziv and Lempel’s 1977 method: replace each repeat with a pointer to an earlier copy.'],
      ],
    },
  },
  {
    id: '03-short-codes',
    title: 'Short codes for common letters',
    short: 'Short codes',
    intro: {
      story:
        'Every letter still costs eight bits, the common ones as much as the rare. What if common letters got shorter codes?',
      goal: 'How does Huffman’s rule give the commonest letters the shortest codes?',
      learn: [
        'Merge the two lightest piles, again and again',
        'Each merge adds one bit to the letters inside',
        'Ties can go either way and still be best',
      ],
      terms: [
        [
          'Huffman code',
          'Short codes for common symbols and long ones for rare, built by merging the two lightest piles.',
        ],
        ['Code tree', 'The tree the merges build: the path from the top down to a letter spells its code.'],
      ],
    },
  },
  {
    id: '04-both-at-once',
    title: 'Both at once',
    short: 'DEFLATE',
    intro: {
      story:
        'Pointers and short codes each shrank the price list. The format inside zip and gzip files runs both, one after the other.',
      goal: 'How close does our pair of coders get to real gzip?',
      learn: [
        'DEFLATE: pointers first, short codes on what is left',
        'gzip wraps DEFLATE in a small header',
        'Real tools search harder for repeats',
      ],
      terms: [
        ['DEFLATE', 'The format inside zip and gzip: LZ77 pointers first, then Huffman codes for what is left.'],
        ['gzip', 'A file format that wraps DEFLATE data with a few label bytes in front and a check at the end.'],
        ['Lossless', 'Packing that brings every byte back exactly.'],
      ],
    },
  },
  {
    id: '05-already-squeezed',
    title: 'Already squeezed',
    short: 'Random',
    intro: {
      story: `The nightly send also carries ${RANDOM}, like an encrypted backup, and files packed before. Someone suggests packing them again.`,
      goal: 'Why can’t any method shrink every file?',
      learn: [
        'Random bytes have no repeats to replace',
        'Packing a packed file gains nothing',
        'There are fewer short files than long ones',
      ],
      terms: [
        ['Pigeonhole', 'More files than shorter files to turn them into, so some must stay as long or grow.'],
        ['Entropy', 'The average bits per byte no code can beat; near eight means nothing left to squeeze.'],
      ],
    },
  },
  {
    id: '06-throwing-some-away',
    title: 'Throwing some away',
    short: 'Lossy',
    intro: {
      story: `The ${PICTURE} barely shrank: its speckle has no repeats. But nobody needs every shade of every pixel.`,
      goal: 'How does throwing detail away make a picture small, and what does it cost?',
      learn: [
        'Drop detail people won’t miss',
        'Fewer shades and blocks make repeats',
        'Smaller files, bigger difference',
      ],
      terms: [['Lossy', 'Packing that throws some detail away for good: the file comes back close, not exact.']],
    },
  },
  {
    id: '07-pack-the-send',
    title: 'Pack the nightly send',
    short: 'Pack the send',
    intro: {
      story: `Tonight’s send: the ${PRICE}, the ${PRODUCT}, the ${RANDOM} and the ${PICTURE}, all on one slow line.`,
      goal: 'Which setting per file fits the budget, with the picture still close enough?',
      learn: ['Lossless for text, always', 'Leave random bytes as they are', 'Lose only what the budget allows'],
      terms: [['Budget', 'The most bytes one send may take: a planning number written for this site.']],
    },
  },
];

export const COMPRESSION_MODULE: Module = {
  id: 'compression',
  title: 'Compression',
  description:
    'How a file gets smaller without losing a byte: repeats replaced by pointers, short codes for common letters, and why some files will not shrink.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story: `${COMPANY}’s catalogue and pictures are too big to send each night; the team finds that compression replaces repeats, so repeated text shrinks and random bytes can’t.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
