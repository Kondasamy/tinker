// Text and Unicode: the module's registry entry and chapters (KTD1). Chapter ids are a contract with readers' saved
// progress: never rename one. Names come from the data (data/unicode/names.json).
import type { Chapter, Module } from '../../lib/modules';
import { ACCENT, COMPANY, CUSTOMER, MOJI, SCRIPTS, SEARCHED } from '../../lib/unicode/story';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-letters-are-numbers',
    title: 'Letters are numbers',
    short: 'Numbers',
    intro: {
      story: `A parcel label at ${COMPANY} reads “${MOJI}”, not “${CUSTOMER}”. To see why, start where computers start.`,
      goal: 'How does a computer store a letter?',
      learn: ['Each letter is stored as a number', 'ASCII numbers 128 characters', 'One byte holds one ASCII letter'],
      terms: [
        [
          'ASCII',
          'The 1960s table of 128 characters, numbered 0 to 127: English letters, digits, punctuation, controls.',
        ],
        ['Byte', 'Eight bits: a number from 0 to 255. One row of holes on the tape.'],
      ],
    },
  },
  {
    id: '02-one-number-for-every-character',
    title: 'One number for every character',
    short: 'Code points',
    intro: {
      story: `ASCII has no ${SCRIPTS.slice(0, 3).join(', no ')}, and ${COMPANY} ships to customers who write in many scripts.`,
      goal: 'How can one table number every character in every script?',
      learn: [
        'Unicode gives each character a code point',
        'Code points go far past 255',
        'One table for every program',
      ],
      terms: [
        ['Unicode', 'One table numbering every character in every script, kept by the Unicode Consortium.'],
        ['Code point', 'A character’s number in Unicode, written U+ and hex: ë is U+00EB.'],
      ],
    },
  },
  {
    id: '03-utf-8',
    title: 'UTF-8: one to four bytes',
    short: 'UTF-8',
    intro: {
      story:
        'Code points run past a million, but a byte holds only 0 to 255. Something has to write big numbers as bytes.',
      goal: 'How does UTF-8 write any code point as bytes, and keep English at one byte?',
      learn: [
        'UTF-8 spends 1 to 4 bytes a character',
        'ASCII stays one byte, unchanged',
        'Lead bytes say how many follow',
      ],
      terms: [
        ['UTF-8', 'The usual way to write code points as bytes: 1 to 4 bytes each, ASCII unchanged.'],
        ['Lead byte', 'A character’s first byte; its top bits say how many bytes follow.'],
      ],
    },
  },
  {
    id: '04-the-wrong-table',
    title: 'The wrong table',
    short: 'Wrong table',
    intro: {
      story: `The punch writes UTF-8 and the bytes are right, yet the warehouse label says “${MOJI}”.`,
      goal: 'What happens when the reader uses a different table from the writer?',
      learn: [
        'Bytes don’t say which table wrote them',
        'UTF-8 read as Latin-1 makes Ã signs',
        'Fix the reader, not the bytes',
      ],
      terms: [
        ['Latin-1', 'An old table for Western European text: 256 characters, one byte each.'],
        ['Mojibake', 'Garbled text from bytes read with the wrong table; Japanese for “character transformation”.'],
      ],
    },
  },
  {
    id: '05-one-emoji-many-numbers',
    title: 'One emoji, many numbers',
    short: 'Emoji',
    intro: {
      story: 'A gift note ends in a family emoji, and the form says the note is too long. How long is one emoji?',
      goal: 'Why does one emoji have several different lengths?',
      learn: [
        'Joined emoji are several code points',
        'Code units, code points and bytes differ',
        'Graphemes are what people see',
      ],
      terms: [
        ['Grapheme', 'What a reader sees as one character, even when it is several code points.'],
        ['Zero-width joiner', 'An invisible code point, U+200D, that glues emoji into one picture.'],
        ['Code unit', 'A 16-bit piece of a JavaScript string; past U+FFFF a character takes two.'],
      ],
    },
  },
  {
    id: '06-same-look-different-bytes',
    title: 'Same look, different bytes',
    short: 'Lookalikes',
    intro: {
      story: `The search box can’t find “${SEARCHED.record}”, though the record is right there. Two strings can look the same and hold different bytes.`,
      goal: 'Why do two strings that look the same compare as different?',
      learn: [
        `${ACCENT.composed} can be one code point or two`,
        'Normalising makes them match',
        'Lookalike letters fool people, not computers',
      ],
      terms: [
        [
          'Normalisation',
          'Rewriting text in one standard form, so the same letters get the same code points. NFC composes.',
        ],
        ['Combining mark', 'A code point that puts an accent on the letter before it, such as U+0301.'],
        ['Homograph', 'A web address that looks like another but uses lookalike letters from another script.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: the name field',
    short: 'Name field',
    intro: {
      story: `${COMPANY}’s new sign-up form has a name field, and the customer file stores names in a column of fixed bytes.`,
      goal: 'What should a name field count, and up to how many, so every name fits and matches?',
      learn: ['Count what the store counts', 'Normalise before you compare', 'What people see has no byte limit'],
      terms: [
        [
          'Column limit',
          'The most bytes the customer file stores for a name: a planning number written for this site.',
        ],
      ],
    },
  },
];

export const UNICODE_MODULE: Module = {
  id: 'unicode',
  title: 'Text and Unicode',
  description: `How letters become bytes: one number for every character, UTF-8, and why a name turns into “${MOJI}” or an emoji breaks a form.`,
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story: `A ${COMPANY} label prints “${MOJI}” for ${CUSTOMER}; the team finds every character is a number, UTF-8 writes it in 1 to 4 bytes, and text breaks when the reader’s table differs from the writer’s.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
